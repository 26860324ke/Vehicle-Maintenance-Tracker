import React from 'react';
import { useAppState } from '../context/AppContext';
import { api } from '../lib/api';
import { ReminderType } from '../types';
import VehicleDetail from './VehicleDetail';

export default function VehicleDetailScreen() {
  const { activeVehicleDetails, navigateTo, refreshAllData, unitPreference } = useAppState();

  if (!activeVehicleDetails) {
    return (
      <div id="no-vehicle-context" className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-3">
        <p className="text-slate-500 text-sm">No vehicle context loaded</p>
        <button
          onClick={() => navigateTo('vehicles')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-5 rounded-xl cursor-pointer shadow"
        >
          Back to Garage
        </button>
      </div>
    );
  }

  const { logs, reminders } = activeVehicleDetails;

  const handleUpdateMileage = async (newMileage: number) => {
    try {
      await api.vehicles.updateMileage(activeVehicleDetails.id, newMileage);
      await refreshAllData();
    } catch (err: any) {
      throw err;
    }
  };

  const handleAddLog = async (data: {
    date: string;
    serviceType: string;
    cost: number;
    mileageAtService: number;
    notes: string;
  }) => {
    try {
      await api.logs.create(activeVehicleDetails.id, data);

      // Auto-schedule subsequent mileage reminder for "next time" maintenance
      const mapping: Record<string, number> = {
        'Oil Change': 5000,
        'Tire Rotation': 8000,
        'Brake Pad Replacement': 30000,
        'Brake Fluid Flush': 30000,
        'Engine Cabin Filter': 25000,
        'Spark Plug Upgrade': 50000,
        'Timing Belt Renewal': 70000,
        'Battery Inspection': 25000,
        'Transmission Fluid Flush': 50000,
        'Coolant Refill': 50000,
        'General Inspection': 8000,
        'General Inspection / Diagnostic': 8000,
      };

      const addVal = mapping[data.serviceType] || 8000;
      const targetMileage = data.mileageAtService + addVal;

      // Complete previous active reminders of this same maintenance category to ensure cleanliness
      const previousMatch = (reminders || []).filter(
        (r) => !r.isCompleted && r.serviceType.toLowerCase() === data.serviceType.trim().toLowerCase()
      );

      for (const oldRem of previousMatch) {
        try {
          await api.reminders.complete(activeVehicleDetails.id, oldRem.id);
        } catch (e) {
          console.warn('Could not auto-complete older matching reminder:', e);
        }
      }

      // Schedule the next wear-alert reminder dynamically
      await api.reminders.create(activeVehicleDetails.id, {
        serviceType: data.serviceType.trim(),
        type: ReminderType.MILEAGE,
        targetMileage,
      });

      await refreshAllData();
    } catch (err: any) {
      throw new Error(err.message || 'Could not save service log');
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await api.logs.delete(activeVehicleDetails.id, logId);
      await refreshAllData();
    } catch (err: any) {
      throw new Error(err.message || 'Could not delete service log');
    }
  };

  const handleAddReminder = async (data: {
    serviceType: string;
    type: ReminderType;
    targetMileage?: number;
    targetDate?: string;
  }) => {
    try {
      await api.reminders.create(activeVehicleDetails.id, data);
      await refreshAllData();
    } catch (err: any) {
      throw new Error(err.message || 'Could not save reminder');
    }
  };

  const handleCompleteReminder = async (remId: string) => {
    try {
      await api.reminders.complete(activeVehicleDetails.id, remId);
      await refreshAllData();
    } catch (err: any) {
      throw new Error(err.message || 'Could not mark reminder complete');
    }
  };

  const handleDeleteReminder = async (remId: string) => {
    try {
      await api.reminders.delete(activeVehicleDetails.id, remId);
      await refreshAllData();
    } catch (err: any) {
      throw new Error(err.message || 'Could not delete reminder');
    }
  };

  return (
    <div id="vehicle-details-screen-container" className="space-y-6">
      <VehicleDetail
        vehicle={activeVehicleDetails}
        logs={logs}
        reminders={reminders}
        onBack={() => navigateTo('vehicles')}
        onUpdateMileage={handleUpdateMileage}
        onAddLog={handleAddLog}
        onDeleteLog={handleDeleteLog}
        onAddReminder={handleAddReminder}
        onCompleteReminder={handleCompleteReminder}
        onDeleteReminder={handleDeleteReminder}
      />
    </div>
  );
}
