
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
  defaultBillingType?: 'hourly' | 'daily'; // Aggiunto: preferenza predefinita
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
  billingType?: 'hourly' | 'daily';
  expenses?: Expense[];
  isNightShift?: boolean;
  user_id?: string;
  is_billed?: boolean; 
}

export interface DayGroup {
  date: string;
  entries: TimeEntry[];
  totalDuration: number;
}

export interface BillingInfo {
  company_name?: string; 
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  vat_number?: string; 
  tax_code?: string; 
  sdi_code?: string; 
  pec?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
  subscription_status: 'trial' | 'active' | 'pro' | 'elite' | 'expired';
  trial_ends_at: string;
  auto_renew?: boolean; 
  created_at?: string; 
  is_approved: boolean;
  password?: string; 
  billing_info?: BillingInfo;
}

export interface ThemeColors {
    sidebarBg: string;     
    itemColor: string;     
    activeBg: string;      
    activeText: string;    
    accentColor: string;   
}

export interface AppTheme {
    trial: ThemeColors;
    pro: ThemeColors;
    elite: ThemeColors;
    admin: ThemeColors;
}

export enum AppView {
  TIMESHEET = 'TIMESHEET', 
  REPORTS = 'REPORTS', 
  CLIENTS = 'CLIENTS', 
  BILLING = 'BILLING',
  ARCHIVE = 'ARCHIVE',
  ADMIN_PANEL = 'ADMIN_PANEL', 
  SETTINGS = 'SETTINGS' 
}
