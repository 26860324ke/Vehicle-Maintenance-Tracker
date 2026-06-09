import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setToken, getToken } from '../lib/api';
import { User, Vehicle, VehicleWithDetails, Reminder } from '../types';
import { LanguageType, CurrencyType, getTranslation } from '../lib/i18n';

interface AlertStatusData {
  overdue: Array<Reminder & { vehicleName: string; statusReason: string }>;
  due: Array<Reminder & { vehicleName: string; statusReason: string }>;
  upcoming: Array<Reminder & { vehicleName: string; statusReason: string }>;
}

export type ActiveTab = 'dashboard' | 'vehicles' | 'vehicle-detail' | 'settings' | 'login' | 'register';

interface AppContextType {
  // Authentication states
  user: Omit<User, 'passwordHash'> | null;
  token: string | null;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  authError: string | null;

  // Global UI States
  activeTab: ActiveTab;
  selectedVehicleId: string | null;
  globalAlerts: AlertStatusData | null;
  vehicles: Array<Vehicle & { logsCount: number; remindersCount: number; lastServiceDate: string }>;
  activeVehicleDetails: VehicleWithDetails | null;
  unitPreference: 'imperial' | 'metric';
  setUnitPreference: (unit: 'imperial' | 'metric') => void;

  // i18n & Financial selection attributes
  languagePreference: LanguageType;
  setLanguagePreference: (lang: LanguageType) => void;
  currencyPreference: CurrencyType;
  setCurrencyPreference: (curr: CurrencyType) => void;
  t: (key: string) => string;

  // API Refreshers
  refreshAllData: () => Promise<void>;
  navigateTo: (tab: ActiveTab, vehicleId?: string | null) => void;

  // Auth Operations
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  clearAuthError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Omit<User, 'passwordHash'> | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('login');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [globalAlerts, setGlobalAlerts] = useState<AlertStatusData | null>(null);
  const [vehicles, setVehicles] = useState<Array<Vehicle & { logsCount: number; remindersCount: number; lastServiceDate: string }>>([]);
  const [activeVehicleDetails, setActiveVehicleDetails] = useState<VehicleWithDetails | null>(null);

  const [unitPreference, setUnitPreferenceState] = useState<'imperial' | 'metric'>('metric');

  const setUnitPreference = (unit: 'imperial' | 'metric') => {
    // Force metric-only as requested
    setUnitPreferenceState('metric');
  };

  const [languagePreference, setLanguagePreferenceState] = useState<LanguageType>(() => {
    const saved = localStorage.getItem('drivecare_language_preference');
    return (saved === 'en' || saved === 'zh-TW') ? saved : 'en';
  });

  const [currencyPreference, setCurrencyPreferenceState] = useState<CurrencyType>(() => {
    const saved = localStorage.getItem('drivecare_currency_preference');
    return (saved === 'CAD' || saved === 'TWD') ? saved : 'CAD';
  });

  const setLanguagePreference = (lang: LanguageType) => {
    setLanguagePreferenceState(lang);
    localStorage.setItem('drivecare_language_preference', lang);
  };

  const setCurrencyPreference = (curr: CurrencyType) => {
    setCurrencyPreferenceState(curr);
    localStorage.setItem('drivecare_currency_preference', curr);
  };

  const t = (key: string) => {
    return getTranslation(key, languagePreference);
  };

  // Authenticate session on boot or token changes
  useEffect(() => {
    const initializeSession = async () => {
      const savedToken = getToken();
      if (!savedToken) {
        setIsSessionLoading(false);
        setIsAuthenticated(false);
        setActiveTab('login');
        return;
      }

      try {
        const response = await api.auth.me();
        setUser(response.user);
        setIsAuthenticated(true);
        setTokenState(savedToken);
        setActiveTab('dashboard');
      } catch (err: any) {
        if (err?.message !== 'No active sessions found.') {
          console.warn('Session restoration skipped:', err?.message || err);
        }
        setToken(null);
        setTokenState(null);
        setIsAuthenticated(false);
        setActiveTab('login');
      } finally {
        setIsSessionLoading(false);
      }
    };

    initializeSession();
  }, []);

  // Sync data whenever logged in state or tab changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshAllData().catch(console.error);
    }
  }, [isAuthenticated, activeTab, selectedVehicleId]);

  const refreshAllData = async () => {
    if (!isAuthenticated) return;
    try {
      // 1. Fetch user vehicles
      const vehiclesList = await api.vehicles.list();
      setVehicles(vehiclesList);

      // 2. Fetch global alert checks
      const alerts = await api.reminders.getGlobalAlerts();
      setGlobalAlerts(alerts);

      // 3. Fetch active vehicle if chosen
      if (selectedVehicleId) {
        const detail = await api.vehicles.get(selectedVehicleId);
        setActiveVehicleDetails(detail);
      } else {
        setActiveVehicleDetails(null);
      }
    } catch (err) {
      console.error('Failed to sync state from Express server:', err);
    }
  };

  const navigateTo = (tab: ActiveTab, vehicleId: string | null = null) => {
    setSelectedVehicleId(vehicleId);
    setActiveTab(tab);
  };

  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await api.auth.login({ email, password });
      setToken(res.token);
      setTokenState(res.token);
      setUser(res.user);
      setIsAuthenticated(true);
      setActiveTab('dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await api.auth.register({ name, email, password });
      setToken(res.token);
      setTokenState(res.token);
      setUser(res.user);
      setIsAuthenticated(true);
      setActiveTab('dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const res = await api.auth.loginWithGoogle();
      setToken(res.token);
      setTokenState(res.token);
      setUser(res.user);
      setIsAuthenticated(true);
      setActiveTab('dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In failed');
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    setIsAuthenticated(false);
    setVehicles([]);
    setGlobalAlerts(null);
    setSelectedVehicleId(null);
    setActiveVehicleDetails(null);
    setActiveTab('login');
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isSessionLoading,
        authError,
        activeTab,
        selectedVehicleId,
        globalAlerts,
        vehicles,
        activeVehicleDetails,
        unitPreference,
        setUnitPreference,
        languagePreference,
        setLanguagePreference,
        currencyPreference,
        setCurrencyPreference,
        t,
        refreshAllData,
        navigateTo,
        login,
        register,
        loginWithGoogle,
        logout,
        clearAuthError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used inside an AppStateProvider');
  }
  return context;
}
