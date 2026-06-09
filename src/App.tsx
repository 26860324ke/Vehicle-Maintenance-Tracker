/**
 * DriveCare: High-Performance Vehicle Maintenance Tracker Dashboard
 * Fully compiled with responsive layout, real-time sync with NodeJS/Express JSON persistence,
 * and adaptive theme control.
 */

import React from 'react';
import { AppStateProvider, useAppState } from './context/AppContext';
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import VehiclesScreen from './components/VehiclesScreen';
import VehicleDetailScreen from './components/VehicleDetailScreen';
import SettingsScreen from './components/SettingsScreen';
import { 
  Car, Wrench, LayoutDashboard, Settings, LogOut, ChevronRight, Menu, X, CheckSquare
} from 'lucide-react';

function AppLayout() {
  const { 
    isAuthenticated, isSessionLoading, activeTab, navigateTo, logout, user,
    unitPreference, setUnitPreference, t 
  } = useAppState();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Car className="h-5 w-5 text-blue-600 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">{t('auth.loadingSession')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('auth.loadingDesc')}</p>
        </div>
      </div>
    );
  }

  // Not authenticated: Render login structure
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Renders the correct screen based on routing state loaded from context
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'vehicles':
        return <VehiclesScreen />;
      case 'vehicle-detail':
        return <VehicleDetailScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  const navItems = [
    { key: 'dashboard', tKey: 'nav.dashboard', icon: LayoutDashboard },
    { key: 'vehicles', tKey: 'nav.garage', icon: Car },
    { key: 'settings', tKey: 'nav.settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      
      {/* 1. TOP NAV BAR (Responsive) */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={() => navigateTo('dashboard')}
              className="flex items-center space-x-2.5 text-left focus:outline-none cursor-pointer select-none"
            >
              <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight block">{t('app.name')}</span>
                <span className="text-[10px] text-slate-400 block font-mono leading-none">{t('app.desc')}</span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key || (item.key === 'vehicles' && activeTab === 'vehicle-detail');
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      navigateTo(item.key as any);
                    }}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer select-none transition ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/15' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t(item.tKey)}</span>
                  </button>
                );
              })}
             </nav>

             {/* Desktop user Profile area */}
             <div className="hidden md:flex items-center space-x-3.5">
              <div className="text-right">
                <p className="text-xs font-bold text-white leading-none">{user?.name}</p>
                <span className="text-[9px] text-slate-400 font-mono mt-1 block">{t('common.role')}</span>
              </div>
              <button
                onClick={logout}
                className="text-slate-400 hover:text-red-400 transition cursor-pointer"
                title="Sign out of your session"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Mobile menu trigger */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-300 hover:text-white p-2 rounded-lg cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

            {/* Mobile Navigation Drawer Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-2 py-3 space-y-1.5 shadow-xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key || (item.key === 'vehicles' && activeTab === 'vehicle-detail');
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    navigateTo(item.key as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{t(item.tKey)}</span>
                </button>
              );
            })}
            
            <div className="border-t border-slate-800/85 mt-2.5 pt-2 px-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{user?.name}</p>
                <p className="text-[10px] text-slate-500">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center space-x-1"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. MAIN HUB WORKSPACE GRID */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in duration-300">
          {renderTabContent()}
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-white border-t border-slate-100 text-slate-550 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <CheckSquare className="h-4 w-4 text-emerald-500" />
            <span>{t('common.footer.compliance')}</span>
          </div>
          <p className="text-slate-400">
            &copy; {new Date().getFullYear()} {t('common.footer.copy')}
          </p>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppLayout />
    </AppStateProvider>
  );
}
