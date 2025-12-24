
import React, { useState } from 'react';
import { Database, Copy, Check, RefreshCw, Terminal, Shield, AlertTriangle, FileUp, Info } from 'lucide-react';

const FULL_INIT_SCRIPT = `-- 1. TABELLA PROFILI
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'user',
  subscription_status text default 'trial',
  trial_ends_at timestamptz default now() + interval '60 days',
  is_approved boolean default true,
  created_at timestamptz default now()
);

-- 2. TABELLA PROGETTI (CLIENTI/POSTAZIONI)
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

-- 3. TABELLA REGISTRO ORE (TIME ENTRIES)
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

-- 4. TABELLA CERTIFICAZIONI
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

-- 5. ABILITA SICUREZZA (RLS) SU TUTTO
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.time_entries enable row level security;
alter table public.certifications enable row level security;

-- 6. POLICIES (Accesso isolato per ogni utente)
drop policy if exists "manage_own_profile" on public.profiles;
create policy "manage_own_profile" on public.profiles for all using (auth.uid() = id);

drop policy if exists "manage_own_projects" on public.projects;
create policy "manage_own_projects" on public.projects for all using (auth.uid() = user_id);

drop policy if exists "manage_own_entries" on public.time_entries;
create policy "manage_own_entries" on public.time_entries for all using (auth.uid() = user_id);

drop policy if exists "manage_own_certs" on public.certifications;
create policy "manage_own_certs" on public.certifications for all using (auth.uid() = user_id);

-- 7. TRIGGER PER CREAZIONE PROFILO AUTOMATICA
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, is_approved)
  values (new.id, new.email, true)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
`;

const STORAGE_POLICY_SCRIPT = `-- ESEGUI QUESTO PER ABILITARE L'UPLOAD FILE
-- Assicurati di aver creato un bucket chiamato 'certifications'
CREATE POLICY "Full Access Certs" ON storage.objects
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
                <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-lg"><Database size={32} /></div>
                        <div>
                            <h1 className="text-2xl font-bold">Configurazione Master Database</h1>
                            <p className="opacity-90">Inizializza tutte le funzioni dell'app.</p>
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-gray-200">
                    <button onClick={() => setActiveTab('init')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'init' ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500'}`}>
                        1. Tabelle SQL
                    </button>
                    <button onClick={() => setActiveTab('storage')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'storage' ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500'}`}>
                        2. Policy File
                    </button>
                    <button onClick={() => setActiveTab('admin')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'admin' ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500'}`}>
                        3. Admin
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {activeTab === 'init' && (
                        <div className="animate-fade-in space-y-4">
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-xs">
                                <AlertTriangle className="shrink-0" />
                                <div>
                                    <p className="font-bold mb-1">SCRIPT DI RIPRISTINO TOTALE</p>
                                    <p>Questo script crea le tabelle per: <strong>Profili, Progetti, Registro Ore e Certificazioni</strong>. Incollalo in Supabase SQL Editor e premi RUN.</p>
                                </div>
                            </div>
                            <div className="relative">
                                <button onClick={() => handleCopy(FULL_INIT_SCRIPT)} className="absolute top-3 right-3 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700">
                                    {copied ? <Check size={14}/> : <Copy size={14}/>} Copia Tutto l'SQL
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
                                    <p className="font-bold mb-1">STORAGE CERTIFICATI</p>
                                    <p>1. Crea un bucket chiamato <code className="font-bold">certifications</code> su Supabase.<br/>2. Impostalo come <strong>PUBLIC</strong>.<br/>3. Esegui questo script SQL per le policy:</p>
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

                    {activeTab === 'admin' && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Tua Email:</label>
                            <input type="email" className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 font-mono text-sm" placeholder="email@esempio.com" value={email} onChange={e => setEmail(e.target.value)} />
                            <div className="relative">
                                <button onClick={() => handleCopy(`UPDATE public.profiles SET role = 'admin', subscription_status = 'elite' WHERE email = '${email}';`)} className="absolute top-3 right-3 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                                    Copia SQL Admin
                                </button>
                                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono"><code>UPDATE public.profiles SET role = 'admin', subscription_status = 'elite' WHERE email = '{email || 'tua@email.com'}';</code></pre>
                            </div>
                        </div>
                    )}

                    <button onClick={() => window.location.reload()} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
                        <RefreshCw size={20} /> Salva e Ricarica App
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSetup;
