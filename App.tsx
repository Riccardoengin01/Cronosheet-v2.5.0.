
import React, { useState, useEffect } from 'react';
import { AppView, TimeEntry, Project, UserProfile } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TimeLogTable from './components/TimeLogTable';
import Reports from './components/Reports';
import EntryModal from './components/EntryModal';
import ManageClients from './components/ManageClients';
import Billing from './components/Billing';
import AdminPanel from './components/AdminPanel';
import UserSettings from './components/UserSettings';
import Auth from './components/Auth';
import DatabaseSetup from './components/DatabaseSetup'; 
import Timer from './components/Timer';
import AIAssistant from './components/AIAssistant';
import SecureTrain from './components/SecureTrain';
import BusinessExpenses from './components/BusinessExpenses';
import * as DB from './services/db';
import { generateId } from './utils';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Plus, LogOut, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { useLanguage } from './lib/i18n';

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const { t } = useLanguage();

  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>(undefined);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | undefined>(undefined);

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
          setProfile(p as UserProfile);
          fetchData(p.id);
      }
      setLoadingAuth(false);
  };

  useEffect(() => {
    if (!isSupabaseConfigured || demoMode) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) fetchUserProfile(session.user);
        else setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) fetchUserProfile(session.user);
        else { setProfile(null); setLoadingAuth(false); }
    });
    return () => subscription.unsubscribe();
  }, [demoMode]);

  const fetchUserProfile = async (user: { id: string, email?: string }) => {
      setDbError(null);
      let p = await DB.getUserProfile(user.id);
      if (!p && user.email) {
          const newProfile = await DB.createUserProfile(user.id, user.email);
          if (!newProfile) setDbError("Errore Database.");
          p = newProfile;
      }
      setProfile(p as UserProfile);
      setLoadingAuth(false);
  };

  useEffect(() => {
      if (profile && profile.is_approved) fetchData(profile.id);
  }, [profile]);

  const fetchData = async (userId: string) => {
      setLoadingData(true);
      try {
          const [p, e] = await Promise.all([DB.getProjects(userId), DB.getEntries(userId)]);
          setProjects(p);
          setEntries(e);
          const running = e.find(entry => entry.endTime === null);
          setActiveEntry(running);
          // Se c'è un timer attivo, mostralo automaticamente
          if (running) setShowTimer(true);
      } catch (err) {
          console.error("Error fetching data:", err);
      } finally {
          setLoadingData(false);
      }
  };

  const handleLogout = async () => {
      if (demoMode) { setDemoMode(false); setProfile(null); return; }
      await supabase.auth.signOut();
      setProfile(null);
      setView(AppView.DASHBOARD);
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
        const success = await DB.saveEntry(entry, profile.id);
        if (success) fetchData(profile.id);
        else alert("Errore salvataggio.");
    }
  };

  const handleStartTimer = async (description: string, projectId: string) => {
    if (profile) {
      const newEntry: TimeEntry = {
        id: generateId(),
        description,
        projectId,
        startTime: Date.now(),
        endTime: null,
        duration: 0,
        hourlyRate: projects.find(p => p.id === projectId)?.defaultHourlyRate || 0,
        billingType: projects.find(p => p.id === projectId)?.defaultBillingType || 'hourly',
        user_id: profile.id
      };
      await DB.saveEntry(newEntry, profile.id);
      fetchData(profile.id);
    }
  };

  const handleStopTimer = async () => {
    if (profile && activeEntry) {
      const endTime = Date.now();
      const updatedEntry = {
        ...activeEntry,
        endTime,
        duration: (endTime - activeEntry.startTime) / 1000
      };
      await DB.saveEntry(updatedEntry, profile.id);
      fetchData(profile.id);
    }
  };

  const handleSaveProject = async (project: Project) => {
      if (profile) { await DB.saveProject(project, profile.id); fetchData(profile.id); }
  };

  const handleDeleteProject = async (id: string) => {
      if (window.confirm('Eliminare postazione?')) {
          await DB.deleteProject(id);
          if (profile) fetchData(profile.id);
      }
  };

  const renderContent = () => {
    if (loadingData) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

    switch (view) {
      case AppView.DASHBOARD:
        return <Dashboard entries={entries} projects={projects} userProfile={profile} onViewChange={setView} />;
      case AppView.TIMESHEET:
        return (
          <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Ingresso Dati</h1>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Registra le tue prestazioni professionali</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowTimer(!showTimer)} 
                    className={`flex items-center justify-center gap-2 text-xs font-black px-6 py-3 rounded-2xl transition-all border ${showTimer ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-200'}`}
                  >
                      <Clock size={18} /> {showTimer ? "Chiudi Timer" : "Usa Cronometro"}
                  </button>
                  <button onClick={handleManualEntryClick} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-black text-white bg-slate-900 hover:bg-indigo-600 px-8 py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95 uppercase tracking-widest">
                      <Plus size={20} strokeWidth={3} /> {t('app.add_service')}
                  </button>
                </div>
             </div>

             {showTimer && (
               <div className="animate-slide-down">
                 <div className="flex items-center gap-2 mb-2 px-2">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Tracking in tempo reale</span>
                 </div>
                 <Timer projects={projects} activeEntry={activeEntry} onStart={handleStartTimer} onStop={handleStopTimer} />
               </div>
             )}

             <TimeLogTable entries={entries} projects={projects} onDelete={handleDeleteEntry} onEdit={(e) => { setEditingEntry(e); setIsModalOpen(true); }} />
          </div>
        );
      case AppView.CLIENTS:
          return <ManageClients projects={projects} onSave={handleSaveProject} onDelete={handleDeleteProject} />;
      case AppView.BILLING:
      case AppView.ARCHIVE:
          return <Billing entries={entries} projects={projects} userProfile={profile} onEntriesChange={() => profile && fetchData(profile.id)} view={view} />;
      case AppView.REPORTS:
        return (
          <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
            <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('menu.reports')}</h1>
                <p className="text-gray-500 font-medium">Visualizza statistiche e insights sul tuo lavoro.</p>
            </div>
            <AIAssistant entries={entries} projects={projects} />
            <Reports entries={entries} projects={projects} />
          </div>
        );
      case AppView.SECURE_TRAIN:
          return profile ? <SecureTrain user={profile} /> : null;
      case AppView.EXPENSES:
          return profile ? <BusinessExpenses user={profile} /> : null;
      case AppView.ADMIN_PANEL:
          return <AdminPanel />;
      case AppView.SETTINGS:
          return profile ? <UserSettings user={profile} onProfileUpdate={() => fetchUserProfile({ id: profile.id, email: profile.email })} /> : null;
      default:
        return null;
    }
  };

  if (loadingAuth) return <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50"><div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  if (dbError || (isSupabaseConfigured && !profile && !loadingAuth)) return <div className="h-screen w-screen flex flex-col"><DatabaseSetup /></div>;

  if (!isSupabaseConfigured && !demoMode) return <div className="h-screen w-screen flex flex-col"><DatabaseSetup /></div>;

  if (!profile) return <Auth onLoginSuccess={(p) => setProfile(p)} />;

  return (
    <div className="flex h-screen bg-white md:bg-gray-50/30 overflow-hidden font-sans text-slate-900 antialiased">
      <Sidebar currentView={view} onChangeView={setView} userProfile={profile} />
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-gray-50/50">
          <div className="absolute top-4 right-4 z-50 flex items-center gap-4 no-print">
               <button onClick={handleLogout} className="bg-white/80 backdrop-blur-md p-2.5 rounded-xl shadow-sm text-gray-400 hover:text-red-500 hover:bg-white transition-all border border-gray-100">
                   <LogOut size={20} />
               </button>
          </div>
        <div className="max-w-7xl mx-auto p-4 md:p-10 pb-32 relative z-10">
            {renderContent()}
        </div>
      </main>
      <EntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveEntry} initialEntry={editingEntry} projects={projects} />
    </div>
  );
}

export default App;
