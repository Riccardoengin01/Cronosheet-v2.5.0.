
import React, { useState } from 'react';
import { Database, Copy, Check, RefreshCw, Terminal, Shield, AlertTriangle, FileUp, Info } from 'lucide-react';

const FULL_INIT_SCRIPT = `-- 1. DISABILITA RLS TEMPORANEAMENTE PER PULIZIA (OPZIONALE)
-- drop table if exists public.time_entries;
-- drop table if exists public.certifications;
-- drop table if exists public.projects;
-- drop table if exists public.profiles;

-- 2. TABELLA PROFILI (BASE DI TUTTO)
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

-- 3. TABELLA PROGETTI
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

-- 4. TABELLA REGISTRO ORE
create table if not exists public.time_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  description text,
  start_time bigint not null,
  end_time bigint,
  duration numeric default 0,
  hourly_rate numeric default 0,
  billing_type text default 'hourly',
  expenses jsonb default '[]'::jsonb,
  is_night_shift boolean default false,
  is_billed boolean default false,
  created_at timestamptz default now()
);

-- 5. TABELLA CERTIFICAZIONI
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

-- 6. ABILITA RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.time_entries enable row level security;
alter table public.certifications enable row level security;

-- 7. POLICY PERMESSI TOTALI PER L'UTENTE SUI PROPRI DATI
create policy "all_profiles" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "all_projects" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "all_entries" on public.time_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "all_certs" on public.certifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. TRIGGER CREAZIONE AUTOMATICA PROFILO
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, is_approved)
  values (new.id, new.email, true)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
`;

const STORAGE_POLICY_SCRIPT = `-- ESEGUI QUESTO PER ABILITARE L'UPLOAD DEI PDF
-- 1. Vai su Storage -> New Bucket -> Chiama il bucket 'certifications' -> Rendilo PUBLIC
-- 2. Esegui questo script:

CREATE POLICY "Permesso Caricamento" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'certifications')
WITH CHECK (bucket_id = 'certifications');
`;

const DatabaseSetup = () => {
    const [activeTab, setActiveTab] = useState<'init' | 'storage' | 'admin'>('init');
    const [copied, setCopied] = useState(false);
    const [email, setEmail] = useState('');

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans z-50 relative">
            <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-red-600 p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-lg"><Database size={32} /></div>
                        <div>
                            <h1 className="text-2xl font-bold">Riparazione Database</h1>
                            <p className="opacity-90">Risolvi gli errori di salvataggio e caricamento.</p>
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-gray-200">
                    <button onClick={() => setActiveTab('init')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'init' ? 'border-b-4 border-red-600 text-red-700 bg-red-50' : 'text-gray-500'}`}>
                        1. Tabelle SQL (Fix)
                    </button>
                    <button onClick={() => setActiveTab('storage')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'storage' ? 'border-b-4 border-red-600 text-red-700 bg-red-50' : 'text-gray-500'}`}>
                        2. Policy File (PDF)
                    </button>
                    <button onClick={() => setActiveTab('admin')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'admin' ? 'border-b-4 border-red-600 text-red-700 bg-red-50' : 'text-gray-500'}`}>
                        3. Admin
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {activeTab === 'init' && (
                        <div className="animate-fade-in space-y-4">
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-xs">
                                <AlertTriangle className="shrink-0" />
                                <div>
                                    <p className="font-bold mb-1">ERRORE DI SALVATAGGIO?</p>
                                    <p>Se ricevi errori salvando ore o certificati, significa che il database non ha ancora creato il tuo profilo. Copia questo script, incollalo nell'SQL Editor di Supabase e premi <strong>RUN</strong>.</p>
                                </div>
                            </div>
                            <div className="relative">
                                <button onClick={() => handleCopy(FULL_INIT_SCRIPT)} className="absolute top-3 right-3 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700">
                                    {copied ? <Check size={14}/> : <Copy size={14}/>} Copia SQL
                                </button>
                                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto text-xs font-mono h-64 border-4 border-slate-50"><code>{FULL_INIT_SCRIPT}</code></pre>
                            </div>
                        </div>
                    )}

                    {activeTab === 'storage' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-xs">
                                <Info className="shrink-0" />
                                <div>
                                    <p className="font-bold mb-1">ERRORE CARICAMENTO PDF?</p>
                                    <p>Assicurati di aver creato il bucket <code className="font-bold">certifications</code> su Supabase e che sia impostato su <strong>PUBLIC</strong>. Poi esegui questo script per i permessi.</p>
                                </div>
                            </div>
                            <div className="relative">
                                <button onClick={() => handleCopy(STORAGE_POLICY_SCRIPT)} className="absolute top-3 right-3 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                                    {copied ? <Check size={14}/> : <Copy size={14}/>} Copia Policy
                                </button>
                                <pre className="bg-slate-900 text-indigo-300 p-4 rounded-xl overflow-x-auto text-xs font-mono border-4 border-slate-50"><code>{STORAGE_POLICY_SCRIPT}</code></pre>
                            </div>
                        </div>
                    )}

                    <button onClick={() => window.location.reload()} className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-xl shadow-red-100 flex items-center justify-center gap-2 hover:bg-red-700 transition-all">
                        <RefreshCw size={20} /> Applica Modifiche e Ricarica
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSetup;
