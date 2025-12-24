
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification } from '../types';
import { calculateEarnings, formatCurrency, formatDurationHuman } from '../utils';
import { Clock, TrendingUp, AlertCircle, ShieldAlert, CheckCircle2, ChevronRight, Calendar, User } from 'lucide-react';
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
            isSafe: expiredCerts.length === 0 && warningCerts.length === 0
        };
    }, [entries, certs]);

    return (
        <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">The Pulse</h1>
                    <p className="text-gray-500 font-medium italic">Benvenuto, Ing. {userProfile?.email.split('@')[0]}</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2 text-sm font-bold text-slate-400">
                    <Calendar size={16} /> {new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Safety Status Card */}
                <div className={`col-span-1 lg:col-span-2 rounded-[2.5rem] p-8 relative overflow-hidden transition-all shadow-2xl ${stats.expiredCount > 0 ? 'bg-red-600 text-white' : stats.warningCount > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
                    <div className="absolute right-0 bottom-0 opacity-10 -mr-10 -mb-10"><ShieldAlert size={240} /></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldAlert size={24} />
                                <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Safety & Compliance Monitor</span>
                            </div>
                            <h2 className="text-4xl font-black leading-tight mb-4">
                                {stats.expiredCount > 0 
                                    ? `Attenzione! Hai ${stats.expiredCount} certificazioni scadute.` 
                                    : stats.warningCount > 0 
                                    ? `In Scadenza: ${stats.warningCount} corsi da aggiornare.`
                                    : "Stato Formativo: Operativo al 100%"}
                            </h2>
                            <p className="text-white/80 font-medium text-lg max-w-md">
                                {stats.isSafe 
                                    ? "Tutti i tuoi titoli (CSP, CSE, RSPP) sono validi secondo l'Accordo 2025. Continua così!" 
                                    : "Procedi al rinnovo immediato per garantire la conformità normativa nei tuoi cantieri."}
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => onViewChange('SECURE_TRAIN')}
                            className="mt-8 flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md w-fit px-6 py-3 rounded-2xl font-bold transition-all active:scale-95"
                        >
                            Apri Secure Train <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Earnings Card */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl w-fit mb-6">
                            <TrendingUp size={28} />
                        </div>
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-1">Guadagni Lordi Mensili</p>
                        <h3 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">{formatCurrency(stats.earnings)}</h3>
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                            <TrendingUp size={16} /> +12% rispetto a scorso mese
                        </div>
                    </div>
                    
                    <div className="pt-8 border-t border-gray-50 flex justify-between items-center">
                        <div>
                            <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Ore Erogate</p>
                            <p className="text-xl font-bold text-slate-700">{formatDurationHuman(stats.hours)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Servizi</p>
                            <p className="text-xl font-bold text-slate-700">{stats.entriesCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Recent Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-lg">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock /> Attività Recente</h3>
                    <div className="space-y-3">
                        {entries.slice(0, 3).map(e => {
                            const p = projects.find(proj => proj.id === e.projectId);
                            return (
                                <div key={e.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-bold truncate">{e.description || 'Senza descrizione'}</p>
                                        <p className="text-[10px] opacity-60 uppercase font-black" style={{ color: p?.color }}>{p?.name}</p>
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-white/10 px-2 py-1 rounded">{new Date(e.startTime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
                     <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2"><User /> Il mio Profilo Safety</h3>
                     <div className="grid grid-cols-2 gap-4">
                         <div className="bg-gray-50 p-4 rounded-2xl text-center">
                             <p className="text-[9px] font-black text-gray-400 uppercase">Qualifica</p>
                             <p className="text-sm font-bold text-slate-700">ING / CSP / CSE</p>
                         </div>
                         <div className="bg-gray-50 p-4 rounded-2xl text-center">
                             <p className="text-[9px] font-black text-gray-400 uppercase">Status</p>
                             <p className="text-sm font-bold text-emerald-600">CERTIFICATO</p>
                         </div>
                         <button 
                            onClick={() => onViewChange('SETTINGS')}
                            className="col-span-2 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-2xl text-sm transition-all"
                        >
                            Impostazioni Fatturazione
                         </button>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
