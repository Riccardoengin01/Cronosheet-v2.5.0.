
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification, BusinessExpense } from '../types';
import { calculateEarnings, formatCurrency, formatDurationHuman } from '../utils';
import { Clock, TrendingUp, AlertCircle, ShieldCheck, ChevronRight, Calendar, Activity, Briefcase, Wallet, PieChart, Landmark, ArrowDownCircle, Info, Calculator, CreditCard, Banknote, Percent } from 'lucide-react';
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
        const currentYear = now.getFullYear();
        const startOfYear = new Date(currentYear, 0, 1).getTime();
        
        // --- CALCOLO CASH BASIS (SOLO INCASSATO) ---
        const yearEntries = entries.filter(e => e.startTime >= startOfYear);
        const yearGrossIncassato = yearEntries.filter(e => e.is_paid).reduce((acc, e) => acc + calculateEarnings(e), 0);
        const yearGrossEmesso = yearEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
        
        // --- FISCAL ENGINE (INGEGNERI FORFETTARIO 5%) ---
        const coefRedditivita = 0.78;
        
        // Inarcassa Integrativo (4% sul fatturato incassato, incassato per la cassa)
        const inarcassaIntegrativo = yearGrossIncassato * 0.04;
        
        // Reddito Imponibile (su fatturato netto da cassa integrativa)
        // Nota: Nel forfettario l'integrativo 4% non fa parte del reddito imponibile
        const redditoLordoPerImponibile = yearGrossIncassato * coefRedditivita;
        
        // Inarcassa Soggettivo (14,5%)
        const inarcassaSoggettivo = redditoLordoPerImponibile * 0.145;
        
        // Imposta Sostitutiva (5% calcolato su Imponibile al netto di Inarcassa Soggettivo)
        const impostaSostitutiva = (redditoLordoPerImponibile - inarcassaSoggettivo) * 0.05;

        const totaleTasseEContributi = inarcassaSoggettivo + impostaSostitutiva;

        // --- SPESE STUDIO (COSTI FISSI) ---
        const yearExpenses = busExpenses.filter(exp => new Date(exp.date).getFullYear() === currentYear);
        const totalYearExpenses = yearExpenses.reduce((acc, e) => acc + e.amount, 0);
        
        const expenseBreakdown = {
            software: yearExpenses.filter(e => e.category === 'Software').reduce((acc, e) => acc + e.amount, 0),
            ordine: yearExpenses.filter(e => e.category === 'Ordine/Assicurazione').reduce((acc, e) => acc + e.amount, 0),
            trasporti: yearExpenses.filter(e => e.category === 'Auto/Trasporti').reduce((acc, e) => acc + e.amount, 0),
            utenze: yearExpenses.filter(e => e.category === 'Studio/Utenze').reduce((acc, e) => acc + e.amount, 0),
            altro: yearExpenses.filter(e => e.category === 'Altro').reduce((acc, e) => acc + e.amount, 0)
        };

        const nettoRealeInTasca = yearGrossIncassato - totaleTasseEContributi - totalYearExpenses - inarcassaIntegrativo;

        return {
            yearGrossIncassato,
            yearGrossEmesso,
            inarcassaSoggettivo,
            impostaSostitutiva,
            inarcassaIntegrativo,
            totaleTasseEContributi,
            totalYearExpenses,
            expenseBreakdown,
            nettoRealeInTasca,
            pendingInvoicesCount: yearEntries.filter(e => e.is_billed && !e.is_paid).length,
            isSafe: certs.filter(c => new Date(c.expiryDate).getTime() < now.getTime()).length === 0
        };
    }, [entries, certs, busExpenses]);

    return (
        <div className="flex flex-col min-h-[calc(100vh-140px)] animate-fade-in max-w-6xl mx-auto space-y-6">
            
            {/* Top Bar Finance */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase">
                        Master Cash Ledger <Banknote className="text-emerald-500" size={24} />
                    </h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Calculator size={12}/> Contabilità Professionale per Cassa • Anno {new Date().getFullYear()}
                    </p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="px-4 py-2 text-center border-r border-slate-50">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Emesso</p>
                        <p className="text-xs font-bold text-slate-600">{formatCurrency(stats.yearGrossEmesso)}</p>
                    </div>
                    <div className="px-4 py-2 text-center">
                        <p className="text-[8px] font-black text-emerald-500 uppercase">Incassato Reale</p>
                        <p className="text-xs font-black text-emerald-600">{formatCurrency(stats.yearGrossIncassato)}</p>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. SEZIONE ACCANTONAMENTI (TASSE & INARCASSA) */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Landmark size={18} className="text-indigo-600" /> Fiscal Predictor
                        </h3>
                        <Percent size={16} className="text-slate-200" />
                    </div>
                    
                    <div className="space-y-5 flex-grow">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Totale Accantonamento</p>
                             <p className="text-3xl font-black text-red-500">-{formatCurrency(stats.totaleTasseEContributi + stats.inarcassaIntegrativo)}</p>
                        </div>

                        <div className="space-y-3 px-1">
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-bold uppercase tracking-tight">Inarcassa Soggettivo (14,5%)</span>
                                <span className="font-mono font-black text-slate-800">{formatCurrency(stats.inarcassaSoggettivo)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-bold uppercase tracking-tight">Inarcassa Integrativo (4%)</span>
                                <span className="font-mono font-black text-slate-800">{formatCurrency(stats.inarcassaIntegrativo)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-bold uppercase tracking-tight">Imposta Sostitutiva (5%)</span>
                                <span className="font-mono font-black text-slate-800">{formatCurrency(stats.impostaSostitutiva)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-slate-50">
                         <div className="flex items-start gap-3 bg-indigo-50/50 p-4 rounded-2xl">
                             <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                             <p className="text-[9px] text-indigo-900/60 leading-relaxed font-bold uppercase">
                                Calcolo effettuato su Imponibile Lordo (Coefficiente 78%) al netto dei contributi previdenziali versati.
                             </p>
                         </div>
                    </div>
                </div>

                {/* 2. SEZIONE SPESE STUDIO DETTAGLIATE */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-100/50">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <PieChart size={18} className="text-indigo-600" /> Analisi Costi Studio
                        </h3>
                        <ArrowDownCircle size={16} className="text-red-300" />
                    </div>

                    <div className="space-y-6">
                        <div>
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Costi Reali Sostenuti</p>
                             <p className="text-3xl font-black text-slate-900">{formatCurrency(stats.totalYearExpenses)}</p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { label: 'Software / BIM', val: stats.expenseBreakdown.software, color: 'bg-indigo-500' },
                                { label: 'Ordine / Assicurazione', val: stats.expenseBreakdown.ordine, color: 'bg-blue-400' },
                                { label: 'Auto / Trasporti', val: stats.expenseBreakdown.trasporti, color: 'bg-emerald-400' },
                                { label: 'Utenze / Studio', val: stats.expenseBreakdown.utenze, color: 'bg-amber-400' },
                                { label: 'Altro', val: stats.expenseBreakdown.altro, color: 'bg-slate-300' }
                            ].map(item => (
                                <div key={item.label} className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                                        <span className="text-slate-500">{item.label}</span>
                                        <span className="text-slate-900">{formatCurrency(item.val)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${item.color} rounded-full transition-all duration-1000`} 
                                            style={{ width: `${stats.totalYearExpenses > 0 ? (item.val / stats.totalYearExpenses * 100) : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. SEZIONE DISPONIBILITÀ REALE (UTILE NETTO) */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={160} /></div>
                    
                    <div className="relative z-10 flex-grow">
                        <h3 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                             Performance Economica
                        </h3>
                        
                        <div className="mt-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Netto Reale "In Tasca"</p>
                            <p className="text-5xl font-black text-white tracking-tighter">{formatCurrency(stats.nettoRealeInTasca)}</p>
                            
                            <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incidenza Netta</span>
                                    <span className="text-sm font-black text-emerald-400">
                                        {stats.yearGrossIncassato > 0 ? (stats.nettoRealeInTasca / stats.yearGrossIncassato * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 rounded-full" 
                                        style={{ width: `${stats.yearGrossIncassato > 0 ? (stats.nettoRealeInTasca / stats.yearGrossIncassato * 100) : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => onViewChange('ARCHIVE')}
                        className="relative z-10 mt-8 w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <CreditCard size={16} /> Gestione Incassi Pendenti
                    </button>
                </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-300 transition-all" onClick={() => onViewChange('SECURE_TRAIN')}>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stats.isSafe ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Security Training</p>
                            <p className="text-sm font-black text-slate-800">
                                {stats.isSafe ? "Tutte le certificazioni conformi" : "Rilevate scadenze imminenti"}
                            </p>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-300 transition-all" onClick={() => onViewChange('EXPENSES')}>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                            <Briefcase size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Business Management</p>
                            <p className="text-sm font-black text-slate-800">Aggiorna i costi fissi dello studio</p>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </div>
            </div>

            {/* Professional Footer */}
            <div className="pt-10 pb-4 border-t border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Cronosheet Professional Analytics v2.8.0 • Developed for Engineering Studios</p>
            </div>
        </div>
    );
};

export default Dashboard;
