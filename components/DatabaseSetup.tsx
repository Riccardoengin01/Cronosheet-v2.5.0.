
import React, { useState } from 'react';
import { Database, Copy, Check, RefreshCw, Terminal, Shield, Key, AlertTriangle, Play } from 'lucide-react';

const INIT_SCRIPT = `-- 1. Crea o Aggiorna Tabella PROFILES
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'user',
  subscription_status text default 'trial',
  trial_ends_at timestamptz,
  auto_renew boolean default true,
  is_approved boolean default true,
  created_at timestamptz default now(),
  billing_info jsonb default '{}'::jsonb
);

-- 2. Tabella CONFIGURAZIONE APP
create table if not exists public.app_config (
  key text primary key,
  value jsonb
);

alter table public.app_config enable row level security;
drop policy if exists "Config viewable by everyone" on public.app_config;
create policy "Config viewable by everyone" on public.app_config for select using (true);
drop policy if exists "Config editable by admins" on public.app_config;
create policy "Config editable by admins" on public.app_config for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 3. Tabelle Progetti e Orari con colonne per Fatturazione
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  color text,
  default_hourly_rate numeric default 0,
  default_billing_type text default 'hourly',
  shifts jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.time_entries (
  id text not null primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  description text,
  start_time bigint,
  end_time bigint,
  duration numeric,
  hourly_rate numeric,
  billing_type text default 'hourly',
  expenses jsonb default '[]'::jsonb,
  is_night_shift boolean default false,
  is_billed boolean default false,
  created_at timestamptz default now()
);

-- 4. MIGRAZIONE: Aggiunta colonne se le tabelle esistevano già
do $$
begin
  -- Per PROFILES
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'auto_renew') then
    alter table public.profiles add column auto_renew boolean default true;
  end if;
  
  -- Per PROJECTS
  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'default_billing_type') then
    alter table public.projects add column default_billing_type text default 'hourly';
  end if;

  -- Per TIME_ENTRIES
  if not exists (select 1 from information_schema.columns where table_name = 'time_entries' and column_name = 'billing_type') then
    alter table public.time_entries add column billing_type text default 'hourly';
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'time_entries' and column_name = 'is_billed') then
    alter table public.time_entries add column is_billed boolean default false;
  end if;
end $$;

-- 5. Sicurezza (RLS)
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

alter table public.projects enable row level security;
drop policy if exists "Users can CRUD their own projects" on public.projects;
create policy "Users can CRUD their own projects" on public.projects for all using (auth.uid() = user_id);

alter table public.time_entries enable row level security;
drop policy if exists "Users can CRUD their own entries" on public.time_entries;
create policy "Users can CRUD their own entries" on public.time_entries for all using (auth.uid() = user_id);
`;

const DatabaseSetup = () => {
    const [activeTab, setActiveTab] = useState<'init' | 'admin'>('init');
    const [copied, setCopied] = useState(false);
    const [email, setEmail] = useState('');

    const getAdminScript = () => {
        const targetEmail = email.trim() || 'tua@email.com';
        return `-- Renditi Admin ed Elite
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
                            <p className="opacity-90">Inizializza tabelle e nuove funzioni di fatturazione.</p>
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-gray-200">
                    <button 
                        onClick={() => setActiveTab('init')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'init' ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Terminal size={18} /> 1. Struttura & Aggiornamento
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
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
                                <AlertTriangle className="text-amber-600 shrink-0" />
                                <div className="text-sm text-amber-800">
                                    <strong>Importante:</strong> Se hai già tabelle esistenti, questo script aggiungerà le colonne <code>default_billing_type</code> e <code>billing_type</code> senza cancellare i tuoi dati. Rieseguilo ora.
                                </div>
                            </div>
                            
                            <div className="relative">
                                <div className="absolute top-3 right-3">
                                    <button 
                                        onClick={() => handleCopy(INIT_SCRIPT)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                                    >
                                        {copied ? <Check size={14}/> : <Copy size={14}/>} Copia Tutto
                                    </button>
                                </div>
                                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto text-xs font-mono h-64 border-4 border-slate-100">
                                    <code>{INIT_SCRIPT}</code>
                                </pre>
                            </div>
                        </>
                    )}

                    {activeTab === 'admin' && (
                        <div className="animate-fade-in">
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
