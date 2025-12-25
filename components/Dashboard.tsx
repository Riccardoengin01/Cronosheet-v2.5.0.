
import React, { useMemo, useEffect, useState } from 'react';
import { TimeEntry, Project, Certification, AppView } from '../types';
import { calculateEarnings, formatCurrency } from '../utils';
import { 
  ShieldCheck, 
  Calculator, 
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Landmark,
  TrendingUp,
  AlertCircle,
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
    
    useEffect(() => {
        if (userProfile?.id) {
            DB.getCertifications(userProfile.id).then(setCerts);
        }
    }, [userProfile?.id]);

    // COSTANTI FISCALI RIGOROSE (Regime Forfettario Ingegneri)
    const COEF_REDDITIVITA = 0.78; 
    const INARCASSA_SOGGETTIVO = 0.145; 
    const IMPOSTA_SOSTITUTIVA = 0.05; 

    const stats = useMemo(() => {
        const allEntries = entries || [];
        
        // Filtriamo solo le entries pagate (Incassato)
        const paidEntries = allEntries.filter(e => e.is_paid);
        
        // 1. Imponibile Professionale (Il valore "buono" di 3.874,56 €)
        const imponibileIncassato = paidEntries.reduce((acc, e) => acc + (Number(calculateEarnings(e)) || 0), 0);
        
        if (imponibileIncassato <= 0) return { imponibile: 0, netto: 0, soggettivo: 0, imposta: 0, efficiency: 0, isSafe: false, expiredCount: 0 };

        // 2. Calcolo Tasse su base 78% (Matematica Ingegneristica)
        const baseFiscale = imponibileIncassato * COEF_REDDITIVITA;
        const soggettivo = baseFiscale * INARCASSA_SOGGETTIVO;
        const imposta = (baseFiscale - soggettivo) * IMPOSTA_SOSTITUTIVA;

        // 3. Netto Reale (Imponibile - Tasse vere)
        const nettoIncassato = imponibileIncassato - soggettivo - imposta;

        // Efficienza Fiscale (Netto / Imponibile)
        const efficiency = (nettoIncassato / imponibileIncassato) * 100;

        const nowMs = Date.now();
        const expiredCerts = (certs || []).filter(c => c.expiryDate && new Date(c.expiryDate).getTime() < nowMs);

        return {
            imponibile: imponibileIncassato,
            netto: nettoIncassato,
            soggettivo,
            imposta,
            efficiency: Number(efficiency) || 0,
            isSafe: expiredCerts.length === 0 && (certs || []).length > 0,
            expiredCount: expiredCerts.length
        };
    }, [entries, certs]);

    return (
        <div className="flex flex-col min-h-screen animate-fade-in max-w-6xl mx-auto space-y-8 pb-24">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                        FluxLedger Professional
                    </h1>
                    <p className="text-indigo-600 text-[11px] font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                        <Calculator size={14}/> Accounting Analitico • STUDIO ENGINEERING SYSTEMS
                    </p>
                </div>
                
                <div 
                  onClick={() => onViewChange(AppView.SECURE_TRAIN)}
                  className={`px-6 py-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 shadow-sm ${stats.isSafe ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600 animate-pulse'}`}
                >
                    {stats.isSafe ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">Status Compliance</span>
                        <span className="text-xs font-black uppercase">{stats.isSafe ? 'Operativo' : `${stats.expiredCount} Scaduti`}</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards Principal - Solo le due fondamentali */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* CARD 1 (BIANCA): IMPONIBILE REALE INCASSATO */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Imponibile Professionale Incassato</p>
                        <p className="text-6xl font-black text-slate-900 font-mono tracking-tighter">
                            {formatCurrency(stats.imponibile)}
                        </p>
                        <div className="mt-10 flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-400 group-hover:text-indigo-600 transition-colors"><FileText size={20}/></div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Base lorda da fatture incassate</span>
                        </div>
                    </div>
                    <Landmark className="absolute -right-16 -bottom-16 opacity-[0.03] text-slate-900" size={300} />
                </div>

                {/* CARD 2 (NERA): DISPONIBILITÀ NETTA REALE */}
                <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border-b-8 border-emerald-500">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4 italic">Disponibilità Netta Reale</p>
                        <p className="text-6xl font-black font-mono tracking-tighter text-white">
                            {formatCurrency(stats.netto)}
                        </p>
                        <div className="mt-10 flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400"><ArrowUpRight size={20}/></div>
                            <span className="text-[11px] font-bold text-slate-400 italic">Netto effettivo in tasca post-tasse</span>
                        </div>
                    </div>
                    <Activity className="absolute -right-16 -bottom-16 opacity-10 text-emerald-500" size={300} />
                </div>
            </div>

            {/* Analisi Fiscale Analitica */}
            <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-50 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 border-b-8 border-slate-900 pb-10 gap-8">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Matematica Fiscale</h2>
                        <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em] mt-3 italic">Trasparenza Contabile Regime Forfettario</p>
                    </div>
                    <div className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-1">Efficienza Netta</span>
                        <span className="text-2xl font-black font-mono">~{stats.efficiency.toFixed(1)}%</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    <div className="space-y-12">
                        <div className="p-10 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-8">Punto di Partenza</h4>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-600 italic">Imponibile Professionale:</span>
                                    <span className="text-3xl font-black text-slate-900 font-mono">{formatCurrency(stats.imponibile)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-indigo-100 pt-6">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Coefficiente Redditività:</span>
                                    <span className="text-lg font-black text-slate-900 font-mono">78%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <AlertCircle className="text-indigo-600 shrink-0" size={24} />
                            <p className="text-[11px] text-slate-500 font-bold uppercase italic leading-relaxed">
                                I calcoli escludono l'integrativo 4% Inarcassa in quanto non costituisce reddito professionale proprio.
                            </p>
                        </div>
                    </div>

                    {/* Dettaglio Tasse sul pagato */}
                    <div className="bg-slate-50 rounded-[2.5rem] p-10 space-y-8 border border-slate-100 shadow-inner">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Accantonamenti Fiscali</h4>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase">Inarcassa Soggettivo (14.5%):</span>
                            <span className="font-mono text-red-500 font-black text-lg">-{formatCurrency(stats.soggettivo)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase">Imposta Sostitutiva (5%):</span>
                            <span className="font-mono text-red-500 font-black text-lg">-{formatCurrency(stats.imposta)}</span>
                        </div>
                        <div className="pt-10 border-t-2 border-slate-200 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-900 uppercase">Netto Reale in Tasca:</span>
                            <span className="text-3xl font-black text-emerald-600 font-mono">{formatCurrency(stats.netto)}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] italic text-center leading-relaxed">
                            Calcolo basato sull'abbattimento forfettario del 22%.<br/>
                            L'imposta è calcolata al netto dei contributi previdenziali.
                        </p>
                    </div>
                </div>
            </div>

            <div className="pt-16 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] mb-4">FluxLedger ERP Professional • STUDIO ENGINEERING SYSTEMS</p>
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
