import {useEffect, useState} from 'react';
import {Box, SegmentedControl, Title, Text, Stack, useMantineColorScheme, Switch, Select, ScrollArea} from '@mantine/core';
import {GetConfig, SaveConfig} from "../../bindings/github.com/amnuts/github-admin/backend/services/appconfigservice.js";
import {Startup, SetDefaultOrganization} from "../../bindings/github.com/amnuts/github-admin/backend/services/githubservice.js";
import {Events} from "@wailsio/runtime";

const Settings = () => {
    const { setColorScheme } = useMantineColorScheme();
    const [config, setConfig] = useState(null);
    const [organizations, setOrganizations] = useState([]);

    useEffect(() => {
        GetConfig().then(cfg => {
            setConfig(cfg);
            if (cfg && cfg.theme) {
                setColorScheme(cfg.theme === 'system' ? 'auto' : cfg.theme);
            }
        });
        Startup().then(status => {
            if (status && status.organizations) {
                setOrganizations(status.organizations);
            }
        });
    }, []);

    const handleThemeChange = (value) => {
        // @ts-ignore
        setColorScheme(value === 'system' ? 'auto' : value);
        if (config) {
            const newConfig = { ...config, theme: value };
            setConfig(newConfig);
            SaveConfig(newConfig).then(() => {
                Events.Emit('config:updated', newConfig);
            });
        }
    };

    const handleRememberPosChange = (event) => {
        const value = event.currentTarget.checked;
        if (config) {
            const newConfig = { ...config, remember_pos: value };
            setConfig(newConfig);
            SaveConfig(newConfig).then(() => {
                Events.Emit('config:updated', newConfig);
            });
        }
    };

    const handleDefaultOrgChange = (value) => {
        if (config) {
            const newConfig = { ...config, default_org: value };
            setConfig(newConfig);
            SetDefaultOrganization(value || "");
        }
    };

    if (!config) {
        return (
            <Box p="md">
                <Text>Loading settings...</Text>
            </Box>
        );
    }

    return (
        <ScrollArea h="100%">
            <Box>
                <Title order={2}>Settings</Title>
                <Text size="sm" c="dimmed" mb="xl">Configure your application preferences</Text>

                <Stack gap="md">
                    <Box>
                        <Text size="sm" fw={500} mb={5}>Application Theme</Text>
                        <SegmentedControl
                            value={config.theme || 'system'}
                            onChange={handleThemeChange}
                            data={[
                                { label: 'Light', value: 'light' },
                                { label: 'Dark', value: 'dark' },
                                { label: 'System', value: 'system' },
                            ]}
                        />
                    </Box>
                    
                    <Box>
                        <Switch
                            label="Remember window position and size"
                            checked={config.remember_pos}
                            onChange={handleRememberPosChange}
                        />
                    </Box>

                    <Box>
                        <Select
                            label="Default GitHub Organization"
                            description="The organization that will be selected when the application starts"
                            placeholder="Select default organization"
                            data={['', ...organizations]}
                            value={config.default_org || ''}
                            onChange={handleDefaultOrgChange}
                            clearable
                        />
                    </Box>
                </Stack>
            </Box>
        </ScrollArea>
    );
};

export default Settings;
