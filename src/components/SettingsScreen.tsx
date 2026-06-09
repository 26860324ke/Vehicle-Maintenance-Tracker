import React from 'react';
import { useAppState } from '../context/AppContext';
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
      rule: languagePreference === 'zh-TW' ? '機油與油芯更換 (Oil Change)' : 'Oil Change', 
      km: '5,000 - 8,000 km',
      time: languagePreference === 'zh-TW' ? '6 個月 (若未達里程)' : '6 Months (if mileage not reached)'
    },
    { 
      rule: languagePreference === 'zh-TW' ? '前後輪對調跑位 (Tire Rotations)' : 'Tire Rotations', 
      km: '8,000 - 13,000 km',
      time: languagePreference === 'zh-TW' ? '6 個月 (若未達里程)' : '6 Months (if mileage not reached)'
    },
    { 
      rule: languagePreference === 'zh-TW' ? '引擎空氣濾網替換 (Engine Air Filter)' : 'Engine Air Filter replacement', 
      km: '25,000 - 50,000 km',
      time: languagePreference === 'zh-TW' ? '12 個月 / 1 年 (若未達里程)' : '12 Months / 1 Year (if mileage not reached)'
    },
    { 
      rule: languagePreference === 'zh-TW' ? '煞車液循環更換 (Brake Fluid Flush)' : 'Brake Fluid Flush', 
      km: '30,000 - 70,000 km',
      time: languagePreference === 'zh-TW' ? '24 個月 / 2 年 (若未達里程)' : '24 Months / 2 Years (if mileage not reached)'
    },
    { 
      rule: languagePreference === 'zh-TW' ? '空調冷氣濾網更換 (Cabin Air Filter)' : 'Cabin Air Filter replacement', 
      km: '20,000 - 25,000 km',
      time: languagePreference === 'zh-TW' ? '12 個月 / 1 年 (若未達里程)' : '12 Months / 1 Year (if mileage not reached)'
    },
    { 
      rule: languagePreference === 'zh-TW' ? '火星塞替換規格 (Spark Plugs)' : 'Spark Plugs Renewal', 
      km: '100,000 - 160,000 km',
      time: languagePreference === 'zh-TW' ? '60 個月 / 5 年 (若未達里程)' : '60 Months / 5 Years (if mileage not reached)'
    },
    { 
      rule: languagePreference === 'zh-TW' ? '變速箱油保養 (Transmission Fluid)' : 'Transmission Fluid Flush', 
      km: '50,500 - 100,000 km',
      time: languagePreference === 'zh-TW' ? '36 個月 / 3 年 (若未達里程)' : '36 Months / 3 Years (if mileage not reached)'
    },
    { 
      rule: languagePreference === 'zh-TW' ? '引擎冷卻水循環替換 (Coolant Flush)' : 'Coolant Flush & Refill', 
      km: '50,000 - 80,000 km',
      time: languagePreference === 'zh-TW' ? '36 個月 / 3 年 (若未達里程)' : '36 Months / 3 Years (if mileage not reached)'
    },
    { 
      rule: languagePreference === 'zh-TW' ? '車用蓄電池健康檢測 (Battery Check)' : 'Battery Inspection & Care', 
      km: '16,000 - 25,000 km',
      time: languagePreference === 'zh-TW' ? '6 - 12 個月 (若未達里程)' : '6 - 12 Months (if mileage not reached)'
    }
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
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <h3 className="font-bold text-slate-900 text-sm">{t('settings.intervalTitle')}</h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {t('settings.recommended')}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase">
                  <th className="pb-2.5 pr-2">{languagePreference === 'zh-TW' ? '保養耗材項目' : 'Service Target Item'}</th>
                  <th className="pb-2.5 pr-2 text-right">{languagePreference === 'zh-TW' ? '里程推薦值 (公里)' : 'Distance Guideline (KM)'}</th>
                  <th className="pb-2.5 text-right">{languagePreference === 'zh-TW' ? '推薦年限 (若里程未達)' : 'Time Limit Guideline (if mileage not reached)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockInstructions.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 pr-2 font-semibold text-slate-800">
                      {item.rule}
                    </td>
                    <td className="py-2.5 pr-2 text-right text-slate-700 font-mono font-medium whitespace-nowrap">
                      {item.km}
                    </td>
                    <td className="py-2.5 text-right text-indigo-600 font-medium whitespace-nowrap">
                      {item.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
