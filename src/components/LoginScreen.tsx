import React, { useState } from 'react';
import { useAppState } from '../context/AppContext';
import { Car, Wrench, ShieldAlert, KeyRound, Mail, UserPlus } from 'lucide-react';

export default function LoginScreen() {
  const { login, register, loginWithGoogle, authError, clearAuthError, t } = useAppState();
  const [isRegister, setIsRegister] = useState<boolean>(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearAuthError();

    if (!email || !password) {
      setError(t('auth.missingCredentials') || 'Please fill in all standard credentials.');
      return;
    }

    if (isRegister && !name) {
      setError(t('auth.missingName') || 'Please provide your name for account set-up.');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication operation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError(null);
    clearAuthError();
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto w-full max-w-md">
        <div className="flex justify-center items-center space-x-3 mb-2">
          <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md shadow-blue-200">
            <Car className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-950 font-sans">
            {t('app.name')}
          </span>
        </div>
        <h2 className="text-center text-sm font-medium text-slate-500 font-sans uppercase tracking-wider mb-6">
          {t('app.desc')}
        </h2>
      </div>

      <div className="mt-2 sm:mx-auto w-full max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-100 rounded-2xl border border-slate-100 sm:px-10">
          <div className="mb-6">
            <h3 className="text-xl font-bold font-sans text-slate-900">
              {isRegister ? t('auth.signUpTitle') : t('auth.signInTitle')}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {isRegister ? t('auth.descRegister') : t('auth.descLogin')}
            </p>
          </div>

          {(error || authError) && (
            <div className="mb-4 bg-red-50 border border-red-205 text-red-700 px-4 py-3 rounded-xl flex items-start space-x-2 text-sm">
              <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error || authError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('auth.fullName')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserPlus className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t('auth.email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 sm:text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t('auth.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 sm:text-sm"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-100 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading 
                ? (isRegister ? t('auth.registering') : t('auth.signingIn')) 
                : (isRegister ? t('auth.submitSignUp') : t('auth.submitSignIn'))}
            </button>
          </form>

          <div className="mt-5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">
                  {t('auth.orContinueWith')}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                disabled={isLoading}
                onClick={async () => {
                  setError(null);
                  clearAuthError();
                  setIsLoading(true);
                  try {
                    await loginWithGoogle();
                  } catch (err: any) {
                    setError(err.message || 'Google Sign-In failed');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all cursor-pointer text-sm font-semibold text-slate-700 bg-white"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>
                  {t('auth.continueWithGoogle')}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {isRegister ? t('auth.haveAccount') : t('auth.needAccount')}
            </span>
            <button
              onClick={toggleMode}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 focus:outline-none border-b border-dashed border-blue-500"
            >
              {isRegister ? t('auth.toggleSignIn') : t('auth.toggleSignUp')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
