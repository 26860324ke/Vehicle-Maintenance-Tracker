import React, { useState } from 'react';
import { useAppState } from '../context/AppContext';
import { api } from '../lib/api';
import { formatDistance, localizeServerText } from '../lib/units';
import { formatCurrencyValue } from '../lib/i18n';
import { 
  Car, AlertTriangle, CheckCircle, ChevronRight, Sparkles, DollarSign, CalendarCheck, HelpCircle
} from 'lucide-react';

export default function DashboardScreen() {
  const { 
    vehicles, 
    globalAlerts, 
    navigateTo, 
    refreshAllData, 
    unitPreference, 
    currencyPreference, 
    languagePreference, 
    t 
  } = useAppState();
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Statistics calculation across all vehicles
  const totalVehicles = vehicles.length;
  
  // Aggregate notifications that require action
  const overdueAlerts = globalAlerts?.overdue || [];
  const dueAlerts = globalAlerts?.due || [];
  const activeAlertsCount = overdueAlerts.length + dueAlerts.length;

  const totalLogsCount = vehicles.reduce((acc, curr) => acc + (curr.logsCount || 0), 0);
  const totalSpendThisYear = vehicles.reduce((acc, curr) => acc + (curr.totalSpendThisYear || 0), 0);
  const totalSpendAllTime = vehicles.reduce((acc, curr) => acc + (curr.totalSpend || 0), 0);

  const handleResolveReminder = async (vehicleId: string, id: string) => {
    try {
      setCompletingId(id);
      await api.reminders.complete(vehicleId, id);
      await refreshAllData();
    } catch (err) {
      console.error('Could not complete reminder alert update:', err);
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Overview Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
          <Car className="h-64 w-64" />
        </div>
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center space-x-1.5 bg-slate-800 text-blue-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3">
            <Sparkles className="h-3 w-3 animate-pulse" />
            <span>{t('dash.smartTelemetry')}</span>
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">
            {t('dash.fleetControl')}
          </h1>
          <p className="mt-1 text-slate-300 text-sm leading-relaxed">
            {t('dash.fleetControlDesc')}
          </p>
        </div>
      </div>

      {/* 1. NEEDS ATTENTION: CRITICAL ACTION REQUIRED MODULE AT TOP */}
      <div id="needs-attention-module" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`h-5 w-5 shrink-0 ${activeAlertsCount > 0 ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
            <h2 className="font-bold text-slate-900 font-sans text-sm uppercase tracking-wider">
              {t('dash.needsAttention')}
            </h2>
          </div>
          {activeAlertsCount > 0 ? (
            <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {activeAlertsCount} {activeAlertsCount > 1 ? t('dash.alertsPending') : t('dash.alertPending') || t('dash.alertsPending')}
            </span>
          ) : (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {t('dash.allNominal')}
            </span>
          )}
        </div>

        {activeAlertsCount === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="bg-emerald-50 text-emerald-600 rounded-full h-11 w-11 flex items-center justify-center mx-auto">
              <CheckCircle className="h-5.5 w-5.5" />
            </div>
            <p className="text-slate-900 font-bold text-sm">{t('dash.perfectHealth')}</p>
            <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
              {t('dash.noAlerts')}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
            {/* 1. Overdue Reminders (Extreme priority) */}
            {overdueAlerts.map((alert) => (
              <div 
                key={alert.id} 
                id={`alert-overdue-${alert.id}`}
                className="p-3.5 bg-rose-50/80 border border-rose-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition hover:bg-rose-50"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider bg-white px-2 py-0.5 rounded shadow-xs border border-slate-100">
                      {alert.vehicleName}
                    </span>
                    <span className="font-mono bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                      {t('dash.overdue')}
                    </span>
                  </div>
                  <h4 className="font-bold text-rose-950 text-sm">{alert.serviceType}</h4>
                  <p className="text-xs text-rose-700 italic font-mono flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1 text-rose-600 shrink-0" />
                    <span>{localizeServerText(alert.statusReason, unitPreference, languagePreference)}</span>
                  </p>
                </div>
                
                <button
                  id={`btn-resolve-overdue-${alert.id}`}
                  onClick={() => handleResolveReminder(alert.vehicleId, alert.id)}
                  disabled={completingId === alert.id}
                  className="self-start md:self-center bg-white border border-rose-200 hover:bg-rose-100/50 px-3.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 flex items-center space-x-1.5 transition cursor-pointer select-none shrink-0 shadow-sm"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>{completingId === alert.id ? t('dash.resolving') : t('dash.completeDismiss')}</span>
                </button>
              </div>
            ))}

            {/* 2. Due Soon Reminders (High warning) */}
            {dueAlerts.map((alert) => (
              <div 
                key={alert.id} 
                id={`alert-due-${alert.id}`}
                className="p-3.5 bg-amber-50/80 border border-amber-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition hover:bg-amber-50"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider bg-white px-2 py-0.5 rounded shadow-xs border border-slate-100">
                      {alert.vehicleName}
                    </span>
                    <span className="font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                      {t('dash.dueSoon')}
                    </span>
                  </div>
                  <h4 className="font-bold text-amber-950 text-sm">{alert.serviceType}</h4>
                  <p className="text-xs text-amber-800 font-mono flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1 text-amber-600 shrink-0" />
                    <span>{localizeServerText(alert.statusReason, unitPreference, languagePreference)}</span>
                  </p>
                </div>

                <button
                  id={`btn-resolve-due-${alert.id}`}
                  onClick={() => handleResolveReminder(alert.vehicleId, alert.id)}
                  disabled={completingId === alert.id}
                  className="self-start md:self-center bg-white border border-amber-200 hover:bg-amber-100/50 px-3.5 py-1.5 rounded-lg text-xs font-bold text-amber-700 flex items-center space-x-1.5 transition cursor-pointer select-none shrink-0 shadow-sm"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>{completingId === alert.id ? t('dash.resolving') : t('dash.completeDismiss')}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. QUICK STATS SUMMARY BLOCK */}
      <div id="quick-stats-summary" className="space-y-4">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider font-sans">
          {t('settings.profileInfo')}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Quick Stat 1: Total money spent on maintenance this year */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
            <div className="bg-blue-50 text-blue-600 p-3.5 rounded-xl shrink-0">
              <DollarSign className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{t('dash.annualSpend')} ({new Date().getFullYear()})</p>
              <p id="annual-spend-stat" className="text-xl font-black text-slate-900 font-mono mt-1">
                {formatCurrencyValue(totalSpendThisYear, currencyPreference, languagePreference)}
              </p>
            </div>
          </div>

          {/* Quick Stat 2: Total vehicles registered */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
            <div className="bg-slate-50 text-slate-600 p-3.5 rounded-xl shrink-0">
              <Car className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{t('dash.totalVehicles')}</p>
              <p id="fleet-count-stat" className="text-xl font-black text-slate-900 mt-1">
                {totalVehicles} {languagePreference === 'zh-TW' ? '部有效車輛' : `Active Auto${totalVehicles !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Quick Stat 3: Total maintenance tasks logged */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
            <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl shrink-0">
              <CalendarCheck className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{t('reminder.type.mileage')}</p>
              <p id="total-repairs-count-stat" className="text-xl font-black text-slate-900 mt-1">
                {totalLogsCount} {languagePreference === 'zh-TW' ? '筆紀錄' : 'Records'}
              </p>
            </div>
          </div>

          {/* Quick Stat 4: Cumulative investment spend */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
            <div className="bg-violet-50 text-violet-600 p-3.5 rounded-xl shrink-0">
              <DollarSign className="h-5.5 w-5.5 text-violet-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{t('dash.allTimeSpend')}</p>
              <p className="text-xl font-black text-blue-950 font-mono mt-1">
                {formatCurrencyValue(totalSpendAllTime, currencyPreference, languagePreference)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. QUICK VEHICLE SELECTOR GRID & ACCESS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 font-sans text-sm uppercase tracking-wider">
              {t('dash.garagedVehicles')}
            </h3>
            <button 
              id="btn-see-all-vehicles"
              onClick={() => navigateTo('vehicles')} 
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer transition select-none"
            >
              {t('dash.configureFleet')}
            </button>
          </div>

          {vehicles.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Car className="text-slate-300 h-12 w-12 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-950">{t('dash.noAutosRecorded')}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {t('dash.noAutosDesc')}
                </p>
              </div>
              <button
                id="btn-garage-onboarding"
                onClick={() => navigateTo('vehicles')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-sm cursor-pointer transition"
              >
                {t('dash.addFirstVehicleBtn')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  id={`dashboard-vehicle-card-${v.id}`}
                  onClick={() => navigateTo('vehicle-detail', v.id)}
                  className="text-left p-4 rounded-xl border border-slate-155 hover:border-blue-300 hover:shadow-xs transition group select-none flex flex-col justify-between h-34 w-full bg-slate-50/55 hover:bg-white cursor-pointer"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-slate-400 font-mono leading-none">
                      {v.year} {t('dash.yearSpec')}
                    </p>
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition text-sm truncate max-w-full">
                      {v.make} {v.model}
                    </h4>
                  </div>

                  <div className="flex items-end justify-between pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{t('garage.odometer')}</p>
                      <p className="text-xs font-bold font-mono text-slate-700">
                        {formatDistance(v.currentMileage, unitPreference)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-100 transition">
                      <span className="font-bold">{v.logsCount || 0} {t('dash.logsCount')}</span>
                      <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
