
import React, { useState } from 'react';
import { Database, Copy, Check, RefreshCw, Terminal, Shield, AlertTriangle, FileUp, Info } from 'lucide-react';

const FULL_INIT_SCRIPT = `-- 🚀 SCRIPT DI RIPRISTINO DEFINITIVO (Fix per colonna 'details')

-- 1. ASSICURA TABELLA PROFILI
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

-- 2. ASSICURA TABELLA CERTIFICAZIONI & AGGIORNA COLONNE ESISTENTI
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

-- FIX: Se la tabella esiste già, forza l'aggiunta delle colonne mancanti
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS details text;
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS course_type text;
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS document_url text;

-- 3. RESET POLICIES
drop policy if exists "Consenti tutto ai proprietari profili" on public.profiles;
drop policy if exists "Consenti tutto ai proprietari certificati" on public.certifications;
drop policy if exists "manage_profiles" on public.profiles;
drop policy if exists "manage_certs" on public.certifications;

-- 4. ABILITA RLS
alter table public.profiles enable row level security;
alter table public.certifications enable row level security;

-- 5. CREA NUOVE POLICIES PERMISSIVE
create policy "manage_profiles" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "manage_certs" on public.certifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. SINCRONIZZAZIONE UTENTI
insert into public.profiles (id, email, is_approved)
select id, email, true from auth.users
on conflict (id) do nothing;

-- 7. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
`;

const STORAGE_POLICY_SCRIPT = `-- ESEGUI QUESTO PER ABILITARE L'UPLOAD FILE (PDF)
-- Assicurati che il bucket 'certifications' sia PUBLIC.

drop policy if exists "Accesso Totale Certificati" on storage.objects;

CREATE POLICY "Accesso Totale Certificati" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'certifications')
WITH CHECK (bucket_id = 'certifications');
`;

const DatabaseSetup = () => {
    const [activeTab, setActiveTab] = useState<'init' | 'storage' | 'admin'>('init');
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
                            <h1 className="text-2xl font-bold">Riparazione Database</h1>
                            <p className="opacity-90">Risolvi l'errore "Column details not found".</p>
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-gray-200">
                    <button onClick={() => setActiveTab('init')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'init' ? 'border-b-4 border-emerald-600 text-emerald-700 bg-emerald-50' : 'text-gray-500'}`}>
                        1. Tabelle & Fix Colonne
                    </button>
                    <button onClick={() => setActiveTab('storage')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'storage' ? 'border-b-4 border-emerald-600 text-emerald-700 bg-emerald-50' : 'text-gray-500'}`}>
                        2. Storage PDF
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-xs">
                        <AlertTriangle className="shrink-0" />
                        <div>
                            <p className="font-bold mb-1">ERRORE COLONNA DETTAGLI?</p>
                            <p>La tua tabella esiste già ma è obsoleta. Lo script qui sotto userà <strong>ALTER TABLE</strong> per aggiungere i campi mancanti (details, course_type, ecc.) senza cancellare i tuoi dati.</p>
                        </div>
                    </div>

                    {activeTab === 'init' ? (
                        <div className="animate-fade-in space-y-4">
                            <div className="relative">
                                <button onClick={() => handleCopy(FULL_INIT_SCRIPT)} className="absolute top-3 right-3 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700">
                                    {copied ? <Check size={14}/> : <Copy size={14}/>} Copia SQL Fix
                                </button>
                                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto text-xs font-mono h-64 border-4 border-slate-50"><code>{FULL_INIT_SCRIPT}</code></pre>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in space-y-4">
                             <div className="relative">
                                <button onClick={() => handleCopy(STORAGE_POLICY_SCRIPT)} className="absolute top-3 right-3 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                                    {copied ? <Check size={14}/> : <Copy size={14}/>} Copia Policy
                                </button>
                                <pre className="bg-slate-900 text-indigo-300 p-4 rounded-xl overflow-x-auto text-xs font-mono border-4 border-slate-50"><code>{STORAGE_POLICY_SCRIPT}</code></pre>
                            </div>
                        </div>
                    )}

                    <button onClick={() => window.location.reload()} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all">
                        <RefreshCw size={20} /> Applica Modifiche e Ricarica App
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSetup;
