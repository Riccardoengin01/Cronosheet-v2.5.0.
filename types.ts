
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
  is_billed?: boolean; // Nuovo campo per stato fatturazione
}

export interface DayGroup {
  date: string;
  entries: TimeEntry[];
  totalDuration: number;
}

export interface BillingInfo {
  company_name?: string; // Ragione Sociale o Nome Cognome
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  vat_number?: string; // Partita IVA
  tax_code?: string; // Codice Fiscale
  sdi_code?: string; // Codice Univoco
  pec?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
  // Aggiunto 'elite' ai possibili stati
  subscription_status: 'trial' | 'active' | 'pro' | 'elite' | 'expired';
  trial_ends_at: string;
  auto_renew?: boolean; // Nuovo campo per gestire il rinnovo automatico
  created_at?: string; // Data di registrazione
  is_approved: boolean;
  password?: string; // Solo per Mock Mode locale
  
  // Dati Fatturazione
  billing_info?: BillingInfo;
}

// --- THEME INTERFACES ---
export interface ThemeColors {
    sidebarBg: string;     // Colore Sfondo Sidebar (Hex)
    itemColor: string;     // Colore Testo Normale (Hex)
    activeBg: string;      // Sfondo elemento attivo (Hex)
    activeText: string;    // Testo elemento attivo (Hex)
    accentColor: string;   // Colore Icone/Accenti (Hex)
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
  ADMIN_PANEL = 'ADMIN_PANEL', // Vista dedicata all'Admin
  SETTINGS = 'SETTINGS' // Vista profilo utente
}