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
import * as DB from './services/db';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Plus, Lock, LogOut, Loader2, Database, Play, AlertOctagon, CreditCard } from 'lucide-react';

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  const [view, setView] = useState<AppView>(AppView.TIMESHEET);
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
      if (profile && profile.is_approved && profile.subscription_status !== 'expired') {
          fetchData(profile.id);
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
      // Qui andrebbe l'integrazione con PayPal
  };

  // --- RENDER LOGIC ---

  if (!isSupabaseConfigured && !demoMode && !loadingAuth) {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
              <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl p-8 text-center space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"></div>
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-lg">
                      <Database className="w-10 h-10 text-slate-600" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Benvenuto in Cronosheet</h1>
                    <p className="text-slate-500 text-lg">L'applicazione non è collegata alle variabili d'ambiente.</p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-left shadow-inner">
                      <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
                          <Play className="w-5 h-5 fill-indigo-600 text-indigo-600" /> Anteprima Immediata
                      </h3>
                      <p className="text-indigo-700 mb-4 text-sm leading-relaxed">
                          Puoi avviare l'applicazione in <strong>Modalità Demo</strong>. I dati verranno salvati temporaneamente nel tuo browser.
                      </p>
                      <button onClick={() => setDemoMode(true)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-200 active:scale-95 flex justify-center items-center gap-2">
                          Avvia Modalità Demo
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (loadingAuth) {
      return <div className="h-screen flex items-center justify-center bg-gray-50 text-indigo-600 flex-col gap-4">
          <Loader2 className="animate-spin w-10 h-10"/>
          <p className="text-sm font-medium animate-pulse">Caricamento Cronosheet...</p>
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
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Account in attesa</h1>
                  <p className="text-gray-600 mb-6">Il tuo account è stato creato ed è in attesa di approvazione.</p>
                  <div className="bg-indigo-50 p-4 rounded-lg text-xs text-left mb-6 text-indigo-800">
                      <strong>ID Utente:</strong> <span className="font-mono">{profile.id}</span><br/>
                      <strong>Stato:</strong> In attesa di verifica manuale.
                  </div>
                  <button onClick={handleLogout} className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold hover:bg-slate-800">Torna al Login</button>
              </div>
          </div>
      );
  }

  // 2. BLOCCO UTENTE SCADUTO (EXPIRED)
  if (profile.subscription_status === 'expired') {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center relative font-sans">
              <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                  
                  <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100">
                      <AlertOctagon className="text-red-600 w-10 h-10" />
                  </div>
                  
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">Abbonamento Scaduto</h1>
                  <p className="text-gray-500 mb-8 text-lg">
                      Il periodo di prova o il tuo abbonamento sono terminati. <br/>
                      Rinnova ora per riaccedere ai tuoi dati.
                  </p>
                  
                  <div className="space-y-4">
                      <button 
                          onClick={handleRenewSubscription}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                          <CreditCard size={20} /> Rinnova con PayPal
                      </button>
                      
                      <button 
                          onClick={handleLogout}
                          className="w-full bg-white border-2 border-gray-200 text-gray-500 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                      >
                          Esci dall'account
                      </button>
                  </div>
                  
                  <p className="mt-6 text-xs text-gray-400">
                      Hai bisogno di aiuto? Contatta support@cronosheet.com
                  </p>
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
                    <h1 className="text-3xl font-bold text-gray-800">Registro Servizi</h1>
                    {demoMode && <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded border border-orange-200">MODALITÀ DEMO</span>}
                </div>
                <button 
                    onClick={handleManualEntryClick}
                    className="flex items-center justify-center gap-2 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                >
                    <Plus size={20} /> Aggiungi Servizio
                </button>
             </div>
             <TimeLogTable entries={entries} projects={projects} onDelete={handleDeleteEntry} onEdit={(e) => { setEditingEntry(e); setIsModalOpen(true); }} />
          </div>
        );
      case AppView.CLIENTS:
          return <ManageClients projects={projects} onSave={handleSaveProject} onDelete={handleDeleteProject} />;
      case AppView.BILLING:
          return <Billing entries={entries} projects={projects} />;
      case AppView.REPORTS:
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
          return <UserSettings user={profile} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar currentView={view} onChangeView={setView} userProfile={profile} />
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-gray-50/50">
          <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
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