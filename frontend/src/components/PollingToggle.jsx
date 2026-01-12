import {ActionIcon, rem, useComputedColorScheme, VisuallyHidden} from '@mantine/core';
import {
    StartRepoPolling,
    StopRepoPolling
} from "../../bindings/github.com/amnuts/github-admin/backend/services/githubservice.js";
import {useAppState} from "../state/StateManager.jsx";
import classes from './PollingToggle.module.css';
import {clsx} from 'clsx';

const PollingToggle = ({ServiceIcon, serviceIconProps, onFunctionName, offFunctionName}) => {
    const appState = useAppState();
    const funcMap = {StartRepoPolling, StopRepoPolling};
    const computedColorScheme = useComputedColorScheme('dark');

    const {isConnected, isPolling} = appState.serviceStatus;

    const togglePolling = () => {
        let funcName = !isPolling ? onFunctionName : offFunctionName;
        funcMap[funcName]();
    };

    const buttonColour = clsx(
        computedColorScheme === 'light' && {'green.2': isPolling, 'gray.3': !isPolling},
        computedColorScheme === 'dark' && {'green.2': isPolling, 'dark.3': !isPolling}
    );

    const serviceIcon = (
        <>
            <VisuallyHidden>{!isConnected ? 'Not connected' : (isPolling ? 'Polling' : 'Not polling')}</VisuallyHidden>
            <ServiceIcon style={{width: rem(20), height: rem(20)}} stroke={0} {...serviceIconProps} />
        </>
    );

    return (
        <ActionIcon
            disabled={!isConnected}
            onClick={() => togglePolling()}
            color={buttonColour}
            aria-label="Toggle polling"
            variant="filled"
            className={classes.button}
        >
            {serviceIcon}
        </ActionIcon>
    );
}

export default PollingToggle;
