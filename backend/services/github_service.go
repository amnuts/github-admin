package services

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/gofri/go-github-ratelimit/v2/github_ratelimit"
	"github.com/google/go-github/v81/github"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type GitHubService struct {
	cancelFunc context.CancelFunc
	client     *github.Client
	ghCtx      context.Context
	token      string
	Status     GitHubServiceStatus
}

type GitHubFetchErrorEvent struct {
	Org   string `json:"org"`
	Type  string `json:"type"` // "repos" or "teams"
	Error string `json:"error"`
}

type GitHubTeam struct {
	Name         string `json:"name"`
	Slug         string `json:"slug"`
	Url          string `json:"url"`
	MembersCount int    `json:"members_count"`
}

type GitHubServiceStatus struct {
	IsConnected   bool     `json:"isConnected"`
	IsPolling     bool     `json:"isPolling"`
	Organizations []string `json:"organizations"`
	SelectedOrg   string   `json:"selectedOrg"`
	DefaultOrg    string   `json:"defaultOrg"`
}

type GitHubRepo struct {
	Name          string   `json:"name"`
	FullName      string   `json:"full_name"`
	Url           string   `json:"url"`
	Topics        []string `json:"topics"`
	Archived      bool     `json:"archived"`
	Public        bool     `json:"public"`
	Visibility    string   `json:"visibility"`
	IsFork        bool     `json:"is_fork"`
	DefaultBranch string   `json:"default_branch"`
	CanManage     bool     `json:"can_manage"`
}

type GitHubRepoTeam struct {
	Name       string `json:"name"`
	Slug       string `json:"slug"`
	Permission string `json:"permission"`
}

type GitHubBranchProtectionDetail struct {
	BranchName string             `json:"branch_name"`
	Protection *github.Protection `json:"protection"`
}

type GitHubRepoDetailed struct {
	GitHubRepo
	Description      string                          `json:"description"`
	Stars            int                             `json:"stars"`
	Watching         int                             `json:"watching"`
	ForksCount       int                             `json:"forks_count"`
	OpenPRs          int                             `json:"open_prs"`
	BranchesCount    int                             `json:"branches_count"`
	CustomProperties []*github.CustomPropertyValue   `json:"custom_properties"`
	Teams            []*GitHubRepoTeam               `json:"teams"`
	Protection       []*GitHubBranchProtectionDetail `json:"protection"`
	Rulesets         []*github.RepositoryRuleset     `json:"rulesets"`
}

type GitHubReposUpdatedEvent struct {
	Org   string        `json:"org"`
	Repos []*GitHubRepo `json:"repos"`
}

type GitHubTeamsUpdatedEvent struct {
	Org   string        `json:"org"`
	Teams []*GitHubTeam `json:"teams"`
}

func (ghs *GitHubService) Startup() *GitHubServiceStatus {
	cfg, err := LoadConfig()
	if err == nil && cfg.GitHubToken != "" {
		ghs.token = cfg.GitHubToken
		ghs.Status.SelectedOrg = cfg.SelectedOrg
		ghs.Status.DefaultOrg = cfg.DefaultOrg
		if ghs.Status.DefaultOrg != "" {
			ghs.Status.SelectedOrg = ""
		}
		err = ghs.Connect(ghs.token)
		if err != nil {
			fmt.Printf("Auto-connect failed: %v\n", err)
		}
	}
	return &ghs.Status
}

func (ghs *GitHubService) Connect(token string) error {
	rateLimiter := github_ratelimit.NewClient(nil)
	client := github.NewClient(rateLimiter).WithAuthToken(token)

	// Verify token by getting user info
	user, _, err := client.Users.Get(context.Background(), "")
	if err != nil {
		return fmt.Errorf("failed to verify token: %w", err)
	}
	fmt.Printf("Connected as: %s\n", user.GetLogin())

	ghs.client = client
	ghs.token = token
	ghs.Status.IsConnected = true

	// Fetch organizations
	orgs, _, err := client.Organizations.List(context.Background(), "", nil)
	if err != nil {
		fmt.Printf("Error fetching orgs: %v\n", err)
	} else {
		ghs.Status.Organizations = []string{user.GetLogin()} // Include user as an "org"
		for _, org := range orgs {
			ghs.Status.Organizations = append(ghs.Status.Organizations, org.GetLogin())
		}
	}

	// Save config
	cfg, _ := LoadConfig()
	if ghs.Status.SelectedOrg != "" {
		found := false
		for _, org := range ghs.Status.Organizations {
			if org == ghs.Status.SelectedOrg {
				found = true
				break
			}
		}
		if !found {
			ghs.Status.SelectedOrg = ""
		}
	}
	if ghs.Status.SelectedOrg == "" && cfg.DefaultOrg != "" {
		for _, org := range ghs.Status.Organizations {
			if org == cfg.DefaultOrg {
				ghs.Status.SelectedOrg = cfg.DefaultOrg
				break
			}
		}
	}
	if ghs.Status.SelectedOrg == "" && len(ghs.Status.Organizations) > 0 {
		ghs.Status.SelectedOrg = ghs.Status.Organizations[0]
	}

	cfg.GitHubToken = ghs.token
	cfg.SelectedOrg = ghs.Status.SelectedOrg
	ghs.Status.DefaultOrg = cfg.DefaultOrg
	SaveConfig(cfg)

	ghs.emitStatus()
	ghs.StartRepoPolling()

	return nil
}

func (ghs *GitHubService) Login(token string) (*GitHubServiceStatus, error) {
	err := ghs.Connect(token)
	if err != nil {
		return nil, err
	}
	return &ghs.Status, nil
}

func (ghs *GitHubService) Logout() {
	ghs.StopRepoPolling()
	ghs.token = ""
	ghs.client = nil
	ghs.Status = GitHubServiceStatus{}
	cfg, _ := LoadConfig()
	cfg.GitHubToken = ""
	cfg.SelectedOrg = ""
	SaveConfig(cfg)
	ghs.emitStatus()
}

func (ghs *GitHubService) SetOrganization(org string) {
	ghs.Status.SelectedOrg = org
	cfg, _ := LoadConfig()
	cfg.GitHubToken = ghs.token
	cfg.SelectedOrg = ghs.Status.SelectedOrg
	SaveConfig(cfg)
	ghs.emitStatus()
	ghs.RefreshRepoList(org)
}

func (ghs *GitHubService) SetDefaultOrganization(org string) {
	ghs.Status.DefaultOrg = org
	cfg, _ := LoadConfig()
	cfg.DefaultOrg = ghs.Status.DefaultOrg
	SaveConfig(cfg)
	ghs.emitStatus()
}

func (ghs *GitHubService) emitStatus() {
	app := application.Get()
	if app != nil {
		app.Event.Emit("github:status:updated", ghs.Status)
	}
}

func (ghs *GitHubService) emitFetchError(org, fetchType, errMsg string) {
	app := application.Get()
	if app != nil {
		app.Event.Emit("github:fetch:error", &GitHubFetchErrorEvent{
			Org:   org,
			Type:  fetchType,
			Error: errMsg,
		})
	}
}

func (ghs *GitHubService) fetchAll(org string) {
	ghs.fetchRepoList(org)
	ghs.fetchTeamList(org)
}

func (ghs *GitHubService) fetchTeamList(org string) {
	if !ghs.Status.IsConnected || org == "" || ghs.client == nil {
		return
	}

	ctx := ghs.ghCtx
	if ctx == nil {
		ctx = context.Background()
	}

	user, _, err := ghs.client.Users.Get(ctx, "")
	if err != nil {
		ghs.emitFetchError(org, "teams", err.Error())
		return
	}

	// Teams only exist for organizations, not individual users
	if user.GetLogin() == org {
		app := application.Get()
		if app != nil {
			app.Event.Emit("github:teams:updated", &GitHubTeamsUpdatedEvent{
				Org:   org,
				Teams: nil,
			})
		}
		return
	}

	opt := &github.ListOptions{PerPage: 100}
	var allTeams []*GitHubTeam

	for {
		teams, resp, err := ghs.client.Teams.ListTeams(ctx, org, opt)
		if err != nil {
			fmt.Printf("Error fetching teams for %s: %v\n", org, err)
			ghs.emitFetchError(org, "teams", err.Error())
			return
		}
		var wg sync.WaitGroup
		sem := make(chan struct{}, 10)
		teamResults := make([]*GitHubTeam, len(teams))

		for i, team := range teams {
			wg.Add(1)
			go func(idx int, t *github.Team) {
				defer wg.Done()
				sem <- struct{}{}
				defer func() { <-sem }()

				mCount := t.GetMembersCount()
				if mCount == 0 {
					// ListTeams often doesn't return members_count, so fetch full team details
					if fullTeam, _, err := ghs.client.Teams.GetTeamBySlug(ctx, org, t.GetSlug()); err == nil && fullTeam != nil {
						mCount = fullTeam.GetMembersCount()
					}
				}

				teamResults[idx] = &GitHubTeam{
					Name:         t.GetName(),
					Slug:         t.GetSlug(),
					Url:          t.GetHTMLURL(),
					MembersCount: mCount,
				}
			}(i, team)
		}
		wg.Wait()
		allTeams = append(allTeams, teamResults...)
		if resp.NextPage == 0 {
			break
		}
		opt.Page = resp.NextPage
	}

	app := application.Get()
	if app != nil {
		app.Event.Emit("github:teams:updated", &GitHubTeamsUpdatedEvent{
			Org:   org,
			Teams: allTeams,
		})
	}
}

func (ghs *GitHubService) fetchRepoList(org string) {
	if !ghs.Status.IsConnected || org == "" || ghs.client == nil {
		return
	}

	ctx := ghs.ghCtx
	if ctx == nil {
		ctx = context.Background()
	}

	opt := &github.RepositoryListByOrgOptions{
		Sort:        "full_name",
		ListOptions: github.ListOptions{PerPage: 100},
	}
	userOpt := &github.RepositoryListOptions{
		Affiliation: "owner",
		Sort:        "full_name",
		ListOptions: github.ListOptions{PerPage: 100},
	}

	var allRepos []*GitHubRepo

	user, _, err := ghs.client.Users.Get(ctx, "")
	if err != nil {
		fmt.Printf("Error getting user info: %v\n", err)
		ghs.emitFetchError(org, "repos", err.Error())
		return
	}

	for {
		var repos []*github.Repository
		var resp *github.Response
		var err error

		if user.GetLogin() == org {
			repos, resp, err = ghs.client.Repositories.ListByAuthenticatedUser(ctx, (*github.RepositoryListByAuthenticatedUserOptions)(userOpt))
		} else {
			repos, resp, err = ghs.client.Repositories.ListByOrg(ctx, org, opt)
		}

		if err != nil {
			fmt.Printf("Error fetching repos for %s: %v\n", org, err)
			ghs.emitFetchError(org, "repos", err.Error())
			return
		}
		for _, repo := range repos {
			canManage := false
			if p := repo.GetPermissions(); p != nil {
				canManage = p["admin"] || p["maintain"] || p["push"]
			}
			allRepos = append(allRepos, &GitHubRepo{
				Name:          repo.GetName(),
				FullName:      repo.GetFullName(),
				Url:           repo.GetHTMLURL(),
				Topics:        repo.Topics,
				Archived:      repo.GetArchived(),
				Public:        !repo.GetPrivate(),
				Visibility:    repo.GetVisibility(),
				IsFork:        repo.GetFork(),
				DefaultBranch: repo.GetDefaultBranch(),
				CanManage:     canManage,
			})
		}

		if resp.NextPage == 0 {
			break
		} else {
			opt.Page = resp.NextPage
			userOpt.Page = resp.NextPage
		}
	}
	fmt.Printf("Fetched %d repos for %s\n", len(allRepos), org)

	app := application.Get()
	if app != nil {
		app.Event.Emit("github:repos:updated", &GitHubReposUpdatedEvent{
			Org:   org,
			Repos: allRepos,
		})
	}
}

func (ghs *GitHubService) fetchAllForAllOrgs() {
	for _, org := range ghs.Status.Organizations {
		ghs.fetchAll(org)
	}
}

func (ghs *GitHubService) StartRepoPolling() {
	if ghs.Status.IsPolling || !ghs.Status.IsConnected {
		return
	}

	ghs.ghCtx, ghs.cancelFunc = context.WithCancel(context.Background())
	ghs.Status.IsPolling = true
	ghs.emitStatus()

	go func() {
		ghs.fetchAllForAllOrgs()
		ticker := time.NewTicker(30 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ghs.ghCtx.Done():
				return
			case <-ticker.C:
				ghs.fetchAllForAllOrgs()
			}
		}
	}()
}

func (ghs *GitHubService) StopRepoPolling() {
	if !ghs.Status.IsPolling {
		return
	}
	if ghs.cancelFunc != nil {
		ghs.cancelFunc()
	}
	ghs.Status.IsPolling = false
	ghs.emitStatus()
}

func (ghs *GitHubService) GetRepoDetails(owner, repoName string) (*GitHubRepoDetailed, error) {
	if !ghs.Status.IsConnected || ghs.client == nil {
		return nil, fmt.Errorf("not connected")
	}

	ctx := ghs.ghCtx
	if ctx == nil {
		ctx = context.Background()
	}

	// 1. Get basic repo info (including description, stars, etc.)
	repo, _, err := ghs.client.Repositories.Get(ctx, owner, repoName)
	if err != nil {
		return nil, err
	}

	canManage := false
	if p := repo.GetPermissions(); p != nil {
		canManage = p["admin"] || p["maintain"] || p["push"]
	}

	detailed := &GitHubRepoDetailed{
		GitHubRepo: GitHubRepo{
			Name:          repo.GetName(),
			FullName:      repo.GetFullName(),
			Url:           repo.GetHTMLURL(),
			Topics:        repo.Topics,
			Archived:      repo.GetArchived(),
			Public:        !repo.GetPrivate(),
			Visibility:    repo.GetVisibility(),
			IsFork:        repo.GetFork(),
			DefaultBranch: repo.GetDefaultBranch(),
			CanManage:     canManage,
		},
		Description: repo.GetDescription(),
		Stars:       repo.GetStargazersCount(),
		Watching:    repo.GetWatchersCount(),
		ForksCount:  repo.GetForksCount(),
	}

	// 2. Get Open PRs count
	query := fmt.Sprintf("repo:%s/%s type:pr state:open", owner, repoName)
	searchRes, _, err := ghs.client.Search.Issues(ctx, query, &github.SearchOptions{ListOptions: github.ListOptions{PerPage: 1}})
	if err == nil {
		detailed.OpenPRs = searchRes.GetTotal()
	}

	// 3. Get Branches count
	branches, resp, err := ghs.client.Repositories.ListBranches(ctx, owner, repoName, &github.BranchListOptions{ListOptions: github.ListOptions{PerPage: 100}})
	if err == nil {
		if resp.LastPage > 0 {
			// This is an estimation if more than one page, but ListBranches doesn't give total count.
			// To be accurate we'd need to follow pages, but let's just use what we have or count.
			count := len(branches)
			for resp.NextPage > 0 {
				var more []*github.Branch
				more, resp, err = ghs.client.Repositories.ListBranches(ctx, owner, repoName, &github.BranchListOptions{ListOptions: github.ListOptions{Page: resp.NextPage, PerPage: 100}})
				if err != nil {
					break
				}
				count += len(more)
			}
			detailed.BranchesCount = count
		} else {
			detailed.BranchesCount = len(branches)
		}
	}

	// 4. Custom Properties
	props, _, err := ghs.client.Repositories.GetAllCustomPropertyValues(ctx, owner, repoName)
	if err == nil {
		detailed.CustomProperties = props
	}

	// 5. Teams and their permissions
	teams, _, err := ghs.client.Repositories.ListTeams(ctx, owner, repoName, &github.ListOptions{PerPage: 100})
	if err == nil {
		for _, t := range teams {
			detailed.Teams = append(detailed.Teams, &GitHubRepoTeam{
				Name:       t.GetName(),
				Slug:       t.GetSlug(),
				Permission: t.GetPermission(),
			})
		}
	}

	// 6. Branch Protection
	// We use the branches we already fetched
	for _, b := range branches {
		if b.GetProtected() {
			protection, _, err := ghs.client.Repositories.GetBranchProtection(ctx, owner, repoName, b.GetName())
			if err == nil {
				detailed.Protection = append(detailed.Protection, &GitHubBranchProtectionDetail{
					BranchName: b.GetName(),
					Protection: protection,
				})
			}
		}
	}

	// 7. Rulesets
	rulesets, _, err := ghs.client.Repositories.GetAllRulesets(ctx, owner, repoName, nil)
	if err == nil {
		// Fetch full details for each ruleset to get the rules
		for _, rs := range rulesets {
			fullRs, _, err := ghs.client.Repositories.GetRuleset(ctx, owner, repoName, rs.GetID(), false)
			if err == nil {
				detailed.Rulesets = append(detailed.Rulesets, fullRs)
			} else {
				detailed.Rulesets = append(detailed.Rulesets, rs)
			}
		}
	}

	return detailed, nil
}

func (ghs *GitHubService) UpdateRepoTopics(owner, repo string, topics []string, mode string) ([]string, error) {
	if ghs.client == nil {
		return nil, fmt.Errorf("not connected")
	}
	ctx := context.Background()
	current, _, err := ghs.client.Repositories.ListAllTopics(ctx, owner, repo)
	if err != nil {
		return nil, err
	}

	var newTopics []string
	switch mode {
	case "replace":
		newTopics = topics
	case "add":
		unique := make(map[string]bool)
		for _, t := range current {
			unique[t] = true
		}
		for _, t := range topics {
			if t != "" {
				unique[t] = true
			}
		}
		for t := range unique {
			newTopics = append(newTopics, t)
		}
	case "remove":
		toRemove := make(map[string]bool)
		for _, t := range topics {
			toRemove[t] = true
		}
		for _, t := range current {
			if !toRemove[t] {
				newTopics = append(newTopics, t)
			}
		}
	default:
		return nil, fmt.Errorf("invalid mode")
	}

	updated, _, err := ghs.client.Repositories.ReplaceAllTopics(ctx, owner, repo, newTopics)
	return updated, err
}

func (ghs *GitHubService) BulkUpdateRepoTopics(fullRepos []string, topics []string, mode string) error {
	for _, fullRepo := range fullRepos {
		parts := strings.Split(fullRepo, "/")
		if len(parts) == 2 {
			_, _ = ghs.UpdateRepoTopics(parts[0], parts[1], topics, mode)
		}
	}
	return nil
}

func (ghs *GitHubService) UpdateRepoTeam(owner, repo, org, teamSlug, permission string, remove bool) error {
	if ghs.client == nil {
		return fmt.Errorf("not connected")
	}
	ctx := context.Background()
	if remove {
		_, err := ghs.client.Teams.RemoveTeamRepoBySlug(ctx, org, teamSlug, owner, repo)
		return err
	}
	_, err := ghs.client.Teams.AddTeamRepoBySlug(ctx, org, teamSlug, owner, repo, &github.TeamAddTeamRepoOptions{
		Permission: permission,
	})
	return err
}

func (ghs *GitHubService) BulkUpdateRepoTeam(fullRepos []string, org, teamSlug, permission string, remove bool) error {
	for _, fullRepo := range fullRepos {
		parts := strings.Split(fullRepo, "/")
		if len(parts) == 2 {
			_ = ghs.UpdateRepoTeam(parts[0], parts[1], org, teamSlug, permission, remove)
		}
	}
	return nil
}

func (ghs *GitHubService) UpdateRepoCustomProperties(org, repo string, properties map[string]interface{}) error {
	if ghs.client == nil {
		return fmt.Errorf("not connected")
	}
	ctx := context.Background()
	var props []*github.CustomPropertyValue
	for k, v := range properties {
		val := v
		if b, ok := v.(bool); ok {
			val = fmt.Sprintf("%v", b)
		}
		props = append(props, &github.CustomPropertyValue{
			PropertyName: k,
			Value:        val,
		})
	}
	_, err := ghs.client.Organizations.CreateOrUpdateRepoCustomPropertyValues(ctx, org, []string{repo}, props)
	return err
}

func (ghs *GitHubService) BulkUpdateRepoCustomProperties(org string, repos []string, properties map[string]interface{}) error {
	if ghs.client == nil {
		return fmt.Errorf("not connected")
	}
	ctx := context.Background()
	var props []*github.CustomPropertyValue
	for k, v := range properties {
		val := v
		if b, ok := v.(bool); ok {
			val = fmt.Sprintf("%v", b)
		}
		props = append(props, &github.CustomPropertyValue{
			PropertyName: k,
			Value:        val,
		})
	}
	var repoNames []string
	for _, r := range repos {
		parts := strings.Split(r, "/")
		if len(parts) == 2 {
			repoNames = append(repoNames, parts[1])
		} else {
			repoNames = append(repoNames, r)
		}
	}
	_, err := ghs.client.Organizations.CreateOrUpdateRepoCustomPropertyValues(ctx, org, repoNames, props)
	return err
}

func (ghs *GitHubService) GetOrgCustomPropertyDefinitions(org string) ([]*github.CustomProperty, error) {
	if ghs.client == nil {
		return nil, fmt.Errorf("not connected")
	}
	ctx := context.Background()
	props, _, err := ghs.client.Organizations.GetAllCustomProperties(ctx, org)
	return props, err
}

func (ghs *GitHubService) UpdateBranchProtection(owner, repo, branch string, protection *github.ProtectionRequest) error {
	if ghs.client == nil {
		return fmt.Errorf("not connected")
	}
	ctx := context.Background()
	_, _, err := ghs.client.Repositories.UpdateBranchProtection(ctx, owner, repo, branch, protection)
	return err
}

func (ghs *GitHubService) BulkUpdateBranchProtection(fullRepos []string, branch string, protection *github.ProtectionRequest) error {
	for _, fullRepo := range fullRepos {
		parts := strings.Split(fullRepo, "/")
		if len(parts) == 2 {
			_ = ghs.UpdateBranchProtection(parts[0], parts[1], branch, protection)
		}
	}
	return nil
}

func (ghs *GitHubService) DeleteBranchProtection(owner, repo, branch string) error {
	if ghs.client == nil {
		return fmt.Errorf("not connected")
	}
	ctx := context.Background()
	_, err := ghs.client.Repositories.RemoveBranchProtection(ctx, owner, repo, branch)
	return err
}

func (ghs *GitHubService) CreateRepoRuleset(owner, repo string, ruleset *github.RepositoryRuleset) error {
	if ghs.client == nil {
		return fmt.Errorf("not connected")
	}
	ctx := context.Background()
	_, _, err := ghs.client.Repositories.CreateRuleset(ctx, owner, repo, *ruleset)
	return err
}

func (ghs *GitHubService) UpdateRepoRuleset(owner, repo string, id int64, ruleset *github.RepositoryRuleset) error {
	if ghs.client == nil {
		return fmt.Errorf("not connected")
	}
	ctx := context.Background()
	_, _, err := ghs.client.Repositories.UpdateRuleset(ctx, owner, repo, id, *ruleset)
	return err
}

func (ghs *GitHubService) DeleteRepoRuleset(owner, repo string, id int64) error {
	if ghs.client == nil {
		return fmt.Errorf("not connected")
	}
	ctx := context.Background()
	_, err := ghs.client.Repositories.DeleteRuleset(ctx, owner, repo, id)
	return err
}

func (ghs *GitHubService) RefreshRepoList(org string) {
	if ghs.ghCtx == nil {
		ghs.ghCtx = context.Background()
	}
	go ghs.fetchAll(org)
}
