import {useState} from 'react';
import {TextInput, Button, Box, Title, Text, Center, Stack, Paper} from '@mantine/core';
import {Login as GitHubLogin} from "../../bindings/github.com/amnuts/github-admin/backend/services/githubservice.js";
import {useAppDispatch} from "../state/StateManager.jsx";

const Login = () => {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const appDispatch = useAppDispatch();

    const handleLogin = async () => {
        if (!token) {
            setError('Token is required');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const status = await GitHubLogin(token);
            appDispatch({type: 'UPDATE_CONNECTION_STATUS', payload: status});
        } catch (e) {
            setError(e.toString());
        } finally {
            setLoading(false);
        }
    };

    return (
        <Center h="100vh">
            <Paper withBorder shadow="md" p="xl" radius="md" style={{ width: 400 }}>
                <Stack>
                    <Title order={2}>GitHub Login</Title>
                    <Text size="sm" color="dimmed">
                        Please enter your GitHub Personal Access Token to continue.
                        The token needs <code>repo</code> and <code>admin:org</code> scopes to manage repository settings and teams.
                    </Text>
                    <TextInput
                        label="Personal Access Token"
                        placeholder="ghp_..."
                        value={token}
                        onChange={(e) => setToken(e.currentTarget.value)}
                        error={error}
                        type="password"
                    />
                    <Button onClick={handleLogin} loading={loading} fullWidth mt="md">
                        Login
                    </Button>
                </Stack>
            </Paper>
        </Center>
    );
};

export default Login;
