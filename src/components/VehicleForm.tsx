import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Vehicle } from '../types';
import { useAppState } from '../context/AppContext';
import { getDistanceLabel, getDistanceUnit } from '../lib/units';

interface VehicleFormProps {
  vehicle: Vehicle | null; // Null means we are ADDING a vehicle
  onSubmit: (data: { make: string; model: string; year: number; currentMileage: number; vin: string }) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export default function VehicleForm({
  vehicle,
  onSubmit,
  onClose,
  isSubmitting,
}: VehicleFormProps) {
  const { unitPreference, t } = useAppState();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [currentMileage, setCurrentMileage] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setMake(vehicle.make);
      setModel(vehicle.model);
      setYear(vehicle.year?.toString() || '');
      setCurrentMileage(vehicle.currentMileage?.toString() || '0');
    } else {
      setMake('');
      setModel('');
      setYear(new Date().getFullYear().toString());
      setCurrentMileage('');
    }
    setErrorText(null);
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (!make.trim() || !model.trim() || !year.trim()) {
      setErrorText('Please fill in the Make, Model, and Year.');
      return;
    }

    if (!vehicle && !currentMileage.trim()) {
      setErrorText(`Please provide initial starting ${getDistanceLabel(unitPreference)}.`);
      return;
    }

    const yearNum = Number(year);
    const mileageNum = Number(currentMileage || 0);

    if (isNaN(yearNum) || yearNum < 1920 || yearNum > new Date().getFullYear() + 2) {
      setErrorText('Please enter a realistic manufacturing year.');
      return;
    }

    if (isNaN(mileageNum) || mileageNum < 0) {
      setErrorText(`Current odometer ${getDistanceLabel(unitPreference)} cannot be negative.`);
      return;
    }

    try {
      await onSubmit({
        make: make.trim(),
        model: model.trim(),
        year: yearNum,
        currentMileage: mileageNum,
        vin: '',
      });
    } catch (err: any) {
      setErrorText(err.message || 'Error occurred while saving vehicle profile.');
    }
  };

  return (
    <div id="vehicle-form-modal-container" className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-150 overflow-hidden transform scale-95 md:scale-100 transition-all duration-300">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
            {vehicle ? t('form.editHeading') : t('form.addHeading')}
          </h3>
          <button 
            id="btn-close-form"
            onClick={onClose} 
            className="text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorText && (
            <div id="form-error-banner" className="bg-red-50 text-red-700 p-3 rounded-lg text-xs border border-red-100 font-medium">
              {errorText}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Make *</label>
              <input
                id="input-make"
                type="text"
                required
                placeholder="e.g. Toyota"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Model *</label>
              <input
                id="input-model"
                type="text"
                required
                placeholder="e.g. Camry"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Year/Production *</label>
              <input
                id="input-year"
                type="number"
                required
                min="1920"
                max={new Date().getFullYear() + 2}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {vehicle ? `Odometer (${getDistanceUnit(unitPreference).toUpperCase()})` : `Starting (${getDistanceUnit(unitPreference).toUpperCase()}) *`}
              </label>
              <input
                id="input-mileage"
                type="number"
                required={!vehicle}
                min="0"
                placeholder={unitPreference === 'metric' ? "e.g. 80000" : "e.g. 52000"}
                value={currentMileage}
                onChange={(e) => setCurrentMileage(e.target.value)}
                disabled={!!vehicle}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              id="btn-cancel-submit"
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-submit-form"
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center space-x-1"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Saving changes...' : vehicle ? 'Save Profile' : 'Register Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
