
import { TimeEntry, DayGroup } from './types';

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const hStr = h < 10 ? `0${h}` : `${h}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  const sStr = s < 10 ? `0${s}` : `${s}`;
  
  return `${hStr}:${mStr}:${sStr}`;
};

export const formatDurationHuman = (seconds: number): string => {
  if (seconds <= 0) return "0m";
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

export const formatTime = (timestamp: number | null): string => {
  if (!timestamp) return "--:--";
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
    
    // Check billing type first
    if (entry.billingType === 'daily') {
        // Daily is a FLAT FEE. Ignore duration.
        total = (entry.hourlyRate || 0);
    } else {
        // Hourly is DURATION * RATE
        if (entry.hourlyRate && entry.duration) {
            total = (entry.duration / 3600) * entry.hourlyRate;
        }
    }

    // Always add expenses
    if (entry.expenses && entry.expenses.length > 0) {
        total += entry.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    }

    return total;
};

// Helper per ottenere YYYY-MM-DD locale
export const toLocalISOString = (timestamp: number): string => {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const groupEntriesByDay = (entries: TimeEntry[]): DayGroup[] => {
  const groups: Record<string, DayGroup> = {};
  // Ordiniamo le entries decrescenti per timestamp per avere il log cronologico corretto
  const sorted = [...entries].sort((a, b) => b.startTime - a.startTime);

  sorted.forEach(entry => {
    // FIX: Usiamo toLocalISOString invece di toISOString() per evitare il salto al giorno prima causa UTC
    const dateKey = toLocalISOString(entry.startTime);
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: dateKey,
        entries: [],
        totalDuration: 0
      };
    }
    groups[dateKey].entries.push(entry);
    
    // Only add to total duration if not a daily entry (or daily entry with times)
    if (entry.billingType !== 'daily' || (entry.endTime && entry.startTime)) {
        const duration = entry.duration || (entry.endTime 
          ? (entry.endTime - entry.startTime) / 1000 
          : 0);
        groups[dateKey].totalDuration += duration;
    }
  });

  // Ordiniamo i gruppi per data decrescente
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
