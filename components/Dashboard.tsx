
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

    const COEF_REDDITIVITA = 0.78; 
    const INARCASSA_SOGGETTIVO = 0.145; 
    const IMPOSTA_SOSTITUTIVA = 0.05; 

    const stats = useMemo(() => {
        const allEntries = entries || [];
        const paidEntries = allEntries.filter(e => e.is_paid);
        const imponibileIncassato = paidEntries.reduce((acc, e) => acc + (Number(calculateEarnings(e)) || 0), 0);
        
        if (imponibileIncassato <= 0) return { imponibile: 0, netto: 0, soggettivo: 0, imposta: 0, efficiency: 0, isSafe: false, expiredCount: 0 };

        const baseFiscale = imponibileIncassato * COEF_REDDITIVITA;
        const soggettivo = baseFiscale * INARCASSA_SOGGETTIVO;
        const imposta = (baseFiscale - soggettivo) * IMPOSTA_SOSTITUTIVA;
        const nettoIncassato = imponibileIncassato - soggettivo - imposta;
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
        <div className="flex flex-col min-h-screen animate-fade-in max-w-5xl mx-auto space-y-6 pb-24 px-2">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">
                        FluxLedger
                    </h1>
                    <p className="text-indigo-600 text-[9px] font-black uppercase tracking-[0.3em] mt-1 flex items-center gap-1">
                        <Calculator size={12}/> STUDIO ENGINEERING SYSTEMS
                    </p>
                </div>
                
                <div 
                  onClick={() => onViewChange(AppView.SECURE_TRAIN)}
                  className={`px-4 py-2 rounded-xl border cursor-pointer transition-all flex items-center gap-2 shadow-sm ${stats.isSafe ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600 animate-pulse'}`}
                >
                    {stats.isSafe ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase leading-none">Compliance</span>
                        <span className="text-[10px] font-black uppercase">{stats.isSafe ? 'Operativo' : `${stats.expiredCount} ALERT`}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-md relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Imponibile Incassato</p>
                        <p className="text-3xl md:text-5xl font-black text-slate-900 font-mono tracking-tighter">
                            {formatCurrency(stats.imponibile)}
                        </p>
                        <div className="mt-6 flex items-center gap-2">
                            <FileText size={16} className="text-slate-300"/>
                            <span className="text-[9px] font-bold text-slate-300 uppercase">Valore base fatturato</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border-b-4 border-emerald-500">
                    <div className="relative z-10">
                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 italic">Disponibilità Netta</p>
                        <p className="text-3xl md:text-5xl font-black font-mono tracking-tighter text-white">
                            {formatCurrency(stats.netto)}
                        </p>
                        <div className="mt-6 flex items-center gap-2">
                            <ArrowUpRight size={16} className="text-emerald-400"/>
                            <span className="text-[9px] font-bold text-slate-400 italic">Netto reale post-fisco</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-50 shadow-lg relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b-4 border-slate-900 pb-6 gap-4">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Fisco Pro</h2>
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex flex-col items-center">
                        <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest mb-0.5">Efficienza</span>
                        <span className="text-lg font-black font-mono">{stats.efficiency.toFixed(1)}%</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16">
                    <div className="space-y-6">
                        <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-600 italic">Lordo Fatturato:</span>
                                    <span className="text-xl font-black text-slate-900 font-mono">{formatCurrency(stats.imponibile)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-indigo-100 pt-4">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Coefficiente:</span>
                                    <span className="text-sm font-black text-slate-900 font-mono">78%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inarcassa (14.5%):</span>
                            <span className="font-mono text-red-500 font-black text-sm">-{formatCurrency(stats.soggettivo)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sostitutiva (5%):</span>
                            <span className="font-mono text-red-500 font-black text-sm">-{formatCurrency(stats.imposta)}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-black text-slate-900 uppercase">Netto Reale:</span>
                            <span className="text-xl font-black text-emerald-600 font-mono">{formatCurrency(stats.netto)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-10 border-t border-slate-100 text-center">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">FluxLedger ERP Professional</p>
                <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed italic">
                    Ingi.RiccardoRighini • © 2026 • Tutti i diritti riservati
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
