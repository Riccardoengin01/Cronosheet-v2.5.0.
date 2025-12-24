
import React, { useState } from 'react';
import { Database, Copy, Check, RefreshCw, Terminal, Shield, AlertTriangle, FileUp, Info } from 'lucide-react';

const FULL_INIT_SCRIPT = `-- 🚀 SCRIPT DI RIPRISTINO V4 (Incassi & Tasse Ingegneri)

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
  created_at timestamptz default now()
);

-- 3. TIME ENTRIES (AGGIUNTA COLONNA IS_PAID)
create table if not exists public.time_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  description text,
  start_time bigint not null,
  end_time bigint,
  duration numeric default 0,
  hourly_rate numeric(10,2),
  billing_type text,
  expenses jsonb default '[]',
  is_night_shift boolean default false,
  is_billed boolean default false,
  is_paid boolean default false, -- <--- FONDAMENTALE PER GLI INCASSI
  created_at timestamptz default now()
);

-- 4. BUSINESS EXPENSES (COSTI FISSI)
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
create policy "manage_profiles" on public.profiles for all using (auth.uid() = id);
create policy "manage_projects" on public.projects for all using (auth.uid() = user_id);
create policy "manage_entries" on public.time_entries for all using (auth.uid() = user_id);
create policy "manage_bus_expenses" on public.business_expenses for all using (auth.uid() = user_id);
create policy "manage_certs" on public.certifications for all using (auth.uid() = user_id);

-- SE LA COLONNA IS_PAID MANCA GIÀ:
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='time_entries' AND column_name='is_paid') THEN
    ALTER TABLE public.time_entries ADD COLUMN is_paid boolean DEFAULT false;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
`;

const DatabaseSetup = () => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans z-50 relative">
            <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-emerald-600 p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-lg"><Database size={32} /></div>
                        <div>
                            <h1 className="text-2xl font-bold">Inizializzazione V4</h1>
                            <p className="opacity-90">Riparazione Incassi (is_paid) e Breakdown Fiscale.</p>
                        </div>
                    </div>
                </div>
                <div className="p-8 space-y-6">
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 flex gap-3">
                        <AlertTriangle className="text-amber-600 shrink-0" size={24}/>
                        <div>
                            <p className="text-sm font-bold text-amber-800">Attenzione Riccardo</p>
                            <p className="text-xs text-amber-700">Se le fatture non rimangono "Incassate", copia il codice sotto, vai su Supabase > SQL Editor e premi RUN.</p>
                        </div>
                    </div>
                    <div className="relative">
                        <button onClick={() => handleCopy(FULL_INIT_SCRIPT)} className="absolute top-3 right-3 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700">
                            {copied ? <Check size={14}/> : <Copy size={14}/>} Copia SQL
                        </button>
                        <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto text-xs font-mono h-64 border-4 border-slate-50"><code>{FULL_INIT_SCRIPT}</code></pre>
                    </div>
                    <button onClick={() => window.location.reload()} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all">
                        <RefreshCw size={20} /> Ricarica App
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSetup;
