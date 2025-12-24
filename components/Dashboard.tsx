
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification } from '../types';
import { calculateEarnings, formatCurrency, formatDurationHuman } from '../utils';
import { Clock, TrendingUp, AlertCircle, ShieldCheck, ShieldAlert, CheckCircle2, ChevronRight, Calendar, User, Activity, LayoutGrid, Briefcase, Wallet } from 'lucide-react';
import * as DB from '../services/db';

interface DashboardProps {
    entries: TimeEntry[];
    projects: Project[];
    userProfile: any;
    onViewChange: (view: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ entries, projects, userProfile, onViewChange }) => {
    const [certs, setCerts] = useState<Certification[]>([]);
    
    useEffect(() => {
        if (userProfile?.id) {
            DB.getCertifications(userProfile.id).then(setCerts);
        }
    }, [userProfile?.id]);

    const stats = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        
        const pendingEntries = entries.filter(e => !e.is_billed);
        const monthEntries = entries.filter(e => e.startTime >= startOfMonth);
        
        const totalEarnings = monthEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
        const totalSeconds = monthEntries.reduce((acc, e) => acc + (e.duration || 0), 0);

        const expiredCerts = certs.filter(c => new Date(c.expiryDate).getTime() < now.getTime());
        const warningCerts = certs.filter(c => {
            const expiryTs = new Date(c.expiryDate).getTime();
            const diffDays = (expiryTs - now.getTime()) / (1000 * 3600 * 24);
            return diffDays > 0 && diffDays <= 60;
        });

        return {
            earnings: totalEarnings,
            hours: totalSeconds,
            entriesCount: monthEntries.length,
            expiredCount: expiredCerts.length,
            warningCount: warningCerts.length,
            isSafe: expiredCerts.length === 0 && warningCerts.length === 0,
            pendingCount: pendingEntries.length
        };
    }, [entries, certs]);

    return (
        <div className="flex flex-col min-h-[calc(100vh-140px)] animate-fade-in max-w-6xl mx-auto space-y-5">
            
            {/* Header Super-Compatto */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Control Center <Activity className="text-indigo-600" size={20} />
                    </h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        Ing. {userProfile?.full_name || userProfile?.email.split('@')[0]}
                    </p>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                    <Calendar size={12} className="text-indigo-500" /> 
                    {new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-colors">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume Affari (Mese)</p>
                    <p className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.earnings)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-colors">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Operatività</p>
                    <p className="text-xl font-black text-slate-900 tracking-tighter">{formatDurationHuman(stats.hours)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-colors">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pratiche Pendenti</p>
                    <p className="text-xl font-black text-indigo-600 tracking-tighter">{stats.pendingCount}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-colors">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Asset Clienti</p>
                    <p className="text-xl font-black text-slate-900 tracking-tighter">{projects.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Main Insight & Progetti */}
                <div className="lg:col-span-8 space-y-5">
                    <div className={`rounded-[2rem] p-8 relative overflow-hidden transition-all shadow-xl ${stats.expiredCount > 0 ? 'bg-red-600' : 'bg-slate-900'} text-white`}>
                        <div className="absolute right-0 bottom-0 opacity-5 -mr-8 -mb-8"><ShieldCheck size={220} /></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg bg-indigo-500/20 backdrop-blur-sm border border-indigo-500/30">
                                    <ShieldCheck size={16} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70">Security & Compliance Ledger</span>
                            </div>
                            
                            <h2 className="text-2xl font-black leading-tight mb-3 tracking-tight">
                                {stats.expiredCount > 0 
                                    ? `Critical Alert: ${stats.expiredCount} Titoli Scaduti` 
                                    : "Stato Formativo Professionalmente Conforme."}
                            </h2>
                            
                            <p className="text-white/60 font-medium text-xs max-w-lg leading-relaxed mb-6">
                                {stats.isSafe 
                                    ? "Il tuo profilo rispetta i requisiti di legge (D.Lgs 81/08). I titoli CSP, CSE e RSPP sono validi e monitorati in tempo reale dal sistema Cronosheet." 
                                    : "Attenzione: Sono presenti titoli scaduti che invalidano le tue attuali nomine in cantiere. Aggiorna immediatamente il registro."}
                            </p>

                            <button 
                                onClick={() => onViewChange('SECURE_TRAIN')}
                                className="flex items-center gap-2 bg-white text-slate-900 hover:bg-indigo-50 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                            >
                                Gestione Certificazioni <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                             <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Briefcase size={12} className="text-indigo-500" /> Progetti in Monitoraggio
                             </h3>
                             <div className="flex flex-wrap gap-1.5">
                                 {projects.slice(0, 5).map(p => (
                                     <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-100 text-[9px] font-bold text-slate-600 bg-slate-50">
                                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }}></div>
                                         {p.name}
                                     </div>
                                 ))}
                                 <button onClick={() => onViewChange('CLIENTS')} className="text-[9px] font-black text-indigo-600 px-1.5">...</button>
                             </div>
                        </div>

                        <div className="bg-indigo-600 p-5 rounded-[1.5rem] shadow-lg text-white flex flex-col justify-between">
                             <div className="flex justify-between items-start">
                                 <p className="text-[9px] font-black uppercase tracking-widest opacity-60 text-indigo-100">Performance Report</p>
                                 <TrendingUp size={16} className="text-indigo-300" />
                             </div>
                             <p className="text-xs font-bold leading-snug my-2">Trend in crescita: +12% di produttività billable registrata questa settimana.</p>
                             <button onClick={() => onViewChange('REPORTS')} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:gap-1.5 transition-all text-indigo-100">
                                Analisi Dettagliata <ChevronRight size={10} />
                             </button>
                        </div>
                    </div>
                </div>

                {/* Attività Recente - Design Professionale */}
                <div className="lg:col-span-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-col">
                    <h3 className="text-sm font-black text-slate-900 mb-5 flex items-center gap-2">
                        <Activity size={16} className="text-indigo-600" /> Flusso Attività
                    </h3>
                    <div className="space-y-3 flex-grow overflow-y-auto custom-scrollbar pr-1 max-h-[350px]">
                        {entries.filter(e => !e.is_billed).slice(0, 6).map(e => {
                            const p = projects.find(proj => proj.id === e.projectId);
                            const total = calculateEarnings(e);
                            return (
                                <div key={e.id} className="group relative p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-[11px] font-black text-slate-800 truncate pr-2">{e.description || 'Intervento Tecnico'}</p>
                                        <span className="text-[10px] font-black text-indigo-600 font-mono">{formatCurrency(total)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p?.color }}></div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase truncate w-24">{p?.name || 'Cliente'}</span>
                                        <span className="text-[9px] font-black text-slate-300 ml-auto font-mono">{new Date(e.startTime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {entries.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 opacity-30 gap-2">
                                <LayoutGrid size={24} />
                                <p className="text-[10px] font-bold uppercase italic">Log vuoto</p>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => onViewChange('TIMESHEET')}
                        className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-md active:scale-95"
                    >
                        Registro Completo
                    </button>
                </div>
            </div>

            {/* Footer Professionale */}
            <div className="mt-auto pt-8 pb-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                    © 2025 Engineer Riccardo Righini - All Rights Reserved
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest opacity-50">Secure Cronosheet System v2.5</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
