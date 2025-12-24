
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification, BusinessExpense, AppView } from '../types';
import { calculateEarnings, formatCurrency } from '../utils';
import { 
  TrendingUp, 
  ShieldCheck, 
  ChevronRight, 
  PieChart, 
  Landmark, 
  Info, 
  Calculator, 
  CreditCard, 
  Banknote, 
  Percent, 
  ArrowRightCircle, 
  Target, 
  FileText 
} from 'lucide-react';
import * as DB from '../services/db';

interface DashboardProps {
    entries: TimeEntry[];
    projects: Project[];
    userProfile: any;
    onViewChange: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ entries, projects, userProfile, onViewChange }) => {
    const [certs, setCerts] = useState<Certification[]>([]);
    const [busExpenses, setBusExpenses] = useState<BusinessExpense[]>([]);
    const [numBolli, setNumBolli] = useState<number>(1); 
    
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
        
        // 1. Filtro le entries dell'anno corrente
        const yearEntries = (entries || []).filter(e => e.startTime >= startOfYear);
        
        // 2. Calcolo il Lordo Incassato Reale (Cash in Bank)
        const yearGrossIncassato = yearEntries
            .filter(e => e.is_paid)
            .reduce((acc, e) => acc + calculateEarnings(e), 0);
            
        const yearGrossEmessoTotal = yearEntries
            .reduce((acc, e) => acc + calculateEarnings(e), 0);
        
        // --- LOGICA FISCALE INGEGNERI (REGIME FORFETTARIO) ---
        const COEF_REDDITIVITA = 0.78; 
        const TOT_BOLLI = (numBolli || 0) * 2;
        
        // Procedura inversa richiesta: Lordo = (Base + Bolli) * 1.04
        const basePiuBolli = yearGrossIncassato / 1.04;
        const inarcassaIntegrativo = yearGrossIncassato - basePiuBolli;
        
        // Base per il 78% = (Base + Bolli) - Bolli reali
        const basePrestazionePura = Math.max(0, basePiuBolli - TOT_BOLLI);
        
        // Calcolo Reddito Imponibile
        const redditoFiscale = basePrestazionePura * COEF_REDDITIVITA;
        
        // Tasse e Contributi
        const inarcassaSoggettivo = redditoFiscale * 0.145; 
        const impostaSostitutiva = Math.max(0, redditoFiscale - inarcassaSoggettivo) * 0.05; 

        const accantonamentoTasseCassa = inarcassaSoggettivo + impostaSostitutiva;

        // Spese Studio Reali
        const yearExpenses = busExpenses.filter(exp => new Date(exp.date).getFullYear() === currentYear);
        const totalYearExpenses = yearExpenses.reduce((acc, e) => acc + e.amount, 0);
        
        const expenseBreakdown = [
            { label: 'Software/BIM', val: yearExpenses.filter(e => e.category === 'Software').reduce((acc, e) => acc + e.amount, 0), color: 'bg-indigo-500' },
            { label: 'Assicurazione/Ordine', val: yearExpenses.filter(e => e.category === 'Ordine/Assicurazione').reduce((acc, e) => acc + e.amount, 0), color: 'bg-blue-400' },
            { label: 'Auto/Trasporti', val: yearExpenses.filter(e => e.category === 'Auto/Trasporti').reduce((acc, e) => acc + e.amount, 0), color: 'bg-emerald-400' },
            { label: 'Utenze Studio', val: yearExpenses.filter(e => e.category === 'Studio/Utenze').reduce((acc, e) => acc + e.amount, 0), color: 'bg-amber-400' },
            { label: 'Altro', val: yearExpenses.filter(e => e.category === 'Altro').reduce((acc, e) => acc + e.amount, 0), color: 'bg-slate-300' }
        ];

        const nettoRealeInTasca = yearGrossIncassato - inarcassaIntegrativo - accantonamentoTasseCassa - totalYearExpenses - TOT_BOLLI;

        return {
            yearGrossIncassato,
            yearGrossEmessoTotal,
            inarcassaIntegrativo,
            basePiuBolli,
            basePrestazionePura,
            redditoFiscale,
            inarcassaSoggettivo,
            impostaSostitutiva,
            accantonamentoTasseCassa,
            totalYearExpenses,
            expenseBreakdown,
            nettoRealeInTasca,
            totBolli: TOT_BOLLI,
            coefPct: COEF_REDDITIVITA * 100,
            isSafe: certs.filter(c => c.expiryDate && new Date(c.expiryDate).getTime() < now.getTime()).length === 0,
            pendingInvoicesCount: yearEntries.filter(e => e.is_billed && !e.is_paid).length
        };
    }, [entries, certs, busExpenses, numBolli]);

    return (
        <div className="flex flex-col min-h-[calc(100vh-140px)] animate-fade-in max-w-6xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase">
                        FluxLedger Professional <Banknote className="text-emerald-500" size={24} />
                    </h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Calculator size={12}/> Revisione Fiscale Certificata • Anno {new Date().getFullYear()}
                    </p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-2 text-center border-r border-slate-50">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Emesso Totale</p>
                        <p className="text-xs font-bold text-slate-600 font-mono">{formatCurrency(stats.yearGrossEmessoTotal)}</p>
                    </div>
                    <div className="px-5 py-2 text-center bg-emerald-50/30">
                        <p className="text-[8px] font-black text-emerald-500 uppercase mb-0.5">Incassato Lordo</p>
                        <p className="text-xs font-black text-emerald-600 font-mono">{formatCurrency(stats.yearGrossIncassato)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. ANALISI FISCALE */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5 text-indigo-900"><Landmark size={140} /></div>
                    
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Percent size={18} className="text-indigo-600" /> Redditività {stats.coefPct}%
                        </h3>
                        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                             <FileText size={12} className="text-slate-400" />
                             <span className="text-[10px] font-black text-slate-500 uppercase">Bolli (€2):</span>
                             <input 
                                type="number" 
                                min="0" 
                                className="w-8 bg-transparent text-[10px] font-black text-indigo-600 outline-none" 
                                value={numBolli} 
                                onChange={(e) => setNumBolli(parseInt(e.target.value) || 0)} 
                             />
                        </div>
                    </div>
                    
                    <div className="space-y-4 flex-grow relative z-10">
                        <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-lg">
                             <p className="text-[9px] font-black text-indigo-300 uppercase mb-1">Punto di Partenza (Cash Lordo)</p>
                             <p className="text-3xl font-black font-mono tracking-tighter">{formatCurrency(stats.yearGrossIncassato)}</p>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Scorporo 4% (incl. bolli)</span>
                                <span className="text-xs font-black text-red-400">-{formatCurrency(stats.inarcassaIntegrativo)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Detrazione Bolli ({stats.totBolli / 2})</span>
                                <span className="text-xs font-black text-slate-600">-{formatCurrency(stats.totBolli)}</span>
                            </div>
                            
                            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 mt-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-black text-emerald-600 uppercase">Imponibile Fiscale ({stats.coefPct}%)</span>
                                    <Target size={14} className="text-emerald-500" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-xl font-black text-emerald-700 tracking-tighter">{formatCurrency(stats.redditoFiscale)}</p>
                                    <span className="text-[9px] font-bold text-emerald-400">su {formatCurrency(stats.basePrestazionePura)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Cassa (14.5%)</p>
                                    <p className="text-xs font-black text-slate-700">{formatCurrency(stats.inarcassaSoggettivo)}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Tasse (5%)</p>
                                    <p className="text-xs font-black text-slate-700">{formatCurrency(stats.impostaSostitutiva)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Debito Obbligatorio</p>
                            <p className="text-xl font-black text-red-500 tracking-tighter">-{formatCurrency(stats.accantonamentoTasseCassa)}</p>
                        </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                         <div className="flex items-start gap-3">
                             <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                             <p className="text-[9px] text-amber-700 leading-relaxed font-bold uppercase">
                                Verifica Commercialista: 4% calcolato su (Base + Bolli). Redditività applicata sulla prestazione netta.
                             </p>
                         </div>
                    </div>
                </div>

                {/* 2. COSTI STUDIO */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-100/50 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5"><PieChart size={120} /></div>
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <PieChart size={18} className="text-indigo-600" /> Studio Overheads
                        </h3>
                        <button onClick={() => onViewChange(AppView.EXPENSES)} className="text-indigo-600 hover:text-indigo-800 transition-colors"><ChevronRight size={20}/></button>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase">Spese Reali Anno</p>
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

                {/* 3. NETTO REALE */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={160} /></div>
                    
                    <div className="relative z-10 flex-grow">
                        <h3 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-12">
                             Flux Balance Performance
                        </h3>
                        
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Utile Reale (Netto in Tasca)</p>
                            <p className="text-5xl font-black text-white tracking-tighter">{formatCurrency(stats.nettoRealeInTasca)}</p>
                        </div>

                        <div className="mt-12 space-y-4">
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rendimento Effettivo %</span>
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
                        onClick={() => onViewChange(AppView.ARCHIVE)}
                        className="relative z-10 mt-10 w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg"
                    >
                        <CreditCard size={18} /> {stats.pendingInvoicesCount} Fatture da Incassare
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-all" onClick={() => onViewChange(AppView.SECURE_TRAIN)}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.isSafe ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Secure Portfolio</p>
                            <p className="text-xs font-black text-slate-800">
                                {stats.isSafe ? "Compliance Tecnica Garantita" : "Scadenze Tecniche Rilevate"}
                            </p>
                        </div>
                    </div>
                    <ArrowRightCircle size={20} className="text-slate-200 group-hover:text-indigo-600 transition-colors" />
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-all" onClick={() => onViewChange(AppView.TIMESHEET)}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
                            <Calculator size={28} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Professional Ledger</p>
                            <p className="text-xs font-black text-slate-800">Registra attività e prestazioni</p>
                        </div>
                    </div>
                    <ArrowRightCircle size={20} className="text-slate-200 group-hover:text-indigo-600 transition-colors" />
                </div>
            </div>

            <div className="pt-8 border-t border-slate-50 text-center">
                <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.6em]">FluxLedger Professional v1.4 • Certified Engineering Systems</p>
            </div>
        </div>
    );
};

export default Dashboard;
