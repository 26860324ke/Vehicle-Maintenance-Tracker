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

  const serviceTypesMatch = (type1: string, type2: string): boolean => {
    const t1 = type1.trim().toLowerCase();
    const t2 = type2.trim().toLowerCase();
    if (t1 === t2) return true;

    const langMap: Record<string, string> = {
      'oil change': '機油與油芯更換',
      'tire rotation': '輪胎對調與平衡',
      'brake pad replacement': '煞車片更換',
      'brake fluid flush': '煞車油更換',
      'engine cabin filter': '引擎或冷氣濾網',
      'spark plug upgrade': '火星塞升級與更換',
      'timing belt renewal': '正時皮帶/皮帶更換',
      'battery inspection': '電瓶檢測與更換',
      'transmission fluid flush': '變速箱油更換',
      'coolant refill': '水箱冷卻液補充/更換',
      'general inspection': '常規全車檢查 / 診斷',
      'general inspection / diagnostic': '常規全車檢查 / 診斷',
      'other repair': '其他特定維修項目',
      'other specific repair': '其他特定維修項目'
    };

    for (const [en, zh] of Object.entries(langMap)) {
      const enLower = en.toLowerCase();
      const zhLower = zh.toLowerCase();
      
      if ((t1 === enLower && t2 === zhLower) || (t1 === zhLower && t2 === enLower)) {
        return true;
      }
    }

    return false;
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
        '機油與油芯更換': 5000,
        'Tire Rotation': 8000,
        '輪胎對調與平衡': 8000,
        'Brake Pad Replacement': 30000,
        '煞車片更換': 30000,
        'Brake Fluid Flush': 30000,
        '煞車油更換': 30000,
        'Engine Cabin Filter': 25000,
        '引擎或冷氣濾網': 25000,
        'Spark Plug Upgrade': 50000,
        '火星塞升級與更換': 50000,
        'Timing Belt Renewal': 70000,
        '正時皮帶/皮帶更換': 70000,
        'Battery Inspection': 25000,
        '電瓶檢測與更換': 25000,
        'Transmission Fluid Flush': 50000,
        '變速箱油更換': 50000,
        'Coolant Refill': 50000,
        '水箱冷卻液補充/更換': 50000,
        'General Inspection': 8000,
        'General Inspection / Diagnostic': 8000,
        '常規全車檢查 / 診斷': 8000,
      };

      const addVal = mapping[data.serviceType] || 8000;
      const targetMileage = data.mileageAtService + addVal;

      // Complete previous active reminders of this same maintenance category to ensure cleanliness
      const previousMatch = (reminders || []).filter(
        (r) => !r.isCompleted && serviceTypesMatch(r.serviceType, data.serviceType)
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
      const reminder = (reminders || []).find(r => r.id === remId);
      await api.reminders.complete(activeVehicleDetails.id, remId);

      // Auto-create service history log for completed category trace to enrich logging flow
      if (reminder) {
        try {
          await api.logs.create(activeVehicleDetails.id, {
            date: new Date().toISOString().split('T')[0],
            serviceType: reminder.serviceType,
            cost: 0,
            mileageAtService: activeVehicleDetails.currentMileage,
            notes: `Completed from alert reminder: ${reminder.serviceType}`,
          });
        } catch (errLog) {
          console.warn('Could not auto-add maintenance log trace for completed reminder:', errLog);
        }
      }

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
