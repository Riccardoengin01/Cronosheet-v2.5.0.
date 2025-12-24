
import React, { useState } from 'react';
import { Database, Copy, Check, RefreshCw, Terminal, Shield, AlertTriangle, FileUp, Info } from 'lucide-react';

const INIT_SCRIPT = `-- 1. TABELLA PROFILI
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

-- 2. TABELLA CERTIFICAZIONI
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

-- 3. ABILITA SICUREZZA (RLS)
alter table public.profiles enable row level security;
alter table public.certifications enable row level security;

-- 4. POLICY PER PROFILI (Permetti agli utenti di gestire il proprio profilo)
drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can manage own profile" on public.profiles 
for all using (auth.uid() = id) with check (auth.uid() = id);

-- 5. POLICY PER CERTIFICAZIONI (Permetti agli utenti di gestire i propri certificati)
drop policy if exists "Users can manage own certs" on public.certifications;
create policy "Users can manage own certs" on public.certifications 
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. TRIGGER AUTOMATICO (Crea profilo al momento della registrazione)
-- Questo assicura che ogni nuovo utente abbia una riga in 'profiles'
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, is_approved)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', true);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
`;

const STORAGE_POLICY_SCRIPT = `-- ESEGUI QUESTO SOLO SE L'UPLOAD DEI FILE NON FUNZIONA
-- Concede il permesso di caricare/leggere file nel bucket 'certifications'
CREATE POLICY "Accesso Totale Certificati" ON storage.objects
FOR ALL 
TO authenticated
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
                            <h1 className="text-2xl font-bold">Configurazione Database</h1>
                            <p className="opacity-90">Rendi l'app operativa al 100%.</p>
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
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
                                <AlertTriangle className="text-amber-600 shrink-0" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <strong>IMPORTANTE:</strong> Se ricevi errori nel salvataggio, significa che non hai ancora creato le tabelle. Copia questo codice e incollalo nell'<strong>SQL Editor</strong> di Supabase, poi premi <strong>RUN</strong>.
                                </p>
                            </div>
                            <div className="relative">
                                <button onClick={() => handleCopy(INIT_SCRIPT)} className="absolute top-3 right-3 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 flex items-center gap-2">
                                    {copied ? <Check size={14}/> : <Copy size={14}/>} Copia Codice SQL
                                </button>
                                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto text-xs font-mono h-64 border-4 border-slate-50"><code>{INIT_SCRIPT}</code></pre>
                            </div>
                        </div>
                    )}

                    {activeTab === 'storage' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                                <Info className="text-blue-600 shrink-0" />
                                <div className="text-xs text-blue-800 leading-relaxed">
                                    <strong>Istruzioni per l'upload:</strong><br/>
                                    1. Crea un Bucket chiamato <code className="font-bold">certifications</code> e rendilo <strong>PUBLIC</strong>.<br/>
                                    2. Vai in <strong>Policies</strong>, clicca "New Policy" e scegli "Create from scratch".<br/>
                                    3. Seleziona l'operazione <strong>ALL</strong> e il ruolo <strong>authenticated</strong>.<br/>
                                    4. Scrivi <code className="font-bold">true</code> nei campi <strong>USING</strong> e <strong>WITH CHECK</strong>.
                                </div>
                            </div>

                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Alternativa: Usa l'SQL Editor</p>
                            <div className="relative">
                                <button onClick={() => handleCopy(STORAGE_POLICY_SCRIPT)} className="absolute top-3 right-3 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                                    {copied ? <Check size={14}/> : <Copy size={14}/>} Copia Policy SQL
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
