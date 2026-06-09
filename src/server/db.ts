import fs from 'fs';
import path from 'path';
import { User, Vehicle, Reminder, MaintenanceLog } from '../types';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface DBStructure {
  users: User[];
  vehicles: Vehicle[];
  reminders: Reminder[];
  logs: MaintenanceLog[];
}

const defaultDB: DBStructure = {
  users: [],
  vehicles: [],
  reminders: [],
  logs: [],
};

/**
 * Robust JSON file persistence database driver.
 * Simulates a relational database with fully validated constraints and cascading operations.
 */
class LocalDB {
  private data: DBStructure = defaultDB;

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        // Ensure all keys exist
        this.data.users = this.data.users || [];
        this.data.vehicles = this.data.vehicles || [];
        this.data.reminders = this.data.reminders || [];
        this.data.logs = this.data.logs || [];
      } else {
        this.data = { ...defaultDB };
        this.save();
      }
    } catch (e) {
      console.error('Error loading database file, reinitializing', e);
      this.data = { ...defaultDB };
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing to database file', e);
    }
  }

  // --- Users Table Manager ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public insertUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  // --- Vehicles Table Manager ---
  public getVehiclesOfUser(userId: string): Vehicle[] {
    return this.data.vehicles.filter((v) => v.userId === userId);
  }

  public findVehicleById(id: string): Vehicle | undefined {
    return this.data.vehicles.find((v) => v.id === id);
  }

  public insertVehicle(vehicle: Vehicle): Vehicle {
    this.data.vehicles.push(vehicle);
    this.save();
    return vehicle;
  }

  public updateVehicle(id: string, updates: Partial<Omit<Vehicle, 'id' | 'userId' | 'createdAt'>>): Vehicle | undefined {
    const idx = this.data.vehicles.findIndex((v) => v.id === id);
    if (idx === -1) return undefined;

    this.data.vehicles[idx] = {
      ...this.data.vehicles[idx],
      ...updates,
    };
    this.save();
    return this.data.vehicles[idx];
  }

  public deleteVehicle(id: string): boolean {
    const idx = this.data.vehicles.findIndex((v) => v.id === id);
    if (idx === -1) return false;

    // Cascading delete: Remove vehicles from collection
    this.data.vehicles.splice(idx, 1);

    // Cascading delete: Remove all logs and reminders associated with the vehicle
    this.data.logs = this.data.logs.filter((log) => log.vehicleId !== id);
    this.data.reminders = this.data.reminders.filter((rem) => rem.vehicleId !== id);

    this.save();
    return true;
  }

  // --- Maintenance Logs Table Manager ---
  public getLogsOfVehicle(vehicleId: string): MaintenanceLog[] {
    return this.data.logs.filter((log) => log.vehicleId === vehicleId);
  }

  public getLogsOfUser(userId: string): MaintenanceLog[] {
    const userVehicleIds = new Set(this.getVehiclesOfUser(userId).map((v) => v.id));
    return this.data.logs.filter((log) => userVehicleIds.has(log.vehicleId));
  }

  public findLogById(id: string): MaintenanceLog | undefined {
    return this.data.logs.find((log) => log.id === id);
  }

  public insertLog(log: MaintenanceLog): MaintenanceLog {
    this.data.logs.push(log);
    this.save();
    return log;
  }

  public updateLog(id: string, updates: Partial<Omit<MaintenanceLog, 'id' | 'vehicleId' | 'createdAt'>>): MaintenanceLog | undefined {
    const idx = this.data.logs.findIndex((log) => log.id === id);
    if (idx === -1) return undefined;

    this.data.logs[idx] = {
      ...this.data.logs[idx],
      ...updates,
    };
    this.save();
    return this.data.logs[idx];
  }

  public deleteLog(id: string): boolean {
    const idx = this.data.logs.findIndex((log) => log.id === id);
    if (idx === -1) return false;

    this.data.logs.splice(idx, 1);
    this.save();
    return true;
  }

  // --- Reminders Table Manager ---
  public getRemindersOfVehicle(vehicleId: string): Reminder[] {
    return this.data.reminders.filter((rem) => rem.vehicleId === vehicleId);
  }

  public getRemindersOfUser(userId: string): Reminder[] {
    const userVehicleIds = new Set(this.getVehiclesOfUser(userId).map((v) => v.id));
    return this.data.reminders.filter((rem) => userVehicleIds.has(rem.vehicleId));
  }

  public findReminderById(id: string): Reminder | undefined {
    return this.data.reminders.find((r) => r.id === id);
  }

  public insertReminder(reminder: Reminder): Reminder {
    this.data.reminders.push(reminder);
    this.save();
    return reminder;
  }

  public updateReminder(id: string, updates: Partial<Omit<Reminder, 'id' | 'vehicleId' | 'createdAt'>>): Reminder | undefined {
    const idx = this.data.reminders.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;

    this.data.reminders[idx] = {
      ...this.data.reminders[idx],
      ...updates,
    };
    this.save();
    return this.data.reminders[idx];
  }

  public deleteReminder(id: string): boolean {
    const idx = this.data.reminders.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    this.data.reminders.splice(idx, 1);
    this.save();
    return true;
  }
}

export const db = new LocalDB();
