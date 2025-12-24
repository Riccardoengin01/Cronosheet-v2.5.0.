
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification, BusinessExpense } from '../types';
import { calculateEarnings, formatCurrency } from '../utils';
import { TrendingUp, ShieldCheck, ChevronRight, PieChart, Landmark, Info, Calculator, CreditCard, Banknote, Percent, ArrowRightCircle, Target } from 'lucide-react';
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
        
        // --- CASH BASIS: SOLO QUELLO CHE È STATO INCASSATO ---
        const yearEntries = entries.filter(e => e.startTime >= startOfYear);
        const yearGrossIncassato = yearEntries.filter(e => e.is_paid).reduce((acc, e) => acc + calculateEarnings(e), 0);
        const yearGrossEmessoTotal = yearEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
        
        // --- ALGORITMO FISCALE INGEGNERI (Regime Forfettario) ---
        const coefRedditivita = 0.78; // Codice ATECO 71.12.10
        
        // 1. Scorporo Inarcassa Integrativo (4%) dal lordo incassato
        // Se hai incassato 104€, 4€ sono di Inarcassa. Formula: Tot / 1.04 * 0.04
        const inarcassaIntegrativo = yearGrossIncassato - (yearGrossIncassato / 1.04);
        
        // 2. Base per il calcolo redditività (Lordo incassato - quota integrativa)
        const baseCalcolo = yearGrossIncassato - inarcassaIntegrativo;
        
        // 3. Calcolo Reddito Imponibile al 78%
        const redditoImponibile = baseCalcolo * coefRedditivita;
        
        // 4. Inarcassa Soggettivo (14,5% sul reddito imponibile)
        const inarcassaSoggettivo = redditoImponibile * 0.145;
        
        // 5. Imposta Sostitutiva (5% per startup su Imponibile al netto dei contributi soggettivi versati)
        const impostaSostitutiva = (redditoImponibile - inarcassaSoggettivo) * 0.05;

        const totaleAccantonamenti = inarcassaSoggettivo + impostaSostitutiva;

        // --- SPESE STUDIO ---
        const yearExpenses = busExpenses.filter(exp => new Date(exp.date).getFullYear() === currentYear);
        const totalYearExpenses = yearExpenses.reduce((acc, e) => acc + e.amount, 0);
        
        const expenseBreakdown = [
            { label: 'Software/BIM', val: yearExpenses.filter(e => e.category === 'Software').reduce((acc, e) => acc + e.amount, 0), color: 'bg-indigo-500' },
            { label: 'Ordine/Assic.', val: yearExpenses.filter(e => e.category === 'Ordine/Assicurazione').reduce((acc, e) => acc + e.amount, 0), color: 'bg-blue-400' },
            { label: 'Mobilità', val: yearExpenses.filter(e => e.category === 'Auto/Trasporti').reduce((acc, e) => acc + e.amount, 0), color: 'bg-emerald-400' },
            { label: 'Studio/Altro', val: yearExpenses.filter(e => !['Software', 'Ordine/Assicurazione', 'Auto/Trasporti'].includes(e.category)).reduce((acc, e) => acc + e.amount, 0), color: 'bg-slate-300' }
        ];

        const nettoRealeInTasca = yearGrossIncassato - inarcassaIntegrativo - totaleAccantonamenti - totalYearExpenses;

        return {
            yearGrossIncassato,
            yearGrossEmessoTotal,
            inarcassaSoggettivo,
            impostaSostitutiva,
            inarcassaIntegrativo,
            redditoImponibile,
            totaleAccantonamenti,
            totalYearExpenses,
            expenseBreakdown,
            nettoRealeInTasca,
            isSafe: certs.filter(c => new Date(c.expiryDate).getTime() < now.getTime()).length === 0,
            pendingInvoicesCount: yearEntries.filter(e => e.is_billed && !e.is_paid).length
        };
    }, [entries, certs, busExpenses]);

    return (
        <div className="flex flex-col min-h-[calc(100vh-140px)] animate-fade-in max-w-6xl mx-auto space-y-6">
            
            {/* Professional Header Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase">
                        Executive Finance <Banknote className="text-emerald-500" size={24} />
                    </h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Landmark size={12}/> Analisi Cash Basis • Studio Ing. Riccardo Righini • Anno {new Date().getFullYear()}
                    </p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-2 text-center border-r border-slate-50">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Emesso Totale</p>
                        <p className="text-xs font-bold text-slate-600 font-mono">{formatCurrency(stats.yearGrossEmessoTotal)}</p>
                    </div>
                    <div className="px-5 py-2 text-center bg-emerald-50/30">
                        <p className="text-[8px] font-black text-emerald-500 uppercase mb-0.5">Cash Incassato</p>
                        <p className="text-xs font-black text-emerald-600 font-mono">{formatCurrency(stats.yearGrossIncassato)}</p>
                    </div>
                </div>
            </div>

            {/* Financial Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. SEZIONE ACCANTONAMENTO FISCALE CON DETTAGLIO 78% */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5"><Percent size={120} /></div>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Calculator size={18} className="text-indigo-600" /> Tasse & Cassa
                        </h3>
                        <div className="px-2 py-1 rounded-lg bg-red-50 text-[9px] font-black text-red-500 border border-red-100 uppercase">Accantonamento</div>
                    </div>
                    
                    <div className="space-y-5 flex-grow relative z-10">
                        {/* Box Imponibile 78% */}
                        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                             <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] font-black text-indigo-400 uppercase">Reddito Imponibile (78%)</p>
                                <Target size={12} className="text-indigo-400" />
                             </div>
                             <p className="text-2xl font-black text-indigo-700 tracking-tighter">{formatCurrency(stats.redditoImponibile)}</p>
                             <p className="text-[8px] font-bold text-indigo-400 mt-1 uppercase tracking-tight">Base di calcolo contributiva e fiscale</p>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-tighter">Inarcassa Soggettivo (14.5%)</span>
                                <span className="font-mono font-black text-slate-800">{formatCurrency(stats.inarcassaSoggettivo)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-tighter">Inarcassa Integrativo (4%)</span>
                                <span className="font-mono font-black text-slate-800">{formatCurrency(stats.inarcassaIntegrativo)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-tighter">Imposta Sostitutiva (5%)</span>
                                <span className="font-mono font-black text-slate-800">{formatCurrency(stats.impostaSostitutiva)}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Totale Debito</p>
                            <p className="text-xl font-black text-red-500 tracking-tighter">-{formatCurrency(stats.totaleAccantonamenti + stats.inarcassaIntegrativo)}</p>
                        </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                         <div className="flex items-start gap-3">
                             <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                             <p className="text-[9px] text-slate-500 leading-relaxed font-bold uppercase">
                                Algoritmo: Scorporo 4%, poi applicazione coefficiente 78% sul netto. Soggettivo 14.5% su imponibile. Imposta 5% su (Imponibile - Contributi).
                             </p>
                         </div>
                    </div>
                </div>

                {/* 2. SEZIONE SPESE STUDIO REALI */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-100/50 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5"><PieChart size={120} /></div>
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <PieChart size={18} className="text-indigo-600" /> Costi Reali Studio
                        </h3>
                        <button onClick={() => onViewChange('EXPENSES')} className="text-indigo-600 hover:text-indigo-800 transition-colors"><ChevronRight size={20}/></button>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase">Uscite Sostenute</p>
                             <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.totalYearExpenses)}</p>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            {stats.expenseBreakdown.map(item => (
                                <div key={item.label} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                                        <span className="text-slate-500">{item.label}</span>
                                        <span className="text-slate-900 font-mono">{formatCurrency(item.val)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${item.color} rounded-full transition-all duration-700`} 
                                            style={{ width: `${stats.totalYearExpenses > 0 ? (item.val / stats.totalYearExpenses * 100) : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. SEZIONE DISPONIBILITÀ NETTA (UTILE) */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={160} /></div>
                    
                    <div className="relative z-10 flex-grow">
                        <h3 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-12">
                             Executive Balance
                        </h3>
                        
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Netto Reale In Tasca</p>
                            <p className="text-5xl font-black text-white tracking-tighter">{formatCurrency(stats.nettoRealeInTasca)}</p>
                        </div>

                        <div className="mt-12 space-y-4">
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rendimento Netto</span>
                                    <span className="text-sm font-black text-emerald-400">
                                        {stats.yearGrossIncassato > 0 ? (stats.nettoRealeInTasca / stats.yearGrossIncassato * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full" 
                                        style={{ width: `${stats.yearGrossIncassato > 0 ? (stats.nettoRealeInTasca / stats.yearGrossIncassato * 100) : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => onViewChange('ARCHIVE')}
                        className="relative z-10 mt-10 w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg"
                    >
                        <CreditCard size={18} /> {stats.pendingInvoicesCount} Fatture da Incassare
                    </button>
                </div>
            </div>

            {/* Sub Widgets Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-all" onClick={() => onViewChange('SECURE_TRAIN')}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.isSafe ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Secure Train</p>
                            <p className="text-xs font-black text-slate-800">
                                {stats.isSafe ? "Tutte le nomine sono in corso di validità" : "Rilevate scadenze abilitative"}
                            </p>
                        </div>
                    </div>
                    <ArrowRightCircle size={20} className="text-slate-200 group-hover:text-indigo-600 transition-colors" />
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-all" onClick={() => onViewChange('TIMESHEET')}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
                            <Calculator size={28} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Monitoraggio Ore</p>
                            <p className="text-xs font-black text-slate-800">Visualizza riepilogo attività mensile</p>
                        </div>
                    </div>
                    <ArrowRightCircle size={20} className="text-slate-200 group-hover:text-indigo-600 transition-colors" />
                </div>
            </div>

            <div className="pt-8 border-t border-slate-50 text-center">
                <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.6em]">Cronosheet Professional Ledger v2.9.1 • Developed for Engineering Studios</p>
            </div>
        </div>
    );
};

export default Dashboard;
