import {
    Box,
    Flex,
    getThemeColor,
    Group,
    Text,
    useComputedColorScheme,
    useMantineTheme,
    Select,
    Button,
} from '@mantine/core';
import {IconBrandGithubFilled, IconLogout, IconSettings, IconStarFilled} from "@tabler/icons-react";
import PollingToggle from "./PollingToggle.jsx";
import {clsx} from "clsx";
import {useAppState} from "../state/StateManager.jsx";
import {SetOrganization, Logout} from "../../bindings/github.com/amnuts/github-admin/backend/services/githubservice.js";
import {ShowSettings} from "../../bindings/github.com/amnuts/github-admin/backend/services/appconfigservice.js";
import {GetVersion} from "../../bindings/github.com/amnuts/github-admin/backend/services/versionservice.js";
import {useEffect, useState} from "react";

const ServiceStatus = () => {
    const appState = useAppState();
    const theme = useMantineTheme();
    const computedColorScheme = useComputedColorScheme('dark');
    const [version, setVersion] = useState('');

    useEffect(() => {
        GetVersion().then(setVersion);
    }, []);

    const {isConnected, isPolling, organizations, selectedOrg, defaultOrg} = appState.serviceStatus;

    const githubColour = clsx(
        !isConnected && getThemeColor('red.9', theme),
        computedColorScheme === 'light' && isConnected && {
            [getThemeColor('dark.6', theme)]: !isPolling,
            [getThemeColor('dark.4', theme)]: isPolling,
        },
        computedColorScheme === 'dark' && isConnected && {
            [getThemeColor('gray.4', theme)]: !isPolling,
            [getThemeColor('dark.6', theme)]: isPolling,
        },
    );

    const handleOrgChange = (value) => {
        SetOrganization(value);
    };

    const handleLogout = () => {
        Logout();
    };

    return (
        <Box
            px="xl"
            py="xs"
            style={(theme) => ({
                borderBottom: `1px solid ${computedColorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`
            })}
        >
            <Flex
                gap="sm"
                justify="space-between"
                align="center"
                direction="row"
                wrap="wrap"
            >
                <Group gap="xs">
                    <PollingToggle
                        ServiceIcon={IconBrandGithubFilled}
                        serviceIconProps={{fill: githubColour}}
                        onFunctionName="StartRepoPolling"
                        offFunctionName="StopRepoPolling"
                    />
                    {isConnected && (
                        <Select
                            data={organizations}
                            value={selectedOrg}
                            onChange={handleOrgChange}
                            size="xs"
                            variant="filled"
                            style={{ width: 180 }}
                            allowDeselect={false}
                            renderOption={({ option }) => (
                                <Group flex="1" gap="xs" justify="space-between">
                                    <Text size="xs">{option.label}</Text>
                                    {option.value === defaultOrg && (
                                        <IconStarFilled size={12} color="orange" />
                                    )}
                                </Group>
                            )}
                        />
                    )}
                </Group>
                <Group gap="xs">
                    <Text size="xs" c="lime.8" className="uppercase">v{version}</Text>
                    {isConnected && (
                        <>
                            <Button
                                variant="subtle"
                                size="xs"
                                onClick={() => ShowSettings()}
                                color="gray"
                                leftSection={<IconSettings size={16} />}

                            >
                                Settings
                            </Button>
                            <Button
                                variant="subtle"
                                size="xs"
                                onClick={handleLogout}
                                color="gray"
                                leftSection={<IconLogout size={16} />}
                            >
                                Logout
                            </Button>
                        </>
                    )}
                </Group>
            </Flex>
        </Box>
    );
};

export default ServiceStatus;
