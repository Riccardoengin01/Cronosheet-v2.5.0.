
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification, BusinessExpense, AppView } from '../types';
import { calculateEarnings, formatCurrency } from '../utils';
import { 
  TrendingUp, 
  ShieldCheck, 
  ChevronRight, 
  PieChart, 
  Landmark, 
  Calculator, 
  Banknote, 
  Target,
  CreditCard,
  Percent,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Wallet
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
        const yearEntries = (entries || []).filter(e => e.startTime >= startOfYear);
        
        // COMPENSI
        const compensiIncassati = yearEntries.filter(e => e.is_paid).reduce((acc, e) => acc + calculateEarnings(e), 0);
        const compensiEmessi = yearEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
        const daIncassare = compensiEmessi - compensiIncassati;

        // ANALISI FISCALE ANALITICA (Proprietà Intellettuale Ing. Righini)
        const COEF_REDDITIVITA = 0.78; 
        const INARCASSA_RATE = 0.145; 
        const IMPOSTA_SOSTITUTIVA_RATE = 0.05; 

        const redditoFiscaleLordo = compensiIncassati * COEF_REDDITIVITA;
        const debitoInarcassa = redditoFiscaleLordo * INARCASSA_RATE;
        const baseImponibileFiscale = Math.max(0, redditoFiscaleLordo - debitoInarcassa);
        const impostaSostitutiva = baseImponibileFiscale * IMPOSTA_SOSTITUTIVA_RATE;
        const totaleAccantonamentoFiscale = debitoInarcassa + impostaSostitutiva;

        // SPESE STUDIO E NETTO DISPONIBILE
        const yearExpenses = busExpenses.filter(exp => new Date(exp.date).getFullYear() === currentYear);
        const totalYearExpenses = yearExpenses.reduce((acc, e) => acc + e.amount, 0);
        const utileNettoReale = compensiIncassati - totaleAccantonamentoFiscale - totalYearExpenses;

        return {
            compensiIncassati,
            compensiEmessi,
            daIncassare,
            redditoFiscaleLordo,
            debitoInarcassa,
            impostaSostitutiva,
            totaleAccantonamentoFiscale,
            totalYearExpenses,
            utileNettoReale,
            coef: COEF_REDDITIVITA * 100,
            pendingInvoicesCount: yearEntries.filter(e => e.is_billed && !e.is_paid).length,
            isSafe: certs.filter(c => c.expiryDate && new Date(c.expiryDate).getTime() < now.getTime()).length === 0
        };
    }, [entries, certs, busExpenses]);

    return (
        <div className="flex flex-col min-h-screen animate-fade-in max-w-6xl mx-auto space-y-8 pb-24">
            
            {/* Header Professionale con Copyright */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                        FluxLedger ERP Professional
                    </h1>
                    <p className="text-indigo-600 text-[11px] font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                        <Calculator size={14}/> Accounting Analitico Commesse • Developed by Ing. Riccardo Righini
                    </p>
                </div>
                {!stats.isSafe && (
                    <div className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl border border-red-100 flex items-center gap-3 animate-pulse">
                        <ShieldAlert size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-center">Titoli Abilitativi Scaduti</span>
                    </div>
                )}
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Liquidità Reale in Cassa</p>
                        <p className="text-5xl font-black font-mono tracking-tighter">{formatCurrency(stats.utileNettoReale)}</p>
                        <div className="mt-8 flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400"><ArrowUpRight size={18}/></div>
                            <span className="text-[11px] font-bold text-slate-400">Netto post-tasse e spese studio</span>
                        </div>
                    </div>
                    <Activity className="absolute -right-10 -bottom-10 opacity-5 text-white transition-transform group-hover:scale-110 duration-700" size={240} />
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Compensi Incassati (Cash Flow)</p>
                    <p className="text-4xl font-black text-slate-900 font-mono">{formatCurrency(stats.compensiIncassati)}</p>
                    <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Crediti Pendenti:</span>
                        <span className="text-base font-black text-amber-500 font-mono">+{formatCurrency(stats.daIncassare)}</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Costi Gestione Studio</p>
                        <p className="text-4xl font-black text-slate-900 font-mono">{formatCurrency(stats.totalYearExpenses)}</p>
                    </div>
                    <button onClick={() => onViewChange(AppView.EXPENSES)} className="mt-8 w-full py-4 border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">
                        <Wallet size={16}/> Analisi Spese Studio
                    </button>
                </div>
            </div>

            {/* Analisi Fiscale Analitica - IL CUORE DEL SISTEMA */}
            <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-50 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 p-12 opacity-5 pointer-events-none">
                    <Landmark size={240} />
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 border-b-8 border-slate-900 pb-10 gap-8">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Proiezione Fiscale Analitica</h2>
                        <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em] mt-3">Metodo di calcolo Regime Forfettario Ingegneri</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] flex flex-col items-center">
                            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-1">Coefficiente</span>
                            <span className="text-2xl font-black font-mono">{stats.coef}%</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    <div className="space-y-12">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Imponibile Lordo Fiscale</p>
                                <p className="text-3xl font-black text-slate-900 font-mono">{formatCurrency(stats.redditoFiscaleLordo)}</p>
                            </div>
                            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                <div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, (stats.utileNettoReale / stats.compensiIncassati) * 100)}%` }}></div>
                                <div className="h-full bg-amber-400" style={{ width: `${(stats.totaleAccantonamentoFiscale / stats.compensiIncassati) * 100}%` }}></div>
                                <div className="h-full bg-slate-300" style={{ width: `${(stats.totalYearExpenses / stats.compensiIncassati) * 100}%` }}></div>
                            </div>
                            <div className="grid grid-cols-3 gap-6 pt-2">
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                                    <div className="w-3 h-3 rounded bg-indigo-600"></div> Netto Reale
                                </div>
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                                    <div className="w-3 h-3 rounded bg-amber-400"></div> Tasse Stimante
                                </div>
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                                    <div className="w-3 h-3 rounded bg-slate-300"></div> Spese Studio
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Cash Efficiency Report</p>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-600 italic">Liquidità disponibile dopo accantonamento:</span>
                                <span className="text-2xl font-black text-indigo-600 font-mono">{formatCurrency(stats.utileNettoReale)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-[2.5rem] p-10 space-y-8 border border-slate-100 shadow-inner">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Inarcassa Soggettivo (14.5%):</span>
                            <span className="font-mono text-red-500 font-black text-lg">-{formatCurrency(stats.debitoInarcassa)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Imposta Sostitutiva Start-up (5%):</span>
                            <span className="font-mono text-red-500 font-black text-lg">-{formatCurrency(stats.impostaSostitutiva)}</span>
                        </div>
                        <div className="pt-8 border-t-2 border-slate-200 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Totale Accantonamento Fiscale:</span>
                            <span className="text-3xl font-black text-slate-900 font-mono">{formatCurrency(stats.totaleAccantonamentoFiscale)}</span>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 items-center">
                            <Percent size={18} className="text-amber-600" />
                            <p className="text-[10px] font-bold text-amber-800 leading-tight">Accantonamento calcolato sul lordo incassato detratto del coefficiente professionale del {stats.coef}%.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer con Copyright e Diritti Protetti */}
            <div className="pt-16 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] mb-4">FluxLedger ERP Professional • v1.6.8 • Studio Engineering Systems</p>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] leading-relaxed">
                    Software Architecture & Legal Rights Protected by <br/>
                    <span className="text-slate-900 text-[11px]">Engineer Riccardo Righini</span><br/>
                    © {new Date().getFullYear()} • All Rights Reserved
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
