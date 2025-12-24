
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'it' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  it: {
    'menu.timesheet': 'Registro Ore',
    'menu.projects': 'Registro Progetti',
    'menu.billing': 'Riepilogo',
    'menu.reports': 'Statistiche',
    'menu.profile': 'Il mio Profilo',
    'menu.admin': 'Admin Panel',
    'menu.secure_train': 'Secure Train',
    'auth.title': 'Gestione orari Cloud & Sicura',
    'auth.create_profile': 'Crea il tuo profilo',
    'auth.login_profile': 'Accedi al tuo profilo',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.login_btn': 'Accedi',
    'auth.signup_btn': 'Registrati',
    'app.loading': 'Caricamento Cronosheet...',
    'app.add_service': 'Aggiungi Servizio',
    'log.year_ref': 'Anno di Riferimento',
    'log.filter_client': 'Filtra Cliente',
    'log.all_clients': 'Tutti i Clienti',
    'log.selected_clients': 'Clienti selezionati',
    'log.months_available': 'Mesi Disponibili',
    'log.select_all': 'Seleziona Tutti',
    'log.deselect_all': 'Deseleziona Tutti',
    'log.total_earnings': 'Guadagno Totale',
    'log.total_hours': 'Ore Totali',
    'log.entries': 'Voci',
    'log.no_entries_found': 'Nessun servizio trovato.',
    'log.extra_expenses': 'extra',
    'log.night': 'Notte',
    'entry.edit_title': 'Modifica Servizio',
    'entry.new_title': 'Nuovo Servizio',
    'entry.client_label': 'Cliente / Postazione',
    'entry.date_label': 'Data Servizio',
    'entry.shift_select': 'Seleziona Turno',
    'entry.start_time': 'Ora Inizio',
    'entry.end_time': 'Ora Fine',
    'entry.type': 'Tipologia',
    'entry.diurnal': 'Diurno',
    'entry.nocturnal': 'Notturno',
    'entry.rate': 'Tariffa',
    'entry.rate_hourly': 'Paga Oraria (€/h)',
    'entry.rate_daily': 'Paga Giornaliera (€/gg)',
    'entry.billing_mode': 'Modalità Tariffa',
    'entry.hourly_mode': 'A Ore',
    'entry.daily_mode': 'A Giornata',
    'entry.notes': 'Note (Opzionale)',
    'entry.extra_expenses': 'Spese Extra',
    'entry.add': 'Aggiungi',
    'entry.save': 'Salva Servizio',
    'entry.cancel': 'Annulla',
    'billing.pending': 'Da Fatturare',
    'billing.billed': 'Archivio Fatture',
    'billing.mark_billed': 'Segna Fatturato',
    'billing.print': 'Stampa / PDF',
    'billing.export': 'Export Dati (CSV)',
    'billing.unit_day': 'GG',
    'clients.title': 'Registro Progetti',
    'clients.new_client': 'Nuovo Cliente',
    'clients.save': 'Salva',
    'clients.cancel': 'Annulla',
    'clients.delete': 'Elimina',
    'reports.analysis_period': 'Periodo Analisi',
    'reports.7d': '7 Giorni',
    'reports.14d': '14 Giorni',
    'reports.month': 'Mese Corrente',
    'train.title': 'Certificazioni & Corsi',
    'train.add': 'Aggiungi Certificato',
    'train.no_data': 'Nessuna certificazione salvata.',
    'train.expiry': 'Scadenza',
    'train.issued': 'Conseguito il',
    'train.days_left': 'giorni rimanenti',
    'train.expired': 'Scaduto',
  },
  en: {
    'menu.timesheet': 'Timesheet',
    'menu.projects': 'Projects',
    'menu.billing': 'Billing',
    'menu.reports': 'Analytics',
    'menu.profile': 'My Profile',
    'menu.admin': 'Admin Panel',
    'menu.secure_train': 'Secure Train',
    'auth.title': 'Secure Cloud Time Tracking',
    'auth.create_profile': 'Create profile',
    'auth.login_profile': 'Login',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.login_btn': 'Login',
    'auth.signup_btn': 'Sign Up',
    'app.loading': 'Loading Cronosheet...',
    'app.add_service': 'Add Service',
    'log.year_ref': 'Reference Year',
    'log.filter_client': 'Filter Client',
    'log.all_clients': 'All Clients',
    'log.selected_clients': 'Clients selected',
    'log.months_available': 'Available Months',
    'log.select_all': 'Select All',
    'log.deselect_all': 'Deselect All',
    'log.total_earnings': 'Total Earnings',
    'log.total_hours': 'Total Hours',
    'log.entries': 'Entries',
    'log.no_entries_found': 'No entries found.',
    'log.extra_expenses': 'extra',
    'log.night': 'Night',
    'entry.edit_title': 'Edit Service',
    'entry.new_title': 'New Service',
    'entry.client_label': 'Client / Site',
    'entry.date_label': 'Service Date',
    'entry.shift_select': 'Select Shift',
    'entry.start_time': 'Start Time',
    'entry.end_time': 'End Time',
    'entry.type': 'Type',
    'entry.diurnal': 'Day',
    'entry.nocturnal': 'Night',
    'entry.rate': 'Rate',
    'entry.rate_hourly': 'Hourly Rate (€/h)',
    'entry.rate_daily': 'Daily Rate (€/day)',
    'entry.billing_mode': 'Billing Mode',
    'entry.hourly_mode': 'Hourly',
    'entry.daily_mode': 'Daily',
    'entry.notes': 'Notes (Optional)',
    'entry.extra_expenses': 'Extra Expenses',
    'entry.add': 'Add',
    'entry.save': 'Save Service',
    'entry.cancel': 'Cancel',
    'billing.pending': 'To Invoice',
    'billing.billed': 'Invoice Archive',
    'billing.mark_billed': 'Mark as Billed',
    'billing.print': 'Print / PDF',
    'billing.export': 'Export Data (CSV)',
    'billing.unit_day': 'DAY',
    'clients.title': 'Projects Registry',
    'clients.new_client': 'New Client',
    'clients.save': 'Save',
    'clients.cancel': 'Cancel',
    'clients.delete': 'Delete',
    'reports.analysis_period': 'Analysis Period',
    'reports.7d': '7 Days',
    'reports.14d': '14 Days',
    'reports.month': 'Current Month',
    'train.title': 'Certifications & Training',
    'train.add': 'Add Certificate',
    'train.no_data': 'No certifications saved.',
    'train.expiry': 'Expiry',
    'train.issued': 'Issued on',
    'train.days_left': 'days left',
    'train.expired': 'Expired',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('it');

  const t = (key: string): string => {
    return (translations[language] as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
