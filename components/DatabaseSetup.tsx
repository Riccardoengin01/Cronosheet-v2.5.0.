
import React, { useState } from 'react';
import { Database, Copy, Check, RefreshCw, AlertTriangle, PlayCircle, ShieldAlert } from 'lucide-react';

interface DatabaseSetupProps {
    onDemoStart?: () => void;
}

const FULL_INIT_SCRIPT = `-- 🚀 FLUXLEDGER PROFESSIONAL - SQL V7 (MIGRATION & SETUP)

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

-- 3. TIME ENTRIES
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

-- FIX COLONNE SE MANCANTI (MIGRATION CRITICA V7)
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-10 font-sans relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>

            <div className="bg-white max-w-4xl w-full rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-slide-up relative z-10">
                <div className="bg-indigo-600 p-8 md:p-12 text-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="bg-white/10 p-4 rounded-[1.5rem] backdrop-blur-md border border-white/20">
                                <Database size={48} strokeWidth={1.5} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-tighter leading-none italic">Sincronizzazione Database</h1>
                                <p className="opacity-70 text-[10px] font-black uppercase tracking-[0.2em] mt-2">FluxLedger ERP Security Protocol • V7.0</p>
                            </div>
                        </div>
                        <div className="bg-indigo-700/50 px-5 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
                            <ShieldAlert className="text-indigo-200" size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Stato: Migrazione Richiesta</span>
                        </div>
                    </div>
                </div>

                <div className="p-8 md:p-12 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-3 flex items-center gap-2">
                                    <PlayCircle size={18} className="text-indigo-600" /> Avvio Rapido
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                                    Se vuoi semplicemente testare l'interfaccia e le nuove funzioni "Pro-Forma" senza configurare database esterni, entra in modalità dimostrativa.
                                </p>
                                <button 
                                    onClick={onDemoStart}
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-600 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-3"
                                >
                                    <PlayCircle size={18} /> Entra in Modalità Demo
                                </button>
                            </div>

                            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                                <h3 className="text-sm font-black text-amber-800 uppercase tracking-tight mb-3 flex items-center gap-2">
                                    <AlertTriangle size={18} className="text-amber-600" /> Configura Supabase
                                </h3>
                                <p className="text-[11px] text-amber-700 leading-relaxed font-bold italic">
                                    "Ho già Supabase, perché vedo questo?"
                                </p>
                                <p className="text-[10px] text-amber-600/80 leading-relaxed mt-2">
                                    Ogni nuovo aggiornamento richiede una piccola sincronizzazione SQL. Copia il codice qui a fianco e premere "Run" nel tuo SQL Editor di Supabase.
                                </p>
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="w-full mt-6 bg-white border-2 border-amber-200 text-amber-600 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <RefreshCw size={16} /> Ricarica Applicazione
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Script SQL di Migrazione</span>
                                <button 
                                    onClick={() => handleCopy(FULL_INIT_SCRIPT)} 
                                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                >
                                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    {copied ? 'Copiato!' : 'Copia SQL'}
                                </button>
                            </div>
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[1.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                                <pre className="relative bg-slate-900 text-indigo-300 p-6 rounded-[1.5rem] overflow-x-auto text-[10px] font-mono h-[300px] border border-slate-800 custom-scrollbar shadow-inner">
                                    <code>{FULL_INIT_SCRIPT}</code>
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-slate-50 text-center bg-slate-50/30">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em] mb-2">FluxLedger ERP Professional System</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">
                        Ingi.RiccardoRighini • © 2026 • Tutti i diritti riservati
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSetup;
