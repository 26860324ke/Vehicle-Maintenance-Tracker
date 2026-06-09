/**
 * Offline-First API Service Client
 * Runs completely in-memory and persists data securely to browser's LocalStorage.
 * No backend/server requests needed. Purely front-end only.
 */

import { User, Vehicle, MaintenanceLog, Reminder, ReminderType, AuthResponse, VehicleWithDetails } from '../types';

// Storage Helper Keys
const USERS_KEY = 'drivecare_users';
const VEHICLES_KEY = 'drivecare_vehicles';
const REMINDERS_KEY = 'drivecare_reminders';
const LOGS_KEY = 'drivecare_logs';
const TOKEN_KEY = 'vmt_token';
const INITIALIZED_KEY = 'drivecare_local_initialized';

// Standard localStorage drivers
function getLocalUsers(): User[] {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getLocalVehicles(): Vehicle[] {
  const data = localStorage.getItem(VEHICLES_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalVehicles(vehicles: Vehicle[]) {
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
}

function getLocalReminders(): Reminder[] {
  const data = localStorage.getItem(REMINDERS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalReminders(reminders: Reminder[]) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

function getLocalLogs(): MaintenanceLog[] {
  const data = localStorage.getItem(LOGS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalLogs(logs: MaintenanceLog[]) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

// Global active auth token state
let authToken: string | null = localStorage.getItem(TOKEN_KEY);

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getToken(): string | null {
  return authToken;
}

// Helper to deduce the active user from the local security token
function getCurrentUserId(): string {
  if (!authToken) {
    throw new Error('Authentication required');
  }
  // Standard token format: local-token-{userId}
  if (authToken.startsWith('local-token-')) {
    return authToken.replace('local-token-', '');
  }
  return 'default-user-id';
}

// -------------------------------------------------------------
// SEED INITIAL DATABASE FOR RECIPIENT ON THE FIRST LOAD
// -------------------------------------------------------------
function initializeLocalDatabase() {
  const isInitialized = localStorage.getItem(INITIALIZED_KEY);
  if (isInitialized === 'true') {
    return;
  }

  // Create default driver account (custom-mapped using metadata context)
  const defaultUserId = 'default-user-id';
  const defaultUser: User = {
    id: defaultUserId,
    email: 'kevintony477@gmail.com',
    name: 'Kevin',
    passwordHash: '',
    createdAt: new Date().toISOString(),
  };

  const users = getLocalUsers();
  if (!users.some(u => u.id === defaultUserId)) {
    users.push(defaultUser);
    saveLocalUsers(users);
  }

  // Seed sample vehicle (Toyotal RAV4 Hybrid)
  const sampleVehicleId = 'sample-vehicle-1';
  const sampleVehicle: Vehicle = {
    id: sampleVehicleId,
    userId: defaultUserId,
    make: 'Toyota',
    model: 'RAV4 Hybrid',
    year: 2022,
    vin: 'JT3DWRFF5ND012345',
    currentMileage: 48500,
    createdAt: new Date().toISOString(),
  };

  const vehicles = getLocalVehicles();
  if (!vehicles.some(v => v.id === sampleVehicleId)) {
    vehicles.push(sampleVehicle);
    saveLocalVehicles(vehicles);
  }

  // Seed recent historical service logs
  const logs = getLocalLogs();
  const sampleLogs: MaintenanceLog[] = [
    {
      id: 'sample-log-1',
      vehicleId: sampleVehicleId,
      date: '2026-04-15',
      serviceType: 'Oil Change',
      cost: 120,
      mileageAtService: 45000,
      notes: 'Full synthetic oil change and filter replacement. Fluids topped up.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-log-2',
      vehicleId: sampleVehicleId,
      date: '2026-02-10',
      serviceType: 'Tire Rotation',
      cost: 45,
      mileageAtService: 42000,
      notes: 'Rotated and balanced tires. Inspected tread depth.',
      createdAt: new Date().toISOString(),
    },
  ];

  for (const log of sampleLogs) {
    if (!logs.some(l => l.id === log.id)) {
      logs.push(log);
    }
  }
  saveLocalLogs(logs);

  // Seed standard active maintenance reminder
  const reminders = getLocalReminders();
  const sampleReminders: Reminder[] = [
    {
      id: 'sample-reminder-1',
      vehicleId: sampleVehicleId,
      serviceType: 'Oil Change',
      type: ReminderType.MILEAGE,
      targetMileage: 50000, // 48,500 active + 1,500 remaining till event
      isCompleted: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-reminder-2',
      vehicleId: sampleVehicleId,
      serviceType: 'Brake Fluid Flush',
      type: ReminderType.DATE,
      targetDate: '2026-12-15',
      isCompleted: false,
      createdAt: new Date().toISOString(),
    },
  ];

  for (const reminder of sampleReminders) {
    if (!reminders.some(r => r.id === reminder.id)) {
      reminders.push(reminder);
    }
  }
  saveLocalReminders(reminders);

  // Auto sign-in the default profile so they enter directly with data
  setToken('local-token-default-user-id');

  // Mark installation as completed
  localStorage.setItem(INITIALIZED_KEY, 'true');
}

// Safe invocation of datastore seed
initializeLocalDatabase();

// Standard Async Delayer helper to mock real latency nicely
const delay = (ms = 120) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // Authentication services
  auth: {
    register: async (data: { email: string; name: string; password: string }): Promise<AuthResponse> => {
      await delay(180);
      const users = getLocalUsers();
      const normalizedEmail = data.email.toLowerCase().trim();
      
      if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
        throw new Error('Email address already registered.');
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        name: data.name.trim(),
        passwordHash: '',
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      saveLocalUsers(users);

      const tokenVal = `local-token-${newUser.id}`;
      setToken(tokenVal);

      return {
        token: tokenVal,
        user: newUser,
      };
    },

    login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
      await delay(150);
      const users = getLocalUsers();
      const normalizedEmail = data.email.toLowerCase().trim();
      
      const matchedUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (!matchedUser) {
        throw new Error('User not found. Try registering instead!');
      }

      const tokenVal = `local-token-${matchedUser.id}`;
      setToken(tokenVal);

      return {
        token: tokenVal,
        user: matchedUser,
      };
    },

    me: async (): Promise<{ user: Omit<User, 'passwordHash'> }> => {
      await delay(50);
      const currentUserId = getCurrentUserId();
      const users = getLocalUsers();
      const user = users.find(u => u.id === currentUserId);
      
      if (!user) {
        throw new Error('Session expired or user deleted.');
      }

      return { user };
    },
  },

  // Vehicle Management services
  vehicles: {
    list: async (): Promise<Array<Vehicle & { logsCount: number; remindersCount: number; lastServiceDate: string; totalSpend: number; totalSpendThisYear: number }>> => {
      await delay(100);
      const currentUserId = getCurrentUserId();
      const vehicles = getLocalVehicles().filter(v => v.userId === currentUserId);
      
      const logs = getLocalLogs();
      const reminders = getLocalReminders();
      const currentYearStr = new Date().getFullYear().toString();

      return vehicles.map(v => {
        const vLogs = logs.filter(l => l.vehicleId === v.id);
        const vReminders = reminders.filter(r => r.vehicleId === v.id && !r.isCompleted);

        const totalSpend = vLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
        const totalSpendThisYear = vLogs
          .filter(log => log.date && log.date.startsWith(currentYearStr))
          .reduce((sum, log) => sum + (log.cost || 0), 0);

        const sortedLogs = [...vLogs].sort((a, b) => b.date.localeCompare(a.date));

        return {
          ...v,
          logsCount: vLogs.length,
          remindersCount: vReminders.length,
          lastServiceDate: sortedLogs[0]?.date || 'No logs',
          totalSpend,
          totalSpendThisYear,
        };
      });
    },

    get: async (id: string): Promise<Vehicle & { logs: MaintenanceLog[]; reminders: Reminder[] }> => {
      await delay(100);
      const currentUserId = getCurrentUserId();
      const vehicles = getLocalVehicles();
      const vehicle = vehicles.find(v => v.id === id);

      if (!vehicle || vehicle.userId !== currentUserId) {
        throw new Error('Vehicle context not found or unauthorized access.');
      }

      const logs = getLocalLogs()
        .filter(l => l.vehicleId === id)
        .sort((a, b) => b.date.localeCompare(a.date));

      const reminders = getLocalReminders()
        .filter(r => r.vehicleId === id);

      return {
        ...vehicle,
        logs,
        reminders,
      };
    },

    create: async (data: Omit<Vehicle, 'id' | 'userId' | 'createdAt'>): Promise<Vehicle> => {
      await delay(120);
      const currentUserId = getCurrentUserId();
      const newVehicle: Vehicle = {
        id: crypto.randomUUID(),
        userId: currentUserId,
        make: data.make.trim(),
        model: data.model.trim(),
        year: Number(data.year),
        vin: (data.vin || '').toUpperCase().trim(),
        currentMileage: Number(data.currentMileage),
        createdAt: new Date().toISOString(),
      };

      const vehicles = getLocalVehicles();
      vehicles.push(newVehicle);
      saveLocalVehicles(vehicles);

      return newVehicle;
    },

    update: async (id: string, data: Partial<Omit<Vehicle, 'id' | 'userId' | 'createdAt'>>): Promise<Vehicle> => {
      await delay(100);
      const currentUserId = getCurrentUserId();
      const vehicles = getLocalVehicles();
      const idx = vehicles.findIndex(v => v.id === id && v.userId === currentUserId);

      if (idx === -1) {
        throw new Error('Vehicle not found or unauthorized.');
      }

      const updatedVehicle = {
        ...vehicles[idx],
        ...data,
      };

      if (data.make !== undefined) updatedVehicle.make = data.make.trim();
      if (data.model !== undefined) updatedVehicle.model = data.model.trim();
      if (data.year !== undefined) updatedVehicle.year = Number(data.year);
      if (data.vin !== undefined) updatedVehicle.vin = data.vin.toUpperCase().trim();
      if (data.currentMileage !== undefined) updatedVehicle.currentMileage = Number(data.currentMileage);

      vehicles[idx] = updatedVehicle;
      saveLocalVehicles(vehicles);

      return updatedVehicle;
    },

    updateMileage: async (id: string, mileage: number): Promise<Vehicle> => {
      await delay(80);
      const currentUserId = getCurrentUserId();
      const vehicles = getLocalVehicles();
      const idx = vehicles.findIndex(v => v.id === id && v.userId === currentUserId);

      if (idx === -1) {
        throw new Error('Vehicle not found.');
      }

      vehicles[idx].currentMileage = Number(mileage);
      saveLocalVehicles(vehicles);

      return vehicles[idx];
    },

    delete: async (id: string): Promise<{ message: string }> => {
      await delay(120);
      const currentUserId = getCurrentUserId();
      const vehicles = getLocalVehicles();
      const filteredVehicles = vehicles.filter(v => !(v.id === id && v.userId === currentUserId));

      if (vehicles.length === filteredVehicles.length) {
        throw new Error('Vehicle not found.');
      }

      saveLocalVehicles(filteredVehicles);

      // Cascade deletes for logs and reminders
      const logs = getLocalLogs().filter(l => l.vehicleId !== id);
      saveLocalLogs(logs);

      const reminders = getLocalReminders().filter(r => r.vehicleId !== id);
      saveLocalReminders(reminders);

      return { message: 'Vehicle deleted successfully!' };
    },
  },

  // Service Logs / Maintenance Logs
  logs: {
    list: async (vehicleId: string): Promise<MaintenanceLog[]> => {
      await delay(80);
      return getLocalLogs()
        .filter(l => l.vehicleId === vehicleId)
        .sort((a, b) => b.date.localeCompare(a.date));
    },

    create: async (vehicleId: string, data: Omit<MaintenanceLog, 'id' | 'vehicleId' | 'createdAt'>): Promise<MaintenanceLog> => {
      await delay(100);
      const newLog: MaintenanceLog = {
        id: crypto.randomUUID(),
        vehicleId,
        date: data.date,
        serviceType: data.serviceType,
        cost: Number(data.cost),
        mileageAtService: Number(data.mileageAtService),
        notes: (data.notes || '').trim(),
        createdAt: new Date().toISOString(),
      };

      const logs = getLocalLogs();
      logs.push(newLog);
      saveLocalLogs(logs);

      return newLog;
    },

    update: async (vehicleId: string, id: string, data: Partial<Omit<MaintenanceLog, 'id' | 'vehicleId' | 'createdAt'>>): Promise<MaintenanceLog> => {
      await delay(100);
      const logs = getLocalLogs();
      const idx = logs.findIndex(l => l.id === id && l.vehicleId === vehicleId);

      if (idx === -1) {
        throw new Error('Service record not found.');
      }

      const updated = {
        ...logs[idx],
        ...data,
      };

      if (data.cost !== undefined) updated.cost = Number(data.cost);
      if (data.mileageAtService !== undefined) updated.mileageAtService = Number(data.mileageAtService);
      if (data.notes !== undefined) updated.notes = data.notes.trim();

      logs[idx] = updated;
      saveLocalLogs(logs);

      return updated;
    },

    delete: async (vehicleId: string, id: string): Promise<{ message: string }> => {
      await delay(80);
      const logs = getLocalLogs();
      const filtered = logs.filter(l => !(l.id === id && l.vehicleId === vehicleId));

      if (logs.length === filtered.length) {
        throw new Error('Service record not found.');
      }

      saveLocalLogs(filtered);
      return { message: 'Service log record deleted successfully!' };
    },
  },

  // Reminders / Alerts
  reminders: {
    list: async (vehicleId: string): Promise<Reminder[]> => {
      await delay(80);
      return getLocalReminders().filter(r => r.vehicleId === vehicleId);
    },

    create: async (vehicleId: string, data: Omit<Reminder, 'id' | 'vehicleId' | 'createdAt' | 'isCompleted'>): Promise<Reminder> => {
      await delay(100);
      const newReminder: Reminder = {
        id: crypto.randomUUID(),
        vehicleId,
        serviceType: data.serviceType,
        type: data.type,
        targetMileage: data.targetMileage ? Number(data.targetMileage) : undefined,
        targetDate: data.targetDate,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };

      const reminders = getLocalReminders();
      reminders.push(newReminder);
      saveLocalReminders(reminders);

      return newReminder;
    },

    update: async (vehicleId: string, id: string, data: Partial<Omit<Reminder, 'id' | 'vehicleId' | 'createdAt'>>): Promise<Reminder> => {
      await delay(100);
      const reminders = getLocalReminders();
      const idx = reminders.findIndex(r => r.id === id && r.vehicleId === vehicleId);

      if (idx === -1) {
        throw new Error('Reminder tracker not found.');
      }

      const updated = {
        ...reminders[idx],
        ...data,
      };

      if (data.targetMileage !== undefined) updated.targetMileage = data.targetMileage ? Number(data.targetMileage) : undefined;

      reminders[idx] = updated;
      saveLocalReminders(reminders);

      return updated;
    },

    complete: async (vehicleId: string, id: string): Promise<Reminder> => {
      await delay(90);
      const reminders = getLocalReminders();
      const idx = reminders.findIndex(r => r.id === id && r.vehicleId === vehicleId);

      if (idx === -1) {
        throw new Error('Reminder tracker not found.');
      }

      reminders[idx].isCompleted = true;
      saveLocalReminders(reminders);

      return reminders[idx];
    },

    delete: async (vehicleId: string, id: string): Promise<{ message: string }> => {
      await delay(80);
      const reminders = getLocalReminders();
      const filtered = reminders.filter(r => !(r.id === id && r.vehicleId === vehicleId));

      if (reminders.length === filtered.length) {
        throw new Error('Reminder tracker not found.');
      }

      saveLocalReminders(filtered);
      return { message: 'Reminder deleted successfully!' };
    },

    getGlobalAlerts: async (): Promise<{
      overdue: Array<Reminder & { vehicleName: string; statusReason: string }>;
      due: Array<Reminder & { vehicleName: string; statusReason: string }>;
      upcoming: Array<Reminder & { vehicleName: string; statusReason: string }>;
    }> => {
      await delay(120);
      const currentUserId = getCurrentUserId();
      const vehicles = getLocalVehicles().filter(v => v.userId === currentUserId);
      const vehiclesMap = new Map(vehicles.map(v => [v.id, v]));

      // Only evaluate active, non-completed reminders for user's vehicles
      const reminders = getLocalReminders().filter(r => !r.isCompleted && vehiclesMap.has(r.vehicleId));

      const todayStr = new Date().toISOString().split('T')[0];
      const todayMs = new Date(todayStr).getTime();

      const result = {
        overdue: [] as Array<Reminder & { vehicleName: string; statusReason: string }>,
        due: [] as Array<Reminder & { vehicleName: string; statusReason: string }>,
        upcoming: [] as Array<Reminder & { vehicleName: string; statusReason: string }>,
      };

      for (const reminder of reminders) {
        const vehicle = vehiclesMap.get(reminder.vehicleId);
        if (!vehicle) continue;

        const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

        if (reminder.type === ReminderType.MILEAGE) {
          const target = reminder.targetMileage || 0;
          const current = vehicle.currentMileage;

          if (current >= target) {
            result.overdue.push({
              ...reminder,
              vehicleName,
              statusReason: `Exceeded target of ${target.toLocaleString()} km (current: ${current.toLocaleString()})`,
            });
          } else if (target - current <= 800) {
            result.due.push({
              ...reminder,
              vehicleName,
              statusReason: `Due soon! Only ${(target - current).toLocaleString()} km remaining of ${target.toLocaleString()} target`,
            });
          } else {
            result.upcoming.push({
              ...reminder,
              vehicleName,
              statusReason: `Safe: ${(target - current).toLocaleString()} km remaining of ${target.toLocaleString()} target`,
            });
          }
        } else {
          if (!reminder.targetDate) continue;

          const targetMs = new Date(reminder.targetDate).getTime();
          const diffDays = Math.ceil((targetMs - todayMs) / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            result.overdue.push({
              ...reminder,
              vehicleName,
              statusReason: `Overdue since ${reminder.targetDate} (${Math.abs(diffDays)} days ago)`,
            });
          } else if (diffDays <= 7) {
            result.due.push({
              ...reminder,
              vehicleName,
              statusReason: `Due in ${diffDays} days (${reminder.targetDate})`,
            });
          } else {
            result.upcoming.push({
              ...reminder,
              vehicleName,
              statusReason: `Upcoming on ${reminder.targetDate} (${diffDays} days left)`,
            });
          }
        }
      }

      return result;
    },
  },
};
