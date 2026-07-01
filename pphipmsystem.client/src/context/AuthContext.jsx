import { createContext, useContext, useState, useCallback } from 'react';
import { login as apiLogin } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  });

  const login = useCallback(async (username, password) => {
    const { data } = await apiLogin({ username, password });
    if (data.requiresTwoFactor) {
      return data;
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  }, []);

  const loginWith2Fa = useCallback(async (username, code) => {
    const { login2Fa: apiLogin2Fa } = await import('../api/auth');
    const { data } = await apiLogin2Fa({ username, code });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, loginWith2Fa, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
