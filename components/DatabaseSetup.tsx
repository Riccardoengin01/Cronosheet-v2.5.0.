
import React, { useState } from 'react';
import { Database, Copy, Check, RefreshCw, Terminal, Shield, AlertTriangle, FileUp, Info } from 'lucide-react';

const FULL_INIT_SCRIPT = `-- 🚀 SCRIPT DI RIPRISTINO V3 (Aggiunto Business Expenses)

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

-- 2. CERTIFICAZIONI
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

-- 3. BUSINESS EXPENSES (COSTI FISSI)
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

-- ABILITA RLS
alter table public.profiles enable row level security;
alter table public.certifications enable row level security;
alter table public.business_expenses enable row level security;

-- POLICIES
create policy "manage_profiles" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "manage_certs" on public.certifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "manage_bus_expenses" on public.business_expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SINCRONIZZAZIONE
insert into public.profiles (id, email, is_approved)
select id, email, true from auth.users
on conflict (id) do nothing;

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
                            <h1 className="text-2xl font-bold">Inizializzazione V3</h1>
                            <p className="opacity-90">Aggiornamento tabelle Cash Flow e Tasse.</p>
                        </div>
                    </div>
                </div>
                <div className="p-8 space-y-6">
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
