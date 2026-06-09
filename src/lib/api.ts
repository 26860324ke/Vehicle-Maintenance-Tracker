/**
 * API Service Client supporting stateful Bearer authorization
 * proxies requests securely to our full-stack Express backend.
 */

import { User, Vehicle, MaintenanceLog, Reminder, ReminderType, AuthResponse } from '../types';

const API_BASE = '/api';

// Simple client-side token store helper
let authToken: string | null = localStorage.getItem('vmt_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('vmt_token', token);
  } else {
    localStorage.removeItem('vmt_token');
  }
}

export function getToken(): string | null {
  return authToken;
}

// Helper to make standardized fetch requests
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Authentication
  auth: {
    register: (data: { email: string; name: string; password: string }) =>
      request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<{ user: Omit<User, 'passwordHash'> }>('/auth/me'),
  },

  // Vehicle Management
  vehicles: {
    list: () => request<Array<Vehicle & { logsCount: number; remindersCount: number; lastServiceDate: string }>>('/vehicles'),
    get: (id: string) => request<Vehicle & { logs: MaintenanceLog[]; reminders: Reminder[] }>(`/vehicles/${id}`),
    create: (data: Omit<Vehicle, 'id' | 'userId' | 'createdAt'>) =>
      request<Vehicle>('/vehicles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Omit<Vehicle, 'id' | 'userId' | 'createdAt'>>) =>
      request<Vehicle>(`/vehicles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updateMileage: (id: string, mileage: number) =>
      request<Vehicle>(`/vehicles/${id}/mileage`, {
        method: 'PATCH',
        body: JSON.stringify({ currentMileage: mileage }),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/vehicles/${id}`, {
        method: 'DELETE',
      }),
  },

  // Service Logs
  logs: {
    list: (vehicleId: string) => request<MaintenanceLog[]>(`/vehicles/${vehicleId}/logs`),
    create: (vehicleId: string, data: Omit<MaintenanceLog, 'id' | 'vehicleId' | 'createdAt'>) =>
      request<MaintenanceLog>(`/vehicles/${vehicleId}/logs`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (vehicleId: string, id: string, data: Partial<Omit<MaintenanceLog, 'id' | 'vehicleId' | 'createdAt'>>) =>
      request<MaintenanceLog>(`/vehicles/${vehicleId}/logs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (vehicleId: string, id: string) =>
      request<{ message: string }>(`/vehicles/${vehicleId}/logs/${id}`, {
        method: 'DELETE',
      }),
  },

  // Reminders
  reminders: {
    list: (vehicleId: string) => request<Reminder[]>(`/vehicles/${vehicleId}/reminders`),
    create: (vehicleId: string, data: Omit<Reminder, 'id' | 'vehicleId' | 'createdAt' | 'isCompleted'>) =>
      request<Reminder>(`/vehicles/${vehicleId}/reminders`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (vehicleId: string, id: string, data: Partial<Omit<Reminder, 'id' | 'vehicleId' | 'createdAt'>>) =>
      request<Reminder>(`/vehicles/${vehicleId}/reminders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    complete: (vehicleId: string, id: string) =>
      request<Reminder>(`/vehicles/${vehicleId}/reminders/${id}/complete`, {
        method: 'PATCH',
      }),
    delete: (vehicleId: string, id: string) =>
      request<{ message: string }>(`/vehicles/${vehicleId}/reminders/${id}`, {
        method: 'DELETE',
      }),
    // Fetch global alert stats parsed category wise (overdue, due, upcoming)
    getGlobalAlerts: () =>
      request<{
        overdue: Array<Reminder & { vehicleName: string; statusReason: string }>;
        due: Array<Reminder & { vehicleName: string; statusReason: string }>;
        upcoming: Array<Reminder & { vehicleName: string; statusReason: string }>;
      }>('/reminders/status'),
  },
};
