import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppState } from '../state/StateManager.jsx';
import {
    Modal,
    Tabs,
    Stack,
    Group,
    Text,
    Title,
    Badge,
    ActionIcon,
    Tooltip,
    ScrollArea,
    LoadingOverlay,
    Box,
    Divider,
    Button,
    TextInput,
    Textarea,
    Switch,
    SimpleGrid,
    Paper,
    List,
    ThemeIcon,
    Table,
    Select,
    MultiSelect,
} from '@mantine/core';
import {
    IconStar,
    IconGitBranch,
    IconGitPullRequest,
    IconEye,
    IconExternalLink,
    IconSettings,
    IconShieldLock,
    IconUsers,
    IconTag,
    IconList,
    IconCheck,
    IconX,
    IconPlus,
    IconTrash,
    IconDots,
} from '@tabler/icons-react';
import { 
    UpdateRepoTopics, 
    UpdateRepoTeam, 
    UpdateRepoCustomProperties, 
    DeleteBranchProtection, 
    DeleteRepoRuleset,
    GetOrgCustomPropertyDefinitions
} from '../../bindings/github.com/amnuts/github-admin/backend/services/githubservice.js';
import {SaveConfig, GetConfig} from "../../bindings/github.com/amnuts/github-admin/backend/services/appconfigservice.js";

const RepoDetailsModal = ({ opened, onClose, details, loading, onRefresh, org }) => {
    const dispatch = useAppDispatch();
    const { teamCache, teamGroups, repoGroups } = useAppState();
    const [activeTab, setActiveTab] = useState('info');
    const [isSaving, setIsSaving] = useState(false);
    const [orgCustomProperties, setOrgCustomProperties] = useState([]);

    const teamList = teamCache[org] || [];
    const supportsTeams = teamCache[org] !== null;
    const currentOrgTeamGroups = (teamGroups && teamGroups[org]) || {};
    const currentOrgRepoGroups = (repoGroups && repoGroups[org]) || {};

    // Topics state
    const [topics, setTopics] = useState([]);
    const [newTopic, setNewTopic] = useState('');

    // Add Team state
    const [selectedTeamSlug, setSelectedTeamSlug] = useState('');
    const [selectedPermission, setSelectedPermission] = useState('push');

    useEffect(() => {
        if (details) {
            setTopics(details.topics || []);
        }
        if (opened && org) {
            GetOrgCustomPropertyDefinitions(org).then(setOrgCustomProperties).catch(console.error);
        }
    }, [details, opened, org]);

    const handleAddTopic = async () => {
        if (!newTopic.trim()) return;
        setIsSaving(true);
        try {
            const owner = details.full_name.split('/')[0];
            const updatedTopics = await UpdateRepoTopics(owner, details.name, [newTopic.trim()], 'add');
            setNewTopic('');
            if (org) {
                dispatch({
                    type: 'UPDATE_REPO_FIELDS',
                    payload: {
                        org,
                        fullName: details.full_name,
                        fields: { topics: updatedTopics }
                    }
                });
            }
            onRefresh();
        } catch (error) {
            console.error("Error adding topic:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveTopic = async (topic) => {
        setIsSaving(true);
        try {
            const owner = details.full_name.split('/')[0];
            const updatedTopics = await UpdateRepoTopics(owner, details.name, [topic], 'remove');
            if (org) {
                dispatch({
                    type: 'UPDATE_REPO_FIELDS',
                    payload: {
                        org,
                        fullName: details.full_name,
                        fields: { topics: updatedTopics }
                    }
                });
            }
            onRefresh();
        } catch (error) {
            console.error("Error removing topic:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!details && !loading) return null;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <Title order={3}>{details?.name || 'Loading...'}</Title>
                    {details && (
                        <Badge variant="light" color={details.visibility === 'public' ? 'blue' : 'dark'}>
                            {details.visibility}
                        </Badge>
                    )}
                </Group>
            }
            size="100%"
            padding="xl"
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <Box pos="relative" mih={400}>
                <LoadingOverlay visible={loading || isSaving} />
                
                {details && (
                    <Tabs value={activeTab} onChange={setActiveTab}>
                        <Tabs.List mb="md">
                            <Tabs.Tab value="info" leftSection={<IconList size={14} />}>General Info</Tabs.Tab>
                            <Tabs.Tab value="topics" leftSection={<IconTag size={14} />}>Topics</Tabs.Tab>
                            {supportsTeams && <Tabs.Tab value="teams" leftSection={<IconUsers size={14} />}>Teams & Access</Tabs.Tab>}
                            <Tabs.Tab value="groups" leftSection={<IconTag size={14} />}>Repo Groups</Tabs.Tab>
                            <Tabs.Tab value="protection" leftSection={<IconShieldLock size={14} />}>Branch Protection</Tabs.Tab>
                            <Tabs.Tab value="rulesets" leftSection={<IconShieldLock size={14} />}>Rulesets</Tabs.Tab>
                            {supportsTeams && <Tabs.Tab value="properties" leftSection={<IconSettings size={14} />}>Custom Properties</Tabs.Tab>}
                        </Tabs.List>

                        <Tabs.Panel value="info">
                            <Stack gap="lg">
                                <Box>
                                    <Text size="sm" fw={500} c="dimmed">Description</Text>
                                    <Text>{details.description || 'No description provided.'}</Text>
                                </Box>

                                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
                                    <Paper withBorder p="md" radius="md">
                                        <Group justify="space-between">
                                            <Text size="xs" c="dimmed" fw={700} className="uppercase">Stars</Text>
                                            <IconStar size={14} color="orange" />
                                        </Group>
                                        <Text size="xl" fw={700}>{details.stars}</Text>
                                    </Paper>
                                    <Paper withBorder p="md" radius="md">
                                        <Group justify="space-between">
                                            <Text size="xs" c="dimmed" fw={700} className="uppercase">Watching</Text>
                                            <IconEye size={14} color="blue" />
                                        </Group>
                                        <Text size="xl" fw={700}>{details.watching}</Text>
                                    </Paper>
                                    <Paper withBorder p="md" radius="md">
                                        <Group justify="space-between">
                                            <Text size="xs" c="dimmed" fw={700} className="uppercase">Forks</Text>
                                            <IconGitBranch size={14} color="green" />
                                        </Group>
                                        <Text size="xl" fw={700}>{details.forks_count}</Text>
                                    </Paper>
                                    <Paper withBorder p="md" radius="md">
                                        <Group justify="space-between">
                                            <Text size="xs" c="dimmed" fw={700} className="uppercase">Open PRs</Text>
                                            <IconGitPullRequest size={14} color="purple" />
                                        </Group>
                                        <Text size="xl" fw={700}>{details.open_prs}</Text>
                                    </Paper>
                                </SimpleGrid>

                                <Group>
                                    <Badge variant="outline" color="gray" leftSection={<IconGitBranch size={12} />}>
                                        {details.branches_count} Branches
                                    </Badge>
                                    <Badge variant="outline" color="gray">
                                        Default Branch: {details.default_branch}
                                    </Badge>
                                    <Button 
                                        variant="light" 
                                        size="compact-xs" 
                                        component="a" 
                                        href={details.url} 
                                        target="_blank"
                                        leftSection={<IconExternalLink size={12} />}
                                    >
                                        Open in Browser
                                    </Button>
                                </Group>
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="topics">
                            <Stack gap="md">
                                <Text size="sm">Manage repository topics. Topics help others find and contribute to your projects.</Text>
                                <Group align="flex-end">
                                    <TextInput 
                                        label="Add Topic" 
                                        placeholder="Enter topic name..." 
                                        value={newTopic} 
                                        onChange={(e) => setNewTopic(e.currentTarget.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                                    />
                                    <Button onClick={handleAddTopic} disabled={!newTopic.trim()}>Add</Button>
                                </Group>
                                <Divider />
                                <Group gap="xs">
                                    {topics.map(topic => (
                                        <Badge 
                                            key={topic} 
                                            variant="filled" 
                                            color="cyan" 
                                            rightSection={
                                                <ActionIcon size="xs" color="white" variant="transparent" onClick={() => handleRemoveTopic(topic)}>
                                                    <IconX size={10} />
                                                </ActionIcon>
                                            }
                                        >
                                            {topic}
                                        </Badge>
                                    ))}
                                    {topics.length === 0 && <Text size="sm" c="dimmed">No topics found.</Text>}
                                </Group>
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="teams">
                            <Stack gap="md">
                                <Group align="flex-end" grow>
                                    <Select 
                                        label="Add Individual Team" 
                                        placeholder="Select a team..." 
                                        data={teamList.map(t => ({ value: t.slug, label: t.name }))}
                                        value={selectedTeamSlug}
                                        onChange={setSelectedTeamSlug}
                                        searchable
                                    />
                                    <Select 
                                        label="Permission" 
                                        data={[
                                            { value: 'pull', label: 'Read (pull)' },
                                            { value: 'push', label: 'Write (push)' },
                                            { value: 'maintain', label: 'Maintain' },
                                            { value: 'admin', label: 'Admin' },
                                        ]}
                                        value={selectedPermission}
                                        onChange={setSelectedPermission}
                                    />
                                    <Button 
                                        onClick={async () => {
                                            if (!selectedTeamSlug) return;
                                            setIsSaving(true);
                                            try {
                                                const [owner, name] = details.full_name.split('/');
                                                await UpdateRepoTeam(owner, name, org, selectedTeamSlug, selectedPermission, false);
                                                setSelectedTeamSlug('');
                                                onRefresh();
                                            } catch (error) {
                                                console.error(error);
                                            } finally {
                                                setIsSaving(false);
                                            }
                                        }} 
                                        disabled={!selectedTeamSlug}
                                        leftSection={<IconPlus size={14} />}
                                    >
                                        Add Team
                                    </Button>
                                </Group>

                                {Object.keys(currentOrgTeamGroups).length > 0 && (
                                    <>
                                        <Divider label="Or apply a Team Group" labelPosition="center" />
                                        <Group align="flex-end">
                                            <Select 
                                                label="Add Team Group"
                                                placeholder="Select a group..."
                                                data={Object.keys(currentOrgTeamGroups).sort()}
                                                style={{ flex: 1 }}
                                                searchable
                                                onChange={async (val) => {
                                                    if (!val) return;
                                                    setIsSaving(true);
                                                    try {
                                                        const [owner, name] = details.full_name.split('/');
                                                        const members = currentOrgTeamGroups[val] || [];
                                                        for (const member of members) {
                                                            await UpdateRepoTeam(owner, name, org, member.slug, member.permission, false);
                                                        }
                                                        onRefresh();
                                                    } catch (error) {
                                                        console.error(error);
                                                    } finally {
                                                        setIsSaving(false);
                                                    }
                                                }}
                                            />
                                        </Group>
                                    </>
                                )}

                                <Divider />
                                <Table verticalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Team</Table.Th>
                                            <Table.Th>Permission</Table.Th>
                                            <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {details.teams?.map(team => (
                                            <Table.Tr key={team.slug}>
                                                <Table.Td>
                                                    <Text fw={500}>{team.name}</Text>
                                                    <Text size="xs" c="dimmed">{team.slug}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge variant="light">{team.permission}</Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Tooltip label="Remove access">
                                                        <ActionIcon color="red" variant="subtle" onClick={async () => {
                                                            if (!window.confirm(`Are you sure you want to remove access for team "${team.name}"?`)) return;
                                                            setIsSaving(true);
                                                            try {
                                                                const [owner, name] = details.full_name.split('/');
                                                                await UpdateRepoTeam(owner, name, org, team.slug, '', true);
                                                                onRefresh();
                                                            } catch (error) {
                                                                console.error(error);
                                                            } finally {
                                                                setIsSaving(false);
                                                            }
                                                        }}>
                                                            <IconTrash size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {!details.teams?.length && (
                                            <Table.Tr>
                                                <Table.Td colSpan={3}>
                                                    <Text ta="center" c="dimmed" py="md">No teams have access to this repository.</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="groups">
                            <Stack gap="md">
                                <Text size="sm">Manage which custom groups this repository belongs to.</Text>
                                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} gap="sm">
                                    {Object.keys(currentOrgRepoGroups).sort().map(groupName => {
                                        const isMember = currentOrgRepoGroups[groupName].includes(details.full_name);
                                        return (
                                            <Paper key={groupName} withBorder p="sm" radius="md">
                                                <Group justify="space-between" wrap="nowrap">
                                                    <Text size="sm" fw={500} truncate="end">{groupName}</Text>
                                                    <Switch 
                                                        checked={isMember}
                                                        onChange={async (e) => {
                                                            const checked = e.currentTarget.checked;
                                                            setIsSaving(true);
                                                            try {
                                                                const existing = currentOrgRepoGroups[groupName] || [];
                                                                let updated;
                                                                if (!checked) {
                                                                    updated = existing.filter(fullName => fullName !== details.full_name);
                                                                } else {
                                                                    updated = Array.from(new Set([...existing, details.full_name]));
                                                                }
                                                                
                                                                const newGroups = {
                                                                    ...currentOrgRepoGroups,
                                                                    [groupName]: updated
                                                                };
                                                                
                                                                dispatch({ type: 'UPDATE_REPO_GROUPS', payload: { ...repoGroups, [org]: newGroups } });
                                                                const cfg = await GetConfig();
                                                                cfg.repo_groups = { ...repoGroups, [org]: newGroups };
                                                                await SaveConfig(cfg);
                                                                onRefresh();
                                                            } catch (error) {
                                                                console.error(error);
                                                            } finally {
                                                                setIsSaving(false);
                                                            }
                                                        }}
                                                    />
                                                </Group>
                                            </Paper>
                                        );
                                    })}
                                </SimpleGrid>
                                {Object.keys(currentOrgRepoGroups).length === 0 && (
                                    <Text ta="center" c="dimmed" py="xl">No repo groups have been created yet.</Text>
                                )}
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="protection">
                            <Stack gap="md">
                                {details.protection?.map(prot => (
                                    <Paper key={prot.branch_name} withBorder p="md" radius="md">
                                        <Group justify="space-between" mb="xs">
                                            <Group gap="xs">
                                                <IconGitBranch size={16} />
                                                <Text fw={700}>{prot.branch_name}</Text>
                                            </Group>
                                            <Group gap="xs">
                                                <Badge color="green">Protected</Badge>
                                                <Tooltip label="Remove protection">
                                                    <ActionIcon color="red" variant="subtle" size="xs" onClick={async () => {
                                                        if (!window.confirm(`Are you sure you want to remove branch protection from ${prot.branch_name}?`)) return;
                                                        setIsSaving(true);
                                                        try {
                                                            const [owner, name] = details.full_name.split('/');
                                                            await DeleteBranchProtection(owner, name, prot.branch_name);
                                                            onRefresh();
                                                        } catch (error) {
                                                            console.error(error);
                                                        } finally {
                                                            setIsSaving(false);
                                                        }
                                                    }}>
                                                        <IconTrash size={12} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Group>
                                        <List size="sm" spacing="xs" icon={
                                            <ThemeIcon color="teal" size={20} radius="xl">
                                                <IconCheck size={12} />
                                            </ThemeIcon>
                                        }>
                                            {prot.protection.required_pull_request_reviews && (
                                                <List.Item>
                                                    Requires Pull Request Reviews 
                                                    (Approvals: {prot.protection.required_pull_request_reviews.required_approving_review_count})
                                                </List.Item>
                                            )}
                                            {prot.protection.enforce_admins?.enabled && (
                                                <List.Item>Enforce admins</List.Item>
                                            )}
                                            {prot.protection.required_status_checks && (
                                                <List.Item>Requires status checks to pass before merging</List.Item>
                                            )}
                                            {prot.protection.restrictions && (
                                                <List.Item>Restricted pushes</List.Item>
                                            )}
                                        </List>
                                    </Paper>
                                ))}
                                {!details.protection?.length && (
                                    <Text ta="center" c="dimmed" py="xl">No branches are protected.</Text>
                                )}
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="rulesets">
                            <Stack gap="md">
                                {details.rulesets?.map(rs => (
                                    <Paper key={rs.id} withBorder p="md" radius="md">
                                        <Group justify="space-between" mb="xs">
                                            <Group gap="xs">
                                                <IconShieldLock size={16} />
                                                <Text fw={700}>{rs.name}</Text>
                                                <Badge size="xs" variant="outline">{rs.enforcement}</Badge>
                                            </Group>
                                            <Group gap="xs">
                                                <Text size="xs" c="dimmed">ID: {rs.id}</Text>
                                                <Tooltip label="Delete ruleset">
                                                    <ActionIcon color="red" variant="subtle" size="xs" onClick={async () => {
                                                        if (!window.confirm(`Are you sure you want to delete ruleset "${rs.name}"?`)) return;
                                                        setIsSaving(true);
                                                        try {
                                                            const [owner, name] = details.full_name.split('/');
                                                            await DeleteRepoRuleset(owner, name, rs.id);
                                                            onRefresh();
                                                        } catch (error) {
                                                            console.error(error);
                                                        } finally {
                                                            setIsSaving(false);
                                                        }
                                                    }}>
                                                        <IconTrash size={12} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Group>
                                        <Text size="sm" mb="xs">Target: {rs.target} ({rs.conditions?.ref_name?.include?.join(', ') || 'all'})</Text>
                                        {rs.rules && rs.rules.length > 0 && (
                                            <Box>
                                                <Text size="xs" fw={700} c="dimmed" mb={5}>Rules:</Text>
                                                <Group gap={4}>
                                                    {rs.rules.map((rule, idx) => (
                                                        <Badge key={idx} variant="light" size="xs">{rule.type}</Badge>
                                                    ))}
                                                </Group>
                                            </Box>
                                        )}
                                    </Paper>
                                ))}
                                {!details.rulesets?.length && (
                                    <Text ta="center" c="dimmed" py="xl">No rulesets found.</Text>
                                )}
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="properties">
                            <Stack gap="md">
                                <Table verticalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Property</Table.Th>
                                            <Table.Th>Value</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {orgCustomProperties?.map(propDef => {
                                            const propValue = details.custom_properties?.find(p => p.property_name === propDef.property_name)?.value;
                                            
                                            const handleUpdate = async (newValue) => {
                                                if (newValue === propValue) return;
                                                setIsSaving(true);
                                                try {
                                                    await UpdateRepoCustomProperties(org, details.name, { [propDef.property_name]: newValue });
                                                    onRefresh();
                                                } catch (error) {
                                                    console.error(error);
                                                } finally {
                                                    setIsSaving(false);
                                                }
                                            };

                                            let input = null;
                                            if (propDef.value_type === 'single_select') {
                                                input = (
                                                    <Select
                                                        size="xs"
                                                        data={propDef.allowed_values || []}
                                                        value={propValue || ''}
                                                        onChange={handleUpdate}
                                                        clearable={!propDef.required}
                                                    />
                                                );
                                            } else if (propDef.value_type === 'multi_select') {
                                                input = (
                                                    <MultiSelect
                                                        size="xs"
                                                        data={propDef.allowed_values || []}
                                                        value={propValue || []}
                                                        onChange={handleUpdate}
                                                        clearable
                                                    />
                                                );
                                            } else if (propDef.value_type === 'true_false') {
                                                input = (
                                                    <Switch
                                                        checked={propValue === 'true' || propValue === true}
                                                        onChange={(e) => handleUpdate(e.currentTarget.checked)}
                                                    />
                                                );
                                            } else {
                                                input = (
                                                    <TextInput 
                                                        size="xs" 
                                                        defaultValue={propValue || ''} 
                                                        onBlur={(e) => handleUpdate(e.currentTarget.value)}
                                                    />
                                                );
                                            }

                                            return (
                                                <Table.Tr key={propDef.property_name}>
                                                    <Table.Td>
                                                        <Box>
                                                            <Text size="sm" fw={500}>{propDef.property_name}</Text>
                                                            {propDef.description && <Text size="xs" c="dimmed">{propDef.description}</Text>}
                                                        </Box>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {input}
                                                    </Table.Td>
                                                </Table.Tr>
                                            );
                                        })}
                                        {(!orgCustomProperties || orgCustomProperties.length === 0) && (
                                            <Table.Tr>
                                                <Table.Td colSpan={2}>
                                                    <Text ta="center" c="dimmed" py="md">No custom properties have been set by the organisation owner.</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Stack>
                        </Tabs.Panel>
                    </Tabs>
                )}
            </Box>
        </Modal>
    );
};

export default RepoDetailsModal;
