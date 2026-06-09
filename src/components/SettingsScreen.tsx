import React from 'react';
import { useAppState } from '../context/AppContext';
import { convertMileageGuideline } from '../lib/units';
import { 
  User, CheckCircle, ShieldAlert, LogOut, Code, Library, FileJson, Sparkles
} from 'lucide-react';

export default function SettingsScreen() {
  const { 
    user, 
    logout, 
    unitPreference, 
    setUnitPreference, 
    languagePreference, 
    setLanguagePreference, 
    currencyPreference, 
    setCurrencyPreference,
    t 
  } = useAppState();

  const mockInstructions = [
    { 
      rule: t('settings.oilChange'), 
      frequency: `${t('settings.oilChange')} - ${t('settings.oilChangeDesc')}` 
    },
    { 
      rule: t('settings.tireRot'), 
      frequency: `${t('settings.tireRot')} - ${t('settings.tireRotDesc')}` 
    },
    { 
      rule: t('settings.airFilter'), 
      frequency: `${t('settings.airFilter')} - ${t('settings.airFilterDesc')}` 
    },
    { 
      rule: t('settings.brakeFluid'), 
      frequency: `${t('settings.brakeFluid')} - ${t('settings.brakeFluidDesc')}` 
    },
  ];

  return (
    <div className="space-y-6 text-slate-950">
      {/* Settings Header block */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-sans tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          {t('settings.distanceExplain')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-50">
            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              {user?.name?.[0].toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="font-bold text-slate-950 text-sm leading-none">{user?.name || 'Authorized Driver'}</h2>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block uppercase">{t('common.role')}</span>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-700">
            <div>
              <span className="text-slate-400 block font-medium uppercase text-[9px] tracking-wider font-mono">{t('settings.email')}</span>
              <span className="font-semibold text-slate-900 break-all">{user?.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium uppercase text-[9px] tracking-wider font-mono">{t('settings.registered')}</span>
              <span className="font-semibold text-slate-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(languagePreference === 'zh-TW' ? 'zh-TW' : 'en-US') : 'N/A'}
              </span>
            </div>

            {/* Settings Screen Currency Preference Picker */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-400 block font-medium uppercase text-[9px] tracking-wider font-mono mb-2">{t('settings.currencySelector')}</span>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrencyPreference('CAD')}
                  className={`text-center py-1.5 rounded-md text-[9px] font-bold font-mono tracking-tighter transition-all cursor-pointer select-none ${
                    currencyPreference === 'CAD' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  CAD (C$)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyPreference('TWD')}
                  className={`text-center py-1.5 rounded-md text-[9px] font-bold font-mono tracking-tighter transition-all cursor-pointer select-none ${
                    currencyPreference === 'TWD' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  TWD (NT$)
                </button>
              </div>
            </div>

            {/* Settings Screen Language Preference Picker */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-400 block font-medium uppercase text-[9px] tracking-wider font-mono mb-2">{t('settings.languageSelector')}</span>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                <button
                  type="button"
                  onClick={() => setLanguagePreference('en')}
                  className={`text-center py-1.5 rounded-md text-[10px] font-bold font-mono tracking-wider transition-all cursor-pointer select-none ${
                    languagePreference === 'en' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  ENGLISH
                </button>
                <button
                  type="button"
                  onClick={() => setLanguagePreference('zh-TW')}
                  className={`text-center py-1.5 rounded-md text-[10px] font-bold font-mono tracking-wider transition-all cursor-pointer select-none ${
                    languagePreference === 'zh-TW' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  繁體中文
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:border-red-300 font-bold text-xs py-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer mt-4"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>

        {/* OEM Guidelines / Best practices card (colspan 2 on desktop) */}
        <div className="md:col-span-2 bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-50">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <h3 className="font-bold text-slate-900 text-sm">{t('settings.intervalTitle')}</h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {t('settings.recommended')}
          </p>

          <div className="divide-y divide-slate-100">
            {mockInstructions.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-start justify-between text-xs">
                <div className="font-bold text-slate-800">{item.rule}</div>
                <div className="text-slate-600 text-right font-medium max-w-[300px]">{item.frequency}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
