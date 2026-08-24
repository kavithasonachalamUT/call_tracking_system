import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextDef';
import { storage } from '../utils/storage';
import { authService } from '../services/authService';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => storage.getUser());
  const [token, setToken] = useState(() => storage.getToken());
  const [isLoading, setIsLoading] = useState(() => {
    // If token exists in local storage, initial verification is required
    return !!storage.getToken();
  });

  // Verify and refresh auth session against backend
  const verifyAuth = useCallback(async () => {
    const savedToken = storage.getToken();
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return null;
    }

    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      storage.setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.warn('Authentication token verification failed:', error?.message || 'Invalid session');
      storage.clearAuth();
      setUser(null);
      setToken(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // On initial mount, verify existing session
  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      const savedToken = storage.getToken();
      if (!savedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          storage.setUser(currentUser);
        }
      } catch (error) {
        console.warn('Initial session restoration failed:', error?.message || 'Session expired');
        if (isMounted) {
          storage.clearAuth();
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeSession();

    // Listen for 401 Unauthorized events from Axios response interceptor
    const handleUnauthorizedEvent = () => {
      if (isMounted) {
        setUser(null);
        setToken(null);
        storage.clearAuth();
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorizedEvent);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorizedEvent);
    };
  }, []);

  // Login action: authenticates, stores token, fetches user profile
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const authResult = await authService.login(email, password);
      const accessToken = authResult.access_token;

      // Store token first so subsequent /auth/me request includes Authorization header
      storage.setToken(accessToken);
      setToken(accessToken);

      // Fetch user profile from /auth/me
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      storage.setUser(currentUser);

      return currentUser;
    } catch (error) {
      // Clean up token if fetching user profile failed
      storage.clearAuth();
      setUser(null);
      setToken(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout action: removes token, clears state
  const logout = () => {
    storage.clearAuth();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    verifyAuth,
    refreshUser: verifyAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
