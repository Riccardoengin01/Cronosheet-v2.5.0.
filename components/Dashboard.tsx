
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification, BusinessExpense, AppView } from '../types';
import { calculateEarnings, formatCurrency } from '../utils';
import { 
  ShieldCheck, 
  ChevronRight, 
  Landmark, 
  Calculator, 
  Banknote, 
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Wallet,
  Calendar,
  Zap,
  Shield
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

    // COSTANTI FISCALI ANALITICHE (Proprietà Ing. Righini)
    const COEF_REDDITIVITA = 0.78; 
    const INARCASSA_RATE = 0.145; 
    const IMPOSTA_SOSTITUTIVA_RATE = 0.05;

    const calculateNet = (gross: number) => {
        const redditoFiscale = gross * COEF_REDDITIVITA;
        const inarcassa = redditoFiscale * INARCASSA_RATE;
        const imposta = Math.max(0, redditoFiscale - inarcassa) * IMPOSTA_SOSTITUTIVA_RATE;
        return gross - (inarcassa + imposta);
    };

    const vatStats = useMemo(() => {
        const VAT_OPENING_DATE = new Date('2025-10-14').getTime();
        const now = new Date().getTime();
        const daysSinceOpening = Math.max(1, Math.ceil((now - VAT_OPENING_DATE) / (1000 * 3600 * 24)));
        
        const grossLifeTime = (entries || [])
            .filter(e => e.startTime >= VAT_OPENING_DATE)
            .reduce((acc, e) => acc + calculateEarnings(e), 0);
            
        // Calcoliamo il NETTO sulla performance per evitare confusione visiva
        const netLifeTime = calculateNet(grossLifeTime);
            
        return {
            totalNet: netLifeTime,
            dailyNetAvg: netLifeTime / daysSinceOpening,
            days: daysSinceOpening
        };
    }, [entries]);

    const stats = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const startOfYear = new Date(currentYear, 0, 1).getTime();
        const yearEntries = (entries || []).filter(e => e.startTime >= startOfYear);
        
        const compensiIncassatiLordi = yearEntries.filter(e => e.is_paid).reduce((acc, e) => acc + calculateEarnings(e), 0);
        const compensiEmessiLordi = yearEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
        const daIncassareLordi = compensiEmessiLordi - compensiIncassatiLordi;

        const redditoFiscaleLordo = compensiIncassatiLordi * COEF_REDDITIVITA;
        const debitoInarcassa = redditoFiscaleLordo * INARCASSA_RATE;
        const baseImponibileFiscale = Math.max(0, redditoFiscaleLordo - debitoInarcassa);
        const impostaSostitutiva = baseImponibileFiscale * IMPOSTA_SOSTITUTIVA_RATE;
        const totaleAccantonamentoFiscale = debitoInarcassa + impostaSostitutiva;

        const yearExpenses = busExpenses.filter(exp => new Date(exp.date).getFullYear() === currentYear);
        const totalYearExpenses = yearExpenses.reduce((acc, e) => acc + e.amount, 0);
        
        // Liquidità netta totale (Cassa reale)
        const utileNettoReale = compensiIncassatiLordi - totaleAccantonamentoFiscale - totalYearExpenses;

        const expiredCerts = certs.filter(c => c.expiryDate && new Date(c.expiryDate).getTime() < now.getTime());

        return {
            compensiIncassatiLordi,
            compensiEmessiLordi,
            daIncassareLordi,
            redditoFiscaleLordo,
            debitoInarcassa,
            impostaSostitutiva,
            totaleAccantonamentoFiscale,
            totalYearExpenses,
            utileNettoReale,
            coef: COEF_REDDITIVITA * 100,
            expiredCertsCount: expiredCerts.length,
            isSafe: expiredCerts.length === 0 && certs.length > 0
        };
    }, [entries, certs, busExpenses]);

    return (
        <div className="flex flex-col min-h-screen animate-fade-in max-w-6xl mx-auto space-y-8 pb-24">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                        FluxLedger ERP Professional
                    </h1>
                    <p className="text-indigo-600 text-[11px] font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                        <Calculator size={14}/> Accounting Analitico Commesse • Developed by Ing. Riccardo Righini
                    </p>
                </div>
                
                {/* Security Status Widget */}
                <div 
                  onClick={() => onViewChange(AppView.SECURE_TRAIN)}
                  className={`px-6 py-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 shadow-sm ${stats.isSafe ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600 animate-pulse'}`}
                >
                    {stats.isSafe ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">Compliance Sicurezza</span>
                        <span className="text-xs font-black uppercase">{stats.isSafe ? 'Digital Rights: Valid' : `${stats.expiredCertsCount} Titoli Scaduti`}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: NETTO REALE IN TASCA */}
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Liquidità Netta Reale (Cassa)</p>
                        <p className="text-5xl font-black font-mono tracking-tighter">{formatCurrency(stats.utileNettoReale)}</p>
                        <div className="mt-8 flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400"><ArrowUpRight size={18}/></div>
                            <span className="text-[11px] font-bold text-slate-400">Netto post-tasse e costi studio</span>
                        </div>
                    </div>
                    <Activity className="absolute -right-10 -bottom-10 opacity-5 text-white transition-transform group-hover:scale-110 duration-700" size={240} />
                </div>

                {/* Card 2: LORDO TOTALE ANNUALE */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Compensi Incassati (Lordi)</p>
                    <p className="text-4xl font-black text-slate-900 font-mono">{formatCurrency(stats.compensiIncassatiLordi)}</p>
                    <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Crediti Pendenti:</span>
                        <span className="text-base font-black text-amber-500 font-mono">+{formatCurrency(stats.daIncassareLordi)}</span>
                    </div>
                </div>

                {/* Card 3: PERFORMANCE NETTA LIFE-TIME (Dal 14/10) */}
                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Zap size={100} /></div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4 italic">Performance dal 14/10/2025</p>
                        <p className="text-2xl font-black font-mono leading-none mb-2">{formatCurrency(vatStats.totalNet)}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-200">Progresso Netto Reale</p>
                    </div>
                    <div className="mt-6 p-4 bg-white/10 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-white/60">Media Daily Netta:</span>
                            <span className="text-sm font-black font-mono">{formatCurrency(vatStats.dailyNetAvg)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analisi Fiscale Analitica */}
            <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-50 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 p-12 opacity-5 pointer-events-none">
                    <Landmark size={240} />
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 border-b-8 border-slate-900 pb-10 gap-8">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Proiezione Fiscale Analitica</h2>
                        <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em] mt-3">Algoritmo Regime Forfettario Professionale</p>
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
                                <div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, (stats.utileNettoReale / stats.compensiIncassatiLordi) * 100)}%` }}></div>
                                <div className="h-full bg-amber-400" style={{ width: `${(stats.totaleAccantonamentoFiscale / stats.compensiIncassatiLordi) * 100}%` }}></div>
                                <div className="h-full bg-slate-300" style={{ width: `${(stats.totalYearExpenses / stats.compensiIncassatiLordi) * 100}%` }}></div>
                            </div>
                            <div className="grid grid-cols-3 gap-6 pt-2">
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                                    <div className="w-3 h-3 rounded bg-indigo-600"></div> Netto Disponibile
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
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Report Efficienza Studio</p>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-600 italic">Disponibilità reale in tasca:</span>
                                <span className="text-2xl font-black text-indigo-600 font-mono">{formatCurrency(stats.utileNettoReale)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-[2.5rem] p-10 space-y-8 border border-slate-100 shadow-inner">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Inarcassa (14.5%):</span>
                            <span className="font-mono text-red-500 font-black text-lg">-{formatCurrency(stats.debitoInarcassa)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Imposta Sostitutiva (5%):</span>
                            <span className="font-mono text-red-500 font-black text-lg">-{formatCurrency(stats.impostaSostitutiva)}</span>
                        </div>
                        <div className="pt-8 border-t-2 border-slate-200 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Totale Accantonamento Fiscale:</span>
                            <span className="text-3xl font-black text-slate-900 font-mono">{formatCurrency(stats.totaleAccantonamentoFiscale)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-16 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] mb-4">FluxLedger ERP Professional • v1.7.2 • Studio Engineering Systems</p>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] leading-relaxed">
                    Developed and Protected by <br/>
                    <span className="text-slate-900 text-[11px]">Engineer Riccardo Righini</span><br/>
                    © {new Date().getFullYear()} • STUDIO ENGINEERING SYSTEMS • All Rights Reserved
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
