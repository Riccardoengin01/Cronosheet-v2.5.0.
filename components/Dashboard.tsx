
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification, AppView } from '../types';
import { calculateEarnings, formatCurrency } from '../utils';
import { 
  ShieldCheck, 
  Calculator, 
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Landmark,
  TrendingUp,
  Receipt,
  AlertCircle
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
    const VAT_OPENING_DATE = new Date('2025-10-14').getTime();

    useEffect(() => {
        if (userProfile?.id) {
            DB.getCertifications(userProfile.id).then(setCerts);
        }
    }, [userProfile?.id]);

    // COSTANTI FISCALI INGEGNERI (Regime Forfettario)
    const COEF_REDDITIVITA = 0.78; 
    const INARCASSA_INTEGRATIVO = 0.04; // 4% in fattura
    const INARCASSA_SOGGETTIVO = 0.145; // 14.5% sui contributi
    const IMPOSTA_SOSTITUTIVA = 0.05; // 5% tasse
    const BOLLO_SOGLIA = 77.47;
    const BOLLO_VALORE = 2.00;

    const stats = useMemo(() => {
        const nowMs = new Date().getTime();
        const pivaEntries = (entries || []).filter(e => e.startTime >= VAT_OPENING_DATE);

        const calculateFullMetrics = (targetEntries: TimeEntry[]) => {
            let imponibileTotale = 0;
            let bolliTotali = 0;

            // Raggruppiamo per "potenziale fattura" (approssimato per giorno/progetto se non specificato)
            targetEntries.forEach(e => {
                const earn = calculateEarnings(e);
                imponibileTotale += earn;
                if (earn > BOLLO_SOGLIA) bolliTotali += BOLLO_VALORE;
            });

            const integrativo = imponibileTotale * INARCASSA_INTEGRATIVO;
            const lordoInFattura = imponibileTotale + integrativo + bolliTotali;

            // Calcolo Tasse (Solo su imponibile professionale * 78%)
            const baseFiscale = imponibileTotale * COEF_REDDITIVITA;
            const quotaInarcassaSoggettiva = baseFiscale * INARCASSA_SOGGETTIVO;
            const baseTasse = Math.max(0, baseFiscale - quotaInarcassaSoggettiva);
            const quotaImposta = baseTasse * IMPOSTA_SOSTITUTIVA;

            // Il Netto Reale è: Lordo Incassato - Tasse che dovrai pagare - Quota Integrativa (che verserai)
            // In pratica: Imponibile - Soggettiva - Imposta + Bolli (se rimborsati)
            const nettoInTasca = imponibileTotale - quotaInarcassaSoggettiva - quotaImposta;

            return {
                imponibile: imponibileTotale,
                integrativo,
                bolli: bolliTotali,
                lordo: lordoInFattura,
                netto: nettoInTasca,
                tasseTotali: quotaInarcassaSoggettiva + quotaImposta
            };
        };

        const paidMetrics = calculateFullMetrics(pivaEntries.filter(e => e.is_paid));
        const producedMetrics = calculateFullMetrics(pivaEntries);
        
        const daIncassareLordo = producedMetrics.lordo - paidMetrics.lordo;
        const daysSinceOpening = Math.max(1, Math.ceil((nowMs - VAT_OPENING_DATE) / (1000 * 3600 * 24)));
        const dailyNetAvg = producedMetrics.netto / daysSinceOpening;

        const expiredCerts = certs.filter(c => c.expiryDate && new Date(c.expiryDate).getTime() < nowMs);

        return {
            paid: paidMetrics,
            produced: producedMetrics,
            daIncassareLordo,
            dailyNetAvg,
            daysSinceOpening,
            isSafe: expiredCerts.length === 0 && certs.length > 0,
            expiredCertsCount: expiredCerts.length
        };
    }, [entries, certs, VAT_OPENING_DATE]);

    return (
        <div className="flex flex-col min-h-screen animate-fade-in max-w-6xl mx-auto space-y-8 pb-24">
            
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
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">Compliance</span>
                        <span className="text-xs font-black uppercase">{stats.isSafe ? 'Operativo' : `${stats.expiredCertsCount} Scaduti`}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: NETTO REALE (CASSA) */}
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group border-b-8 border-emerald-500">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4">Disponibilità Netta Reale</p>
                        <p className="text-5xl font-black font-mono tracking-tighter">{formatCurrency(stats.paid.net)}</p>
                        <div className="mt-8 flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400"><ArrowUpRight size={18}/></div>
                            <span className="text-[11px] font-bold text-slate-400 italic">Guadagno reale post-tasse su incassato</span>
                        </div>
                    </div>
                    <Activity className="absolute -right-10 -bottom-10 opacity-5 text-white" size={240} />
                </div>

                {/* Card 2: LORDO INCASSATO (TOTALE FATTURE) */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Totale Lordo Incassato (Invoices)</p>
                    <p className="text-4xl font-black text-slate-900 font-mono">{formatCurrency(stats.paid.lordo)}</p>
                    <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase italic">Da Incassare (Lordo):</span>
                        <span className="text-base font-black text-amber-500 font-mono">+{formatCurrency(stats.daIncassareLordo)}</span>
                    </div>
                </div>

                {/* Card 3: PERFORMANCE NETTA PRODOTTA */}
                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Zap size={100} /></div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4 italic">Valore Netto Lavoro Svolto</p>
                        <p className="text-2xl font-black font-mono leading-none mb-2">{formatCurrency(stats.produced.net)}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-200">Proiezione Netta su Tutto il Lavoro</p>
                    </div>
                    <div className="mt-6 p-4 bg-white/10 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-white/60">Guadagno Medio/Giorno:</span>
                            <span className="text-sm font-black font-mono">{formatCurrency(stats.dailyNetAvg)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reconciliation Section */}
            <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-50 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 p-12 opacity-5 pointer-events-none">
                    <Landmark size={240} />
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 border-b-8 border-slate-900 pb-10 gap-8">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Matematica Fiscale Analitica</h2>
                        <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em] mt-3 italic">Analisi basata sul Criterio di Cassa Reale</p>
                    </div>
                    <div className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-1">Efficienza Netta</span>
                        <span className="text-2xl font-black font-mono">~{((stats.produced.net / stats.produced.lordo) * 100).toFixed(1)}%</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    <div className="space-y-10">
                        <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-6">Composizione Lordo Incassato</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-600">Imponibile (Lavoro):</span>
                                    <span className="text-lg font-black text-slate-900 font-mono">{formatCurrency(stats.paid.imponibile)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-600">Integrativo Inarcassa (4%):</span>
                                    <span className="text-lg font-black text-slate-900 font-mono">{formatCurrency(stats.paid.integrativo)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-600">Bolli Assolti:</span>
                                    <span className="text-lg font-black text-slate-900 font-mono">{formatCurrency(stats.paid.bolli)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-indigo-200 pt-4">
                                    <span className="text-sm font-black text-slate-800 uppercase">Totale Invoices Paid:</span>
                                    <span className="text-2xl font-black text-indigo-600 font-mono">{formatCurrency(stats.paid.lordo)}</span>
                                </div>
                            </div>
                        </div>
                        
                        {stats.daIncassareLordo > 0 && (
                            <div className="flex items-start gap-4 p-6 bg-amber-50 rounded-3xl border border-amber-100">
                                <AlertCircle className="text-amber-600 shrink-0" size={24} />
                                <p className="text-[11px] text-amber-700 font-bold uppercase italic leading-relaxed">
                                    Hai {formatCurrency(stats.daIncassareLordo)} ancora da incassare. <br/>
                                    Controlla il registro e segna come 'Pagate' le fatture saldate per aggiornare il Netto Reale.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 rounded-[2.5rem] p-10 space-y-8 border border-slate-100 shadow-inner">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Accantonamenti Professionali</h4>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-tight">Soggettivo Inarcassa (14.5%):</span>
                            <span className="font-mono text-red-500 font-black text-lg">-{formatCurrency(stats.paid.imponibile * 0.78 * 0.145)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-tight">Imposta Sostitutiva (5%):</span>
                            <span className="font-mono text-red-500 font-black text-lg">-{formatCurrency((stats.paid.imponibile * 0.78 * (1 - 0.145)) * 0.05)}</span>
                        </div>
                        <div className="pt-8 border-t-2 border-slate-200 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-900 uppercase">Netto Residuo in Tasca:</span>
                            <span className="text-2xl font-black text-emerald-600 font-mono">{formatCurrency(stats.paid.net)}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-tight mt-4">
                            Il netto è calcolato sull'imponibile professionale (lordo fattura meno 4% e bolli).
                        </p>
                    </div>
                </div>
            </div>

            <div className="pt-16 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] mb-4">FluxLedger ERP Professional • v2.1.0 • Studio Engineering Systems</p>
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
