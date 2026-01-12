import React, { useState } from 'react';
import { useAppState } from '../state/StateManager.jsx';
import {
    Modal,
    Tabs,
    Stack,
    Group,
    Text,
    Title,
    Badge,
    Button,
    TextInput,
    Divider,
    Box,
    LoadingOverlay,
    Alert,
    Select,
    MultiSelect,
    Switch,
} from '@mantine/core';
import {
    IconTag,
    IconUsers,
    IconSettings,
    IconAlertCircle,
    IconShieldLock,
} from '@tabler/icons-react';
import {
    BulkUpdateRepoTopics,
    BulkUpdateRepoTeam,
    BulkUpdateRepoCustomProperties,
    GetOrgCustomPropertyDefinitions,
} from '../../bindings/github.com/amnuts/github-admin/backend/services/githubservice.js';

const BulkEditModal = ({ opened, onClose, selectedRepoNames, org }) => {
    const { teamCache, teamGroups } = useAppState();
    const [activeTab, setActiveTab] = useState('topics');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [orgCustomProperties, setOrgCustomProperties] = useState([]);

    const teamList = teamCache[org] || [];
    const supportsTeams = teamCache[org] !== null;
    const currentOrgTeamGroups = (teamGroups && teamGroups[org]) || {};

    // Topics state
    const [topics, setTopics] = useState('');
    const [topicsMode, setTopicsMode] = useState('add');

    // Teams state
    const [teamSlug, setTeamSlug] = useState('');
    const [permission, setPermission] = useState('push');

    // Team Groups state
    const [selectedTeamGroup, setSelectedTeamGroup] = useState('');

    // Custom Properties state
    const [selectedPropName, setSelectedPropName] = useState('');
    const [propValue, setPropValue] = useState(null);

    React.useEffect(() => {
        if (opened && org) {
            GetOrgCustomPropertyDefinitions(org).then(setOrgCustomProperties).catch(console.error);
        }
    }, [opened, org]);

    const handleBulkTopics = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const topicList = topics.split(',').map(t => t.trim()).filter(t => t !== '');
            await BulkUpdateRepoTopics(selectedRepoNames, topicList, topicsMode);
            onClose();
        } catch (err) {
            setError(err.toString());
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkTeam = async (remove = false) => {
        setIsSaving(true);
        setError(null);
        try {
            await BulkUpdateRepoTeam(selectedRepoNames, org, teamSlug, permission, remove);
            onClose();
        } catch (err) {
            setError(err.toString());
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkTeamGroup = async (remove = false) => {
        if (!selectedTeamGroup) return;
        setIsSaving(true);
        setError(null);
        try {
            const groupMembers = currentOrgTeamGroups[selectedTeamGroup] || [];
            for (const member of groupMembers) {
                await BulkUpdateRepoTeam(selectedRepoNames, org, member.slug, member.permission, remove);
            }
            onClose();
        } catch (err) {
            setError(err.toString());
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkProperties = async () => {
        if (!selectedPropName) return;
        setIsSaving(true);
        setError(null);
        try {
            await BulkUpdateRepoCustomProperties(org, selectedRepoNames, { [selectedPropName]: propValue });
            onClose();
        } catch (err) {
            setError(err.toString());
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Title order={3}>Bulk Edit {selectedRepoNames.length} Repositories</Title>}
            size="lg"
        >
            <Box pos="relative">
                <LoadingOverlay visible={isSaving} />
                
                {error && (
                    <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="md">
                        {error}
                    </Alert>
                )}

                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List mb="md">
                        <Tabs.Tab value="topics" leftSection={<IconTag size={14} />}>Topics</Tabs.Tab>
                        {supportsTeams && <Tabs.Tab value="teams" leftSection={<IconUsers size={14} />}>Teams</Tabs.Tab>}
                        {supportsTeams && <Tabs.Tab value="team-groups" leftSection={<IconUsers size={14} />}>Team Groups</Tabs.Tab>}
                        {supportsTeams && <Tabs.Tab value="properties" leftSection={<IconSettings size={14} />}>Custom Properties</Tabs.Tab>}
                    </Tabs.List>

                    <Tabs.Panel value="topics">
                        <Stack gap="md">
                            <Text size="sm">Apply topics to all selected repositories. Separate topics with commas.</Text>
                            <TextInput 
                                label="Topics" 
                                placeholder="topic1, topic2, topic3" 
                                value={topics} 
                                onChange={(e) => setTopics(e.currentTarget.value)}
                            />
                            <Group>
                                <Button variant={topicsMode === 'add' ? 'filled' : 'light'} onClick={() => setTopicsMode('add')}>Add</Button>
                                <Button variant={topicsMode === 'remove' ? 'filled' : 'light'} onClick={() => setTopicsMode('remove')}>Remove</Button>
                                <Button variant={topicsMode === 'replace' ? 'filled' : 'light'} color="red" onClick={() => setTopicsMode('replace')}>Replace All</Button>
                            </Group>
                            <Divider mt="md" />
                            <Button onClick={handleBulkTopics} disabled={!topics.trim()}>Apply to {selectedRepoNames.length} Repos</Button>
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="teams">
                        <Stack gap="md">
                            <Text size="sm">Manage team access for all selected repositories.</Text>
                            <Select 
                                label="Team" 
                                placeholder="Select a team..." 
                                data={teamList.map(t => ({ value: t.slug, label: t.name }))}
                                value={teamSlug}
                                onChange={setTeamSlug}
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
                                value={permission}
                                onChange={setPermission}
                            />
                            <Group grow>
                                <Button onClick={() => handleBulkTeam(false)} disabled={!teamSlug.trim()}>Add/Update Team</Button>
                                <Button color="red" variant="light" onClick={() => handleBulkTeam(true)} disabled={!teamSlug.trim()}>Remove Team</Button>
                            </Group>
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="team-groups">
                        <Stack gap="md">
                            <Text size="sm">Apply a team group to all selected repositories. All teams in the group will be added with their predefined permission levels.</Text>
                            <Select 
                                label="Team Group" 
                                placeholder="Select a team group..." 
                                data={Object.keys(currentOrgTeamGroups).sort().map(g => ({ value: g, label: g }))}
                                value={selectedTeamGroup}
                                onChange={setSelectedTeamGroup}
                                searchable
                            />
                            {selectedTeamGroup && currentOrgTeamGroups[selectedTeamGroup] && (
                                <Box>
                                    <Text size="xs" fw={700} mb={5}>Teams in group:</Text>
                                    <Group gap={4}>
                                        {currentOrgTeamGroups[selectedTeamGroup].map(m => (
                                            <Badge key={m.slug} variant="light" size="xs">
                                                {m.slug} ({m.permission})
                                            </Badge>
                                        ))}
                                    </Group>
                                </Box>
                            )}
                            <Group grow>
                                <Button onClick={() => handleBulkTeamGroup(false)} disabled={!selectedTeamGroup}>Apply Team Group</Button>
                                <Button color="red" variant="light" onClick={() => handleBulkTeamGroup(true)} disabled={!selectedTeamGroup}>Remove Team Group</Button>
                            </Group>
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="properties">
                        <Stack gap="md">
                            {(!orgCustomProperties || orgCustomProperties.length === 0) ? (
                                <Text ta="center" c="dimmed" py="md">No custom properties have been set by the organisation owner.</Text>
                            ) : (
                                <>
                                    <Text size="sm">Set custom property values for all {selectedRepoNames.length} selected repositories.</Text>
                                    <Select
                                        label="Property"
                                        placeholder="Select a property to update..."
                                        data={orgCustomProperties.map(p => ({ value: p.property_name, label: p.property_name }))}
                                        value={selectedPropName}
                                        onChange={(val) => {
                                            setSelectedPropName(val);
                                            setPropValue(null); // Reset value when property changes
                                        }}
                                        searchable
                                    />
                                    {selectedPropName && (() => {
                                        const propDef = orgCustomProperties.find(p => p.property_name === selectedPropName);
                                        if (!propDef) return null;

                                        if (propDef.value_type === 'single_select') {
                                            return (
                                                <Select
                                                    label="Value"
                                                    data={propDef.allowed_values || []}
                                                    value={propValue || ''}
                                                    onChange={setPropValue}
                                                    clearable={!propDef.required}
                                                />
                                            );
                                        } else if (propDef.value_type === 'multi_select') {
                                            return (
                                                <MultiSelect
                                                    label="Value"
                                                    data={propDef.allowed_values || []}
                                                    value={propValue || []}
                                                    onChange={setPropValue}
                                                    clearable
                                                />
                                            );
                                        } else if (propDef.value_type === 'true_false') {
                                            return (
                                                <Switch
                                                    label="Value"
                                                    checked={propValue === 'true' || propValue === true}
                                                    onChange={(e) => setPropValue(e.currentTarget.checked)}
                                                />
                                            );
                                        } else {
                                            return (
                                                <TextInput
                                                    label="Value"
                                                    placeholder="Enter value..."
                                                    value={propValue || ''}
                                                    onChange={(e) => setPropValue(e.currentTarget.value)}
                                                />
                                            );
                                        }
                                    })()}
                                    <Button onClick={handleBulkProperties} disabled={!selectedPropName || propValue === null}>
                                        Apply to {selectedRepoNames.length} Repos
                                    </Button>
                                </>
                            )}
                        </Stack>
                    </Tabs.Panel>
                </Tabs>
            </Box>
        </Modal>
    );
};

export default BulkEditModal;
