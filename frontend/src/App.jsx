import {Events} from "@wailsio/runtime";
import {useEffect} from 'react'
import {useDisclosure} from '@mantine/hooks';
import {Box, Flex, LoadingOverlay, useMantineColorScheme} from '@mantine/core';
import {Startup} from "../bindings/github.com/amnuts/github-admin/backend/services/githubservice.js";
import {GetConfig} from "../bindings/github.com/amnuts/github-admin/backend/services/appconfigservice.js";
import RouteSwitcher from "./state/RouteSwitcher.jsx";
import {useAppDispatch, useAppState} from "./state/StateManager.jsx";
import ServiceStatus from "./components/ServiceStatus.jsx";
import Login from "./screens/Login.jsx";

const App = () => {
  const [initComplete, {open}] = useDisclosure(false);
  const appDispatch = useAppDispatch();
  const {serviceStatus} = useAppState();
  const { setColorScheme } = useMantineColorScheme();
  
  const isSettingsWindow = window.location.hash === '#/settings';
  
  useEffect(() => {
    GetConfig().then(cfg => {
      if (cfg) {
        if (cfg.theme) {
          setColorScheme(cfg.theme === 'system' ? 'auto' : cfg.theme);
        }
        if (cfg.repo_groups) {
          appDispatch({type: 'UPDATE_REPO_GROUPS', payload: cfg.repo_groups});
        }
        if (cfg.team_groups) {
          appDispatch({type: 'UPDATE_TEAM_GROUPS', payload: cfg.team_groups});
        }
      }
    });

    if (isSettingsWindow) {
      open();
      return;
    }

    Startup().then((result) => {
      appDispatch({type: 'UPDATE_CONNECTION_STATUS', payload: result});
      open();
    });
    
    const reposUpdated = Events.On('github:repos:updated', (e) => {
      appDispatch({type: 'UPDATE_REPO_LIST', payload: {org: e.data.org, repos: e.data.repos}});
    });
    const teamsUpdated = Events.On('github:teams:updated', (e) => {
      appDispatch({type: 'UPDATE_TEAM_LIST', payload: {org: e.data.org, teams: e.data.teams}});
    });
    const statusUpdated = Events.On('github:status:updated', (e) => {
      appDispatch({type: 'UPDATE_CONNECTION_STATUS', payload: e.data});
    });
    const configUpdated = Events.On('config:updated', (e) => {
      if (e.data && e.data.theme) {
        setColorScheme(e.data.theme === 'system' ? 'auto' : e.data.theme);
      }
    });
    const fetchError = Events.On('github:fetch:error', (e) => {
      appDispatch({type: 'SET_FETCH_ERROR', payload: e.data});
    });

    return () => {
      reposUpdated();
      teamsUpdated();
      statusUpdated();
      configUpdated();
      fetchError();
    };
  }, []);

  if (isSettingsWindow) {
    return (
      <Box p="md">
        <RouteSwitcher />
      </Box>
    );
  }

  if (!serviceStatus.isConnected) {
    return (
      <Box>
        <LoadingOverlay visible={!initComplete} zIndex={1000} overlayProps={{radius: "sm", blur: 2}}/>
        {initComplete && <Login />}
      </Box>
    );
  }
  
  return (
      <Flex direction="column" h="100vh" style={{ overflow: 'hidden' }}>
        <LoadingOverlay visible={!initComplete} zIndex={1000} overlayProps={{radius: "sm", blur: 2}}/>
        <ServiceStatus/>
        <Box flex={1} p="xl" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <RouteSwitcher/>
        </Box>
      </Flex>
  );
}

export default App
