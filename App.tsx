
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

  const [view, setView] = useState<AppView>(AppView.CLIENTS);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>(undefined);

  // Inizializzazione Demo o Configurazione Supabase
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

  // Listener Autenticazione Supabase
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
          p = await DB.createUserProfile(user.id, user.email);
      }
      setProfile(p);
      setLoadingAuth(false);
  };

  useEffect(() => {
      if (profile && profile.is_approved) {
          fetchData(profile.id);
      }
  }, [profile]);

  const fetchData = async (userId: string) => {
      setLoadingData(true);
      try {
          const [p, e] = await Promise.all([DB.getProjects(userId), DB.getEntries(userId)]);
          setProjects(p);
          setEntries(e);
      } catch (err) {
          console.error("Error fetching data:", err);
      } finally {
          setLoadingData(false);
      }
  };

  const handleLogout = async () => {
      if (demoMode) {
          setDemoMode(false);
          setProfile(null);
          return;
      }
      await supabase.auth.signOut();
      setProfile(null);
      setView(AppView.CLIENTS);
  };

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm('Eliminare questo servizio?')) {
        await DB.deleteEntry(id);
        if (profile) fetchData(profile.id);
    }
  };

  const handleManualEntryClick = () => {
    if (projects.length === 0) {
        alert("Devi prima creare almeno una postazione/cliente.");
        setView(AppView.CLIENTS);
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
                </div>
                <button 
                    onClick={handleManualEntryClick}
                    className="flex items-center justify-center gap-2 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95"
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
          return <Billing entries={entries} projects={projects} userProfile={profile} onEntriesChange={() => profile && fetchData(profile.id)} />;
      case AppView.REPORTS:
        return <Reports entries={entries} projects={projects} />;
      case AppView.ADMIN_PANEL:
          return <AdminPanel />;
      case AppView.SETTINGS:
          return profile ? <UserSettings user={profile} onProfileUpdate={() => fetchUserProfile({ id: profile.id, email: profile.email })} /> : null;
      default:
        return null;
    }
  };

  // 1. Schermata di Caricamento Iniziale
  if (loadingAuth) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
              <p className="text-gray-500 font-medium">{t('app.loading')}</p>
          </div>
      );
  }

  // 2. Schermata Setup se Supabase non è configurato e non siamo in Demo
  if (!isSupabaseConfigured && !demoMode) {
      return (
          <div className="h-screen w-screen flex flex-col">
              <div className="bg-amber-50 p-4 text-amber-800 text-center text-sm font-medium border-b border-amber-200">
                  ⚠️ Database Cloud non configurato. <button onClick={() => setDemoMode(true)} className="underline font-bold">Prova la Demo Locale</button>
              </div>
              <DatabaseSetup />
          </div>
      );
  }

  // 3. Schermata Login se non c'è un profilo
  if (!profile) {
      return (
          <div className="relative">
             {demoMode && (
                 <div className="fixed top-0 left-0 w-full bg-indigo-600 text-white text-[10px] font-bold text-center py-1 z-50">
                     MODALITÀ DEMO ATTIVA
                 </div>
             )}
             <Auth onLoginSuccess={(p) => setProfile(p)} />
          </div>
      );
  }

  // 4. App Principale
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar currentView={view} onChangeView={setView} userProfile={profile} />
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-gray-50/50">
          {demoMode && (
              <div className="bg-indigo-600 text-white text-[10px] font-bold text-center py-1 no-print">
                  STAI USANDO LA VERSIONE DEMO - I DATI VERRANNO PERSI AL REFRESH
              </div>
          )}
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
