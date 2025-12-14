
export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  defaultHourlyRate: number; 
  shifts?: Shift[];
  user_id?: string; 
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
}

export interface TimeEntry {
  id: string;
  description: string; 
  projectId: string; 
  startTime: number;
  endTime: number | null; 
  duration: number;
  hourlyRate?: number;
  expenses?: Expense[];
  isNightShift?: boolean;
  user_id?: string; 
}

export interface DayGroup {
  date: string;
  entries: TimeEntry[];
  totalDuration: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
  // Aggiunto 'elite' ai possibili stati
  subscription_status: 'trial' | 'active' | 'pro' | 'elite' | 'expired';
  trial_ends_at: string;
  created_at?: string; // Nuova proprietà per la data di registrazione
  is_approved: boolean;
  password?: string; // Solo per Mock Mode locale
}

export enum AppView {
  TIMESHEET = 'TIMESHEET', 
  REPORTS = 'REPORTS', 
  CLIENTS = 'CLIENTS', 
  BILLING = 'BILLING',
  ADMIN_PANEL = 'ADMIN_PANEL', // Vista dedicata all'Admin
  SETTINGS = 'SETTINGS' // Vista profilo utente
}
