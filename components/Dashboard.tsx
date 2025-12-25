
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification, BusinessExpense, AppView } from '../types';
import { calculateEarnings, formatCurrency } from '../utils';
import { 
  ShieldCheck, 
  Calculator, 
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Landmark,
  TrendingUp
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
    
    // DATA CARDINE: Apertura Partita IVA (14/10/2025)
    // Qualsiasi transazione antecedente viene ignorata per coerenza contabile.
    const VAT_OPENING_DATE = new Date('2025-10-14').getTime();

    useEffect(() => {
        if (userProfile?.id) {
            DB.getCertifications(userProfile.id).then(setCerts);
        }
    }, [userProfile?.id]);

    // COSTANTI FISCALI RIGOROSE (Regime Forfettario Ingegneri)
    const COEF_REDDITIVITA = 0.78; // 78%
    const INARCASSA_RATE = 0.145; // 14.5%
    const IMPOSTA_SOSTITUTIVA_RATE = 0.05; // 5%

    /**
     * CALCOLO NETTO PROFESSIONALE (LOGICA FORFETTARIA)
     * Il netto in tasca nel regime forfettario è:
     * Gross - (Gross * 0.78 * 0.145) - ((Gross * 0.78 * (1 - 0.145)) * 0.05)
     * Le spese studio REALI non vanno sottratte perché già forfettizzate nel 22%.
     */
    const calculatePureNet = (gross: number) => {
        if (gross <= 0) return 0;
        const imponibile = gross * COEF_REDDITIVITA;
        const quotaInarcassa = imponibile * INARCASSA_RATE;
        const quotaImposta = (imponibile - quotaInarcassa) * IMPOSTA_SOSTITUTIVA_RATE;
        return gross - quotaInarcassa - quotaImposta;
    };

    const stats = useMemo(() => {
        const nowMs = new Date().getTime();
        
        // FILTRO DATA APERTURA: Consideriamo solo il lavoro post 14/10/2025
        const pivaEntries = (entries || []).filter(e => e.startTime >= VAT_OPENING_DATE);
        
        // 1. Lordo Incassato (Base per la liquidità reale)
        const totalGrossPaid = pivaEntries
            .filter(e => e.is_paid)
            .reduce((acc, e) => acc + calculateEarnings(e), 0);
        
        // 2. Lordo Totale (Lavoro prodotto, incassato e non)
        const totalGrossProduced = pivaEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
        
        // 3. CALCOLO NETTI (Senza sottrarre le spese studio inserite)
        const cashNet = calculatePureNet(totalGrossPaid);
        const performanceNet = calculatePureNet(totalGrossProduced);

        // 4. Media Giornaliera (Basata sulla performance netta)
        const daysSinceOpening = Math.max(1, Math.ceil((nowMs - VAT_OPENING_DATE) / (1000 * 3600 * 24)));
        const dailyNetAvg = performanceNet / daysSinceOpening;

        const expiredCerts = certs.filter(c => c.expiryDate && new Date(c.expiryDate).getTime() < nowMs);

        return {
            totalGrossPaid,
            totalGrossProduced,
            cashNet,
            performanceNet,
            dailyNetAvg,
            daysSinceOpening,
            isSafe: expiredCerts.length === 0 && certs.length > 0,
            expiredCertsCount: expiredCerts.length
        };
    }, [entries, certs, VAT_OPENING_DATE]);

    return (
        <div className="flex flex-col min-h-screen animate-fade-in max-w-6xl mx-auto space-y-8 pb-24">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                        FluxLedger ERP Professional
                    </h1>
                    <p className="text-indigo-600 text-[11px] font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                        <Calculator size={14}/> Accounting Analitico • Dal 14/10/2025
                    </p>
                </div>
                
                <div 
                  onClick={() => onViewChange(AppView.SECURE_TRAIN)}
                  className={`px-6 py-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 shadow-sm ${stats.isSafe ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600 animate-pulse'}`}
                >
                    {stats.isSafe ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">Status Compliance</span>
                        <span className="text-xs font-black uppercase">{stats.isSafe ? 'Operativo' : `${stats.expiredCertsCount} Titoli Scaduti`}</span>
                    </div>
                </div>
            </div>

            {/* Main KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* CARD 1: LIQUIDITÀ NETTA (CASSA) */}
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group border-b-8 border-emerald-500">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4">Disponibilità Netta Reale (Incassata)</p>
                        <p className="text-5xl font-black font-mono tracking-tighter">
                            {formatCurrency(stats.cashNet)}
                        </p>
                        <div className="mt-8 flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400"><ArrowUpRight size={18}/></div>
                            <span className="text-[11px] font-bold text-slate-400 italic">Netto effettivo post-tasse su lordo incassato</span>
                        </div>
                    </div>
                    <Activity className="absolute -right-10 -bottom-10 opacity-5 text-white" size={240} />
                </div>

                {/* CARD 2: LORDO INCASSATO */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Totale Lordo Incassato</p>
                    <p className="text-4xl font-black text-slate-900 font-mono">
                        {formatCurrency(stats.totalGrossPaid)}
                    </p>
                    <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase italic">Lordo Totale Prodotto:</span>
                        <span className="text-base font-black text-indigo-600 font-mono">{formatCurrency(stats.totalGrossProduced)}</span>
                    </div>
                </div>

                {/* CARD 3: PERFORMANCE NETTA */}
                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Zap size={100} /></div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4 italic">Valore Netto Lavoro Svolto</p>
                        <p className="text-2xl font-black font-mono leading-none mb-2">{formatCurrency(stats.performanceNet)}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-200">Proiezione Netta su Tutto il Lavoro</p>
                    </div>
                    <div className="mt-6 p-4 bg-white/10 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-white/60">Guadagno Medio Netto/Giorno:</span>
                            <span className="text-sm font-black font-mono">{formatCurrency(stats.dailyNetAvg)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fiscal Transparency Section */}
            <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-50 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 p-12 opacity-5 pointer-events-none">
                    <Landmark size={240} />
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 border-b-8 border-slate-900 pb-10 gap-8">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Matematica Fiscale Analitica</h2>
                        <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em] mt-3 italic">Coerente con i 3.874,56 € Lordi dal 14 Ottobre</p>
                    </div>
                    <div className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-1">Efficienza Netta</span>
                        <span className="text-2xl font-black font-mono">~85.4%</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    <div className="space-y-12">
                        <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-6">Trasparenza Contabile</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-600 italic">Lordo Effettivo Incassato:</span>
                                    <span className="text-xl font-black text-slate-900 font-mono">{formatCurrency(stats.totalGrossPaid)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-indigo-100 pt-4">
                                    <span className="text-sm font-bold text-slate-800">Netto Reale (In Tasca):</span>
                                    <span className="text-3xl font-black text-emerald-600 font-mono">{formatCurrency(stats.cashNet)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <TrendingUp className="text-indigo-600 shrink-0" size={24} />
                            <p className="text-[11px] text-slate-500 font-bold uppercase italic leading-relaxed">
                                Logica applicata: Sottrazione di Inarcassa (14.5%) e Imposta (5%) esclusivamente sull'imponibile forfettario (78%).
                                <br/>Le spese studio sono escluse dal calcolo per evitare il doppio conteggio.
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-[2.5rem] p-10 space-y-8 border border-slate-100 shadow-inner">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Accantonamenti Fiscali</h4>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-tight">Inarcassa (Su 78% Lordo):</span>
                            <span className="font-mono text-red-500 font-black text-lg">-{formatCurrency(stats.totalGrossPaid * 0.78 * 0.145)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-tight">Imposta Sostitutiva (5%):</span>
                            <span className="font-mono text-red-500 font-black text-lg">-{formatCurrency((stats.totalGrossPaid * 0.78 * (1 - 0.145)) * 0.05)}</span>
                        </div>
                        <div className="pt-8 border-t-2 border-slate-200 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-900 uppercase">Totale Tasse (Su Incassato):</span>
                            <span className="text-2xl font-black text-slate-900 font-mono">{formatCurrency(stats.totalGrossPaid - stats.cashNet)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="pt-16 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] mb-4">FluxLedger ERP Professional • v2.0.0 • Studio Engineering Systems</p>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] leading-relaxed">
                    Software Architecture & Logical Integrity by <br/>
                    <span className="text-slate-900 text-[11px]">Engineer Riccardo Righini</span><br/>
                    © {new Date().getFullYear()} • All Rights Reserved
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
