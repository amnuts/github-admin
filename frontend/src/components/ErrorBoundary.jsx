import React from 'react';
import { Box, Title, Text, Button, Center, Paper, Stack } from '@mantine/core';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Center h="100vh" w="100vw">
          <Paper withBorder shadow="md" p="xl" radius="md" style={{ maxWidth: 500 }}>
            <Stack>
              <Title order={2} color="red">Something went wrong</Title>
              <Text size="sm">
                An unexpected error occurred in the application.
              </Text>
              <Box bg="dark.7" p="xs" style={{ borderRadius: 4, overflow: 'auto' }}>
                <Text size="xs" ff="monospace" color="gray.3">
                  {this.state.error && this.state.error.toString()}
                </Text>
              </Box>
              <Button onClick={() => window.location.reload()}>
                Reload Application
              </Button>
            </Stack>
          </Paper>
        </Center>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
