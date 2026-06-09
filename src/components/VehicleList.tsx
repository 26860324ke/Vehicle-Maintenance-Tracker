import React from 'react';
import { Car, Gauge, Edit2, Trash2, ArrowUpRight } from 'lucide-react';
import { Vehicle } from '../types';
import { useAppState } from '../context/AppContext';
import { formatDistance, getDistanceLabel } from '../lib/units';

interface VehicleListProps {
  vehicles: Vehicle[];
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string, name: string) => void;
  onLogMileage: (vehicle: Vehicle) => void;
  onSelect: (id: string) => void;
  onAddClick: () => void;
}

export default function VehicleList({
  vehicles,
  onEdit,
  onDelete,
  onLogMileage,
  onSelect,
  onAddClick,
}: VehicleListProps) {
  const { unitPreference, languagePreference, t } = useAppState();

  if (vehicles.length === 0) {
    return (
      <div id="no-vehicles-card" className="bg-white border border-slate-100 p-12 text-center rounded-2xl shadow-sm text-slate-505 space-y-4">
        <div className="h-14 w-14 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <Car className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{t('garage.noVehicles')}</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {t('garage.addPrompt')}
          </p>
        </div>
        <button
          id="btn-register-first"
          onClick={onAddClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-5 rounded-xl shadow transition cursor-pointer"
        >
          {t('garage.registerFirst')}
        </button>
      </div>
    );
  }

  return (
    <div id="vehicle-grid-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vehicles.map((v) => {
        const displayName = `${v.year} ${v.make} ${v.model}`;
        return (
          <div 
            key={v.id} 
            id={`vehicle-card-${v.id}`}
            className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col hover:shadow-md transition duration-200 overflow-hidden"
          >
            {/* Visual Top Bar Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Car className="h-4 w-4 text-blue-400 shrink-0" />
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  id={`btn-edit-veh-${v.id}`}
                  onClick={() => onEdit(v)}
                  className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title={languagePreference === 'zh-TW' ? '編輯車輛資訊' : "Edit vehicle details"}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  id={`btn-delete-veh-${v.id}`}
                  onClick={() => onDelete(v.id, displayName)}
                  className="text-slate-300 hover:text-red-400 p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title={languagePreference === 'zh-TW' ? '永久刪除車輛' : "Delete vehicle permanently"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Quick specifications and status blocks */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base font-sans line-clamp-1">
                  {displayName}
                </h3>
                <div className="flex items-center space-x-1 text-slate-500 text-xs">
                  <Gauge className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{languagePreference === 'zh-TW' ? '目前里程數：' : `Current ${getDistanceLabel(unitPreference)}:`}</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatDistance(v.currentMileage, unitPreference)}
                  </span>
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl text-xs">
                <div>
                  <span className="block text-slate-500 font-medium text-[10px] uppercase tracking-wider">{languagePreference === 'zh-TW' ? '保養日誌數' : 'Service Logs'}</span>
                  <span className="font-bold text-slate-900 font-mono text-xs">
                    {v.logsCount || 0} {languagePreference === 'zh-TW' ? '筆紀錄' : 'logs registered'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 font-medium text-[10px] uppercase tracking-wider">{languagePreference === 'zh-TW' ? '提醒警報數' : 'Alert Reminders'}</span>
                  <span className="font-bold text-slate-900 font-mono text-xs">
                    {v.remindersCount || 0} {languagePreference === 'zh-TW' ? '項提醒作用中' : 'active alert'}
                  </span>
                </div>
              </div>

              {/* Action trigger hooks */}
              <div className="flex gap-2.5 pt-1">
                <button
                  id={`btn-log-km-${v.id}`}
                  onClick={() => onLogMileage(v)}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2 rounded-xl text-center cursor-pointer transition flex items-center justify-center space-x-1"
                >
                  <Gauge className="h-3.5 w-3.5" />
                  <span>{languagePreference === 'zh-TW' ? '登錄里程' : 'Update Odo'}</span>
                </button>
                
                <button
                  id={`btn-details-${v.id}`}
                  onClick={() => onSelect(v.id)}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs py-2 rounded-xl text-center cursor-pointer transition flex items-center justify-center space-x-1 group"
                >
                  <span>{languagePreference === 'zh-TW' ? '進入規格保養' : 'Inspection Specs'}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
