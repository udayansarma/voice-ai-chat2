import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, type FC } from 'react';
import apiClient from '../utils/apiClient';

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  username?: string;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  username: undefined,
  login: async () => false,
  logout: async () => {},
});

export const useAuth = (): AuthContextType => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | undefined>(undefined);

  const checkStatus = useCallback(async () => {
    console.log('[Auth] Checking authentication status...');
    try {
      const { data } = await apiClient.get('/api/auth/status');
      console.log('[Auth] Status response:', data);
      setIsAuthenticated(data.authenticated);
      setUsername(data.username);
    } catch (error) {
      console.error('[Auth] Status check failed', error);
      setIsAuthenticated(false);
      setUsername(undefined);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log('[Auth] Attempting login for:', username);
    try {
      await apiClient.post('/api/auth/login', { username, password });
      console.log('[Auth] Login successful');
      setIsAuthenticated(true);
      setUsername(username);
      return true;
    } catch (error) {
      console.error('[Auth] Login failed', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    console.log('[Auth] Logging out...');
    try {
      await apiClient.post('/api/auth/logout');
      console.log('[Auth] Logout successful');
    } catch (error) {
      console.error('[Auth] Logout error', error);
    } finally {
      setIsAuthenticated(false);
      setUsername(undefined);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
