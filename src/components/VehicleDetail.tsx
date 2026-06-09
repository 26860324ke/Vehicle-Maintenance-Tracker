import React, { useState } from 'react';
import { 
  ArrowLeft, Calendar, DollarSign, Gauge, Edit, Info, X 
} from 'lucide-react';
import { Vehicle, ReminderType } from '../types';
import { useAppState } from '../context/AppContext';
import { formatDistance, getDistanceLabel, getDistanceUnit } from '../lib/units';
import { formatCurrencyValue } from '../lib/i18n';
import MaintenanceHistory from './MaintenanceHistory';
import ReminderManager from './ReminderManager';

interface VehicleDetailProps {
  vehicle: Vehicle;
  logs: any[];
  reminders: any[];
  onBack: () => void;
  onUpdateMileage: (newMileage: number) => Promise<void>;
  onAddLog: (data: {
    date: string;
    serviceType: string;
    cost: number;
    mileageAtService: number;
    notes: string;
  }) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
  onAddReminder: (data: {
    serviceType: string;
    type: ReminderType;
    targetMileage?: number;
    targetDate?: string;
  }) => Promise<void>;
  onCompleteReminder: (id: string) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
}

export default function VehicleDetail({
  vehicle,
  logs,
  reminders,
  onBack,
  onUpdateMileage,
  onAddLog,
  onDeleteLog,
  onAddReminder,
  onCompleteReminder,
  onDeleteReminder,
}: VehicleDetailProps) {
  const { unitPreference, currencyPreference, languagePreference, t } = useAppState();
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [mileageInputValue, setMileageInputValue] = useState(vehicle.currentMileage.toString());
  const [isSavingMileage, setIsSavingMileage] = useState(false);
  const [mileageError, setMileageError] = useState<string | null>(null);

  const totalSpend = logs.reduce((acc, curr) => acc + (curr.cost || 0), 0);

  const handleMileageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMileageError(null);
    const milNum = Number(mileageInputValue);

    if (isNaN(milNum) || milNum < 0) {
      setMileageError(languagePreference === 'zh-TW' ? '里程錶數值不得為負數。' : 'Odometer reading cannot be negative.');
      return;
    }

    if (milNum < vehicle.currentMileage) {
      const rollbackConfirm = languagePreference === 'zh-TW'
        ? '新輸入的里程錶數值低於目前系統登記之紀錄。您確定要將里程錶往回設定嗎？'
        : 'The value is lower than current record. Confirm rolling back odometer?';
      if (!window.confirm(rollbackConfirm)) {
        return;
      }
    }

    setIsSavingMileage(true);
    try {
      await onUpdateMileage(milNum);
      setShowMileageModal(false);
    } catch (err: any) {
      setMileageError(err.message || (languagePreference === 'zh-TW' ? '里程錶更新失敗' : 'Failed to update mileage'));
    } finally {
      setIsSavingMileage(false);
    }
  };

  return (
    <div id="vehicle-details-view" className="space-y-6 text-slate-900">
      
      {/* Detail Header Back Bar */}
      <div className="flex items-center space-x-3">
        <button
          id="btn-back-to-garage"
          onClick={onBack}
          className="bg-white hover:bg-slate-55 border border-slate-200 text-slate-700 p-2.5 rounded-xl transition cursor-pointer shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase font-mono">{t('detail.specSheets')}</span>
          <h1 className="text-xl font-bold text-slate-900 font-sans leading-none mt-0.5">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
        </div>
      </div>

      {/* Profile Specifications & Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Vehicle Identity */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 md:col-span-2 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">{t('detail.registeredIdentity')}</span>
            <h2 className="text-xl font-bold font-sans mt-0.5">{vehicle.make} {vehicle.model}</h2>
          </div>
          <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
            {t('detail.registeredOn')} {new Date(vehicle.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Current Odometer Column (Includes required custom current mileage modifier) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shrink-0">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('garage.odometer')}</span>
              <span className="text-lg font-bold font-mono text-slate-900 leading-none">
                {vehicle.currentMileage.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {languagePreference === 'zh-TW' ? `已登錄里程 (${getDistanceUnit(unitPreference)})` : `${getDistanceLabel(unitPreference)} logged`}
              </span>
            </div>
          </div>
          
          <button
            id="btn-update-mileage-detail"
            onClick={() => {
              setMileageInputValue(vehicle.currentMileage.toString());
              setMileageError(null);
              setShowMileageModal(true);
            }}
            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs py-1.5 rounded-xl border border-slate-200 mt-3 transition flex items-center justify-center space-x-1 cursor-pointer"
          >
            <Edit className="h-3 w-3" />
            <span>{t('detail.updateCurrent')}</span>
          </button>
        </div>

        {/* Financial spend metrics dashboard card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center space-x-3.5 shadow-sm">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('detail.totalSpend')}</span>
            <span className="text-lg font-bold font-mono text-slate-900 leading-none">
              {formatCurrencyValue(totalSpend, currencyPreference, languagePreference)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{languagePreference === 'zh-TW' ? '車輛保養總和花費' : 'cumulative maintenance spend'}</span>
          </div>
        </div>
      </div>

      {/* Functional Timelines Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <ReminderManager
            reminders={reminders}
            currentMileage={vehicle.currentMileage}
            onAddReminder={onAddReminder}
            onCompleteReminder={onCompleteReminder}
            onDeleteReminder={onDeleteReminder}
          />
        </div>
        <div className="lg:col-span-2">
          <MaintenanceHistory
            logs={logs}
            currentMileage={vehicle.currentMileage}
            onAddLog={onAddLog}
            onDeleteLog={onDeleteLog}
          />
        </div>
      </div>

      {/* QUICK MILEAGE ODOMETER MODIFIER WINDOW MODAL */}
      {showMileageModal && (
        <div id="quick-mileage-modal" className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden transform scale-95 md:scale-100 transition-all duration-300">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
                {languagePreference === 'zh-TW' ? '登錄最新行車里程錶數值' : 'Log New Odometer Reading'}
              </h3>
              <button 
                onClick={() => setShowMileageModal(false)}
                className="text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMileageSubmit} className="p-5 space-y-4">
              {mileageError && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-100 font-semibold text-[11px]">
                  {mileageError}
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{languagePreference === 'zh-TW' ? '目前系統已記錄里程' : 'Current Logged Milestone'}</span>
                <span className="text-sm font-bold font-mono text-slate-800">{formatDistance(vehicle.currentMileage, unitPreference)}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{languagePreference === 'zh-TW' ? '新累積里程錶數值' : 'New Odometer Value'} ({getDistanceLabel(unitPreference)})</label>
                <div className="relative mt-1">
                  <input
                    id="input-quick-mileage-value"
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 104500"
                    value={mileageInputValue}
                    onChange={(e) => setMileageInputValue(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 font-mono">
                    {getDistanceUnit(unitPreference)}
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2 text-[10px] text-slate-500">
                <Info className="h-4 w-4 text-blue-500 shrink-0" />
                <span>{languagePreference === 'zh-TW' ? '調進里程錶讀數時，系統會立即重新審查所有耗材及零件通知，即時更新警報狀態。' : 'Advancing the odometer updates notification thresholds, instantly auditing alerts that are due.'}</span>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMileageModal(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingMileage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSavingMileage ? (languagePreference === 'zh-TW' ? '正在儲存...' : 'Saving...') : (languagePreference === 'zh-TW' ? '儲存行車里程' : 'Save Reading')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export { ReminderType };
