import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, RoleName } from '../types';

interface AuthContextType {
  user: User | null;
  activeRole: RoleName | null;
  setActiveRole: (role: RoleName) => void;
  login: (email: string, password: string) => Promise<User>;
  demoLogin: (roleName: RoleName) => Promise<User>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_CREDENTIALS: Record<RoleName, string> = {
  CUSTOMER: 'alice.customer@bms.bank',
  BANK_MANAGER: 'bankmanager@bms.bank',
  BRANCH_MANAGER: 'branchmanager@bms.bank',
  BANK_TELLER: 'teller@bms.bank',
  ACCOUNTANT: 'accountant@bms.bank',
  LOAN_OFFICER: 'loanofficer@bms.bank',
  CUSTOMER_SERVICE_OFFICER: 'support@bms.bank',
  SYSTEM_ADMINISTRATOR: 'admin@bms.bank',
  AUDITOR: 'auditor@bms.bank',
  COMPLIANCE_OFFICER: 'compliance@bms.bank',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<RoleName | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('bms_access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        const userData = res.data.user;
        setUser(userData);
        const savedRole = localStorage.getItem('bms_active_role') as RoleName;
        if (savedRole && userData.roles.includes(savedRole)) {
          setActiveRole(savedRole);
        } else {
          setActiveRole(userData.roles[0] || null);
        }
      } catch (err) {
        localStorage.removeItem('bms_access_token');
        localStorage.removeItem('bms_refresh_token');
        setUser(null);
        setActiveRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user: userData, accessToken, refreshToken } = res.data;
      localStorage.setItem('bms_access_token', accessToken);
      localStorage.setItem('bms_refresh_token', refreshToken);
      setUser(userData);
      const role = userData.roles[0] as RoleName;
      setActiveRole(role);
      localStorage.setItem('bms_active_role', role);
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (roleName: RoleName) => {
    const email = DEMO_CREDENTIALS[roleName];
    return login(email, 'Password123!');
  };

  const logout = () => {
    localStorage.removeItem('bms_access_token');
    localStorage.removeItem('bms_refresh_token');
    localStorage.removeItem('bms_active_role');
    setUser(null);
    setActiveRole(null);
    window.location.href = '/login';
  };

  const handleSetActiveRole = (role: RoleName) => {
    setActiveRole(role);
    localStorage.setItem('bms_active_role', role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        setActiveRole: handleSetActiveRole,
        login,
        demoLogin,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
