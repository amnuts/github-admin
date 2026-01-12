import React from 'react'
import ReactDOM from 'react-dom/client'
import AppMantineProvider from './providers/AppMantineProvider';
import AppProvider from './providers/AppProvider';
import App from './App'
import ErrorBoundary from './components/ErrorBoundary';
import '@mantine/core/styles.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppMantineProvider>
      <AppProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AppProvider>
    </AppMantineProvider>
  </React.StrictMode>,
)
