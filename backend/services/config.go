package services

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/adrg/xdg"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type TeamGroupMember struct {
	Slug       string `json:"slug"`
	Permission string `json:"permission"`
}

type Config struct {
	GitHubToken  string                                  `json:"github_token"`
	SelectedOrg  string                                  `json:"selected_org"`
	DefaultOrg   string                                  `json:"default_org"`
	WindowX      int                                     `json:"window_x"`
	WindowY      int                                     `json:"window_y"`
	WindowWidth  int                                     `json:"window_width"`
	WindowHeight int                                     `json:"window_height"`
	RememberPos  bool                                    `json:"remember_pos"`
	Theme        string                                  `json:"theme"`
	RepoGroups   map[string]map[string][]string          `json:"repo_groups"` // Org -> GroupName -> []RepoFullName
	TeamGroups   map[string]map[string][]TeamGroupMember `json:"team_groups"` // Org -> GroupName -> []TeamGroupMember
}

type AppConfigService struct{}

func GetAppTheme(themeName string) application.Theme {
	switch themeName {
	case "light":
		return application.Light
	case "dark":
		return application.Dark
	default:
		return application.SystemDefault
	}
}

func (s *AppConfigService) ShowSettings() {
	app := application.Get()
	settingsWindow, found := app.Window.GetByName("settings")
	if found {
		settingsWindow.Focus()
		return
	}

	currentCfg, _ := LoadConfig()
	currentTheme := GetAppTheme(currentCfg.Theme)

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:   "settings",
		Title:  "Settings",
		Width:  500,
		Height: 600,
		URL:    "/#/settings",
		Windows: application.WindowsWindow{
			BackdropType: application.Acrylic,
			Theme:        currentTheme,
		},
	})
}

func (s *AppConfigService) GetConfig() (*Config, error) {
	return LoadConfig()
}

func (s *AppConfigService) SaveConfig(cfg *Config) error {
	return SaveConfig(cfg)
}

var configPath = filepath.Join(xdg.ConfigHome, "github-admin", "config.json")

func LoadConfig() (*Config, error) {
	cfg := &Config{
		WindowX:      -1,
		WindowY:      -1,
		WindowWidth:  1280,
		WindowHeight: 1024,
		RememberPos:  true,
		Theme:        "system",
	}
	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return nil, err
	}
	err = json.Unmarshal(data, cfg)
	if err != nil {
		return nil, err
	}
	if cfg.RepoGroups == nil {
		cfg.RepoGroups = make(map[string]map[string][]string)
	}
	if cfg.TeamGroups == nil {
		cfg.TeamGroups = make(map[string]map[string][]TeamGroupMember)
	}
	return cfg, nil
}

func SaveConfig(cfg *Config) error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	err = os.MkdirAll(filepath.Dir(configPath), 0755)
	if err != nil {
		return err
	}
	return os.WriteFile(configPath, data, 0644)
}
