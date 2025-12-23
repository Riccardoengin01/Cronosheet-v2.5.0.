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
      if (!p) {
          setLoadingAuth(false);
          return;
      }
      setProfile(p);
      setLoadingAuth(false);
  };

  useEffect(() => {
      if (profile && profile.is_approved) {
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
    if (profile?.subscription_status === 'trial' && entries.length >= 15) {
        const confirmUpgrade = window.confirm("⚠️ Limite Raggiunto\n\nPassa a Pro per inserimenti illimitati.");
        if (confirmUpgrade) setView(AppView.SETTINGS);
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

  const checkIsExpired = (p: UserProfile) => {
      if (p.subscription_status === 'elite') return false;
      if (p.subscription_status === 'expired') return true;
      if (p.trial_ends_at) {
          return Date.now() > new Date(p.trial_ends_at).getTime();
      }
      return false;
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
          return (
              <Billing 
                entries={entries} 
                projects={projects} 
                userProfile={profile} 
                onEntriesChange={() => profile && fetchData(profile.id)} 
              />
          );
      case AppView.REPORTS:
        if (profile?.subscription_status === 'trial' && profile?.role !== 'admin') {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                    <PieChart className="w-16 h-16 text-indigo-400 mb-6" />
                    <h2 className="text-3xl font-bold text-gray-800 mb-3">Statistiche Avanzate</h2>
                    <button onClick={() => setView(AppView.SETTINGS)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">Passa a Pro</button>
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
          return <AdminPanel />;
      case AppView.SETTINGS:
          return profile ? <UserSettings user={profile} onProfileUpdate={() => fetchUserProfile({ id: profile.id, email: profile.email })} /> : null;
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