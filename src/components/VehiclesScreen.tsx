import React, { useState } from 'react';
import { useAppState } from '../context/AppContext';
import { api } from '../lib/api';
import { Vehicle } from '../types';
import { Plus, X, Info, Gauge } from 'lucide-react';
import { formatDistance, getDistanceLabel } from '../lib/units';
import VehicleList from './VehicleList';
import VehicleForm from './VehicleForm';

export default function VehiclesScreen() {
  const { vehicles, navigateTo, refreshAllData, unitPreference, languagePreference, t } = useAppState();

  // Modal and custom states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [mileageUpdateVehicle, setMileageUpdateVehicle] = useState<Vehicle | null>(null);
  const [newMileageValue, setNewMileageValue] = useState('');
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [deletingVehicleName, setDeletingVehicleName] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFormState = () => {
    setEditingVehicle(null);
    setShowFormModal(false);
    setMileageUpdateVehicle(null);
    setNewMileageValue('');
    setDeletingVehicleId(null);
    setDeletingVehicleName('');
    setDeleteError(null);
  };

  const handleOpenRegister = () => {
    setEditingVehicle(null);
    setShowFormModal(true);
  };

  const handleStartEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowFormModal(true);
  };

  const handleDeleteVehicle = (id: string, name: string) => {
    setDeletingVehicleId(id);
    setDeletingVehicleName(name);
    setDeleteError(null);
  };

  const confirmDeleteVehicle = async () => {
    if (!deletingVehicleId) return;
    try {
      await api.vehicles.delete(deletingVehicleId);
      await refreshAllData();
      resetFormState();
    } catch (err: any) {
      setDeleteError(err.message || (languagePreference === 'zh-TW' ? '無法刪除指定車輛' : 'Could not delete specified vehicle'));
    }
  };

  const handleFormSubmit = async (data: { make: string; model: string; year: number; currentMileage: number; vin: string }) => {
    setIsSubmitting(true);
    try {
      if (editingVehicle) {
        // UPDATE Existing
        await api.vehicles.update(editingVehicle.id, {
          make: data.make,
          model: data.model,
          year: data.year,
          vin: data.vin,
          currentMileage: editingVehicle.currentMileage, // Preserve existing odometer value
        });
      } else {
        // CREATE New
        await api.vehicles.create({
          make: data.make,
          model: data.model,
          year: data.year,
          vin: data.vin,
          currentMileage: data.currentMileage,
        });
      }
      await refreshAllData();
      resetFormState();
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartLogMileage = (vehicle: Vehicle) => {
    setMileageUpdateVehicle(vehicle);
    setNewMileageValue(vehicle.currentMileage.toString());
  };

  const handleQuickMileageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mileageUpdateVehicle) return;

    const milNum = Number(newMileageValue);
    if (isNaN(milNum) || milNum < 0) {
      alert(languagePreference === 'zh-TW' ? '里程錶數值不得為負數。' : 'Odometer value cannot be negative.');
      return;
    }

    try {
      await api.vehicles.updateMileage(mileageUpdateVehicle.id, milNum);
      await refreshAllData();
      resetFormState();
    } catch (err: any) {
      const errMsg = languagePreference === 'zh-TW'
        ? `無法更新里程計單位`
        : `Could not update odometer ${getDistanceLabel(unitPreference)}`;
      alert(err.message || errMsg);
    }
  };

  return (
    <div id="vehicles-screen-root" className="space-y-6">
      {/* Upper header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-sans tracking-tight">
            {t('garage.title')}
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {t('garage.desc')}
          </p>
        </div>
        <button
          id="btn-add-vehicle-top"
          onClick={handleOpenRegister}
          className="self-start sm:self-center bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow transition duration-150 cursor-pointer flex items-center space-x-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>{t('garage.addNew')}</span>
        </button>
      </div>

      {/* Grid of registered vehicles cards */}
      <VehicleList
        vehicles={vehicles}
        onEdit={handleStartEdit}
        onDelete={handleDeleteVehicle}
        onLogMileage={handleStartLogMileage}
        onSelect={(id) => navigateTo('vehicle-detail', id)}
        onAddClick={handleOpenRegister}
      />

      {/* Register/Edit profile popup Modal form */}
      {showFormModal && (
        <VehicleForm
          vehicle={editingVehicle}
          onSubmit={handleFormSubmit}
          onClose={resetFormState}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Fast mileage adjust picker overlay */}
      {mileageUpdateVehicle && (
        <div id="quick-mileage-update-modal" className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden transform scale-95 md:scale-100 transition duration-300">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
                {languagePreference === 'zh-TW' ? '登錄最新行車里程錶數值' : 'Log New Odometer Reading'}
              </h3>
              <button 
                id="btn-close-mileage-modal"
                onClick={resetFormState} 
                className="text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickMileageUpdate} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                <p className="text-slate-550 font-medium">{t('garage.selectedVehicle')}</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {mileageUpdateVehicle.year} {mileageUpdateVehicle.make} {mileageUpdateVehicle.model}
                </p>
                <p className="mt-1 text-slate-500 text-[10px]">
                  {t('garage.currentRecord')}: <span className="font-bold font-mono text-slate-800">{formatDistance(mileageUpdateVehicle.currentMileage, unitPreference)}</span>
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{languagePreference === 'zh-TW' ? '新累積里程錶數值' : 'New Odometer Value'} ({getDistanceLabel(unitPreference)})</label>
                <input
                  id="input-mileage-val"
                  type="number"
                  required
                  min="0"
                  value={newMileageValue}
                  onChange={(e) => setNewMileageValue(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {Number(newMileageValue) < mileageUpdateVehicle.currentMileage && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-amber-800 text-[11px] leading-relaxed">
                  ⚠️ {languagePreference === 'zh-TW' 
                    ? '重要提示：您輸入的里程數低於目前記錄，這將促使里程計數倒退，但您仍可點擊下方儲存。' 
                    : 'Note: You are entering a mileage lower than currently recorded, which will roll back the odometer.'}
                </div>
              )}

              <div className="flex items-start space-x-2 text-[10px] text-slate-400">
                <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>{languagePreference === 'zh-TW' ? '調進里程錶讀數時，系統會立即重新審查所有耗材及零件通知，即時更新警報狀態。' : 'Advancing the odometer updates notification thresholds, instantly auditing alerts that are due.'}</span>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  id="btn-cancel-mileage-update"
                  type="button"
                  onClick={resetFormState}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  id="btn-save-mileage-update"
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  {languagePreference === 'zh-TW' ? '儲存行車里程' : 'Save Reading'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Vehicle Confirmation Modal */}
      {deletingVehicleId && (
        <div id="delete-vehicle-modal" className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden transform scale-95 md:scale-100 transition duration-300">
            <div className="bg-red-600 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
                {languagePreference === 'zh-TW' ? '確認刪除車輛' : 'Confirm Vehicle Deletion'}
              </h3>
              <button 
                id="btn-close-delete-vehicle-modal"
                onClick={resetFormState} 
                className="text-white hover:text-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-800">
                <p className="font-bold text-xs">
                  {languagePreference === 'zh-TW' 
                    ? `確定要刪除「${deletingVehicleName}」？` 
                    : `Delete "${deletingVehicleName}"?`}
                </p>
                <p className="mt-2 text-[11px] text-red-700 leading-relaxed">
                  {languagePreference === 'zh-TW' 
                    ? '該車輛的所有歷史保養紀錄及已設定的排程提醒將會被永久移除且無法還原。'
                    : 'All historical service items and scheduled reminders for this vehicle will retrieve permanent removal.'}
                </p>
              </div>

              {deleteError && (
                <p id="delete-vehicle-error" className="text-red-700 font-semibold text-[10px] bg-red-50 p-2 rounded-lg">
                  {deleteError}
                </p>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  id="btn-cancel-delete-vehicle"
                  type="button"
                  onClick={resetFormState}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  id="btn-confirm-delete-vehicle-action"
                  onClick={confirmDeleteVehicle}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  {languagePreference === 'zh-TW' ? '確認永久刪除' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
