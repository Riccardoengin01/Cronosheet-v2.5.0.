import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'it' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  it: {
    // Sidebar & Footer
    'menu.timesheet': 'Registro Ore',
    'menu.projects': 'Registro Progetti',
    'menu.billing': 'Riepilogo',
    'menu.reports': 'Statistiche',
    'menu.profile': 'Il mio Profilo',
    'menu.admin': 'Admin Panel',
    'copyright': 'Tutti i diritti riservati.',
    'version': 'v2.7.0',
    
    // Auth
    'auth.title': 'Gestione orari Cloud & Sicura',
    'auth.create_profile': 'Crea il tuo profilo',
    'auth.login_profile': 'Accedi al tuo profilo',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.login_btn': 'Accedi',
    'auth.signup_btn': 'Registrati',
    'auth.have_account': 'Hai già un account?',
    'auth.no_account': 'Non hai un profilo?',
    'auth.trial_note': '60 giorni di prova inclusi.',
    'auth.privacy': 'Privacy & Policy Dati',

    // App Main
    'app.loading': 'Caricamento Cronosheet...',
    'app.account_pending': 'Account in attesa',
    'app.account_pending_msg': 'Il tuo account è stato creato ed è in attesa di approvazione.',
    'app.expired': 'Abbonamento Scaduto',
    'app.expired_msg': 'Il periodo di prova o il tuo abbonamento sono terminati. Rinnova ora per riaccedere ai tuoi dati.',
    'app.renew_paypal': 'Rinnova con PayPal',
    'app.logout': 'Esci',
    'app.add_service': 'Aggiungi Servizio',
    'app.demo_mode': 'MODALITÀ DEMO',
    
    // TimeLogTable
    'log.year_ref': 'Anno di Riferimento',
    'log.filter_client': 'Filtra Cliente',
    'log.all_clients': 'Tutti i Clienti',
    'log.selected_clients': 'Clienti selezionati',
    'log.search_placeholder': 'Cerca cliente...',
    'log.months_available': 'Mesi Disponibili',
    'log.select_all': 'Seleziona Tutti',
    'log.deselect_all': 'Deseleziona Tutti',
    'log.no_data_year': 'Nessun dato registrato nel',
    'log.total_earnings': 'Guadagno Totale',
    'log.total_hours': 'Ore Totali',
    'log.entries': 'Voci',
    'log.days_worked': 'Giorni Lavorati',
    'log.no_entries_found': 'Nessun servizio trovato con i filtri selezionati.',
    'log.no_notes': 'Nessuna nota',
    'log.extra_expenses': 'extra',
    'log.night': 'Notte',

    // EntryModal
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
    'entry.rate': 'Paga Oraria (€)',
    'entry.notes': 'Note (Opzionale)',
    'entry.notes_placeholder': 'Dettagli attività...',
    'entry.extra_expenses': 'Spese Extra',
    'entry.add': 'Aggiungi',
    'entry.no_extra': 'Nessuna spesa extra.',
    'entry.cancel': 'Annulla',
    'entry.save': 'Salva Servizio',

    // Manage Clients
    'clients.title': 'Registro Progetti',
    'clients.subtitle': 'Visualizza e gestisci la lista di tutti i clienti, cantieri e progetti.',
    'clients.new_client': 'Nuovo Cliente',
    'clients.edit_client': 'Modifica Cliente',
    'clients.name': 'Nome Cliente / Cantiere',
    'clients.rate': 'Tariffa Base (€/h)',
    'clients.color': 'Colore Etichetta',
    'clients.shifts': 'Configurazione Turni (Opzionale)',
    'clients.shifts_desc': 'Aggiungi qui i turni standard per questo cliente.',
    'clients.save': 'Salva',
    'clients.cancel': 'Annulla',
    'clients.delete': 'Elimina',
    'clients.no_clients': 'Nessun cliente definito. Crea un nuovo cliente per iniziare.',
    'clients.per_hour': '/ ora',
    'clients.no_shifts': 'Nessun turno preimpostato',

    // Reports
    'reports.analysis_period': 'Periodo Analisi',
    'reports.7d': '7 Giorni',
    'reports.14d': '14 Giorni',
    'reports.month': 'Mese Corrente',
    'reports.total_hours_range': 'Ore Totali',
    'reports.daily_avg': 'Media Giornaliera',
    'reports.top_project': 'Progetto Top',
    'reports.of_time': 'del tempo',
    'reports.project_dist': 'Ripartizione Progetti',
    'reports.daily_trend': 'Andamento Giornaliero',
    'reports.no_data_period': 'Nessun dato nel periodo selezionato',

    // Billing
    'billing.pending': 'Da Fatturare',
    'billing.billed': 'Archivio Fatture',
    'billing.mark_billed': 'Segna Fatturato',
    'billing.restore': 'Ripristina',
    'billing.total_pending': 'Totale Da Incassare',
    'billing.total_archived': 'Totale Archiviato',
    'billing.print': 'Stampa / PDF',
    'billing.export': 'Export Dati (CSV)',
    'billing.config_period': 'Configura Periodo e Clienti',
    'billing.all_clients': 'Tutti i Clienti',
    'billing.selected': 'Selezionati',
    'billing.search_client': 'Cerca cliente...',
    'billing.select_all': 'Seleziona Tutti',
    'billing.deselect_all': 'Deseleziona',
    'billing.months_available': 'Mesi Disponibili',
    'billing.no_data': 'Nessun dato.',
    'billing.summary_title': 'Riepilogo Servizi',
    'billing.archive_title': 'Archivio Fatture',
    'billing.doc_info': 'Documento informativo prestazioni',
    'billing.date': 'Data',
    'billing.client': 'Cliente',
    'billing.time': 'Orario',
    'billing.description': 'Descrizione',
    'billing.hours': 'Ore',
    'billing.rate_col': 'Tariffa',
    'billing.extra': 'Extra',
    'billing.total': 'Totale',
    'billing.empty_pending': 'Tutto in ordine! Nessuna voce da fatturare.',
    'billing.empty_archive': 'Nessuna voce in archivio per questo periodo.',
    'billing.generated_by': 'Generato con Cronosheet',
  },
  en: {
    // Sidebar & Footer
    'menu.timesheet': 'Timesheet',
    'menu.projects': 'Projects / Clients',
    'menu.billing': 'Billing & Recap',
    'menu.reports': 'Analytics',
    'menu.profile': 'My Profile',
    'menu.admin': 'Admin Panel',
    'copyright': 'All rights reserved.',
    'version': 'v2.7.0',

    // Auth
    'auth.title': 'Secure Cloud Time Tracking',
    'auth.create_profile': 'Create your profile',
    'auth.login_profile': 'Login to your profile',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.login_btn': 'Login',
    'auth.signup_btn': 'Sign Up',
    'auth.have_account': 'Already have an account?',
    'auth.no_account': 'Don\'t have a profile?',
    'auth.trial_note': '60 days free trial included.',
    'auth.privacy': 'Privacy & Data Policy',

    // App Main
    'app.loading': 'Loading Cronosheet...',
    'app.account_pending': 'Account Pending',
    'app.account_pending_msg': 'Your account has been created and is awaiting approval.',
    'app.expired': 'Subscription Expired',
    'app.expired_msg': 'Your trial period or subscription has ended. Renew now to access your data.',
    'app.renew_paypal': 'Renew with PayPal',
    'app.logout': 'Logout',
    'app.add_service': 'Add Entry',
    'app.demo_mode': 'DEMO MODE',

    // TimeLogTable
    'log.year_ref': 'Reference Year',
    'log.filter_client': 'Filter Client',
    'log.all_clients': 'All Clients',
    'log.selected_clients': 'Clients selected',
    'log.search_placeholder': 'Search client...',
    'log.months_available': 'Available Months',
    'log.select_all': 'Select All',
    'log.deselect_all': 'Deselect All',
    'log.no_data_year': 'No data recorded in',
    'log.total_earnings': 'Total Earnings',
    'log.total_hours': 'Total Hours',
    'log.entries': 'Entries',
    'log.days_worked': 'Days Worked',
    'log.no_entries_found': 'No services found with the selected filters.',
    'log.no_notes': 'No notes',
    'log.extra_expenses': 'extra',
    'log.night': 'Night',

    // EntryModal
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
    'entry.rate': 'Hourly Rate (€)',
    'entry.notes': 'Notes (Optional)',
    'entry.notes_placeholder': 'Activity details...',
    'entry.extra_expenses': 'Extra Expenses',
    'entry.add': 'Add',
    'entry.no_extra': 'No extra expenses.',
    'entry.cancel': 'Cancel',
    'entry.save': 'Save Service',

    // Manage Clients
    'clients.title': 'Projects Registry',
    'clients.subtitle': 'View and manage your clients, sites, and projects.',
    'clients.new_client': 'New Client',
    'clients.edit_client': 'Edit Client',
    'clients.name': 'Client / Site Name',
    'clients.rate': 'Base Rate (€/h)',
    'clients.color': 'Label Color',
    'clients.shifts': 'Shift Configuration (Optional)',
    'clients.shifts_desc': 'Add standard shifts for this client here.',
    'clients.save': 'Save',
    'clients.cancel': 'Cancel',
    'clients.delete': 'Delete',
    'clients.no_clients': 'No clients defined. Create a new client to start.',
    'clients.per_hour': '/ hour',
    'clients.no_shifts': 'No shifts preset',

    // Reports
    'reports.analysis_period': 'Analysis Period',
    'reports.7d': '7 Days',
    'reports.14d': '14 Days',
    'reports.month': 'Current Month',
    'reports.total_hours_range': 'Total Hours',
    'reports.daily_avg': 'Daily Average',
    'reports.top_project': 'Top Project',
    'reports.of_time': 'of time',
    'reports.project_dist': 'Project Distribution',
    'reports.daily_trend': 'Daily Trend',
    'reports.no_data_period': 'No data in the selected period',

    // Billing
    'billing.pending': 'To Bill',
    'billing.billed': 'Billed Archive',
    'billing.mark_billed': 'Mark as Billed',
    'billing.restore': 'Restore',
    'billing.total_pending': 'Total Pending',
    'billing.total_archived': 'Total Archived',
    'billing.print': 'Print / PDF',
    'billing.export': 'Export Data (CSV)',
    'billing.config_period': 'Configure Period & Clients',
    'billing.all_clients': 'All Clients',
    'billing.selected': 'Selected',
    'billing.search_client': 'Search client...',
    'billing.select_all': 'Select All',
    'billing.deselect_all': 'Deselect',
    'billing.months_available': 'Available Months',
    'billing.no_data': 'No data.',
    'billing.summary_title': 'Service Summary',
    'billing.archive_title': 'Invoice Archive',
    'billing.doc_info': 'Performance information document',
    'billing.date': 'Date',
    'billing.client': 'Client',
    'billing.time': 'Time',
    'billing.description': 'Description',
    'billing.hours': 'Hours',
    'billing.rate_col': 'Rate',
    'billing.extra': 'Extra',
    'billing.total': 'Total',
    'billing.empty_pending': 'All clear! No items to bill.',
    'billing.empty_archive': 'No items in archive for this period.',
    'billing.generated_by': 'Generated with Cronosheet',
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
