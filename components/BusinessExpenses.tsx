
import React, { useState, useEffect } from 'react';
import { BusinessExpense, UserProfile } from '../types';
import * as DB from '../services/db';
import { generateId, formatCurrency } from '../utils';
import { Plus, Trash2, Wallet, Calendar, Tag, Info, Save, X, Loader2, PieChart } from 'lucide-react';

interface BusinessExpensesProps {
    user: UserProfile;
}

const CATEGORIES = ['Software', 'Ordine/Assicurazione', 'Auto/Trasporti', 'Studio/Utenze', 'Altro'] as const;

const BusinessExpenses: React.FC<BusinessExpensesProps> = ({ user }) => {
    const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form State
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [cat, setCat] = useState<typeof CATEGORIES[number]>('Software');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

    useEffect(() => {
        fetchExpenses();
    }, [user.id]);

    const fetchExpenses = async () => {
        setLoading(true);
        const data = await DB.getBusinessExpenses(user.id);
        setExpenses(data);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const newExp: BusinessExpense = {
            id: generateId(),
            user_id: user.id,
            description: desc,
            amount: parseFloat(amount),
            category: cat,
            date: date,
            is_recurring: false
        };
        await DB.saveBusinessExpense(newExp);
        setIsModalOpen(false);
        setDesc(''); setAmount('');
        fetchExpenses();
    };

    const total = expenses.reduce((acc, e) => acc + e.amount, 0);

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
                        Costi Generali Studio <PieChart className="text-indigo-600" size={24} />
                    </h1>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Fixed Business Costs Management</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest"
                >
                    <Plus size={16} /> Nuova Spesa
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Totale Costi Studio</p>
                    <p className="text-3xl font-black">{formatCurrency(total)}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">Anno {new Date().getFullYear()}</p>
                </div>
                
                <div className="md:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 bg-slate-50/50">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Registro Spese Fixed</h3>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {expenses.map(exp => (
                            <div key={exp.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <Wallet size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{exp.description}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                                            {exp.category} • {new Date(exp.date).toLocaleDateString('it-IT')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono font-black text-sm text-red-500">-{formatCurrency(exp.amount)}</span>
                                    <button onClick={() => { if(confirm("Elimina?")) DB.deleteBusinessExpense(exp.id).then(fetchExpenses); }} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {expenses.length === 0 && (
                            <div className="py-20 text-center text-slate-300 italic text-xs">Nessuna spesa fissa inserita.</div>
                        )}
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Inserisci Spesa</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Descrizione</label>
                                <input type="text" required className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl font-bold text-sm" value={desc} onChange={e => setDesc(e.target.value)} placeholder="es. Abbonamento AutoCAD" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Importo (€)</label>
                                    <input type="number" step="0.01" required className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl font-bold text-sm" value={amount} onChange={e => setAmount(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Data</label>
                                    <input type="date" required className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl font-bold text-sm" value={date} onChange={e => setDate(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Categoria</label>
                                <select className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl font-bold text-sm" value={cat} onChange={e => setCat(e.target.value as any)}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-indigo-100 mt-6 flex items-center justify-center gap-2">
                                <Save size={16}/> Registra Costo
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessExpenses;
