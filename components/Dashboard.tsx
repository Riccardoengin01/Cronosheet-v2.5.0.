
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification, BusinessExpense } from '../types';
import { calculateEarnings, formatCurrency, formatDurationHuman } from '../utils';
import { Clock, TrendingUp, AlertCircle, ShieldCheck, ChevronRight, Calendar, Activity, Briefcase, Wallet, PieChart, Landmark, ArrowDownCircle } from 'lucide-react';
import * as DB from '../services/db';

interface DashboardProps {
    entries: TimeEntry[];
    projects: Project[];
    userProfile: any;
    onViewChange: (view: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ entries, projects, userProfile, onViewChange }) => {
    const [certs, setCerts] = useState<Certification[]>([]);
    const [busExpenses, setBusExpenses] = useState<BusinessExpense[]>([]);
    
    useEffect(() => {
        if (userProfile?.id) {
            DB.getCertifications(userProfile.id).then(setCerts);
            DB.getBusinessExpenses(userProfile.id).then(setBusExpenses);
        }
    }, [userProfile?.id]);

    const stats = useMemo(() => {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        
        // Dati Mese Corrente
        const monthEntries = entries.filter(e => e.startTime >= startOfMonth);
        const monthEarnings = monthEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
        const monthHours = monthEntries.reduce((acc, e) => acc + (e.duration || 0), 0);

        // Dati Anno Corrente (per Tasse)
        const yearEntries = entries.filter(e => e.startTime >= startOfYear);
        const yearGross = yearEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);

        // Calcolo Forfettario Ingegneri (ATECO 71.12.10)
        // Lordo - 4% Inarcassa (Integrativo incluso nel lordo ma neutro ai fini fiscali per molti)
        // In realtà per semplicità calcoliamo sul lordo fatturato totale:
        const coefRedditivita = 0.78;
        const redditoImponibile = yearGross * coefRedditivita;
        const inarcassaSoggettiva = redditoImponibile * 0.145; // 14.5% circa
        const impostaSostitutiva = (redditoImponibile - inarcassaSoggettiva) * 0.05; // 5% startup
        const totaleTasseAnno = inarcassaSoggettiva + impostaSostitutiva;

        // Spese Reali (Fisse)
        const yearExpenses = busExpenses.filter(exp => new Date(exp.date).getFullYear() === now.getFullYear());
        const totalYearExpenses = yearExpenses.reduce((acc, e) => acc + e.amount, 0);

        const nettoRealeAnno = yearGross - totaleTasseAnno - totalYearExpenses;

        const expiredCerts = certs.filter(c => new Date(c.expiryDate).getTime() < now.getTime());
        const warningCerts = certs.filter(c => {
            const expiryTs = new Date(c.expiryDate).getTime();
            const diffDays = (expiryTs - now.getTime()) / (1000 * 3600 * 24);
            return diffDays > 0 && diffDays <= 60;
        });

        return {
            monthEarnings,
            monthHours,
            yearGross,
            totaleTasseAnno,
            totalYearExpenses,
            nettoRealeAnno,
            expiredCount: expiredCerts.length,
            warningCount: warningCerts.length,
            isSafe: expiredCerts.length === 0 && warningCerts.length === 0,
            pendingCount: entries.filter(e => !e.is_billed).length
        };
    }, [entries, certs, busExpenses]);

    return (
        <div className="flex flex-col min-h-[calc(100vh-140px)] animate-fade-in max-w-6xl mx-auto space-y-4">
            
            {/* Header */}
            <div className="flex justify-between items-center px-2">
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-2 uppercase">
                        Master Dashboard <Landmark className="text-indigo-600" size={18} />
                    </h1>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
                        Analisi Redditività Professionale • {userProfile?.full_name || 'Ingegnere'}
                    </p>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
                    <Calendar size={12} className="text-indigo-500" /> {new Date().toLocaleDateString('it-IT', { month: 'long' })}
                </div>
            </div>

            {/* Quick Stats Grid - Più Compatta */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mese Corrente</p>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(stats.monthEarnings)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ore Erogate (Mese)</p>
                    <p className="text-lg font-black text-slate-900">{formatDurationHuman(stats.monthHours)}</p>
                </div>
                <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-100">
                    <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Fatturato Annuo</p>
                    <p className="text-lg font-black">{formatCurrency(stats.yearGross)}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-lg">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Accantonamento Tasse</p>
                    <p className="text-lg font-black text-amber-400">-{formatCurrency(stats.totaleTasseAnno)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Cash Flow & Tax Predictor */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-8 items-center">
                        <div className="shrink-0 text-center space-y-2">
                             <div className="w-32 h-32 rounded-full border-[12px] border-indigo-50 flex items-center justify-center relative">
                                <div className="absolute inset-0 border-[12px] border-indigo-500 rounded-full" style={{ clipPath: `polygon(50% 50%, 50% 0%, ${Math.min(100, (stats.nettoRealeAnno / stats.yearGross) * 100)}% 0%, 100% 100%, 0% 100%)` }}></div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Margine</p>
                                    <p className="text-xl font-black text-slate-900">{stats.yearGross > 0 ? ((stats.nettoRealeAnno / stats.yearGross) * 100).toFixed(0) : 0}%</p>
                                </div>
                             </div>
                        </div>
                        
                        <div className="flex-grow space-y-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                                <Landmark size={16} className="text-indigo-600" /> Analisi Netto Reale (Regime Forfettario)
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold">Lordo Annuo</span>
                                    <span className="font-mono font-black">{formatCurrency(stats.yearGross)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-amber-500 font-bold">Imposte & Inarcassa (Est.)</span>
                                    <span className="font-mono font-black text-amber-600">-{formatCurrency(stats.totaleTasseAnno)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-red-500 font-bold">Spese Reali Studio</span>
                                    <span className="font-mono font-black text-red-600">-{formatCurrency(stats.totalYearExpenses)}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-sm font-black text-slate-900">NETTO REALE IN TASCA</span>
                                    <span className="text-lg font-black text-emerald-600">{formatCurrency(stats.nettoRealeAnno)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`rounded-2xl p-5 relative overflow-hidden transition-all shadow-sm ${stats.expiredCount > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                             <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldCheck size={16} className={stats.isSafe ? "text-emerald-500" : "text-red-500"} />
                                    <span className="text-[9px] font-black uppercase text-slate-400">Security Ledger</span>
                                </div>
                                <p className="text-xs font-bold text-slate-800 leading-snug">
                                    {stats.expiredCount > 0 
                                        ? `Attenzione: ${stats.expiredCount} titoli scaduti.` 
                                        : "Tutti i titoli (CSP/CSE/RSPP) sono in corso di validità."}
                                </p>
                                <button onClick={() => onViewChange('SECURE_TRAIN')} className="mt-3 text-[9px] font-black text-indigo-600 uppercase hover:underline">Vedi registro</button>
                             </div>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col justify-between">
                             <div className="flex justify-between items-start">
                                 <p className="text-[9px] font-black uppercase text-indigo-400">Pendenze</p>
                                 <Wallet size={16} className="text-indigo-400" />
                             </div>
                             <p className="text-xs font-bold text-indigo-900">Hai {stats.pendingCount} interventi pronti per il riepilogo fattura.</p>
                             <button onClick={() => onViewChange('BILLING')} className="mt-3 text-[9px] font-black text-indigo-600 uppercase hover:underline">Vai a Riepilogo</button>
                        </div>
                    </div>
                </div>

                {/* Log & Azioni */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex-grow">
                        <h3 className="text-xs font-black text-slate-900 mb-4 flex items-center gap-2 uppercase">
                            <Activity size={16} className="text-indigo-600" /> Attività Recente
                        </h3>
                        <div className="space-y-3">
                            {entries.filter(e => !e.is_billed).slice(0, 4).map(e => {
                                const p = projects.find(proj => proj.id === e.projectId);
                                return (
                                    <div key={e.id} className="flex justify-between items-center p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="truncate">
                                            <p className="text-[10px] font-black text-slate-800 truncate">{e.description || 'Intervento'}</p>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p?.color }}></div>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{p?.name}</span>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black text-indigo-600 shrink-0 ml-2">{formatCurrency(calculateEarnings(e))}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <button onClick={() => onViewChange('TIMESHEET')} className="mt-4 w-full py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Apri Registro</button>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-6 text-white shadow-lg">
                        <PieChart size={24} className="mb-3 opacity-60" />
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Business Expense</p>
                        <p className="text-sm font-bold mb-4">Gestisci i costi fissi dello studio per un netto reale preciso.</p>
                        <button onClick={() => onViewChange('EXPENSES')} className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors">Gestisci Spese</button>
                    </div>
                </div>
            </div>

            {/* Footer Professionale */}
            <div className="pt-6 pb-2 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                <span>© 2025 Engineer Riccardo Righini - All Rights Reserved</span>
                <span className="text-indigo-200">Cronosheet Analytics v2.6.0</span>
            </div>
        </div>
    );
};

export default Dashboard;
