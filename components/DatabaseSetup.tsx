import React, { useState } from 'react';
import { Database, Copy, Check, RefreshCw, Terminal, Shield, Key, AlertTriangle } from 'lucide-react';

const INIT_SCRIPT = `-- 1. Crea la tabella PROFILES (se non esiste)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text default 'user',
  subscription_status text default 'trial',
  trial_ends_at timestamptz,
  is_approved boolean default true,
  created_at timestamptz default now()
);

-- 2. Abilita sicurezza (RLS)
alter table public.profiles enable row level security;

-- 3. PULIZIA POLICY VECCHIE (Per evitare conflitti)
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Admins can update everyone" on public.profiles;
drop policy if exists "Admins can delete everyone" on public.profiles;

-- 4. CREA NUOVE POLICY
-- Tutti possono vedere i profili (necessario per login e admin panel)
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

-- Gli utenti possono inserire se stessi al signup
create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Gli utenti possono modificare SOLO se stessi
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- GLI ADMIN POSSONO MODIFICARE TUTTI (Cruciale per il Pannello Admin)
create policy "Admins can update everyone" on public.profiles
  for update using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- GLI ADMIN POSSONO ELIMINARE TUTTI
create policy "Admins can delete everyone" on public.profiles
  for delete using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- 5. Tabelle Progetti e Orari
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  color text,
  default_hourly_rate numeric,
  shifts jsonb,
  created_at timestamptz default now()
);
alter table public.projects enable row level security;
drop policy if exists "Users can CRUD their own projects" on public.projects;
create policy "Users can CRUD their own projects" on public.projects
  for all using (auth.uid() = user_id);

create table if not exists public.time_entries (
  id text not null primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  description text,
  start_time bigint,
  end_time bigint,
  duration numeric,
  hourly_rate numeric,
  expenses jsonb,
  is_night_shift boolean default false,
  created_at timestamptz default now()
);
alter table public.time_entries enable row level security;
drop policy if exists "Users can CRUD their own entries" on public.time_entries;
create policy "Users can CRUD their own entries" on public.time_entries
  for all using (auth.uid() = user_id);

-- 6. Constraints per Dropdown Supabase
alter table public.profiles drop constraint if exists check_subscription_status;
alter table public.profiles add constraint check_subscription_status 
  check (subscription_status in ('trial', 'active', 'pro', 'elite', 'expired'));

alter table public.profiles drop constraint if exists check_role;
alter table public.profiles add constraint check_role 
  check (role in ('admin', 'user'));
`;

const DatabaseSetup = () => {
    const [activeTab, setActiveTab] = useState<'init' | 'admin'>('init');
    const [copied, setCopied] = useState(false);
    const [email, setEmail] = useState('');

    const getAdminScript = () => {
        const targetEmail = email.trim() || 'tua@email.com';
        return `-- Renditi Admin, Approvato ed Elite
UPDATE public.profiles
SET 
    role = 'admin',
    is_approved = true,
    subscription_status = 'elite'
WHERE email = '${targetEmail}';`;
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans z-50 relative">
            <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-lg">
                            <Database size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Configurazione Database</h1>
                            <p className="opacity-90">Inizializza tabelle e permessi.</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button 
                        onClick={() => setActiveTab('init')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'init' ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Terminal size={18} /> 1. Tabelle & Permessi
                    </button>
                    <button 
                        onClick={() => setActiveTab('admin')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'admin' ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Shield size={18} /> 2. Sblocca Admin
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    
                    {activeTab === 'init' && (
                        <>
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3">
                                <AlertTriangle className="text-blue-600 shrink-0" />
                                <div className="text-sm text-blue-800">
                                    <strong>Importante:</strong> Esegui questo script per aggiornare le "Policy" di sicurezza. Senza questo, il pannello Admin non funzionerà perché Supabase bloccherà le modifiche agli altri utenti.
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute top-3 right-3">
                                    <button 
                                        onClick={() => handleCopy(INIT_SCRIPT)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                                    >
                                        {copied ? <Check size={14}/> : <Copy size={14}/>} Copia
                                    </button>
                                </div>
                                <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl overflow-x-auto text-xs font-mono h-64 border-4 border-slate-100">
                                    <code>{INIT_SCRIPT}</code>
                                </pre>
                            </div>
                        </>
                    )}

                    {activeTab === 'admin' && (
                        <div className="animate-fade-in">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                                    <Key size={18} /> Come diventare Admin
                                </h3>
                                <p className="text-amber-700 text-sm">
                                    Inserisci la tua email. Copia il codice SQL generato. Incollalo nell'Editor SQL di Supabase e premi RUN. Questo ti renderà immediatamente Admin ed Elite.
                                </p>
                            </div>

                            <label className="block text-sm font-bold text-gray-700 mb-2">La tua Email:</label>
                            <input 
                                type="email" 
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none mb-6 font-mono"
                                placeholder="tuo@indirizzo.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />

                            <div className="relative">
                                <div className="absolute top-3 right-3">
                                    <button 
                                        onClick={() => handleCopy(getAdminScript())}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                                    >
                                        {copied ? <Check size={14}/> : <Copy size={14}/>} Copia SQL
                                    </button>
                                </div>
                                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto text-sm font-mono border-4 border-slate-100">
                                    <code>{getAdminScript()}</code>
                                </pre>
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                        <p className="font-bold mb-1">Passaggi su Supabase:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Vai su <a href="https://supabase.com/dashboard" target="_blank" className="text-indigo-600 font-bold hover:underline">Supabase Dashboard</a> &gt; Progetto.</li>
                            <li>Clicca su <strong>SQL Editor</strong> (icona terminale a sinistra).</li>
                            <li>Incolla il codice copiato qui sopra.</li>
                            <li>Clicca su <strong>Run</strong> (in basso a destra).</li>
                        </ol>
                    </div>

                    <div className="flex justify-center pt-2">
                        <button 
                            onClick={() => window.location.reload()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
                        >
                            <RefreshCw size={20} /> Ricarica App
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSetup;