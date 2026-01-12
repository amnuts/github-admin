import {createContext, useContext} from "react";

export const AppStateContext = createContext();
export const AppDispatchContext = createContext();

export const useAppState = () => useContext(AppStateContext);
export const useAppDispatch = () => useContext(AppDispatchContext);

export const appReducer = (state, action) => {
    switch (action.type) {
        case 'UPDATE_CONNECTION_STATUS':
            const updatedStatus = {
                ...state.serviceStatus,
                ...action.payload,
            };
            return {
                ...state,
                serviceStatus: updatedStatus,
                repoCache: updatedStatus.isConnected ? state.repoCache : {},
                teamCache: updatedStatus.isConnected ? state.teamCache : {},
            };
        case 'SET_SELECTED_ORG':
            return {
                ...state,
                serviceStatus: {
                    ...state.serviceStatus,
                    selectedOrg: action.payload,
                }
            };
        case 'UPDATE_REPO_LIST':
            const repoFetchErrors = { ...state.fetchErrors };
            delete repoFetchErrors[`${action.payload.org}-repos`];
            return {
                ...state,
                repoCache: {
                    ...state.repoCache,
                    [action.payload.org]: action.payload.repos
                },
                fetchErrors: repoFetchErrors
            };
        case 'UPDATE_TEAM_LIST':
            const teamFetchErrors = { ...state.fetchErrors };
            delete teamFetchErrors[`${action.payload.org}-teams`];
            return {
                ...state,
                teamCache: {
                    ...state.teamCache,
                    [action.payload.org]: action.payload.teams
                },
                fetchErrors: teamFetchErrors
            };
        case 'SET_FETCH_ERROR':
            return {
                ...state,
                fetchErrors: {
                    ...state.fetchErrors,
                    [`${action.payload.org}-${action.payload.type}`]: action.payload.error
                }
            };
        case 'UPDATE_REPO_GROUPS':
            return {
                ...state,
                repoGroups: action.payload
            };
        case 'UPDATE_TEAM_GROUPS':
            return {
                ...state,
                teamGroups: action.payload
            };
        case 'UPDATE_REPO_FIELDS':
            const {org: updateOrg, fullName, fields} = action.payload;
            if (!state.repoCache[updateOrg]) return state;
            return {
                ...state,
                repoCache: {
                    ...state.repoCache,
                    [updateOrg]: state.repoCache[updateOrg].map(repo => 
                        repo.full_name === fullName ? { ...repo, ...fields } : repo
                    )
                }
            };
        case 'UPDATE_CONTAINER_LIST':
            return {
                ...state,
                containerList: action.payload
            };
        default:
            return state;
    }
};
