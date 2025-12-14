import { TimeEntry, DayGroup } from './types';

// Supabase richiede UUID validi per le colonne di tipo uuid.
// Le vecchie stringhe brevi (Math.random) causavano il fallimento del salvataggio nel DB.
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback per browser vecchi
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  const hStr = h < 10 ? `0${h}` : `${h}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  const sStr = s < 10 ? `0${s}` : `${s}`;
  
  return `${hStr}:${mStr}:${sStr}`;
};

export const formatDurationHuman = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('it-IT', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

export const calculateEarnings = (entry: TimeEntry): number => {
    let total = 0;
    
    // Time cost
    if (entry.hourlyRate && entry.duration) {
        total += (entry.duration / 3600) * entry.hourlyRate;
    }

    // Expenses
    if (entry.expenses && entry.expenses.length > 0) {
        total += entry.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    }

    return total;
};

export const groupEntriesByDay = (entries: TimeEntry[]): DayGroup[] => {
  const groups: Record<string, DayGroup> = {};

  // Sort entries descending
  const sorted = [...entries].sort((a, b) => b.startTime - a.startTime);

  sorted.forEach(entry => {
    const dateKey = new Date(entry.startTime).toISOString().split('T')[0];
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: dateKey,
        entries: [],
        totalDuration: 0
      };
    }
    groups[dateKey].entries.push(entry);
    
    // Calculate duration for finished entries, or active duration if needed
    // For grouping purposes, we use stored duration or calc elapsed if running
    const duration = entry.endTime 
      ? (entry.endTime - entry.startTime) / 1000 
      : (Date.now() - entry.startTime) / 1000;
      
    groups[dateKey].totalDuration += duration;
  });

  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
};

export const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#14b8a6', // Teal
];