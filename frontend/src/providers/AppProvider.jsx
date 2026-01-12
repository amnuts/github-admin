import React, {useReducer} from 'react';
import {HashRouter} from 'react-router-dom';
import {appReducer} from "../state/StateManager.jsx";
import {AppStateContext, AppDispatchContext} from "../state/StateManager.jsx";

const AppProvider = ({children}) => {
    const [state, dispatch] = useReducer(appReducer, {
        serviceStatus: {
            isConnected: false,
            isPolling: false,
            organizations: [],
            selectedOrg: '',
        },
        repoCache: {},
        teamCache: {},
        repoGroups: {},
        teamGroups: {},
        fetchErrors: {},
    });

    return (
        <AppStateContext.Provider value={state}>
            <AppDispatchContext.Provider value={dispatch}>
                <HashRouter>
                    {children}
                </HashRouter>
            </AppDispatchContext.Provider>
        </AppStateContext.Provider>
    );
};

export default AppProvider;
