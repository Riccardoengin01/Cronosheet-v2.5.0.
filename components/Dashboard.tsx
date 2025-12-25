
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
    
    // DATA CARDINE: Apertura Partita IVA - Tutto il sistema ruota attorno a questa data
    const VAT_OPENING_DATE = new Date('2025-10-14').getTime();

    useEffect(() => {
        if (userProfile?.id) {
            DB.getCertifications(userProfile.id).then(setCerts);
            DB.getBusinessExpenses(userProfile.id).then(setBusExpenses);
        }
    }, [userProfile?.id]);

    // COSTANTI FISCALI RIGOROSE (Regime Forfettario Ingegneri)
    const COEF_REDDITIVITA = 0.78; 
    const INARCASSA_RATE = 0.145; 
    const IMPOSTA_SOSTITUTIVA_RATE = 0.05;

    // Funzione di calcolo Netto Fiscale Puro (senza sottrazione spese reali, come da normativa forfettaria)
    const calculateNet = (gross: number) => {
        if (gross <= 0) return 0;
        const redditoFiscale = gross * COEF_REDDITIVITA;
        const inarcassa = redditoFiscale * INARCASSA_RATE;
        const baseImponibileFiscale = Math.max(0, redditoFiscale - inarcassa);
        const imposta = baseImponibileFiscale * IMPOSTA_SOSTITUTIVA_RATE;
        // Il netto è ciò che resta del lordo tolti i contributi e l'imposta
        return gross - (inarcassa + imposta);
    };

    const stats = useMemo(() => {
        const nowMs = new Date().getTime();
        
        // FILTRO ASSOLUTO: Ignoriamo qualsiasi dato precedente al 14/10/2025
        const pivaEntries = (entries || []).filter(e => e.startTime >= VAT_OPENING_DATE);
        
        // 1. Lordo Incassato (Base per il calcolo del Netto in Cassa)
        const compensiIncassatiLordi = pivaEntries.filter(e => e.is_paid).reduce((acc, e) => acc + calculateEarnings(e), 0);
        
        // 2. Lordo Totale (Inclusi crediti non ancora incassati)
        const compensiTotaliProdottiLordi = pivaEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
        const daIncassareLordi = compensiTotaliProdottiLordi - compensiIncassatiLordi;

        // 3. CALCOLO DISPONIBILITA' NETTA (FISCALMENTE CORRETTA)
        // Non sottraiamo le spese busExpenses perché sono già coperte dal 22% (1 - 0.78)
        const utileNettoReale = calculateNet(compensiIncassatiLordi);

        // 4. PERFORMANCE NETTA TOTALE (Valore di tutto il lavoro prodotto dal 14/10)
        const performanceNettaTotale = calculateNet(compensiTotaliProdottiLordi);

        // 5. MEDIA DAILY
        const daysSinceOpening = Math.max(1, Math.ceil((nowMs - VAT_OPENING_DATE) / (1000 * 3600 * 24)));
        const dailyNetAvg = performanceNettaTotale / daysSinceOpening;

        const expiredCerts = certs.filter(c => c.expiryDate && new Date(c.expiryDate).getTime() < nowMs);

        return {
            compensiIncassatiLordi,
            compensiTotaliProdottiLordi,
            daIncassareLordi,
            utileNettoReale,
            performanceNettaTotale,
            dailyNetAvg,
            daysSinceOpening,
            coef: COEF_REDDITIVITA * 100,
            isSafe: expiredCerts.length === 0 && certs.length > 0,
            expiredCertsCount: expiredCerts.length
        };
    }, [entries, certs, busExpenses, VAT_OPENING_DATE]);

    return (
        <div className="flex flex-col min-h-screen animate-fade-in max-w-6xl mx-auto space-y-8 pb-24">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                        FluxLedger ERP Professional
                    </h1>
                    <p className="text-indigo-600 text-[11px] font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                        <Calculator size={14}/> Accounting Analitico • Gestione dal 14/10/2025
                    </p>
                </div>
                
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
                {/* Card 1: NETTO REALE (CASSA FISCALE) */}
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group border-b-8 border-emerald-500">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4">Disponibilità Netta in Tasca</p>
                        <p className="text-5xl font-black font-mono tracking-tighter">{formatCurrency(stats.utileNettoReale)}</p>
                        <div className="mt-8 flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400"><ArrowUpRight size={18}/></div>
                            <span className="text-[11px] font-bold text-slate-400 italic">Netto reale post-tasse su incassato</span>
                        </div>
                    </div>
                    <Activity className="absolute -right-10 -bottom-10 opacity-5 text-white transition-transform group-hover:scale-110 duration-700" size={240} />
                </div>

                {/* Card 2: LORDO INCASSATO */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Lordo Incassato (Invoices Paid)</p>
                    <p className="text-4xl font-black text-slate-900 font-mono">{formatCurrency(stats.compensiIncassatiLordi)}</p>
                    <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Crediti da Incassare:</span>
                        <span className="text-base font-black text-amber-500 font-mono">+{formatCurrency(stats.daIncassareLordi)}</span>
                    </div>
                </div>

                {/* Card 3: PERFORMANCE NETTA (PRODOTTO) */}
                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Zap size={100} /></div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4 italic">Progresso Netto Business</p>
                        <p className="text-2xl font-black font-mono leading-none mb-2">{formatCurrency(stats.performanceNettaTotale)}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-200">Valore Netto del Lavoro Prodotto</p>
                    </div>
                    <div className="mt-6 p-4 bg-white/10 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-white/60">Media Daily Netta:</span>
                            <span className="text-sm font-black font-mono">{formatCurrency(stats.dailyNetAvg)}</span>
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
                        <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Dettaglio Calcolo Fiscale</h2>
                        <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em] mt-3 italic">Basato su Coefficiente di Redditività Forfettario ({stats.coef}%)</p>
                    </div>
                    <div className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-1">Giorni P.IVA</span>
                        <span className="text-2xl font-black font-mono">{stats.daysSinceOpening}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    <div className="space-y-12">
                        <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-6">Trasparenza Ingegneristica</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-600">Lordo Incassato:</span>
                                    <span className="text-xl font-black text-slate-900 font-mono">{formatCurrency(stats.compensiIncassatiLordi)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-indigo-100 pt-4">
                                    <span className="text-sm font-bold text-slate-600">Netto (Post-Tasse):</span>
                                    <span className="text-3xl font-black text-indigo-600 font-mono">{formatCurrency(stats.utileNettoReale)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-[11px] text-slate-400 font-bold uppercase italic leading-relaxed">
                            * Nota: In regime forfettario le spese studio non sono detraibili analiticamente. <br/>
                            Il Netto mostrato è calcolato sottraendo Inarcassa (14.5%) e Imposta (5%) dal 78% del lordo.
                        </p>
                    </div>

                    <div className="bg-slate-50 rounded-[2.5rem] p-10 space-y-8 border border-slate-100 shadow-inner">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Accantonamenti Obbligatori</h4>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase">Inarcassa (Su {stats.coef}% Lordo):</span>
                            <span className="font-mono text-slate-900 font-black">-{formatCurrency(stats.compensiIncassatiLordi * 0.78 * 0.145)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase">Imposta (Su Imponibile Netto):</span>
                            <span className="font-mono text-slate-900 font-black">-{formatCurrency((stats.compensiIncassatiLordi * 0.78 * (1 - 0.145)) * 0.05)}</span>
                        </div>
                        <div className="pt-8 border-t-2 border-slate-200 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-900 uppercase">Totale Tasse su Incassato:</span>
                            <span className="text-2xl font-black text-slate-900 font-mono">{formatCurrency(stats.compensiIncassatiLordi - stats.utileNettoReale)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-16 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] mb-4">FluxLedger ERP Professional • v1.9.0 • Studio Engineering Systems</p>
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
