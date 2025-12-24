
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign, Clock, Calendar, ListChecks, Target } from 'lucide-react';
import { Project, TimeEntry, Expense, ActivityType } from '../types';
import { generateId } from '../utils';
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
        setStartTimeStr('08:00');
        setEndTimeStr('16:00');
        setNoSpecificTime(false);
        setHourlyRate(defaultProj?.defaultHourlyRate.toString() || '0');
        setBillingType(defaultProj?.defaultBillingType || 'hourly');
        setExpenses([]);
        setIsNightShift(false);
      }
    }
  }, [isOpen, initialEntry, projects]);

  const handleProjectChange = (newProjectId: string) => {
      setProjectId(newProjectId);
      const proj = projects.find(p => p.id === newProjectId);
      if (proj) {
          setHourlyRate(proj.defaultHourlyRate.toString());
          if (!initialEntry) {
              setBillingType(proj.defaultBillingType || 'hourly');
              if (proj.defaultBillingType === 'daily') setNoSpecificTime(true);
              else setNoSpecificTime(false);
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
        activityTypeId, // Salvataggio esplicito
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-100">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
            {initialEntry ? "Aggiorna Servizio" : "Nuova Prestazione"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <X size={20} className="text-slate-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
              <div className="flex items-center gap-2">
                  <ListChecks className="text-indigo-600" size={20} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metodo Billing</span>
              </div>
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                  <button type="button" onClick={() => { setBillingType('hourly'); setNoSpecificTime(false); }} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${billingType === 'hourly' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>A Ore</button>
                  <button type="button" onClick={() => setBillingType('daily')} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${billingType === 'daily' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Giornata</button>
              </div>
          </div>

          <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente / Ledger</label>
              <select className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" value={projectId} onChange={e => handleProjectChange(e.target.value)}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
          </div>

          <div>
              <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Target size={14}/> Fase / Ritmo
              </label>
              <select className="w-full px-5 py-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900" value={activityTypeId} onChange={e => setActivityTypeId(e.target.value)}>
                  <option value="">Generico / Altro</option>
                  {selectedProject?.activityTypes?.map(act => (
                      <option key={act.id} value={act.id}>{act.name}</option>
                  ))}
              </select>
          </div>

          <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrizione Prestazione</label>
              <textarea 
                className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                placeholder="es. Sopralluogo cantiere"
                rows={2}
              />
          </div>

          <div className="grid grid-cols-2 gap-6">
              <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data</label>
                  <input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl font-bold" value={dateStr} onChange={e => setDateStr(e.target.value)} />
              </div>
              <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tariffa (€)</label>
                  <input type="number" step="0.01" className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl font-black font-mono" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> Orario</span>
                  {billingType === 'daily' && (
                      <button type="button" onClick={() => setNoSpecificTime(!noSpecificTime)} className={`text-[9px] font-black uppercase px-2 py-1 rounded-md transition-all ${noSpecificTime ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>Giorno Intero</button>
                  )}
              </div>
              {!noSpecificTime && (
                  <div className="grid grid-cols-2 gap-4">
                      <input type="time" required className="px-4 py-2.5 bg-slate-50 border-0 rounded-xl font-mono font-black" value={startTimeStr} onChange={e => setStartTimeStr(e.target.value)} />
                      <input type="time" required className="px-4 py-2.5 bg-slate-50 border-0 rounded-xl font-mono font-black" value={endTimeStr} onChange={e => setEndTimeStr(e.target.value)} />
                  </div>
              )}
          </div>

          <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-900 transition-all">
              Registra nel Ledger
          </button>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;
