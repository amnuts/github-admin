import React from "react";
import {ColorSchemeScript, createTheme, MantineProvider} from '@mantine/core';
import {ModalsProvider} from '@mantine/modals';

const theme = createTheme({
    focusRing: "auto",
});

const AppMantineProvider = ({children}) => {
    return (
        <>
            <ColorSchemeScript defaultColorScheme="auto"/>
            <MantineProvider theme={theme} defaultColorScheme="auto">
                <ModalsProvider>
                    {children}
                </ModalsProvider>
            </MantineProvider>
        </>
    );
};

export default AppMantineProvider;
