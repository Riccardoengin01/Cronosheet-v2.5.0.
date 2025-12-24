
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification, BusinessExpense } from '../types';
import { calculateEarnings, formatCurrency } from '../utils';
import { TrendingUp, ShieldCheck, ChevronRight, PieChart, Landmark, Info, Calculator, CreditCard, Banknote, Percent, ArrowRightCircle, Target, ArrowDownCircle } from 'lucide-react';
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
        
        // --- CASH BASIS: CALCOLI BASATI SOLO SUGLI INCASSI REALI ---
        const yearEntries = entries.filter(e => e.startTime >= startOfYear);
        const yearGrossIncassato = yearEntries.filter(e => e.is_paid).reduce((acc, e) => acc + calculateEarnings(e), 0);
        const yearGrossEmessoTotal = yearEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
        
        // --- LOGICA FISCALE INGEGNERI (Forfettario 5%) ---
        const COEF_REDDITIVITA = 0.78; // 78% per Ingegneri
        
        // 1. Scorporo Inarcassa Integrativo (4%) dal lordo incassato
        // Se il lordo include la cassa, il netto prestazione è Lordo / 1.04
        const inarcassaIntegrativo = yearGrossIncassato - (yearGrossIncassato / 1.04);
        const basePrestazione = yearGrossIncassato - inarcassaIntegrativo;
        
        // 2. Calcolo Reddito Imponibile (Coefficiente 78%)
        const redditoImponibileLordo = basePrestazione * COEF_REDDITIVITA;
        
        // 3. Inarcassa Soggettivo (14,5% sull'imponibile lordo)
        const inarcassaSoggettivo = redditoImponibileLordo * 0.145;
        
        // 4. Imposta Sostitutiva (5% su Imponibile al netto dei contributi previdenziali)
        const impostaSostitutiva = (redditoImponibileLordo - inarcassaSoggettivo) * 0.05;

        const totaleTasseEContributi = inarcassaSoggettivo + impostaSostitutiva;

        // --- SPESE STUDIO ---
        const yearExpenses = busExpenses.filter(exp => new Date(exp.date).getFullYear() === currentYear);
        const totalYearExpenses = yearExpenses.reduce((acc, e) => acc + e.amount, 0);
        
        const expenseBreakdown = [
            { label: 'Software/BIM', val: yearExpenses.filter(e => e.category === 'Software').reduce((acc, e) => acc + e.amount, 0), color: 'bg-indigo-500' },
            { label: 'Ordine/Assic.', val: yearExpenses.filter(e => e.category === 'Ordine/Assicurazione').reduce((acc, e) => acc + e.amount, 0), color: 'bg-blue-400' },
            { label: 'Mobilità', val: yearExpenses.filter(e => e.category === 'Auto/Trasporti').reduce((acc, e) => acc + e.amount, 0), color: 'bg-emerald-400' },
            { label: 'Studio/Utenze', val: yearExpenses.filter(e => e.category === 'Studio/Utenze').reduce((acc, e) => acc + e.amount, 0), color: 'bg-amber-400' },
            { label: 'Altro', val: yearExpenses.filter(e => e.category === 'Altro').reduce((acc, e) => acc + e.amount, 0), color: 'bg-slate-300' }
        ];

        // Netto Reale = Incassato - 4% Integrativo - Tasse/Contributi - Spese Studio
        const nettoRealeInTasca = yearGrossIncassato - inarcassaIntegrativo - totaleTasseEContributi - totalYearExpenses;

        return {
            yearGrossIncassato,
            yearGrossEmessoTotal,
            inarcassaSoggettivo,
            impostaSostitutiva,
            inarcassaIntegrativo,
            basePrestazione,
            redditoImponibileLordo,
            coefRedditivita: COEF_REDDITIVITA,
            totaleTasseEContributi,
            totalYearExpenses,
            expenseBreakdown,
            nettoRealeInTasca,
            isSafe: certs.filter(c => new Date(c.expiryDate).getTime() < now.getTime()).length === 0,
            pendingInvoicesCount: yearEntries.filter(e => e.is_billed && !e.is_paid).length
        };
    }, [entries, certs, busExpenses]);

    return (
        <div className="flex flex-col min-h-[calc(100vh-140px)] animate-fade-in max-w-6xl mx-auto space-y-6">
            
            {/* Top Stats Overview */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase">
                        Studio Professional Ledger <Banknote className="text-emerald-500" size={24} />
                    </h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Calculator size={12}/> Analisi per Cassa • Anno {new Date().getFullYear()}
                    </p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-2 text-center border-r border-slate-50">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Fatturato Emesso</p>
                        <p className="text-xs font-bold text-slate-600 font-mono">{formatCurrency(stats.yearGrossEmessoTotal)}</p>
                    </div>
                    <div className="px-5 py-2 text-center bg-emerald-50/30">
                        <p className="text-[8px] font-black text-emerald-500 uppercase mb-0.5">Cash Incassato Reale</p>
                        <p className="text-xs font-black text-emerald-600 font-mono">{formatCurrency(stats.yearGrossIncassato)}</p>
                    </div>
                </div>
            </div>

            {/* Financial Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. SEZIONE ANALISI FISCALE TRASPARENTE */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5"><Percent size={120} /></div>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Landmark size={18} className="text-indigo-600" /> Fiscal Predictor 78%
                        </h3>
                        <div className="px-2 py-1 rounded-lg bg-red-50 text-[9px] font-black text-red-500 border border-red-100 uppercase">Accantonamento</div>
                    </div>
                    
                    <div className="space-y-4 flex-grow relative z-10">
                        {/* Breakdown Redditività */}
                        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                             <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] font-black text-indigo-400 uppercase">Reddito Imponibile (78%)</p>
                                <Target size={12} className="text-indigo-400" />
                             </div>
                             <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-indigo-700 tracking-tighter">{formatCurrency(stats.redditoImponibileLordo)}</p>
                                <span className="text-[10px] font-bold text-indigo-300">su {formatCurrency(stats.basePrestazione)}</span>
                             </div>
                             <p className="text-[8px] font-bold text-indigo-400 mt-1 uppercase tracking-tight">Base imponibile calcolata al 78% (Codice ATECO Ingegneri)</p>
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
                            <p className="text-[10px] font-black text-slate-400 uppercase">Debito Totale</p>
                            <p className="text-xl font-black text-red-500 tracking-tighter">-{formatCurrency(stats.totaleTasseEContributi + stats.inarcassaIntegrativo)}</p>
                        </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                         <div className="flex items-start gap-3">
                             <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                             <p className="text-[9px] text-slate-500 leading-relaxed font-bold uppercase">
                                Verifica: Lordo Incassato → Scorporo 4% → Coefficiente 78% → Soggettivo 14.5% → Sostitutiva 5%. 
                             </p>
                         </div>
                    </div>
                </div>

                {/* 2. SEZIONE SPESE STUDIO REALI */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-100/50 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5"><PieChart size={120} /></div>
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <PieChart size={18} className="text-indigo-600" /> Gestione Costi Studio
                        </h3>
                        <button onClick={() => onViewChange('EXPENSES')} className="text-indigo-600 hover:text-indigo-800 transition-colors"><ChevronRight size={20}/></button>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase">Spese Reali Sostenute</p>
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

                {/* 3. SEZIONE DISPONIBILITÀ NETTA (UTILE REALIZZATO) */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={160} /></div>
                    
                    <div className="relative z-10 flex-grow">
                        <h3 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-12">
                             Net Performance Ledger
                        </h3>
                        
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Utente Netto Reale "In Tasca"</p>
                            <p className="text-5xl font-black text-white tracking-tighter">{formatCurrency(stats.nettoRealeInTasca)}</p>
                        </div>

                        <div className="mt-12 space-y-4">
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incidenza Netta</span>
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
                        <CreditCard size={18} /> {stats.pendingInvoicesCount} Fatture Pendenti Incasso
                    </button>
                </div>
            </div>

            {/* Support Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-all" onClick={() => onViewChange('SECURE_TRAIN')}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.isSafe ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Secure Portfolio</p>
                            <p className="text-xs font-black text-slate-800">
                                {stats.isSafe ? "Compliance Certificazioni Garantita" : "Scadenze Tecniche Rilevate"}
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
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Time Ledger</p>
                            <p className="text-xs font-black text-slate-800">Registra nuove prestazioni professionali</p>
                        </div>
                    </div>
                    <ArrowRightCircle size={20} className="text-slate-200 group-hover:text-indigo-600 transition-colors" />
                </div>
            </div>

            <div className="pt-8 border-t border-slate-50 text-center">
                <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.6em]">Cronosheet Executive v3.0 • Optimized for Engineering Firms</p>
            </div>
        </div>
    );
};

export default Dashboard;
