
import React, { useState } from 'react';
import { Database, Copy, Check, RefreshCw, AlertTriangle, PlayCircle } from 'lucide-react';

interface DatabaseSetupProps {
    onDemoStart?: () => void;
}

const FULL_INIT_SCRIPT = `-- 🚀 FLUXLEDGER PROFESSIONAL - SQL V7

-- 1. PROFILI
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'user',
  subscription_status text default 'trial',
  trial_ends_at timestamptz default now() + interval '60 days',
  is_approved boolean default true,
  auto_renew boolean default true,
  created_at timestamptz default now()
);

-- 2. PROGETTI / CLIENTI
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  color text,
  default_hourly_rate numeric(10,2) default 0,
  default_billing_type text default 'hourly',
  shifts jsonb default '[]',
  activity_types jsonb default '[]',
  created_at timestamptz default now()
);

-- 3. TIME ENTRIES (Aggiunto invoice_number)
create table if not exists public.time_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  activity_type_id uuid,
  description text,
  start_time bigint not null,
  end_time bigint,
  duration numeric default 0,
  hourly_rate numeric(10,2),
  billing_type text,
  expenses jsonb default '[]',
  is_night_shift boolean default false,
  is_billed boolean default false,
  is_paid boolean default false,
  invoice_number text,
  created_at timestamptz default now()
);

-- 4. BUSINESS EXPENSES
create table if not exists public.business_expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  description text not null,
  amount numeric(10,2) default 0,
  category text,
  date date default current_date,
  is_recurring boolean default false,
  created_at timestamptz default now()
);

-- 5. CERTIFICAZIONI
create table if not exists public.certifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  course_type text, 
  organization text,
  issue_date date,
  expiry_date date,
  document_url text, 
  details text,     
  created_at timestamptz default now()
);

-- ABILITA RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.time_entries enable row level security;
alter table public.business_expenses enable row level security;
alter table public.certifications enable row level security;

-- POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manage_profiles') THEN
        create policy "manage_profiles" on public.profiles for all using (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manage_projects') THEN
        create policy "manage_projects" on public.projects for all using (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manage_entries') THEN
        create policy "manage_entries" on public.time_entries for all using (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manage_bus_expenses') THEN
        create policy "manage_bus_expenses" on public.business_expenses for all using (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'manage_certs') THEN
        create policy "manage_certs" on public.certifications for all using (auth.uid() = user_id);
    END IF;
END $$;

-- FIX COLONNE SE MANCANTI (MIGRATION)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='time_entries' AND column_name='invoice_number') THEN
    ALTER TABLE public.time_entries ADD COLUMN invoice_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='time_entries' AND column_name='activity_type_id') THEN
    ALTER TABLE public.time_entries ADD COLUMN activity_type_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='activity_types') THEN
    ALTER TABLE public.projects ADD COLUMN activity_types jsonb DEFAULT '[]';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
`;

const DatabaseSetup: React.FC<DatabaseSetupProps> = ({ onDemoStart }) => {
    const [copied, setCopied] = useState(false);
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
                        <div className="bg-white/20 p-3 rounded-lg"><Database size={32} /></div>
                        <div>
                            <h1 className="text-2xl font-bold uppercase tracking-tight">Configurazione FluxLedger</h1>
                            <p className="opacity-90 text-xs">Necessario per salvare i tuoi dati in modo sicuro nel cloud.</p>
                        </div>
                    </div>
                </div>
                <div className="p-8 space-y-6">
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 flex gap-3">
                        <AlertTriangle className="text-indigo-600 shrink-0" size={24}/>
                        <div>
                            <p className="text-sm font-bold text-indigo-800 tracking-tight">Database non connesso</p>
                            <p className="text-xs text-indigo-700 leading-relaxed">
                                Se hai già configurato Supabase, copia lo script qui sotto e premi <strong>RUN</strong> nell'SQL Editor del loro sito.
                                Se vuoi solo provare l'app, clicca sul pulsante "Entra in Modalità Demo" qui sotto.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                            onClick={onDemoStart}
                            className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
                        >
                            <PlayCircle size={20} /> Entra in Modalità Demo
                        </button>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="flex-1 bg-indigo-50 text-indigo-600 border border-indigo-100 py-4 rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all active:scale-95 cursor-pointer"
                        >
                            <RefreshCw size={20} /> Ricarica App
                        </button>
                    </div>

                    <div className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Script SQL per Supabase</p>
                             <button onClick={() => handleCopy(FULL_INIT_SCRIPT)} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-colors">
                                {copied ? <Check size={14} className="inline mr-1"/> : <Copy size={14} className="inline mr-1"/>} {copied ? 'Copiato!' : 'Copia SQL'}
                            </button>
                        </div>
                        <pre className="bg-slate-900 text-indigo-300 p-4 rounded-xl overflow-x-auto text-[10px] font-mono h-48 border border-slate-800"><code>{FULL_INIT_SCRIPT}</code></pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSetup;
