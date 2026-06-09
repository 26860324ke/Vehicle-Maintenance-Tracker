/**
 * Real-Time Firebase + Cloud Firestore API Service Client
 * Persists user identities to Firebase Auth and stores records dynamically in Firestore.
 */

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, cleanUndefined } from './firebase';
import { User, Vehicle, MaintenanceLog, Reminder, ReminderType, AuthResponse } from '../types';

// Storage Helper Keys
const TOKEN_KEY = 'vmt_token';

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
  // If we have an active firebase session or token, report it to the state loader
  return auth.currentUser ? 'firebase-active' : localStorage.getItem(TOKEN_KEY);
}

// Helper to retrieve the logged-in uid from the Firebase Auth client
function getCurrentUserId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Authentication required');
  }
  return uid;
}

// -------------------------------------------------------------
// CLEANUP SAMPLE STATE FOR USER WORKSPACE
// -------------------------------------------------------------
async function clearSampleVehicleFirestoreDatabase(userId: string) {
  const sampleVehicleId = 'sample-vehicle-1';
  try {
    const vehicleRef = doc(db, 'vehicles', sampleVehicleId);
    const vDoc = await getDoc(vehicleRef);

    if (vDoc.exists()) {
      // 1. Delete reminders
      const remRef = collection(db, 'vehicles', sampleVehicleId, 'reminders');
      const remSnapshot = await getDocs(remRef);
      for (const rDoc of remSnapshot.docs) {
        await deleteDoc(doc(db, 'vehicles', sampleVehicleId, 'reminders', rDoc.id));
      }

      // 2. Delete logs
      const logsRef = collection(db, 'vehicles', sampleVehicleId, 'logs');
      const logsSnapshot = await getDocs(logsRef);
      for (const lDoc of logsSnapshot.docs) {
        await deleteDoc(doc(db, 'vehicles', sampleVehicleId, 'logs', lDoc.id));
      }

      // 3. Delete vehicle
      await deleteDoc(vehicleRef);
      console.log('Successfully completed deletion of sample vehicle, logs, and reminders.');
    }
  } catch (err) {
    console.warn('De-seeding/cleanup issue:', err);
  }
}

export const api = {
  // Authentication services (Firebase Auth wrapper)
  auth: {
    register: async (data: { email: string; name: string; password: string }): Promise<AuthResponse> => {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const uid = userCredential.user.uid;

        const newUser: User = {
          id: uid,
          email: data.email.toLowerCase().trim(),
          name: data.name.trim(),
          passwordHash: '',
          createdAt: new Date().toISOString(),
        };

        // Save profile block in Firestore
        await setDoc(doc(db, 'users', uid), newUser);

        const tokenVal = await userCredential.user.getIdToken();
        setToken(tokenVal);

        // Clear any existing sample sandbox database
        await clearSampleVehicleFirestoreDatabase(uid);

        return {
          token: tokenVal,
          user: newUser,
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'users');
        throw error;
      }
    },

    login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
        const uid = userCredential.user.uid;

        const profileDoc = await getDoc(doc(db, 'users', uid));
        if (!profileDoc.exists()) {
          throw new Error('User profile record not found inside database.');
        }

        const tokenVal = await userCredential.user.getIdToken();
        setToken(tokenVal);

        // Clear any existing sample checks for login
        await clearSampleVehicleFirestoreDatabase(uid);

        return {
          token: tokenVal,
          user: profileDoc.data() as User,
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users');
        throw error;
      }
    },

    loginWithGoogle: async (): Promise<AuthResponse> => {
      try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const uid = userCredential.user.uid;

        let profileDoc = await getDoc(doc(db, 'users', uid));
        let userProfile: User;

        if (!profileDoc.exists()) {
          userProfile = {
            id: uid,
            email: (userCredential.user.email || '').toLowerCase().trim(),
            name: (userCredential.user.displayName || 'Google User').trim(),
            passwordHash: '',
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', uid), userProfile);
        } else {
          userProfile = profileDoc.data() as User;
        }

        const tokenVal = await userCredential.user.getIdToken();
        setToken(tokenVal);

        // Clear any existing sample
        await clearSampleVehicleFirestoreDatabase(uid);

        return {
          token: tokenVal,
          user: userProfile,
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'users');
        throw error;
      }
    },

    me: async (): Promise<{ user: Omit<User, 'passwordHash'> }> => {
      return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          unsubscribe();
          if (fbUser) {
            try {
              const profileDoc = await getDoc(doc(db, 'users', fbUser.uid));
              if (profileDoc.exists()) {
                await clearSampleVehicleFirestoreDatabase(fbUser.uid);
                resolve({ user: profileDoc.data() as User });
              } else {
                reject(new Error('Firebase Auth session active but Firestore profile not found.'));
              }
            } catch (err) {
              handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
              reject(err);
            }
          } else {
            reject(new Error('No active sessions found.'));
          }
        });
      });
    },
  },

  // Vehicle Management services (Protected with User ID maps)
  vehicles: {
    list: async (): Promise<Array<Vehicle & { logsCount: number; remindersCount: number; lastServiceDate: string; totalSpend: number; totalSpendThisYear: number }>> => {
      const currentUserId = getCurrentUserId();
      const pathStr = 'vehicles';
      try {
        const q = query(collection(db, pathStr), where('userId', '==', currentUserId));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(vDoc => ({ id: vDoc.id, ...vDoc.data() } as Vehicle));

        const result = [];
        const currentYearStr = new Date().getFullYear().toString();

        for (const v of list) {
          const logsSnapshot = await getDocs(collection(db, 'vehicles', v.id, 'logs'));
          const remindersSnapshot = await getDocs(collection(db, 'vehicles', v.id, 'reminders'));

          const logs = logsSnapshot.docs.map(doc => doc.data() as MaintenanceLog);
          const reminders = remindersSnapshot.docs.map(doc => doc.data() as Reminder);
          const activeRem = reminders.filter(r => !r.isCompleted);

          const totalSpend = logs.reduce((sum, log) => sum + (log.cost || 0), 0);
          const totalSpendThisYear = logs
            .filter(log => log.date && log.date.startsWith(currentYearStr))
            .reduce((sum, log) => sum + (log.cost || 0), 0);

          const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));

          result.push({
            ...v,
            logsCount: logs.length,
            remindersCount: activeRem.length,
            lastServiceDate: sortedLogs[0]?.date || 'No logs',
            totalSpend,
            totalSpendThisYear,
          });
        }

        return result;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, pathStr);
        throw error;
      }
    },

    get: async (id: string): Promise<Vehicle & { logs: MaintenanceLog[]; reminders: Reminder[] }> => {
      const currentUserId = getCurrentUserId();
      const pathStr = `vehicles/${id}`;
      try {
        const vDoc = await getDoc(doc(db, 'vehicles', id));
        if (!vDoc.exists() || vDoc.data().userId !== currentUserId) {
          throw new Error('Vehicle context not found or unauthorized access.');
        }

        const vehicle = { id: vDoc.id, ...vDoc.data() } as Vehicle;

        const logsSnapshot = await getDocs(collection(db, 'vehicles', id, 'logs'));
        const remindersSnapshot = await getDocs(collection(db, 'vehicles', id, 'reminders'));

        const logs = logsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceLog))
          .sort((a, b) => b.date.localeCompare(a.date));

        const reminders = remindersSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Reminder));

        return {
          ...vehicle,
          logs,
          reminders,
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, pathStr);
        throw error;
      }
    },

    create: async (data: Omit<Vehicle, 'id' | 'userId' | 'createdAt'>): Promise<Vehicle> => {
      const currentUserId = getCurrentUserId();
      const id = crypto.randomUUID();
      const pathStr = `vehicles/${id}`;
      
      const newVehicle: Vehicle = {
        id,
        userId: currentUserId,
        make: data.make.trim(),
        model: data.model.trim(),
        year: Number(data.year),
        vin: (data.vin || '').toUpperCase().trim(),
        currentMileage: Number(data.currentMileage),
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'vehicles', id), cleanUndefined(newVehicle));
        return newVehicle;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, pathStr);
        throw error;
      }
    },

    update: async (id: string, data: Partial<Omit<Vehicle, 'id' | 'userId' | 'createdAt'>>): Promise<Vehicle> => {
      const currentUserId = getCurrentUserId();
      const pathStr = `vehicles/${id}`;
      try {
        const vehicleRef = doc(db, 'vehicles', id);
        const vDoc = await getDoc(vehicleRef);

        if (!vDoc.exists() || vDoc.data().userId !== currentUserId) {
          throw new Error('Vehicle not found or unauthorized.');
        }

        const updatedVehicle = {
          ...vDoc.data(),
          ...data,
        } as Vehicle;

        if (data.make !== undefined) updatedVehicle.make = data.make.trim();
        if (data.model !== undefined) updatedVehicle.model = data.model.trim();
        if (data.year !== undefined) updatedVehicle.year = Number(data.year);
        if (data.vin !== undefined) updatedVehicle.vin = data.vin.toUpperCase().trim();
        if (data.currentMileage !== undefined) updatedVehicle.currentMileage = Number(data.currentMileage);

        await setDoc(vehicleRef, cleanUndefined(updatedVehicle));
        return updatedVehicle;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, pathStr);
        throw error;
      }
    },

    updateMileage: async (id: string, mileage: number): Promise<Vehicle> => {
      const currentUserId = getCurrentUserId();
      const pathStr = `vehicles/${id}`;
      try {
        const vehicleRef = doc(db, 'vehicles', id);
        const vDoc = await getDoc(vehicleRef);

        if (!vDoc.exists() || vDoc.data().userId !== currentUserId) {
          throw new Error('Vehicle not found.');
        }

        const updated = {
          ...vDoc.data(),
          currentMileage: Number(mileage),
        } as Vehicle;

        await setDoc(vehicleRef, cleanUndefined(updated));
        return updated;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, pathStr);
        throw error;
      }
    },

    delete: async (id: string): Promise<{ message: string }> => {
      const currentUserId = getCurrentUserId();
      const pathStr = `vehicles/${id}`;
      try {
        const vehicleRef = doc(db, 'vehicles', id);
        const vDoc = await getDoc(vehicleRef);

        if (!vDoc.exists() || vDoc.data().userId !== currentUserId) {
          throw new Error('Vehicle not found or access denied.');
        }

        // Cleanup subcollections
        const logsRef = collection(db, 'vehicles', id, 'logs');
        const logsSnapshot = await getDocs(logsRef);
        for (const lDoc of logsSnapshot.docs) {
          await deleteDoc(doc(db, 'vehicles', id, 'logs', lDoc.id));
        }

        const remRef = collection(db, 'vehicles', id, 'reminders');
        const remSnapshot = await getDocs(remRef);
        for (const rDoc of remSnapshot.docs) {
          await deleteDoc(doc(db, 'vehicles', id, 'reminders', rDoc.id));
        }

        // Delete main record
        await deleteDoc(vehicleRef);
        return { message: 'Vehicle deleted successfully!' };
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, pathStr);
        throw error;
      }
    },
  },

  // Service Logs / Maintenance Logs
  logs: {
    list: async (vehicleId: string): Promise<MaintenanceLog[]> => {
      const pathStr = `vehicles/${vehicleId}/logs`;
      try {
        const logsSnapshot = await getDocs(collection(db, 'vehicles', vehicleId, 'logs'));
        return logsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceLog))
          .sort((a, b) => b.date.localeCompare(a.date));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, pathStr);
        throw error;
      }
    },

    create: async (vehicleId: string, data: Omit<MaintenanceLog, 'id' | 'vehicleId' | 'createdAt'>): Promise<MaintenanceLog> => {
      const id = crypto.randomUUID();
      const pathStr = `vehicles/${vehicleId}/logs/${id}`;

      const newLog: MaintenanceLog = {
        id,
        vehicleId,
        date: data.date,
        serviceType: data.serviceType,
        cost: Number(data.cost),
        mileageAtService: Number(data.mileageAtService),
        notes: (data.notes || '').trim(),
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'vehicles', vehicleId, 'logs', id), cleanUndefined(newLog));
        return newLog;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, pathStr);
        throw error;
      }
    },

    update: async (vehicleId: string, id: string, data: Partial<Omit<MaintenanceLog, 'id' | 'vehicleId' | 'createdAt'>>): Promise<MaintenanceLog> => {
      const pathStr = `vehicles/${vehicleId}/logs/${id}`;
      try {
        const logRef = doc(db, 'vehicles', vehicleId, 'logs', id);
        const lDoc = await getDoc(logRef);

        if (!lDoc.exists()) {
          throw new Error('Service record not found.');
        }

        const updated = {
          ...lDoc.data(),
          ...data,
        } as MaintenanceLog;

        if (data.cost !== undefined) updated.cost = Number(data.cost);
        if (data.mileageAtService !== undefined) updated.mileageAtService = Number(data.mileageAtService);
        if (data.notes !== undefined) updated.notes = data.notes.trim();

        await setDoc(logRef, cleanUndefined(updated));
        return updated;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, pathStr);
        throw error;
      }
    },

    delete: async (vehicleId: string, id: string): Promise<{ message: string }> => {
      const pathStr = `vehicles/${vehicleId}/logs/${id}`;
      try {
        const logRef = doc(db, 'vehicles', vehicleId, 'logs', id);
        const lDoc = await getDoc(logRef);

        if (!lDoc.exists()) {
          throw new Error('Service record not found.');
        }

        await deleteDoc(logRef);
        return { message: 'Service log record deleted successfully!' };
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, pathStr);
        throw error;
      }
    },
  },

  // Reminders / Alerts
  reminders: {
    list: async (vehicleId: string): Promise<Reminder[]> => {
      const pathStr = `vehicles/${vehicleId}/reminders`;
      try {
        const remindersSnapshot = await getDocs(collection(db, 'vehicles', vehicleId, 'reminders'));
        return remindersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, pathStr);
        throw error;
      }
    },

    create: async (vehicleId: string, data: Omit<Reminder, 'id' | 'vehicleId' | 'createdAt' | 'isCompleted'>): Promise<Reminder> => {
      const id = crypto.randomUUID();
      const pathStr = `vehicles/${vehicleId}/reminders/${id}`;

      const newReminder: Reminder = {
        id,
        vehicleId,
        serviceType: data.serviceType,
        type: data.type,
        targetMileage: data.targetMileage ? Number(data.targetMileage) : undefined,
        targetDate: data.targetDate,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'vehicles', vehicleId, 'reminders', id), cleanUndefined(newReminder));
        return newReminder;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, pathStr);
        throw error;
      }
    },

    update: async (vehicleId: string, id: string, data: Partial<Omit<Reminder, 'id' | 'vehicleId' | 'createdAt'>>): Promise<Reminder> => {
      const pathStr = `vehicles/${vehicleId}/reminders/${id}`;
      try {
        const reminderRef = doc(db, 'vehicles', vehicleId, 'reminders', id);
        const rDoc = await getDoc(reminderRef);

        if (!rDoc.exists()) {
          throw new Error('Reminder tracker not found.');
        }

        const updated = {
          ...rDoc.data(),
          ...data,
        } as Reminder;

        if (data.targetMileage !== undefined) updated.targetMileage = data.targetMileage ? Number(data.targetMileage) : undefined;

        await setDoc(reminderRef, cleanUndefined(updated));
        return updated;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, pathStr);
        throw error;
      }
    },

    complete: async (vehicleId: string, id: string): Promise<Reminder> => {
      const pathStr = `vehicles/${vehicleId}/reminders/${id}`;
      try {
        const reminderRef = doc(db, 'vehicles', vehicleId, 'reminders', id);
        const rDoc = await getDoc(reminderRef);

        if (!rDoc.exists()) {
          throw new Error('Reminder tracker not found.');
        }

        const updated = {
          ...rDoc.data(),
          isCompleted: true,
        } as Reminder;

        await setDoc(reminderRef, cleanUndefined(updated));
        return updated;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, pathStr);
        throw error;
      }
    },

    delete: async (vehicleId: string, id: string): Promise<{ message: string }> => {
      const pathStr = `vehicles/${vehicleId}/reminders/${id}`;
      try {
        const reminderRef = doc(db, 'vehicles', vehicleId, 'reminders', id);
        const rDoc = await getDoc(reminderRef);

        if (!rDoc.exists()) {
          throw new Error('Reminder tracker not found.');
        }

        await deleteDoc(reminderRef);
        return { message: 'Reminder deleted successfully!' };
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, pathStr);
        throw error;
      }
    },

    getGlobalAlerts: async (): Promise<{
      overdue: Array<Reminder & { vehicleName: string; statusReason: string }>;
      due: Array<Reminder & { vehicleName: string; statusReason: string }>;
      upcoming: Array<Reminder & { vehicleName: string; statusReason: string }>;
    }> => {
      const currentUserId = getCurrentUserId();
      const pathStr = 'vehicles';
      try {
        const q = query(collection(db, 'vehicles'), where('userId', '==', currentUserId));
        const vehiclesSnapshot = await getDocs(q);
        const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));

        const todayStr = new Date().toISOString().split('T')[0];
        const todayMs = new Date(todayStr).getTime();

        const result = {
          overdue: [] as Array<Reminder & { vehicleName: string; statusReason: string }>,
          due: [] as Array<Reminder & { vehicleName: string; statusReason: string }>,
          upcoming: [] as Array<Reminder & { vehicleName: string; statusReason: string }>,
        };

        for (const vehicle of vehicles) {
          const remindersSnapshot = await getDocs(collection(db, 'vehicles', vehicle.id, 'reminders'));
          
          // Only evaluate active, non-completed reminders for user's vehicles
          const activeReminders = remindersSnapshot.docs
            .map(doc => doc.data() as Reminder)
            .filter(r => !r.isCompleted);

          const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

          for (const reminder of activeReminders) {
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
        }

        return result;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, pathStr);
        throw error;
      }
    },
  },
};
