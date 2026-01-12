import {useState, useEffect} from 'react';
import {useAppState, useAppDispatch} from '../state/StateManager.jsx';
import {
    Table,
    TextInput,
    Switch,
    Group,
    Title,
    Text,
    Anchor,
    Badge,
    Stack,
    Box,
    ScrollArea,
    Tabs,
    Alert,
    Skeleton,
    Loader,
    Center,
    Flex,
    ActionIcon,
    Tooltip,
    Divider,
    Checkbox,
    useComputedColorScheme,
    Menu,
    Modal,
    Button,
    Select,
} from '@mantine/core';
import {
    IconSearch,
    IconUsers,
    IconList,
    IconAlertCircle,
    IconLayoutSidebarRightCollapse,
    IconLayoutSidebarRightExpand,
    IconFilter,
    IconDots,
    IconFolderPlus,
    IconTrash,
    IconPlus,
    IconTag,
    IconSquareCheck,
    IconSquareX,
    IconExternalLink,
    IconStar,
    IconGitBranch,
    IconGitPullRequest,
    IconEye,
    IconLock,
    IconWorld,
    IconShieldLock,
    IconSettings,
} from '@tabler/icons-react';
import {SaveConfig, GetConfig} from "../../bindings/github.com/amnuts/github-admin/backend/services/appconfigservice.js";
import {GetRepoDetails, RefreshRepoList} from "../../bindings/github.com/amnuts/github-admin/backend/services/githubservice.js";
import RepoDetailsModal from '../components/RepoDetailsModal.jsx';
import BulkEditModal from '../components/BulkEditModal.jsx';

const Repositories = () => {
    const {repoCache, teamCache, fetchErrors, serviceStatus, repoGroups, teamGroups} = useAppState();
    const appDispatch = useAppDispatch();
    
    const [activeTab, setActiveTab] = useState('repos');
    const [repoFilters, setRepoFilters] = useState({
        search: '',
        onlyManageable: true,
        onlySelected: false,
        public: true,
        private: true,
        forks: true,
        internal: true,
        archived: true,
        group: null,
    });
    const [teamFilters, setTeamFilters] = useState({
        search: '',
        onlySelected: false,
        group: null,
    });
    const [repoFiltersOpen, setRepoFiltersOpen] = useState(true);
    const [teamFiltersOpen, setTeamFiltersOpen] = useState(false);
    
    const [selectedRepos, setSelectedRepos] = useState(new Set());
    const [selectedTeams, setSelectedTeams] = useState(new Set());
    const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
    const [createTeamGroupModalOpen, setCreateTeamGroupModalOpen] = useState(false);
    const [createGroupError, setCreateGroupError] = useState('');
    const [createTeamGroupError, setCreateTeamGroupError] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [newTeamGroupName, setNewTeamGroupName] = useState('');
    const [contextMenuOpened, setContextMenuOpened] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [contextMenuGroup, setContextMenuGroup] = useState(null);
    const [contextMenuIsTeamGroup, setContextMenuIsTeamGroup] = useState(false);
    const [lastSelectedRepo, setLastSelectedRepo] = useState(null);
    const [lastSelectedTeam, setLastSelectedTeam] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedRepoDetails, setSelectedRepoDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [manageTeamGroupModalOpen, setManageTeamGroupModalOpen] = useState(false);
    const [selectedTeamGroupName, setSelectedTeamGroupName] = useState(null);

    const filtersOpen = activeTab === 'repos' ? repoFiltersOpen : teamFiltersOpen;
    const setFiltersOpen = activeTab === 'repos' ? setRepoFiltersOpen : setTeamFiltersOpen;

    const selectedOrg = serviceStatus.selectedOrg;
    const repoList = repoCache[selectedOrg];
    const teamList = teamCache[selectedOrg];
    const supportsTeams = teamList !== null;
    const currentOrgGroups = (repoGroups && repoGroups[selectedOrg]) || {};
    const currentOrgTeamGroups = (teamGroups && teamGroups[selectedOrg]) || {};
    
    const repoError = fetchErrors[`${selectedOrg}-repos`];
    const teamError = fetchErrors[`${selectedOrg}-teams`];

    const computedColorScheme = useComputedColorScheme('dark');

    useEffect(() => {
        setSelectedRepos(new Set());
        setLastSelectedRepo(null);
        setSelectedTeams(new Set());
        setLastSelectedTeam(null);
        if (!supportsTeams && activeTab === 'teams') {
            setActiveTab('repos');
        }
    }, [selectedOrg, supportsTeams]);

    const saveGroups = async (newGroups) => {
        const updatedRepoGroups = {
            ...repoGroups,
            [selectedOrg]: newGroups
        };
        appDispatch({ type: 'UPDATE_REPO_GROUPS', payload: updatedRepoGroups });
        const cfg = await GetConfig();
        cfg.repo_groups = updatedRepoGroups;
        await SaveConfig(cfg);
    };

    const saveTeamGroups = async (newGroups) => {
        const updatedTeamGroups = {
            ...teamGroups,
            [selectedOrg]: newGroups
        };
        appDispatch({ type: 'UPDATE_TEAM_GROUPS', payload: updatedTeamGroups });
        const cfg = await GetConfig();
        cfg.team_groups = updatedTeamGroups;
        await SaveConfig(cfg);
    };

    const handleCreateGroup = () => {
        const trimmedName = newGroupName.trim();
        if (!trimmedName || selectedRepos.size === 0) return;
        
        if (currentOrgGroups[trimmedName]) {
            setCreateGroupError('A group with this name already exists.');
            return;
        }
        
        const newGroups = {
            ...currentOrgGroups,
            [trimmedName]: Array.from(selectedRepos)
        };
        
        saveGroups(newGroups);
        setNewGroupName('');
        setCreateGroupError('');
        setCreateGroupModalOpen(false);
    };

    const handleCreateTeamGroup = () => {
        const trimmedName = newTeamGroupName.trim();
        if (!trimmedName || selectedTeams.size === 0) return;
        
        if (currentOrgTeamGroups[trimmedName]) {
            setCreateTeamGroupError('A group with this name already exists.');
            return;
        }
        
        const newGroups = {
            ...currentOrgTeamGroups,
            [trimmedName]: Array.from(selectedTeams).map(slug => ({ slug, permission: 'push' }))
        };
        
        saveTeamGroups(newGroups);
        setNewTeamGroupName('');
        setCreateTeamGroupError('');
        setCreateTeamGroupModalOpen(false);
    };

    const handleAddSelectedToGroup = (groupName) => {
        const existing = currentOrgGroups[groupName] || [];
        const updated = Array.from(new Set([...existing, ...Array.from(selectedRepos)]));
        saveGroups({
            ...currentOrgGroups,
            [groupName]: updated
        });
    };

    const handleAddSelectedToTeamGroup = (groupName) => {
        const existing = currentOrgTeamGroups[groupName] || [];
        const existingSlugs = new Set(existing.map(m => m.slug));
        const newMembers = Array.from(selectedTeams)
            .filter(slug => !existingSlugs.has(slug))
            .map(slug => ({ slug, permission: 'push' }));
        
        saveTeamGroups({
            ...currentOrgTeamGroups,
            [groupName]: [...existing, ...newMembers]
        });
    };

    const handleRemoveSelectedFromGroup = (groupName) => {
        const existing = currentOrgGroups[groupName] || [];
        const updated = existing.filter(repoName => !selectedRepos.has(repoName));
        saveGroups({
            ...currentOrgGroups,
            [groupName]: updated
        });
    };

    const handleRemoveSelectedFromTeamGroup = (groupName) => {
        const existing = currentOrgTeamGroups[groupName] || [];
        const updated = existing.filter(member => !selectedTeams.has(member.slug));
        saveTeamGroups({
            ...currentOrgTeamGroups,
            [groupName]: updated
        });
    };

    const handleDeleteGroup = (groupName) => {
        const newGroups = { ...currentOrgGroups };
        delete newGroups[groupName];
        saveGroups(newGroups);
        if (repoFilters.group === groupName) {
            setRepoFilters(prev => ({ ...prev, group: null }));
        }
    };

    const handleDeleteTeamGroup = (groupName) => {
        const newGroups = { ...currentOrgTeamGroups };
        delete newGroups[groupName];
        saveTeamGroups(newGroups);
        if (teamFilters.group === groupName) {
            setTeamFilters(prev => ({ ...prev, group: null }));
        }
    };

    const handleFilterByGroup = (groupName) => {
        setRepoFilters(prev => ({ ...prev, group: groupName }));
    };

    const handleFilterByTeamGroup = (groupName) => {
        setTeamFilters(prev => ({ ...prev, group: groupName }));
    };

    const handleUpdateTeamPermissionInGroup = (groupName, teamSlug, newPermission) => {
        const existing = currentOrgTeamGroups[groupName] || [];
        const updated = existing.map(member => 
            member.slug === teamSlug ? { ...member, permission: newPermission } : member
        );
        saveTeamGroups({
            ...currentOrgTeamGroups,
            [groupName]: updated
        });
    };

    const handleRemoveTeamFromGroup = (groupName, teamSlug) => {
        const existing = currentOrgTeamGroups[groupName] || [];
        const updated = existing.filter(member => member.slug !== teamSlug);
        saveTeamGroups({
            ...currentOrgTeamGroups,
            [groupName]: updated
        });
    };

    const handleViewDetails = async (repo) => {
        setLoadingDetails(true);
        setSelectedRepoDetails(null);
        setDetailsModalOpen(true);
        try {
            const owner = repo.full_name.split('/')[0];
            const name = repo.name;
            const details = await GetRepoDetails(owner, name);
            setSelectedRepoDetails(details);
        } catch (error) {
            console.error("Error fetching repo details:", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleContextMenu = (e, groupName, isTeamGroup = false) => {
        e.preventDefault();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setContextMenuGroup(groupName);
        setContextMenuIsTeamGroup(isTeamGroup);
        setContextMenuOpened(true);
    };

    if (repoList === undefined && !repoError) {
        return (
            <Flex direction="column" h="100%" style={{ minHeight: 0 }}>
                <Group justify="space-between" mb="md">
                    <Title order={2}>Organization Management: {selectedOrg}</Title>
                    <ActionIcon variant="light" disabled size="lg">
                        <IconLayoutSidebarRightCollapse size={20} />
                    </ActionIcon>
                </Group>
                
                <Flex direction="row" flex={1} gap="md" style={{ minHeight: 0 }}>
                    <Box flex={1} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <Tabs value={activeTab} onChange={setActiveTab} flex={1} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <Tabs.List mb="md">
                                <Tabs.Tab value="repos" leftSection={<IconList size={14} />}>
                                    Repositories (...)
                                </Tabs.Tab>
                                <Tabs.Tab value="teams" leftSection={<IconUsers size={14} />}>
                                    Teams (...)
                                </Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="repos" flex={1} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                <Center h="100%">
                                    <Stack align="center" gap="md">
                                        <Loader size="xl" variant="bars" />
                                        <Text c="dimmed">Loading repositories and teams for {selectedOrg}...</Text>
                                    </Stack>
                                </Center>
                            </Tabs.Panel>
                        </Tabs>
                    </Box>
                    {filtersOpen && (
                        <Box w="33%" maw={400} style={(theme) => ({
                            borderLeft: `1px solid ${computedColorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                            paddingLeft: theme.spacing.md,
                        })}>
                            <Stack gap="md">
                                <Group gap="xs">
                                    <IconFilter size={20} />
                                    <Title order={4}>Filters</Title>
                                </Group>
                                <Skeleton height={36} radius="md" />
                                <Divider label="Visibility" labelPosition="left" />
                                <Stack gap="xs">
                                    <Skeleton height={20} width="60%" radius="xs" />
                                    <Skeleton height={20} width="50%" radius="xs" />
                                    <Skeleton height={20} width="70%" radius="xs" />
                                    <Skeleton height={20} width="40%" radius="xs" />
                                    <Skeleton height={20} width="55%" radius="xs" />
                                </Stack>
                            </Stack>
                        </Box>
                    )}
                </Flex>
            </Flex>
        );
    }

    const filteredRepos = (repoList || []).filter(repo => {
        const search = repoFilters.search.toLowerCase();
        const matchesSearch = repo.name.toLowerCase().includes(search) || 
                             (repo.topics && repo.topics.some(t => t.toLowerCase().includes(search)));
        const matchesManageable = !repoFilters.onlyManageable || repo.can_manage;
        const matchesSelected = !repoFilters.onlySelected || selectedRepos.has(repo.full_name);
        const matchesGroup = !repoFilters.group || (currentOrgGroups[repoFilters.group] || []).includes(repo.full_name);
        
        let matchesVisibility = false;
        if (repo.visibility === 'public') {
            if (repoFilters.public) matchesVisibility = true;
        } else if (repo.visibility === 'internal') {
            if (repoFilters.internal) matchesVisibility = true;
        } else {
            // treat as private if it's not public or internal
            if (repoFilters.private) matchesVisibility = true;
        }

        // Fallback for when visibility might not be populated yet
        if (repo.visibility === undefined || repo.visibility === "") {
            if (repo.public && repoFilters.public) matchesVisibility = true;
            if (!repo.public && repoFilters.private) matchesVisibility = true;
        }

        const matchesFork = !repo.is_fork || repoFilters.forks;
        const matchesArchived = !repo.archived || repoFilters.archived;

        return matchesSearch && matchesManageable && matchesSelected && matchesVisibility && matchesFork && matchesArchived && matchesGroup;
    });

    const filteredTeams = (teamList || []).filter(team => {
        const matchesSearch = team.name.toLowerCase().includes(teamFilters.search.toLowerCase()) || 
                             team.slug.toLowerCase().includes(teamFilters.search.toLowerCase());
        const matchesSelected = !teamFilters.onlySelected || selectedTeams.has(team.slug);
        const matchesGroup = !teamFilters.group || (currentOrgTeamGroups[teamFilters.group] || []).some(m => m.slug === team.slug);
        
        return matchesSearch && matchesSelected && matchesGroup;
    });

    const repoRows = filteredRepos.length > 0 ? filteredRepos.map((repo) => (
        <Table.Tr key={repo.full_name} bg={selectedRepos.has(repo.full_name) ? (computedColorScheme === 'dark' ? 'dark.8' : 'blue.0') : undefined}>
            <Table.Td>
                <Checkbox 
                    checked={selectedRepos.has(repo.full_name)} 
                    onChange={(e) => {
                        const isChecked = e.currentTarget.checked;
                        const isShift = e.nativeEvent.shiftKey;
                        
                        setSelectedRepos(prev => {
                            const newSelection = new Set(prev);
                            if (isShift && lastSelectedRepo) {
                                const lastIndex = filteredRepos.findIndex(r => r.full_name === lastSelectedRepo);
                                const currentIndex = filteredRepos.findIndex(r => r.full_name === repo.full_name);
                                
                                if (lastIndex !== -1 && currentIndex !== -1) {
                                    const start = Math.min(lastIndex, currentIndex);
                                    const end = Math.max(lastIndex, currentIndex);
                                    for (let i = start; i <= end; i++) {
                                        if (isChecked) {
                                            newSelection.add(filteredRepos[i].full_name);
                                        } else {
                                            newSelection.delete(filteredRepos[i].full_name);
                                        }
                                    }
                                    return newSelection;
                                }
                            }
                            
                            if (isChecked) {
                                newSelection.add(repo.full_name);
                            } else {
                                newSelection.delete(repo.full_name);
                            }
                            return newSelection;
                        });
                        setLastSelectedRepo(repo.full_name);
                    }}
                />
            </Table.Td>
            <Table.Td>
                <Stack gap={0}>
                    <Group gap="xs" wrap="nowrap">
                        <Text 
                            fw={700} 
                            size="sm" 
                            style={{ cursor: 'pointer' }} 
                            onClick={() => handleViewDetails(repo)}
                            c="blue"
                        >
                            {repo.name}
                        </Text>
                        <Tooltip label="Open on GitHub">
                            <ActionIcon 
                                component="a" 
                                href={repo.url} 
                                target="_blank" 
                                variant="subtle" 
                                size="sm" 
                                color="gray"
                            >
                                <IconExternalLink size={14} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                    <Text size="xs" c="dimmed" mb={repo.topics?.length ? 4 : 0}>{repo.full_name}</Text>
                    {repo.topics && repo.topics.length > 0 && (
                        <Group gap={4}>
                            {repo.topics.map(topic => (
                                <Badge key={topic} variant="light" color="cyan" size="xs" radius="xs" style={{textTransform: 'none', fontSize: '10px', height: '16px'}}>
                                    {topic}
                                </Badge>
                            ))}
                        </Group>
                    )}
                </Stack>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    {repo.visibility === 'public' || (repo.visibility === "" && repo.public) ? (
                        <Badge color="blue" variant="filled" size="xs">Public</Badge>
                    ) : repo.visibility === 'internal' ? (
                        <Badge color="teal" variant="filled" size="xs">Internal</Badge>
                    ) : (
                        <Badge color="dark" variant="filled" size="xs">Private</Badge>
                    )}
                    {repo.archived && <Badge color="red" variant="filled" size="xs">Archived</Badge>}
                    {repo.is_fork && <Badge color="orange" variant="filled" size="xs">Fork</Badge>}
                </Group>
            </Table.Td>
            <Table.Td>
                <Badge variant="outline" color="gray" size="xs" radius="sm">{repo.default_branch}</Badge>
            </Table.Td>
        </Table.Tr>
    )) : (
        <Table.Tr>
            <Table.Td colSpan={4}>
                <Text ta="center" c="dimmed" py="xl">
                    {(repoList || []).length === 0 ? 'No repositories found in this organization.' : 'No repositories matching your search.'}
                </Text>
            </Table.Td>
        </Table.Tr>
    );

    const teamRows = filteredTeams.length > 0 ? filteredTeams.map((team) => {
        const memberInGroup = teamFilters.group ? currentOrgTeamGroups[teamFilters.group]?.find(m => m.slug === team.slug) : null;
        
        return (
            <Table.Tr key={team.slug} bg={selectedTeams.has(team.slug) ? (computedColorScheme === 'dark' ? 'dark.8' : 'blue.0') : undefined}>
                <Table.Td>
                    <Checkbox 
                        checked={selectedTeams.has(team.slug)} 
                        onChange={(e) => {
                            const isChecked = e.currentTarget.checked;
                            const isShift = e.nativeEvent.shiftKey;
                            
                            setSelectedTeams(prev => {
                                const newSelection = new Set(prev);
                                if (isShift && lastSelectedTeam) {
                                    const lastIndex = filteredTeams.findIndex(t => t.slug === lastSelectedTeam);
                                    const currentIndex = filteredTeams.findIndex(t => t.slug === team.slug);
                                    
                                    if (lastIndex !== -1 && currentIndex !== -1) {
                                        const start = Math.min(lastIndex, currentIndex);
                                        const end = Math.max(lastIndex, currentIndex);
                                        for (let i = start; i <= end; i++) {
                                            if (isChecked) {
                                                newSelection.add(filteredTeams[i].slug);
                                            } else {
                                                newSelection.delete(filteredTeams[i].slug);
                                            }
                                        }
                                        return newSelection;
                                    }
                                }
                                
                                if (isChecked) {
                                    newSelection.add(team.slug);
                                } else {
                                    newSelection.delete(team.slug);
                                }
                                return newSelection;
                            });
                            setLastSelectedTeam(team.slug);
                        }}
                    />
                </Table.Td>
                <Table.Td>
                    <Anchor href={team.url} target="_blank" fw={700} size="sm">
                        {team.name}
                    </Anchor>
                </Table.Td>
                <Table.Td>
                    <Text size="xs" c="dimmed">{team.slug}</Text>
                </Table.Td>
                <Table.Td>
                    <Badge color="grape" variant="light" size="xs">{team.members_count || 0} members</Badge>
                </Table.Td>
                {teamFilters.group && (
                    <>
                        <Table.Td>
                            <Select 
                                size="xs"
                                data={[
                                    { value: 'pull', label: 'Read (pull)' },
                                    { value: 'push', label: 'Write (push)' },
                                    { value: 'maintain', label: 'Maintain' },
                                    { value: 'admin', label: 'Admin' },
                                ]}
                                value={memberInGroup?.permission}
                                onChange={(val) => handleUpdateTeamPermissionInGroup(teamFilters.group, team.slug, val)}
                                variant="filled"
                            />
                        </Table.Td>
                        <Table.Td>
                            <Tooltip label="Remove from group">
                                <ActionIcon 
                                    color="red" 
                                    variant="subtle" 
                                    onClick={() => handleRemoveTeamFromGroup(teamFilters.group, team.slug)}
                                >
                                    <IconTrash size={14} />
                                </ActionIcon>
                            </Tooltip>
                        </Table.Td>
                    </>
                )}
            </Table.Tr>
        );
    }) : (
        <Table.Tr>
            <Table.Td colSpan={teamFilters.group ? 6 : 4}>
                <Text ta="center" c="dimmed" py="xl">
                    {(teamList || []).length === 0 ? 'No teams found in this organization.' : 'No teams matching your search.'}
                </Text>
            </Table.Td>
        </Table.Tr>
    );

    return (
        <Flex direction="column" h="100%" style={{ minHeight: 0 }}>
            <Group justify="space-between" mb="md">
                <Title order={2}>Organization Management: {selectedOrg}</Title>
                <Group>
                    {activeTab === 'repos' && selectedRepos.size > 1 && (
                        <Button 
                            variant="filled" 
                            color="blue" 
                            size="sm"
                            leftSection={<IconSettings size={16} />}
                            onClick={() => setBulkModalOpen(true)}
                        >
                            Bulk Edit ({selectedRepos.size})
                        </Button>
                    )}
                    <Tooltip label={filtersOpen ? "Hide Filters" : "Show Filters"}>
                        <ActionIcon 
                            variant="light" 
                            onClick={() => setFiltersOpen(!filtersOpen)}
                            size="lg"
                        >
                            {filtersOpen ? <IconLayoutSidebarRightCollapse size={20} /> : <IconLayoutSidebarRightExpand size={20} />}
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
            
            <Flex direction="row" flex={1} gap="md" style={{ minHeight: 0 }}>
                <Box flex={1} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <Tabs value={activeTab} onChange={setActiveTab} flex={1} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <Tabs.List mb="md">
                            <Tabs.Tab value="repos" leftSection={<IconList size={14} />}>
                                Repositories ({filteredRepos.length === (repoList || []).length ? filteredRepos.length : `${filteredRepos.length}/${(repoList || []).length}`})
                            </Tabs.Tab>
                            {supportsTeams && (
                                <Tabs.Tab value="teams" leftSection={<IconUsers size={14} />}>
                                    Teams ({filteredTeams.length === (teamList || []).length ? filteredTeams.length : `${filteredTeams.length}/${(teamList || []).length}`})
                                </Tabs.Tab>
                            )}
                        </Tabs.List>

                        <Tabs.Panel value="repos" flex={1} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            {repoError && (
                                <Alert icon={<IconAlertCircle size={16} />} title="Error fetching repositories" color="red" mb="md" variant="light">
                                    {repoError}
                                </Alert>
                            )}
                            {repoFilters.group && (
                                <Alert icon={<IconFilter size={16} />} color="blue" mb="md" variant="light" withCloseButton onClose={() => setRepoFilters(prev => ({ ...prev, group: null }))}>
                                    Showing repositories in group: <b>{repoFilters.group}</b>
                                </Alert>
                            )}
                            <ScrollArea flex={1} style={{ minHeight: 0 }}>
                                <Table highlightOnHover verticalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th style={{ width: 40 }}>
                                                <Checkbox
                                                    checked={filteredRepos.length > 0 && filteredRepos.every(r => selectedRepos.has(r.full_name))}
                                                    indeterminate={filteredRepos.length > 0 && filteredRepos.some(r => selectedRepos.has(r.full_name)) && !filteredRepos.every(r => selectedRepos.has(r.full_name))}
                                                    onChange={(event) => {
                                                        const isChecked = event.currentTarget.checked;
                                                        setSelectedRepos(prev => {
                                                            const newSelection = new Set(prev);
                                                            filteredRepos.forEach(r => {
                                                                if (isChecked) {
                                                                    newSelection.add(r.full_name);
                                                                } else {
                                                                    newSelection.delete(r.full_name);
                                                                }
                                                            });
                                                            return newSelection;
                                                        });
                                                        setLastSelectedRepo(null);
                                                    }}
                                                />
                                            </Table.Th>
                                            <Table.Th>Name</Table.Th>
                                            <Table.Th>Visibility</Table.Th>
                                            <Table.Th>Branch</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>{repoRows}</Table.Tbody>
                                </Table>
                            </ScrollArea>
                        </Tabs.Panel>

                        <Tabs.Panel value="teams" flex={1} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            {teamError && (
                                <Alert icon={<IconAlertCircle size={16} />} title="Error fetching teams" color="red" mb="md" variant="light">
                                    {teamError}
                                </Alert>
                            )}
                            {teamFilters.group && (
                                <Alert 
                                    icon={<IconFilter size={16} />} 
                                    color="blue" 
                                    mb="md" 
                                    variant="light" 
                                    withCloseButton 
                                    onClose={() => setTeamFilters(prev => ({ ...prev, group: null }))}
                                >
                                    Showing teams in group: <b>{teamFilters.group}</b>
                                </Alert>
                            )}
                            <ScrollArea flex={1} style={{ minHeight: 0 }}>
                                <Table highlightOnHover verticalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th style={{ width: 40 }}>
                                                <Checkbox
                                                    checked={filteredTeams.length > 0 && filteredTeams.every(t => selectedTeams.has(t.slug))}
                                                    indeterminate={filteredTeams.length > 0 && filteredTeams.some(t => selectedTeams.has(t.slug)) && !filteredTeams.every(t => selectedTeams.has(t.slug))}
                                                    onChange={(event) => {
                                                        const isChecked = event.currentTarget.checked;
                                                        setSelectedTeams(prev => {
                                                            const newSelection = new Set(prev);
                                                            filteredTeams.forEach(t => {
                                                                if (isChecked) {
                                                                    newSelection.add(t.slug);
                                                                } else {
                                                                    newSelection.delete(t.slug);
                                                                }
                                                            });
                                                            return newSelection;
                                                        });
                                                        setLastSelectedTeam(null);
                                                    }}
                                                />
                                            </Table.Th>
                                            <Table.Th>Team Name</Table.Th>
                                            <Table.Th>Slug</Table.Th>
                                            <Table.Th>Members</Table.Th>
                                            {teamFilters.group && (
                                                <>
                                                    <Table.Th>Permission</Table.Th>
                                                    <Table.Th style={{ width: 50 }}>Actions</Table.Th>
                                                </>
                                            )}
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>{teamRows}</Table.Tbody>
                                </Table>
                            </ScrollArea>
                        </Tabs.Panel>
                    </Tabs>
                </Box>

                {filtersOpen && (
                    <Box w="33%" maw={400} style={(theme) => ({
                        borderLeft: `1px solid ${computedColorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                        paddingLeft: theme.spacing.md,
                    })}>
                        <Stack gap="md">
                            <Group gap="xs">
                                <IconFilter size={20} />
                                <Title order={4}>Filters</Title>
                            </Group>
                            
                            <TextInput
                                placeholder="Search..."
                                leftSection={<IconSearch size={16} />}
                                value={activeTab === 'repos' ? repoFilters.search : teamFilters.search}
                                onChange={(e) => {
                                    const val = e.currentTarget.value;
                                    if (activeTab === 'repos') {
                                        setRepoFilters(prev => ({ ...prev, search: val }));
                                    } else {
                                        setTeamFilters(prev => ({ ...prev, search: val }));
                                    }
                                }}
                            />

                            {activeTab === 'repos' && (
                                <>
                                    <Divider label="Visibility" labelPosition="left" />
                                    <Stack gap="xs">
                                        <Checkbox 
                                            label="Public" 
                                            checked={repoFilters.public} 
                                            onChange={(e) => setRepoFilters(prev => ({ ...prev, public: e.currentTarget.checked }))} 
                                        />
                                        <Checkbox 
                                            label="Private" 
                                            checked={repoFilters.private} 
                                            onChange={(e) => setRepoFilters(prev => ({ ...prev, private: e.currentTarget.checked }))} 
                                        />
                                        <Checkbox 
                                            label="Internal" 
                                            checked={repoFilters.internal} 
                                            onChange={(e) => setRepoFilters(prev => ({ ...prev, internal: e.currentTarget.checked }))} 
                                        />
                                        <Checkbox 
                                            label="Forks" 
                                            checked={repoFilters.forks} 
                                            onChange={(e) => setRepoFilters(prev => ({ ...prev, forks: e.currentTarget.checked }))} 
                                        />
                                        <Checkbox 
                                            label="Archived" 
                                            checked={repoFilters.archived} 
                                            onChange={(e) => setRepoFilters(prev => ({ ...prev, archived: e.currentTarget.checked }))} 
                                        />
                                    </Stack>

                                    <Divider label="Access" labelPosition="left" />
                                    <Stack gap="xs">
                                        <Switch
                                            label="Only show manageable"
                                            checked={repoFilters.onlyManageable}
                                            onChange={(e) => setRepoFilters(prev => ({ ...prev, onlyManageable: e.currentTarget.checked }))}
                                        />
                                        <Switch
                                            label="Only show selected"
                                            checked={repoFilters.onlySelected}
                                            onChange={(e) => setRepoFilters(prev => ({ ...prev, onlySelected: e.currentTarget.checked }))}
                                        />
                                    </Stack>

                                    <Divider label="Groups" labelPosition="left" />
                                    <Stack gap="xs">
                                        <Stack gap={0}>
                                            <Group justify="space-between" wrap="nowrap" align="center">
                                                <Text size="xs" c="dimmed">{selectedRepos.size} selected</Text>
                                                {selectedRepos.size > 0 && (
                                                    <Anchor size="xs" onClick={() => {
                                                        setSelectedRepos(new Set());
                                                        setLastSelectedRepo(null);
                                                    }}>{repoFilters.group ? 'Clear Selection' : 'Clear'}</Anchor>
                                                )}
                                            </Group>
                                            {repoFilters.group && (
                                                <Group justify="space-between" wrap="nowrap" align="center">
                                                    <Text size="xs" c="blue" fw={500} truncate="end" style={{ maxWidth: '150px' }}>
                                                        Filtering by: {repoFilters.group}
                                                    </Text>
                                                    <Anchor size="xs" onClick={() => setRepoFilters(prev => ({ ...prev, group: null }))}>Clear Group</Anchor>
                                                </Group>
                                            )}
                                        </Stack>
                                        
                                        {Object.keys(currentOrgGroups).length === 0 ? (
                                            <Text size="xs" c="dimmed" ta="center" py="xs">No groups created yet.</Text>
                                        ) : (
                                            Object.keys(currentOrgGroups).sort().map(groupName => (
                                                <Group key={groupName} justify="space-between" wrap="nowrap" gap="xs">
                                                    <Box 
                                                        style={{ cursor: 'pointer', flex: 1, overflow: 'hidden' }} 
                                                        onClick={() => handleFilterByGroup(groupName)}
                                                        onContextMenu={(e) => handleContextMenu(e, groupName)}
                                                    >
                                                        <Tooltip label="Click to filter by group, Right-click for options" position="left" openDelay={500}>
                                                            <Text 
                                                                size="sm" 
                                                                truncate="end" 
                                                                fw={repoFilters.group === groupName ? 700 : (selectedRepos.size > 0 && currentOrgGroups[groupName].every(r => selectedRepos.has(r)) && currentOrgGroups[groupName].length === selectedRepos.size ? 700 : 400)}
                                                                c={repoFilters.group === groupName ? 'blue' : undefined}
                                                            >
                                                                {groupName}
                                                            </Text>
                                                        </Tooltip>
                                                    </Box>
                                                    <Badge variant={repoFilters.group === groupName ? "filled" : "light"} size="xs" color={repoFilters.group === groupName ? "blue" : "gray"}>{currentOrgGroups[groupName].length}</Badge>
                                                </Group>
                                            ))
                                        )}
                                        <Button 
                                            variant="light" 
                                            size="xs" 
                                            leftSection={<IconPlus size={14} />}
                                            onClick={() => {
                                                setNewGroupName('');
                                                setCreateGroupError('');
                                                setCreateGroupModalOpen(true);
                                            }}
                                            disabled={selectedRepos.size === 0}
                                        >
                                            Create from selection
                                        </Button>
                                    </Stack>
                                </>
                            )}

                            {activeTab === 'teams' && (
                                <>
                                    <Divider label="Access" labelPosition="left" />
                                    <Stack gap="xs">
                                        <Switch
                                            label="Only show selected"
                                            checked={teamFilters.onlySelected}
                                            onChange={(e) => setTeamFilters(prev => ({ ...prev, onlySelected: e.currentTarget.checked }))}
                                        />
                                    </Stack>

                                    <Divider label="Groups" labelPosition="left" />
                                    <Stack gap="xs">
                                        <Stack gap={0}>
                                            <Group justify="space-between" wrap="nowrap" align="center">
                                                <Text size="xs" c="dimmed">{selectedTeams.size} selected</Text>
                                                {selectedTeams.size > 0 && (
                                                    <Anchor size="xs" onClick={() => {
                                                        setSelectedTeams(new Set());
                                                        setLastSelectedTeam(null);
                                                    }}>{teamFilters.group ? 'Clear Selection' : 'Clear'}</Anchor>
                                                )}
                                            </Group>
                                            {teamFilters.group && (
                                                <Group justify="space-between" wrap="nowrap" align="center">
                                                    <Text size="xs" c="blue" fw={500} truncate="end" style={{ maxWidth: '150px' }}>
                                                        Filtering by: {teamFilters.group}
                                                    </Text>
                                                    <Anchor size="xs" onClick={() => setTeamFilters(prev => ({ ...prev, group: null }))}>Clear Group</Anchor>
                                                </Group>
                                            )}
                                        </Stack>
                                        
                                        {Object.keys(currentOrgTeamGroups).length === 0 ? (
                                            <Text size="xs" c="dimmed" ta="center" py="xs">No groups created yet.</Text>
                                        ) : (
                                            Object.keys(currentOrgTeamGroups).sort().map(groupName => (
                                                <Group key={groupName} justify="space-between" wrap="nowrap" gap="xs">
                                                    <Box 
                                                        style={{ cursor: 'pointer', flex: 1, overflow: 'hidden' }} 
                                                        onClick={() => handleFilterByTeamGroup(groupName)}
                                                        onContextMenu={(e) => handleContextMenu(e, groupName, true)}
                                                    >
                                                        <Tooltip label="Click to filter by group, Right-click for options" position="left" openDelay={500}>
                                                            <Text 
                                                                size="sm" 
                                                                truncate="end" 
                                                                fw={teamFilters.group === groupName ? 700 : (selectedTeams.size > 0 && currentOrgTeamGroups[groupName].every(m => selectedTeams.has(m.slug)) && currentOrgTeamGroups[groupName].length === selectedTeams.size ? 700 : 400)}
                                                                c={teamFilters.group === groupName ? 'blue' : undefined}
                                                            >
                                                                {groupName}
                                                            </Text>
                                                        </Tooltip>
                                                    </Box>
                                                    <Badge 
                                                        variant={teamFilters.group === groupName ? "filled" : "light"} 
                                                        size="xs" 
                                                        color={teamFilters.group === groupName ? "blue" : "gray"}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => {
                                                            setSelectedTeamGroupName(groupName);
                                                            setManageTeamGroupModalOpen(true);
                                                        }}
                                                    >
                                                        {currentOrgTeamGroups[groupName].length}
                                                    </Badge>
                                                </Group>
                                            ))
                                        )}
                                        <Button 
                                            variant="light" 
                                            size="xs" 
                                            leftSection={<IconPlus size={14} />}
                                            onClick={() => {
                                                setNewTeamGroupName('');
                                                setCreateTeamGroupError('');
                                                setCreateTeamGroupModalOpen(true);
                                            }}
                                            disabled={selectedTeams.size === 0}
                                        >
                                            Create from selection
                                        </Button>
                                    </Stack>
                                </>
                            )}
                        </Stack>
                    </Box>
                )}
            </Flex>

            <Modal 
                opened={createGroupModalOpen} 
                onClose={() => setCreateGroupModalOpen(false)} 
                title="Create New Group"
                size="sm"
            >
                <Stack gap="md">
                    <Text size="sm">Create a group containing the {selectedRepos.size} selected repositories.</Text>
                    <TextInput
                        label="Group Name"
                        placeholder="Enter group name..."
                        value={newGroupName}
                        onChange={(e) => {
                            setNewGroupName(e.currentTarget.value);
                            setCreateGroupError('');
                        }}
                        error={createGroupError}
                        data-autofocus
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={() => setCreateGroupModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>Create Group</Button>
                    </Group>
                </Stack>
            </Modal>

            <Menu 
                opened={contextMenuOpened} 
                onChange={setContextMenuOpened}
                position="bottom-start"
                offset={0}
                onClose={() => setContextMenuOpened(false)}
            >
                <Menu.Target>
                    <div style={{ position: 'fixed', left: contextMenuPos.x, top: contextMenuPos.y }} />
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Label>{contextMenuIsTeamGroup ? 'Team Group' : 'Group'}: {contextMenuGroup}</Menu.Label>
                    <Menu.Item 
                        leftSection={<IconFolderPlus size={14} />} 
                        onClick={() => contextMenuIsTeamGroup ? handleAddSelectedToTeamGroup(contextMenuGroup) : handleAddSelectedToGroup(contextMenuGroup)}
                        disabled={contextMenuIsTeamGroup ? selectedTeams.size === 0 : selectedRepos.size === 0}
                    >
                        Add selected ({contextMenuIsTeamGroup ? selectedTeams.size : selectedRepos.size})
                    </Menu.Item>
                    <Menu.Item 
                        leftSection={<IconSquareX size={14} />} 
                        onClick={() => contextMenuIsTeamGroup ? handleRemoveSelectedFromTeamGroup(contextMenuGroup) : handleRemoveSelectedFromGroup(contextMenuGroup)}
                        disabled={contextMenuIsTeamGroup ? selectedTeams.size === 0 : selectedRepos.size === 0}
                    >
                        Remove selected ({contextMenuIsTeamGroup ? selectedTeams.size : selectedRepos.size})
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item 
                        color="red" 
                        leftSection={<IconTrash size={14} />} 
                        onClick={() => contextMenuIsTeamGroup ? handleDeleteTeamGroup(contextMenuGroup) : handleDeleteGroup(contextMenuGroup)}
                    >
                        Delete group
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
            <RepoDetailsModal 
                opened={detailsModalOpen} 
                onClose={() => setDetailsModalOpen(false)} 
                details={selectedRepoDetails} 
                loading={loadingDetails}
                org={selectedOrg}
                onRefresh={() => {
                    if (selectedRepoDetails) {
                        handleViewDetails({ 
                            full_name: selectedRepoDetails.full_name, 
                            name: selectedRepoDetails.name 
                        });
                    }
                }}
            />
            <BulkEditModal
                opened={bulkModalOpen}
                onClose={() => {
                    setBulkModalOpen(false);
                    // Refresh current org repo list to see changes
                    RefreshRepoList(selectedOrg);
                }}
                selectedRepoNames={Array.from(selectedRepos)}
                org={selectedOrg}
            />

            <Modal 
                opened={createTeamGroupModalOpen} 
                onClose={() => setCreateTeamGroupModalOpen(false)} 
                title="Create New Team Group"
                size="sm"
            >
                <Stack gap="md">
                    <Text size="sm">Create a group containing the {selectedTeams.size} selected teams.</Text>
                    <TextInput
                        label="Group Name"
                        placeholder="Enter group name..."
                        value={newTeamGroupName}
                        onChange={(e) => {
                            setNewTeamGroupName(e.currentTarget.value);
                            setCreateTeamGroupError('');
                        }}
                        error={createTeamGroupError}
                        data-autofocus
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={() => setCreateTeamGroupModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateTeamGroup} disabled={!newTeamGroupName.trim()}>Create Group</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={manageTeamGroupModalOpen}
                onClose={() => setManageTeamGroupModalOpen(false)}
                title={`Manage Team Group: ${selectedTeamGroupName}`}
                size="lg"
            >
                <Stack gap="md">
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Team</Table.Th>
                                <Table.Th>Permission</Table.Th>
                                <Table.Th style={{ width: 50 }}></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {(currentOrgTeamGroups[selectedTeamGroupName] || []).map(member => (
                                <Table.Tr key={member.slug}>
                                    <Table.Td>
                                        <Text size="sm" fw={500}>{member.slug}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Select 
                                            size="xs"
                                            data={[
                                                { value: 'pull', label: 'Read (pull)' },
                                                { value: 'push', label: 'Write (push)' },
                                                { value: 'maintain', label: 'Maintain' },
                                                { value: 'admin', label: 'Admin' },
                                            ]}
                                            value={member.permission}
                                            onChange={(val) => handleUpdateTeamPermissionInGroup(selectedTeamGroupName, member.slug, val)}
                                        />
                                    </Table.Td>
                                    <Table.Td>
                                        <ActionIcon 
                                            color="red" 
                                            variant="subtle" 
                                            onClick={() => {
                                                const updated = currentOrgTeamGroups[selectedTeamGroupName].filter(m => m.slug !== member.slug);
                                                saveTeamGroups({
                                                    ...currentOrgTeamGroups,
                                                    [selectedTeamGroupName]: updated
                                                });
                                            }}
                                        >
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                    <Group justify="flex-end">
                        <Button onClick={() => setManageTeamGroupModalOpen(false)}>Close</Button>
                    </Group>
                </Stack>
            </Modal>
        </Flex>
    );
};

export default Repositories;
