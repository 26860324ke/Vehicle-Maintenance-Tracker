/**
 * Model definitions for the Vehicle Maintenance Tracker.
 * These types define the schema and relationships in both client and server code.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string; // Stored securely on the server
  createdAt: string;
}

export interface Vehicle {
  id: string;
  userId: string; // Belongs to a User
  make: string;
  model: string;
  year: number;
  vin: string;
  currentMileage: number;
  createdAt: string;
  logsCount?: number;
  remindersCount?: number;
  totalSpend?: number;
  totalSpendThisYear?: number;
}

export enum ReminderType {
  MILEAGE = 'mileage',
  DATE = 'date',
}

export interface Reminder {
  id: string;
  vehicleId: string; // Belongs to a Vehicle
  serviceType: string; // e.g. "Oil Change", "Tire Rotation"
  type: ReminderType;
  targetMileage?: number; // For mileage-based alerts (e.g. at 120,000 miles)
  targetDate?: string;    // For date-based alerts (e.g. YYYY-MM-DD)
  isCompleted: boolean;
  createdAt: string;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string; // Belongs to a Vehicle
  date: string;       // YYYY-MM-DD
  serviceType: string; // e.g. "Oil Change", "Brake Pad Replacement"
  cost: number;
  mileageAtService: number;
  notes: string;
  createdAt: string;
}

// Request and Response payload types for Auth
export interface AuthResponse {
  token: string;
  user: Omit<User, 'passwordHash'>;
}

// Full Dashboard/Vehicle details query representation helper
export interface VehicleWithDetails extends Vehicle {
  logs: MaintenanceLog[];
  reminders: Reminder[];
}
