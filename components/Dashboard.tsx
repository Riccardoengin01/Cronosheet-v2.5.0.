
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
  Banknote, 
  Percent, 
  ArrowRightCircle, 
  Target,
  CreditCard 
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
        
        const compensiProfessionaliIncassati = yearEntries
            .filter(e => e.is_paid)
            .reduce((acc, e) => acc + calculateEarnings(e), 0);
            
        const compensiProfessionaliEmessi = yearEntries
            .reduce((acc, e) => acc + calculateEarnings(e), 0);
        
        const COEF_REDDITIVITA = 0.78; 
        const redditoFiscaleLordo = compensiProfessionaliIncassati * COEF_REDDITIVITA;
        const inarcassaSoggettivo = redditoFiscaleLordo * 0.145; 
        const baseImpostaSostitutiva = Math.max(0, redditoFiscaleLordo - inarcassaSoggettivo);
        const impostaSostitutiva = baseImpostaSostitutiva * 0.05; 
        const debitoFiscaleTotale = inarcassaSoggettivo + impostaSostitutiva;

        const yearExpenses = busExpenses.filter(exp => new Date(exp.date).getFullYear() === currentYear);
        const totalYearExpenses = yearExpenses.reduce((acc, e) => acc + e.amount, 0);
        const utileNettoReale = compensiProfessionaliIncassati - debitoFiscaleTotale - totalYearExpenses;

        const expenseBreakdown = [
            { label: 'Software/BIM', val: yearExpenses.filter(e => e.category === 'Software').reduce((acc, e) => acc + e.amount, 0), color: 'bg-indigo-500' },
            { label: 'Assicurazione/Ordine', val: yearExpenses.filter(e => e.category === 'Ordine/Assicurazione').reduce((acc, e) => acc + e.amount, 0), color: 'bg-blue-400' },
            { label: 'Auto/Trasporti', val: yearExpenses.filter(e => e.category === 'Auto/Trasporti').reduce((acc, e) => acc + e.amount, 0), color: 'bg-emerald-400' },
            { label: 'Utenze Studio', val: yearExpenses.filter(e => e.category === 'Studio/Utenze').reduce((acc, e) => acc + e.amount, 0), color: 'bg-amber-400' },
            { label: 'Altro', val: yearExpenses.filter(e => e.category === 'Altro').reduce((acc, e) => acc + e.amount, 0), color: 'bg-slate-300' }
        ];

        return {
            compensiProfessionaliIncassati,
            compensiProfessionaliEmessi,
            redditoFiscaleLordo,
            debitoFiscaleTotale,
            totalYearExpenses,
            expenseBreakdown,
            utileNettoReale,
            isSafe: certs.filter(c => c.expiryDate && new Date(c.expiryDate).getTime() < now.getTime()).length === 0,
            pendingInvoicesCount: yearEntries.filter(e => e.is_billed && !e.is_paid).length
        };
    }, [entries, certs, busExpenses]);

    return (
        <div className="flex flex-col min-h-[calc(100vh-140px)] animate-fade-in max-w-6xl mx-auto space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase italic">
                        FluxLedger Professional <Banknote className="text-emerald-500" size={24} />
                    </h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Calculator size={12}/> Auditing Analitico • Engineer Riccardo Righini
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Analisi Fiscale */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5 text-indigo-900"><Landmark size={140} /></div>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Landmark size={18} className="text-indigo-600" /> Fiscal Performance
                        </h3>
                    </div>
                    <div className="space-y-4 flex-grow relative z-10">
                        <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-lg">
                             <p className="text-[9px] font-black text-indigo-300 uppercase mb-1">Base Imponibile Forfettaria</p>
                             <p className="text-3xl font-black font-mono tracking-tighter">{formatCurrency(stats.redditoFiscaleLordo)}</p>
                        </div>
                        <div className="pt-6 border-t border-slate-100 flex justify-between items-end">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Debito Stimato (INAR + AdE)</p>
                            <p className="text-2xl font-black text-red-500 tracking-tighter">-{formatCurrency(stats.debitoFiscaleTotale)}</p>
                        </div>
                    </div>
                </div>

                {/* Spese Studio */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5"><PieChart size={120} /></div>
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                            <PieChart size={18} className="text-indigo-600" /> Costi Reali Studio
                        </h3>
                        <button onClick={() => onViewChange(AppView.EXPENSES)} className="text-indigo-600 hover:text-indigo-800 transition-colors"><ChevronRight size={20}/></button>
                    </div>
                    <div className="space-y-6 relative z-10">
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.totalYearExpenses)}</p>
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            {stats.expenseBreakdown.map(item => (
                                <div key={item.label} className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-black uppercase">
                                        <span className="text-slate-500">{item.label}</span>
                                        <span className="text-slate-900">{formatCurrency(item.val)}</span>
                                    </div>
                                    <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${stats.totalYearExpenses > 0 ? (item.val / stats.totalYearExpenses * 100) : 0}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Performance Finale */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={160} /></div>
                    <div className="relative z-10 flex-grow">
                        <h3 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-12">Net Efficiency</h3>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Netto Disponibile Reale</p>
                            <p className="text-5xl font-black text-white tracking-tighter">{formatCurrency(stats.utileNettoReale)}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => onViewChange(AppView.ARCHIVE)}
                        className="relative z-10 mt-10 w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg"
                    >
                        <CreditCard size={18} /> {stats.pendingInvoicesCount} Crediti verso Clienti
                    </button>
                </div>
            </div>

            <div className="pt-12 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] mb-2">FluxLedger ERP Professional • v1.6</p>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">
                    Developed and Protected by <span className="text-slate-900">Engineer Riccardo Righini</span><br/>
                    © {new Date().getFullYear()} STUDIO ENGINEERING SYSTEMS • All Rights Reserved
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
