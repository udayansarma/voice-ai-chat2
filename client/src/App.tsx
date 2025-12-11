import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import ChatInterface from './components/ChatInterface';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import TemplateProvider from './context/TemplateContextProvider';
import ChatProvider from './context/ChatContextProvider';
import { VoiceProvider } from './context/VoiceContext';
import { EvaluationProvider } from './context/EvaluationContext';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Create a Spectrum-inspired theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#0066cc', // Spectrum blue
      light: '#3399ff', 
      dark: '#004499',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff6b35', // Spectrum accent orange
      light: '#ff9968',
      dark: '#cc4a1a',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8f9fa', // Light gray background
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a', // Dark text
      secondary: '#6c757d', // Medium gray
    },
    grey: {
      50: '#f8f9fa',
      100: '#e9ecef',
      200: '#dee2e6',
      300: '#ced4da',
      400: '#adb5bd',
      500: '#6c757d',
      600: '#495057',
      700: '#343a40',
      800: '#212529',
      900: '#000000',
    },
  },
  typography: {
    fontFamily: [
      '"Segoe UI"',
      '-apple-system',
      'BlinkMacSystemFont',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 600,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '12px 24px',
          fontSize: '.9rem',
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0, 102, 204, 0.2)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 102, 204, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)',
          borderRadius: 12,
          border: '1px solid #e9ecef',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)',
        },
      },
    },
  },
});

function App() {
  const { isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <VoiceProvider>
        <TemplateProvider>
          <ChatProvider>
            <EvaluationProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <ChatInterface />
                    </PrivateRoute>
                  }
                />
              </Routes>
            </EvaluationProvider>
          </ChatProvider>
        </TemplateProvider>
      </VoiceProvider>
    </ThemeProvider>
  )
}

export default App;
