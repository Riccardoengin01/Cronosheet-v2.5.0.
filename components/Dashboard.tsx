
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification, BusinessExpense } from '../types';
import { calculateEarnings, formatCurrency, formatDurationHuman } from '../utils';
import { Clock, TrendingUp, AlertCircle, ShieldCheck, ChevronRight, Calendar, Activity, Briefcase, Wallet, PieChart, Landmark, ArrowDownCircle, Info, Calculator, CreditCard } from 'lucide-react';
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
        
        // --- FISCAL ENGINE (INGEGNERI FORFETTARIO) ---
        // Ipotizziamo Forfettario 5% startup e Coefficiente 78% (Codice ATECO 71.12.10)
        const coefRedditivita = 0.78;
        
        // 1. Reddito Imponibile Lordo
        const redditoLordo = yearGrossIncassato * coefRedditivita;
        
        // 2. Inarcassa Soggettivo (circa 14.5% sull'imponibile)
        const inarcassaSoggettivo = redditoLordo * 0.145;
        
        // 3. Imposta Sostitutiva (5% calcolato su Imponibile al netto dei contributi pagati)
        const impostaSostitutiva = (redditoLordo - inarcassaSoggettivo) * 0.05;
        
        // 4. Inarcassa Integrativo (4% - Già presente nel lordo fatturato, incassato per conto della cassa)
        const inarcassaIntegrativo = yearGrossIncassato * 0.04;

        const totaleAccantonamenti = inarcassaSoggettivo + impostaSostitutiva;

        // --- SPESE STUDIO (COSTI FISSI) ---
        const yearExpenses = busExpenses.filter(exp => new Date(exp.date).getFullYear() === currentYear);
        const totalYearExpenses = yearExpenses.reduce((acc, e) => acc + e.amount, 0);
        
        const expenseBreakdown = {
            software: yearExpenses.filter(e => e.category === 'Software').reduce((acc, e) => acc + e.amount, 0),
            ordine: yearExpenses.filter(e => e.category === 'Ordine/Assicurazione').reduce((acc, e) => acc + e.amount, 0),
            trasporti: yearExpenses.filter(e => e.category === 'Auto/Trasporti').reduce((acc, e) => acc + e.amount, 0),
            altro: yearExpenses.filter(e => !['Software', 'Ordine/Assicurazione', 'Auto/Trasporti'].includes(e.category)).reduce((acc, e) => acc + e.amount, 0)
        };

        const nettoRealeInTasca = yearGrossIncassato - totaleAccantonamenti - totalYearExpenses;

        const pendingInvoicesCount = yearEntries.filter(e => e.is_billed && !e.is_paid).length;

        return {
            yearGrossIncassato,
            yearGrossEmesso,
            inarcassaSoggettivo,
            impostaSostitutiva,
            inarcassaIntegrativo,
            totaleAccantonamenti,
            totalYearExpenses,
            expenseBreakdown,
            nettoRealeInTasca,
            pendingInvoicesCount,
            isSafe: certs.filter(c => new Date(c.expiryDate).getTime() < now.getTime()).length === 0,
            monthEarnings: yearEntries.filter(e => e.startTime >= new Date(now.getFullYear(), now.getMonth(), 1).getTime()).reduce((acc, e) => acc + calculateEarnings(e), 0)
        };
    }, [entries, certs, busExpenses]);

    return (
        <div className="flex flex-col min-h-[calc(100vh-140px)] animate-fade-in max-w-6xl mx-auto space-y-4">
            
            {/* Header */}
            <div className="flex justify-between items-center px-2">
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-2 uppercase">
                        Executive Finance <Calculator className="text-indigo-600" size={18} />
                    </h1>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
                        Contabilità per Cassa • Ing. Riccardo Righini
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
                        <Landmark size={12} className="text-indigo-500" /> Fiscal Year {new Date().getFullYear()}
                    </div>
                </div>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-xl flex flex-col justify-between overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Wallet size={80} /></div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-1">Incassato Reale (Cash)</p>
                        <p className="text-2xl font-black tracking-tighter">{formatCurrency(stats.yearGrossIncassato)}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 text-[9px] font-bold text-slate-400 flex justify-between items-center">
                        <span>Emesso: {formatCurrency(stats.yearGrossEmesso)}</span>
                        <span className="text-amber-400">{stats.pendingInvoicesCount} pendenti</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Accantonamento Fiscale</p>
                        <p className="text-2xl font-black text-red-500 tracking-tighter">-{formatCurrency(stats.totaleAccantonamenti)}</p>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                        <div className="px-2 py-0.5 rounded-lg bg-red-50 text-[8px] font-black text-red-600 border border-red-100">INARCASSA 14.5%</div>
                        <div className="px-2 py-0.5 rounded-lg bg-red-50 text-[8px] font-black text-red-600 border border-red-100">IMPOSTA 5%</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Spese Studio (Fixed)</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.totalYearExpenses)}</p>
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1 italic">Incidenza: {stats.yearGrossIncassato > 0 ? ((stats.totalYearExpenses / stats.yearGrossIncassato) * 100).toFixed(1) : 0}% sul fatturato</p>
                </div>

                <div className="bg-indigo-600 p-5 rounded-2xl text-white shadow-xl shadow-indigo-100 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10 -mr-4 -mb-4"><TrendingUp size={100}/></div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-100 mb-1">Disponibilità Netta (Utile)</p>
                        <p className="text-2xl font-black tracking-tighter">{formatCurrency(stats.nettoRealeInTasca)}</p>
                    </div>
                    <button onClick={() => onViewChange('REPORTS')} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1 mt-4 text-indigo-100 hover:text-white transition-colors">
                        Analisi Rendimento <ChevronRight size={10} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Dettaglio Tasse & Inarcassa */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2 mb-6">
                            <Landmark size={16} className="text-indigo-600" /> Analisi Dettagliata Accantonamenti
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                        Inarcassa Soggettivo (14,5%)
                                    </div>
                                    <span className="font-mono text-slate-900">{formatCurrency(stats.inarcassaSoggettivo)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                        Imposta Sostitutiva Forfettario (5%)
                                    </div>
                                    <span className="font-mono text-slate-900">{formatCurrency(stats.impostaSostitutiva)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-400 italic">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                        Inarcassa Integrativo (4% Pass-through)
                                    </div>
                                    <span className="font-mono">{formatCurrency(stats.inarcassaIntegrativo)}</span>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 mt-4">
                                <p className="text-[10px] font-black text-indigo-600 uppercase mb-2 flex items-center gap-1">
                                    <Info size={12}/> Nota Tecnica per Riccardo
                                </p>
                                <p className="text-[10px] text-indigo-900/70 font-medium leading-relaxed">
                                    I calcoli sono basati sul <strong>Cash Basis</strong> (Incassato). Il contributo integrativo del 4% è escluso dal calcolo delle imposte poiché riscosso per conto dell'ente. L'imponibile è calcolato applicando il coefficiente di redditività del 78% (Ingegneria).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Dettaglio Spese Studio */}
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2 mb-6">
                            <PieChart size={16} className="text-indigo-600" /> Breakdown Costi Reali Studio
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Software / BIM</p>
                                <p className="text-sm font-black text-slate-800">{formatCurrency(stats.expenseBreakdown.software)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Ordine / Assic.</p>
                                <p className="text-sm font-black text-slate-800">{formatCurrency(stats.expenseBreakdown.ordine)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Mobilità / Auto</p>
                                <p className="text-sm font-black text-slate-800">{formatCurrency(stats.expenseBreakdown.trasporti)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Altro</p>
                                <p className="text-sm font-black text-slate-800">{formatCurrency(stats.expenseBreakdown.altro)}</p>
                            </div>
                        </div>
                        <button onClick={() => onViewChange('EXPENSES')} className="mt-6 text-[9px] font-black text-indigo-600 uppercase hover:underline flex items-center gap-1">
                            Gestisci registro spese <ChevronRight size={10} />
                        </button>
                    </div>
                </div>

                {/* Status Azioni Veloci */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl flex flex-col justify-between h-full relative overflow-hidden">
                        <div className="absolute right-0 top-0 p-6 opacity-10"><Calculator size={120} /></div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-black mb-4 leading-tight">Proiezione Netto <br/> Reale Anno {new Date().getFullYear()}</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-indigo-300">Margine Utile Effettivo</p>
                                    <p className="text-3xl font-black text-white">{formatCurrency(stats.nettoRealeInTasca)}</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-400 rounded-full" 
                                            style={{ width: `${stats.yearGrossIncassato > 0 ? (stats.nettoRealeInTasca / stats.yearGrossIncassato * 100) : 0}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400">Rendimento al netto di ogni onere: {stats.yearGrossIncassato > 0 ? (stats.nettoRealeInTasca / stats.yearGrossIncassato * 100).toFixed(0) : 0}%</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => onViewChange('ARCHIVE')} className="mt-8 bg-white text-slate-900 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                            <CreditCard size={14} /> Verifica Incassi Pendenti
                        </button>
                    </div>

                    <div className={`p-6 rounded-[2rem] border shadow-sm flex flex-col justify-between ${stats.isSafe ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex justify-between items-start">
                            <h4 className={`text-xs font-black uppercase tracking-widest ${stats.isSafe ? 'text-emerald-600' : 'text-red-600'}`}>Security Training Monitor</h4>
                            <ShieldCheck size={20} className={stats.isSafe ? 'text-emerald-500' : 'text-red-500'} />
                        </div>
                        <p className="text-xs font-bold text-slate-700 my-3">
                            {stats.isSafe 
                                ? "Stato Abilitativo Conforme: Tutti i tuoi titoli (CSP/CSE/RSPP) risultano aggiornati." 
                                : "Azione Richiesta: Alcuni titoli sono scaduti. Rischio di invalidità nomine in cantiere."}
                        </p>
                        <button onClick={() => onViewChange('SECURE_TRAIN')} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Accedi al registro titoli</button>
                    </div>
                </div>
            </div>

            {/* Footer Copyright */}
            <div className="pt-6 pb-2 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                <span>© 2025 Engineer Riccardo Righini - All Rights Reserved</span>
                <span className="text-indigo-200">Cronosheet Professional Cash Control v2.7</span>
            </div>
        </div>
    );
};

export default Dashboard;
