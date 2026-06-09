import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from './db';
import { authenticate, AuthenticatedRequest, hashPassword, verifyPassword, generateToken } from './auth';
import { User, Vehicle, MaintenanceLog, Reminder, ReminderType } from '../types';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION ROUTER
// ==========================================
const authRouter = Router();

/**
 * Register a new user account
 */
authRouter.post('/register', (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    if (db.findUserByEmail(email)) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      name,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    db.insertUser(newUser);

    const token = generateToken(newUser.id);
    const { passwordHash: _, ...safeUser } = newUser;

    return res.status(201).json({
      token,
      user: safeUser,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to register traveler user', details: err.message });
  }
});

/**
 * Authenticate login credentials and issue token
 */
authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);
    const { passwordHash: _, ...safeUser } = user;

    return res.json({
      token,
      user: safeUser,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to authenticating user', details: err.message });
  }
});

/**
 * Get profile of current logged-in user
 */
authRouter.get('/me', authenticate as any, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { passwordHash: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

apiRouter.use('/auth', authRouter);


// ==========================================
// 2. VEHICLE MANAGEMENT ROUTER
// ==========================================
const vehicleRouter = Router();

// Secure all vehicle endpoints
vehicleRouter.use(authenticate as any);

/**
 * Get all vehicles owned by the logged-in user
 */
vehicleRouter.get('/', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const vehicles = db.getVehiclesOfUser(userId);

    const currentYearStr = new Date().getFullYear().toString();
    // Attach basic stats/counts to vehicles for dashboard summary ease
    const vehiclesWithSummary = vehicles.map(v => {
      const logs = db.getLogsOfVehicle(v.id);
      const reminders = db.getRemindersOfVehicle(v.id);

      const totalSpend = logs.reduce((sum, log) => sum + (log.cost || 0), 0);
      const totalSpendThisYear = logs
        .filter(log => log.date && log.date.startsWith(currentYearStr))
        .reduce((sum, log) => sum + (log.cost || 0), 0);

      return {
        ...v,
        logsCount: logs.length,
        remindersCount: reminders.length,
        lastServiceDate: logs.sort((a,b) => b.date.localeCompare(a.date))[0]?.date || 'No logs',
        totalSpend,
        totalSpendThisYear,
      };
    });

    return res.json(vehiclesWithSummary);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve vehicles', details: err.message });
  }
});

/**
 * Add a new vehicle
 */
vehicleRouter.post('/', (req: AuthenticatedRequest, res) => {
  try {
    const { make, model, year, vin, currentMileage } = req.body;

    if (!make || !model || !year || currentMileage === undefined) {
      return res.status(400).json({ error: 'Make, model, year, and current mileage are required' });
    }

    const parsedYear = Number(year);
    const parsedMileage = Number(currentMileage);

    if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > new Date().getFullYear() + 2) {
      return res.status(400).json({ error: 'Please enter a valid vehicle year' });
    }

    if (isNaN(parsedMileage) || parsedMileage < 0) {
      return res.status(400).json({ error: 'Vehicle mileage cannot be negative' });
    }

    const newVehicle: Vehicle = {
      id: crypto.randomUUID(),
      userId: req.user!.id,
      make: make.trim(),
      model: model.trim(),
      year: parsedYear,
      vin: (vin || '').toUpperCase().trim(),
      currentMileage: parsedMileage,
      createdAt: new Date().toISOString(),
    };

    const saved = db.insertVehicle(newVehicle);
    return res.status(201).json(saved);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add vehicle', details: err.message });
  }
});

/**
 * Get single vehicle details (including embedded service logs & reminders)
 */
vehicleRouter.get('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const vehicleId = req.params.id;

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle not found or unauthorized' });
    }

    const logs = db.getLogsOfVehicle(vehicleId).sort((a, b) => b.date.localeCompare(a.date));
    const reminders = db.getRemindersOfVehicle(vehicleId);

    return res.json({
      ...vehicle,
      logs,
      reminders,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch vehicle details', details: err.message });
  }
});

/**
 * Edit comprehensive vehicle details
 */
vehicleRouter.put('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const vehicleId = req.params.id;
    const { make, model, year, vin, currentMileage } = req.body;

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle not found or unauthorized' });
    }

    const updates: Partial<Omit<Vehicle, 'id' | 'userId' | 'createdAt'>> = {};
    if (make !== undefined) updates.make = make.trim();
    if (model !== undefined) updates.model = model.trim();
    if (year !== undefined) {
      const parsedYear = Number(year);
      if (isNaN(parsedYear) || parsedYear < 1900) {
        return res.status(400).json({ error: 'Invalid manufacturing year' });
      }
      updates.year = parsedYear;
    }
    if (vin !== undefined) updates.vin = vin.toUpperCase().trim();
    if (currentMileage !== undefined) {
      const parsedMileage = Number(currentMileage);
      if (isNaN(parsedMileage) || parsedMileage < 0) {
        return res.status(400).json({ error: 'Vehicle mileage cannot be negative' });
      }
      updates.currentMileage = parsedMileage;
    }

    const updated = db.updateVehicle(vehicleId, updates);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update vehicle', details: err.message });
  }
});

/**
 * Dedicated PATCH endpoint to securely update ONLY a vehicle's current mileage
 */
vehicleRouter.patch('/:id/mileage', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const vehicleId = req.params.id;
    const { currentMileage } = req.body;

    if (currentMileage === undefined) {
      return res.status(400).json({ error: 'Current mileage value is required' });
    }

    const parsedMileage = Number(currentMileage);
    if (isNaN(parsedMileage) || parsedMileage < 0) {
      return res.status(400).json({ error: 'Odometer mileage cannot be negative' });
    }

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle not found or unauthorized' });
    }

    if (parsedMileage < vehicle.currentMileage) {
      // While atypical, we allow minor adjustments but flag warnings. Let's permit it but validate range
      // For general sanity, update is complete
    }

    const updated = db.updateVehicle(vehicleId, { currentMileage: parsedMileage });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update vehicle mileage tracker', details: err.message });
  }
});

/**
 * Delete a vehicle (Trigger cascading logs / reminders clean actions)
 */
vehicleRouter.delete('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const vehicleId = req.params.id;

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle not found or unauthorized' });
    }

    const deleted = db.deleteVehicle(vehicleId);
    if (deleted) {
      return res.json({ message: 'Vehicle and metadata cascadingly deleted successfully' });
    }
    return res.status(400).json({ error: 'Could not perform delete operation' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete vehicle', details: err.message });
  }
});

apiRouter.use('/vehicles', vehicleRouter);


// ==========================================
// 3. MAINTENANCE LOGS ROUTER
// ==========================================
const logRouter = Router();
logRouter.use(authenticate as any);

/**
 * Get all maintenance logs for a specific vehicle
 */
logRouter.get('/:vehicleId/logs', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { vehicleId } = req.params;

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle not found or unauthorized' });
    }

    const logs = db.getLogsOfVehicle(vehicleId).sort((a,b) => b.date.localeCompare(a.date));
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve service logs', details: err.message });
  }
});

/**
 * Add a new maintenance log entry
 */
logRouter.post('/:vehicleId/logs', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { vehicleId } = req.params;
    const { date, serviceType, cost, mileageAtService, notes } = req.body;

    if (!date || !serviceType || cost === undefined || mileageAtService === undefined) {
      return res.status(400).json({ error: 'Date, service type, cost, and service mileage are required' });
    }

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle not found or unauthorized' });
    }

    const parsedCost = Number(cost);
    const parsedServiceMileage = Number(mileageAtService);

    if (isNaN(parsedCost) || parsedCost < 0) {
      return res.status(400).json({ error: 'Service cost cannot be less than zero' });
    }
    if (isNaN(parsedServiceMileage) || parsedServiceMileage < 0) {
      return res.status(400).json({ error: 'Service mileage cannot be less than zero' });
    }

    const newLog: MaintenanceLog = {
      id: crypto.randomUUID(),
      vehicleId,
      date,
      serviceType: serviceType.trim(),
      cost: parsedCost,
      mileageAtService: parsedServiceMileage,
      notes: (notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    // Auto-advance vehicle odometer if service mileage is higher than current mileage!
    if (parsedServiceMileage > vehicle.currentMileage) {
      db.updateVehicle(vehicleId, { currentMileage: parsedServiceMileage });
    }

    const saved = db.insertLog(newLog);
    return res.status(201).json(saved);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create active maintenance log', details: err.message });
  }
});

/**
 * Edit a specific log entry
 */
logRouter.put('/:vehicleId/logs/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { vehicleId, id } = req.params;
    const { date, serviceType, cost, mileageAtService, notes } = req.body;

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle context not found or unauthorized' });
    }

    const log = db.findLogById(id);
    if (!log || log.vehicleId !== vehicleId) {
      return res.status(404).json({ error: 'Service log not found under this vehicle' });
    }

    const updates: Partial<Omit<MaintenanceLog, 'id' | 'vehicleId' | 'createdAt'>> = {};
    if (date !== undefined) updates.date = date;
    if (serviceType !== undefined) updates.serviceType = serviceType.trim();
    if (cost !== undefined) {
      const parsedCost = Number(cost);
      if (isNaN(parsedCost) || parsedCost < 0) return res.status(400).json({ error: 'Cost cannot be negative' });
      updates.cost = parsedCost;
    }
    if (mileageAtService !== undefined) {
      const parsedMil = Number(mileageAtService);
      if (isNaN(parsedMil) || parsedMil < 0) return res.status(400).json({ error: 'Service mileage cannot be negative' });
      updates.mileageAtService = parsedMil;

      // Auto-advance vehicle mileage if service update exceeds modern record
      if (parsedMil > vehicle.currentMileage) {
        db.updateVehicle(vehicleId, { currentMileage: parsedMil });
      }
    }
    if (notes !== undefined) updates.notes = notes.trim();

    const updated = db.updateLog(id, updates);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update maintenance log', details: err.message });
  }
});

/**
 * Delete a service log
 */
logRouter.delete('/:vehicleId/logs/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { vehicleId, id } = req.params;

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle context not found or unauthorized' });
    }

    const log = db.findLogById(id);
    if (!log || log.vehicleId !== vehicleId) {
      return res.status(404).json({ error: 'Service log not found under this vehicle' });
    }

    db.deleteLog(id);
    return res.json({ message: 'Service log item deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete service log', details: err.message });
  }
});

apiRouter.use('/vehicles', logRouter); // Extends /api/vehicles/:vehicleId/logs


// ==========================================
// 4. FUTURE REMINDERS ROUTER
// ==========================================
const reminderRouter = Router();
reminderRouter.use(authenticate as any);

/**
 * Get all reminders for a specific vehicle
 */
reminderRouter.get('/:vehicleId/reminders', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { vehicleId } = req.params;

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle not found or unauthorized' });
    }

    const reminders = db.getRemindersOfVehicle(vehicleId);
    return res.json(reminders);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve reminders list', details: err.message });
  }
});

/**
 * Add a future renewal reminder tracker
 */
reminderRouter.post('/:vehicleId/reminders', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { vehicleId } = req.params;
    const { serviceType, type, targetMileage, targetDate } = req.body;

    if (!serviceType || !type) {
      return res.status(400).json({ error: 'Service type and tracking type are required' });
    }

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle not found or unauthorized' });
    }

    if (type !== ReminderType.MILEAGE && type !== ReminderType.DATE) {
      return res.status(400).json({ error: 'Notification type must be mileage or date' });
    }

    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      vehicleId,
      serviceType: serviceType.trim(),
      type: type as ReminderType,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };

    if (type === ReminderType.MILEAGE) {
      if (targetMileage === undefined) {
        return res.status(400).json({ error: 'Mileage threshold target value is required for mileage alerts' });
      }
      const parsedMileage = Number(targetMileage);
      if (isNaN(parsedMileage) || parsedMileage < 0) {
        return res.status(400).json({ error: 'Target alert mileage cannot be negative' });
      }
      newReminder.targetMileage = parsedMileage;
    } else {
      if (!targetDate) {
        return res.status(400).json({ error: 'Target alert date is required for calendar date alerts' });
      }
      newReminder.targetDate = targetDate;
    }

    const saved = db.insertReminder(newReminder);
    return res.status(201).json(saved);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to register maintenance reminder', details: err.message });
  }
});

/**
 * Edit a specific reminder
 */
reminderRouter.put('/:vehicleId/reminders/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { vehicleId, id } = req.params;
    const { serviceType, type, targetMileage, targetDate, isCompleted } = req.body;

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle context not found or unauthorized' });
    }

    const reminder = db.findReminderById(id);
    if (!reminder || reminder.vehicleId !== vehicleId) {
      return res.status(404).json({ error: 'Reminder tracker not found under this vehicle context' });
    }

    const updates: Partial<Omit<Reminder, 'id' | 'vehicleId' | 'createdAt'>> = {};
    if (serviceType !== undefined) updates.serviceType = serviceType.trim();
    if (type !== undefined) {
      if (type !== ReminderType.MILEAGE && type !== ReminderType.DATE) {
        return res.status(400).json({ error: 'Invalid reminder threshold mapping' });
      }
      updates.type = type as ReminderType;
    }
    if (targetMileage !== undefined) {
      const parsedMileage = Number(targetMileage);
      if (isNaN(parsedMileage) || parsedMileage < 0) return res.status(400).json({ error: 'Invalid target mileage criteria' });
      updates.targetMileage = parsedMileage;
    }
    if (targetDate !== undefined) updates.targetDate = targetDate;
    if (isCompleted !== undefined) updates.isCompleted = Boolean(isCompleted);

    const updated = db.updateReminder(id, updates);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update reminder item details', details: err.message });
  }
});

/**
 * Patch to complete a reminder
 */
reminderRouter.patch('/:vehicleId/reminders/:id/complete', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { vehicleId, id } = req.params;

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle not found or unauthorized' });
    }

    const reminder = db.findReminderById(id);
    if (!reminder || reminder.vehicleId !== vehicleId) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const updated = db.updateReminder(id, { isCompleted: true });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to complete reminder tracker', details: err.message });
  }
});

/**
 * Delete a reminder alert
 */
reminderRouter.delete('/:vehicleId/reminders/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { vehicleId, id } = req.params;

    const vehicle = db.findVehicleById(vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Vehicle context not found or unauthorized' });
    }

    const reminder = db.findReminderById(id);
    if (!reminder || reminder.vehicleId !== vehicleId) {
      return res.status(404).json({ error: 'Reminder tracker not found under this vehicle' });
    }

    db.deleteReminder(id);
    return res.json({ message: 'Reminder item deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete reminder tracker', details: err.message });
  }
});

apiRouter.use('/vehicles', reminderRouter); // Extends /api/vehicles/:vehicleId/reminders


// ==========================================
// 5. GLOBAL ALERTS CHECK ENDPOINT
// ==========================================
/**
 * Global endpoint checking and classifying all uncompleted reminders for all user vehicles.
 * Returns categorization of reminders into:
 *  - "overdue" (Mileage exceeded, or Date has passed)
 *  - "due" (Mileage is within 800 km, or Date is within 7 days)
 *  - "upcoming" (Safe threshold)
 */
apiRouter.get('/reminders/status', authenticate as any, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const vehicles = db.getVehiclesOfUser(userId);
    const vehiclesMap = new Map(vehicles.map(v => [v.id, v]));

    const reminders = db.getRemindersOfUser(userId).filter(r => !r.isCompleted);

    const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
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
        // Date alert
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

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to inspect reminders status thresholds', details: err.message });
  }
});
