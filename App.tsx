import React, { useState, useEffect } from 'react';
import { AppView, TimeEntry, Project, UserProfile } from './types';
import Sidebar from './components/Sidebar';
import TimeLogTable from './components/TimeLogTable';
import Reports from './components/Reports';
import EntryModal from './components/EntryModal';
import ManageClients from './components/ManageClients';
import Billing from './components/Billing';
import AdminPanel from './components/AdminPanel';
import UserSettings from './components/UserSettings';
import Auth from './components/Auth';
import DatabaseSetup from './components/DatabaseSetup'; 
import * as DB from './services/db';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Plus, Lock, LogOut, Loader2, AlertOctagon, CreditCard, PieChart, ArrowRight } from 'lucide-react';
import { useLanguage } from './lib/i18n';

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const { t } = useLanguage();

  // Default view cambiata a CLIENTS (Registro Progetti)
  const [view, setView] = useState<AppView>(AppView.CLIENTS);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>(undefined);

  // 0. Environment Check & Demo Logic
  useEffect(() => {
    if (!isSupabaseConfigured && !demoMode) {
        setLoadingAuth(false);
    } else if (demoMode) {
        initializeDemo();
    }
  }, [demoMode]);

  const initializeDemo = async () => {
      setLoadingAuth(true);
      const demoId = 'demo-user-1';
      const p = await DB.createUserProfile(demoId, 'demo@cronosheet.com');
      if (p) {
          setProfile(p);
          fetchData(p.id);
      }
      setLoadingAuth(false);
  };

  // 1. Real Auth Check
  useEffect(() => {
    if (!isSupabaseConfigured || demoMode) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            fetchUserProfile(session.user);
        } else {
            setLoadingAuth(false);
        }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
            fetchUserProfile(session.user);
        } else {
            setProfile(null);
            setLoadingAuth(false);
        }
    });

    return () => subscription.unsubscribe();
  }, [demoMode]);

  const fetchUserProfile = async (user: { id: string, email?: string }) => {
      let p = await DB.getUserProfile(user.id);
      
      if (!p && user.email) {
          console.log("Profilo mancante. Creazione fallback...");
          p = await DB.createUserProfile(user.id, user.email);
      }

      if (!p) {
          setLoadingAuth(false);
          return;
      }

      setProfile(p);
      setLoadingAuth(false);
  };

  // 2. Data Fetching when profile changes
  useEffect(() => {
      if (profile && profile.is_approved) {
          // Check expiration before fetching data
          const isExpired = checkIsExpired(profile);
          if (!isExpired) {
             fetchData(profile.id);
          }
      }
  }, [profile]);

  const fetchData = async (userId: string) => {
      setLoadingData(true);
      const [p, e] = await Promise.all([DB.getProjects(userId), DB.getEntries(userId)]);
      setProjects(p);
      setEntries(e);
      setLoadingData(false);
  };

  const handleLogout = async () => {
      if (demoMode) {
          setDemoMode(false);
          setProfile(null);
          setEntries([]);
          setProjects([]);
          return;
      }
      await supabase.auth.signOut();
      setProfile(null);
      setEntries([]);
      setProjects([]);
      setView(AppView.TIMESHEET);
  };

  // Handlers
  const handleDeleteEntry = async (id: string) => {
    if (window.confirm('Eliminare questo servizio?')) {
        await DB.deleteEntry(id);
        if (profile) fetchData(profile.id);
    }
  };

  const handleManualEntryClick = () => {
    // 1. Check Projects
    if (projects.length === 0) {
        alert("Devi prima creare almeno una postazione/cliente.");
        setView(AppView.CLIENTS);
        return;
    }

    // 2. Check Limits (Start/Trial Plan max 15 entries)
    if (profile?.subscription_status === 'trial' && entries.length >= 15) {
        const confirmUpgrade = window.confirm(
            "⚠️ Limite Raggiunto\n\n" +
            "Il piano Start (Trial) consente un massimo di 15 voci di registro.\n" +
            "Hai raggiunto il limite.\n\n" +
            "Vuoi passare al piano Pro per inserimenti illimitati?"
        );
        if (confirmUpgrade) {
            setView(AppView.SETTINGS);
        }
        return;
    }

    setEditingEntry(undefined);
    setIsModalOpen(true);
  };

  const handleSaveEntry = async (entry: TimeEntry) => {
    if (profile) {
        await DB.saveEntry(entry, profile.id);
        fetchData(profile.id);
    }
  };

  const handleSaveProject = async (project: Project) => {
      if (profile) {
          await DB.saveProject(project, profile.id);
          fetchData(profile.id);
      }
  };

  const handleDeleteProject = async (id: string) => {
      if (window.confirm('Eliminare postazione?')) {
          await DB.deleteProject(id);
          if (profile) fetchData(profile.id);
      }
  };

  const handleRenewSubscription = () => {
      alert("Reindirizzamento al portale pagamenti PayPal...");
  };

  // Helper per controllare se è scaduto in base alla data
  const checkIsExpired = (p: UserProfile) => {
      if (p.subscription_status === 'elite') return false; // Elite mai scaduto
      if (p.subscription_status === 'expired') return true; // Esplicitamente scaduto
      
      // Controllo data per Trial e Pro
      if (p.trial_ends_at) {
          const endDate = new Date(p.trial_ends_at).getTime();
          const now = Date.now();
          // Se la data è passata, consideralo scaduto
          return now > endDate;
      }
      return false;
  };

  // --- RENDER LOGIC ---

  if (!isSupabaseConfigured && !demoMode && !loadingAuth) {
      return (
        <>
            <DatabaseSetup />
            <div className="fixed bottom-4 right-4 z-[60]">
                 <button 
                    onClick={() => setDemoMode(true)}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-slate-700 transition-colors"
                 >
                    Salta e usa Demo Mode
                 </button>
            </div>
        </>
      );
  }

  if (loadingAuth) {
      return <div className="h-screen flex items-center justify-center bg-gray-50 text-indigo-600 flex-col gap-4">
          <Loader2 className="animate-spin w-10 h-10"/>
          <p className="text-sm font-medium animate-pulse">{t('app.loading')}</p>
      </div>;
  }
  
  if (!profile) {
      return <Auth onLoginSuccess={() => {}} />;
  }

  // 1. BLOCCO UTENTE NON APPROVATO
  if (!profile.is_approved) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center relative">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
                  <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="text-amber-600 w-8 h-8" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('app.account_pending')}</h1>
                  <p className="text-gray-600 mb-6">{t('app.account_pending_msg')}</p>
                  <div className="bg-indigo-50 p-4 rounded-lg text-xs text-left mb-6 text-indigo-800">
                      <strong>ID Utente:</strong> <span className="font-mono">{profile.id}</span><br/>
                      <strong>Stato:</strong> In attesa di verifica manuale.
                  </div>
                  <button onClick={handleLogout} className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold hover:bg-slate-800">Torna al Login</button>
              </div>
          </div>
      );
  }

  // 2. BLOCCO UTENTE SCADUTO (O DATA SUPERATA)
  const isExpired = checkIsExpired(profile);

  if (isExpired) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center relative font-sans">
              <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                  
                  <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100">
                      <AlertOctagon className="text-red-600 w-10 h-10" />
                  </div>
                  
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">{t('app.expired')}</h1>
                  <p className="text-gray-500 mb-8 text-lg">
                      {t('app.expired_msg')}
                  </p>
                  
                  <div className="space-y-4">
                      <button 
                          onClick={handleRenewSubscription}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                          <CreditCard size={20} /> {t('app.renew_paypal')}
                      </button>
                      
                      <button 
                          onClick={handleLogout}
                          className="w-full bg-white border-2 border-gray-200 text-gray-500 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                      >
                          {t('app.logout')}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  const renderContent = () => {
    if (loadingData) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
    }

    switch (view) {
      case AppView.TIMESHEET:
        return (
          <div className="space-y-8 animate-fade-in">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{t('menu.timesheet')}</h1>
                    {demoMode && <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded border border-orange-200">{t('app.demo_mode')}</span>}
                </div>
                <button 
                    onClick={handleManualEntryClick}
                    className="flex items-center justify-center gap-2 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                >
                    <Plus size={20} /> {t('app.add_service')}
                </button>
             </div>
             <TimeLogTable entries={entries} projects={projects} onDelete={handleDeleteEntry} onEdit={(e) => { setEditingEntry(e); setIsModalOpen(true); }} />
          </div>
        );
      case AppView.CLIENTS:
          return <ManageClients projects={projects} onSave={handleSaveProject} onDelete={handleDeleteProject} />;
      case AppView.BILLING:
          return (
              <Billing 
                entries={entries} 
                projects={projects} 
                userProfile={profile} 
                onEntriesChange={() => fetchData(profile.id)} // Passata funzione refresh
              />
          );
      case AppView.REPORTS:
        // CHECK BLOCCO STATISTICHE PER UTENTI FREE/TRIAL
        if (profile.subscription_status === 'trial' && profile.role !== 'admin') {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                    <div className="bg-indigo-50 p-6 rounded-full mb-6">
                        <PieChart className="w-16 h-16 text-indigo-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-3">Statistiche Avanzate</h2>
                    <p className="text-gray-500 max-w-md mb-8 text-lg">
                        L'analisi dettagliata, i grafici di produttività e l'andamento giornaliero sono funzionalità esclusive del piano <strong className="text-indigo-600">Pro</strong>.
                    </p>
                    <button 
                        onClick={() => setView(AppView.SETTINGS)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                    >
                        Passa a Pro <ArrowRight size={20} />
                    </button>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Analisi Produttività</h2>
                <Reports entries={entries} projects={projects} />
            </div>
        );
      case AppView.ADMIN_PANEL:
          if (profile.role !== 'admin') return <div className="text-red-500 p-8">Accesso Negato.</div>;
          return <AdminPanel />;
      case AppView.SETTINGS:
          return <UserSettings user={profile} onProfileUpdate={() => fetchUserProfile({ id: profile.id, email: profile.email })} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar currentView={view} onChangeView={setView} userProfile={profile} />
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-gray-50/50">
          <div className="absolute top-4 right-4 z-50 flex items-center gap-4 no-print">
               <button onClick={handleLogout} className="bg-white p-2 rounded-lg shadow-sm text-slate-400 hover:text-red-500 transition-colors border border-gray-100" title="Disconnetti">
                   <LogOut size={18} />
               </button>
          </div>
        <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 mt-10 md:mt-0">
            {renderContent()}
        </div>
      </main>
      <EntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveEntry} initialEntry={editingEntry} projects={projects} />
    </div>
  );
}

export default App;