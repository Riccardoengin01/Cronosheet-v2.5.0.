
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign, Clock, Calendar, ListChecks, Target, Wallet } from 'lucide-react';
import { Project, TimeEntry, Expense, ActivityType } from '../types';
import { generateId, formatCurrency } from '../utils';
import { useLanguage } from '../lib/i18n';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: TimeEntry) => void;
  initialEntry?: TimeEntry;
  projects: Project[];
}

const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onClose, onSave, initialEntry, projects }) => {
  const { t } = useLanguage();
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [dateStr, setDateStr] = useState(''); 
  const [startTimeStr, setStartTimeStr] = useState(''); 
  const [endTimeStr, setEndTimeStr] = useState(''); 
  const [hourlyRate, setHourlyRate] = useState<string>('0');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isNightShift, setIsNightShift] = useState(false);
  const [billingType, setBillingType] = useState<'hourly' | 'daily'>('hourly');
  const [noSpecificTime, setNoSpecificTime] = useState(false);

  // Local state for new expense row
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');

  const pad = (n: number) => n < 10 ? '0' + n : n;
  const toDateStr = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const toTimeStr = (ts: number | null) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const selectedProject = projects.find(p => p.id === projectId);

  useEffect(() => {
    if (isOpen) {
      if (initialEntry) {
        setDescription(initialEntry.description);
        setProjectId(initialEntry.projectId);
        setActivityTypeId(initialEntry.activityTypeId || '');
        setDateStr(toDateStr(initialEntry.startTime));
        const sTime = toTimeStr(initialEntry.startTime);
        const eTime = toTimeStr(initialEntry.endTime);
        setStartTimeStr(sTime);
        setEndTimeStr(eTime);
        setNoSpecificTime(!sTime && !eTime && initialEntry.billingType === 'daily');
        setHourlyRate(initialEntry.hourlyRate ? initialEntry.hourlyRate.toString() : '0');
        setExpenses(initialEntry.expenses || []);
        setIsNightShift(!!initialEntry.isNightShift);
        setBillingType(initialEntry.billingType || 'hourly');
      } else {
        const now = new Date();
        setDescription('');
        const defaultProj = projects[0];
        setProjectId(defaultProj?.id || '');
        setActivityTypeId('');
        setDateStr(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
        setStartTimeStr('08:30');
        setEndTimeStr('17:30');
        setNoSpecificTime(false);
        setHourlyRate(defaultProj?.defaultHourlyRate.toString() || '0');
        setBillingType(defaultProj?.defaultBillingType || 'hourly');
        setExpenses([]);
        setIsNightShift(false);
      }
    }
  }, [isOpen, initialEntry, projects]);

  const addExpense = () => {
    if (!newExpDesc || !newExpAmount) return;
    setExpenses([...expenses, { id: generateId(), description: newExpDesc, amount: parseFloat(newExpAmount) }]);
    setNewExpDesc('');
    setNewExpAmount('');
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleProjectChange = (newProjectId: string) => {
      setProjectId(newProjectId);
      const proj = projects.find(p => p.id === newProjectId);
      if (proj) {
          setHourlyRate(proj.defaultHourlyRate.toString());
          if (!initialEntry) {
              setBillingType(proj.defaultBillingType || 'hourly');
              setNoSpecificTime(proj.defaultBillingType === 'daily');
              setActivityTypeId('');
          }
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStr) return;
    let start, end, duration = 0;
    if (noSpecificTime && billingType === 'daily') {
        start = new Date(`${dateStr}T00:00:00`).getTime();
        end = null;
    } else {
        if (!startTimeStr || !endTimeStr) return;
        start = new Date(`${dateStr}T${startTimeStr}:00`).getTime();
        let endVal = new Date(`${dateStr}T${endTimeStr}:00`).getTime();
        if (endVal < start) endVal += 24 * 60 * 60 * 1000;
        end = endVal;
        duration = (end - start) / 1000;
    }

    onSave({
        id: initialEntry ? initialEntry.id : generateId(),
        description, 
        projectId, 
        activityTypeId, 
        startTime: start, 
        endTime: end, 
        duration,
        hourlyRate: parseFloat(hourlyRate),
        billingType, 
        expenses, 
        isNightShift: noSpecificTime ? false : isNightShift
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 md:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/20">
        <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              {initialEntry ? "Modifica Prestazione" : "Registra Servizio"}
            </h2>
            <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest leading-none mt-1">Ledger Update Studio Systems</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selettore Metodo Billing */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button type="button" onClick={() => { setBillingType('hourly'); setNoSpecificTime(false); }} className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${billingType === 'hourly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>A Ore</button>
              <button type="button" onClick={() => setBillingType('daily')} className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${billingType === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>A Giornata</button>
          </div>

          <div className="space-y-4">
              <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cliente / Commessa</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-1 focus:ring-indigo-500 font-bold text-sm" value={projectId} onChange={e => handleProjectChange(e.target.value)}>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
              </div>

              <div>
                  <label className="block text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Target size={12}/> Fase Analitica
                  </label>
                  <select className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-1 focus:ring-indigo-500 font-bold text-sm text-indigo-900" value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)}>
                      <option value="">Generico / Altro</option>
                      {selectedProject?.activityTypes?.map(act => (
                          <option key={act.id} value={act.id}>{act.name}</option>
                      ))}
                  </select>
              </div>

              <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrizione Attività</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-1 focus:ring-indigo-500 font-bold text-sm" 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    placeholder="es. Assistenza collaudo..."
                    rows={2}
                  />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Data</label>
                      <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs" value={dateStr} onChange={e => setDateStr(e.target.value)} />
                  </div>
                  <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Paga / Unità (€)</label>
                      <input type="number" step="0.01" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-black font-mono text-xs" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
                  </div>
              </div>

              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Orario</span>
                      {billingType === 'daily' && (
                          <button type="button" onClick={() => setNoSpecificTime(!noSpecificTime)} className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg transition-all ${noSpecificTime ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>Giorno Intero</button>
                      )}
                  </div>
                  {!noSpecificTime && (
                      <div className="grid grid-cols-2 gap-2">
                          <input type="time" required className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-mono font-black text-xs" value={startTimeStr} onChange={e => setStartTimeStr(e.target.value)} />
                          <input type="time" required className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-mono font-black text-xs" value={endTimeStr} onChange={e => setEndTimeStr(e.target.value)} />
                      </div>
                  )}
              </div>

              {/* NUOVA SEZIONE SPESE EXTRA MULTIPLE */}
              <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100 space-y-3">
                  <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <Wallet size={12}/> Spese Accessorie (Rimborsi)
                  </label>
                  
                  {expenses.length > 0 && (
                    <div className="space-y-1">
                      {expenses.map(exp => (
                        <div key={exp.id} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg border border-indigo-50 group">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-700">{exp.description}</span>
                            <span className="text-[9px] font-black text-indigo-500 font-mono">{formatCurrency(exp.amount)}</span>
                          </div>
                          <button type="button" onClick={() => removeExpense(exp.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-2">
                    <input 
                      type="text" 
                      placeholder="es. Carburante" 
                      className="col-span-7 px-3 py-2 bg-white border border-indigo-100 rounded-lg text-[10px] font-bold"
                      value={newExpDesc}
                      onChange={e => setNewExpDesc(e.target.value)}
                    />
                    <input 
                      type="number" 
                      placeholder="€" 
                      className="col-span-3 px-3 py-2 bg-white border border-indigo-100 rounded-lg text-[10px] font-black font-mono"
                      value={newExpAmount}
                      onChange={e => setNewExpAmount(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={addExpense}
                      className="col-span-2 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
              </div>
          </div>

          <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95 italic">
            Salva nel Registro
          </button>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;
