
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign, Clock, Calendar, ToggleLeft, ToggleRight, ListChecks, Info } from 'lucide-react';
import { Project, TimeEntry, Expense } from '../types';
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
              // Se il progetto è a giornata, attiva spesso "Intera Giornata" se non ci sono orari
              if (proj.defaultBillingType === 'daily') {
                  setNoSpecificTime(true);
              } else {
                  setNoSpecificTime(false);
                  setStartTimeStr('08:00');
                  setEndTimeStr('16:00');
              }
          }
      }
  };

  const applyPreset = (start: string, end: string) => {
      setNoSpecificTime(false);
      setStartTimeStr(start);
      setEndTimeStr(end);
      const s = parseInt(start.split(':')[0]);
      const e = parseInt(end.split(':')[0]);
      const isNight = s >= 20 || s <= 4 || e <= 7;
      setIsNightShift(isNight);
  };

  const handleAddExpense = () => {
    setExpenses([...expenses, { id: generateId(), description: '', amount: 0 }]);
  };

  const handleUpdateExpense = (id: string, field: 'description' | 'amount', value: any) => {
    setExpenses(expenses.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dateStr) {
        alert("Inserire la data del servizio.");
        return;
    }

    let start, end, duration = 0;

    if (noSpecificTime && billingType === 'daily') {
        // Usa mezzanotte come orario fittizio
        start = new Date(`${dateStr}T00:00:00`).getTime();
        end = null;
        duration = 0;
    } else {
        if (!startTimeStr || !endTimeStr) {
            alert("Inserire gli orari di inizio e fine servizio.");
            return;
        }
        start = new Date(`${dateStr}T${startTimeStr}:00`).getTime();
        let endVal = new Date(`${dateStr}T${endTimeStr}:00`).getTime();
        
        // Gestione passaggio mezzanotte
        if (endVal < start) endVal += 24 * 60 * 60 * 1000;
        
        end = endVal;
        duration = (end - start) / 1000;
    }

    const entryToSave: TimeEntry = {
        id: initialEntry ? initialEntry.id : generateId(),
        description,
        projectId,
        startTime: start,
        endTime: end,
        duration,
        hourlyRate: parseFloat(hourlyRate),
        billingType,
        expenses,
        isNightShift: noSpecificTime ? false : isNightShift
    };

    onSave(entryToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {initialEntry ? "Modifica Servizio" : "Nuovo Inserimento"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <ListChecks className="text-indigo-600" size={20} />
                      <span className="text-sm font-bold text-indigo-900">Modalità Fatturazione</span>
                  </div>
                  <div className="flex bg-white p-1 rounded-lg border border-indigo-200">
                      <button 
                        type="button"
                        onClick={() => { setBillingType('hourly'); setNoSpecificTime(false); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${billingType === 'hourly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          A Ore
                      </button>
                      <button 
                        type="button"
                        onClick={() => setBillingType('daily')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${billingType === 'daily' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          A Giornata
                      </button>
                  </div>
              </div>
          </div>

          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente / Postazione</label>
              <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg font-bold"
                  value={projectId}
                  onChange={e => handleProjectChange(e.target.value)}
              >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data del Servizio</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="date" 
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={dateStr}
                        onChange={e => setDateStr(e.target.value)}
                    />
                  </div>
              </div>
              <div className="flex flex-col justify-end">
                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                       {billingType === 'hourly' ? "Paga Oraria (€/h)" : "Paga Giornaliera (€/gg)"}
                   </label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 font-bold">€</span>
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        required
                        className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-lg font-bold"
                        value={hourlyRate}
                        onChange={e => setHourlyRate(e.target.value)}
                      />
                   </div>
              </div>
          </div>

          <div className={`space-y-4 p-4 rounded-xl border transition-all ${billingType === 'daily' && noSpecificTime ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Clock size={16} /> Dettaglio Orario
                  </h3>
                  {billingType === 'daily' && (
                      <button 
                        type="button" 
                        onClick={() => setNoSpecificTime(!noSpecificTime)}
                        className={`text-xs px-2 py-1 rounded-md font-bold transition-colors ${noSpecificTime ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                      >
                          {noSpecificTime ? "✓ Giornata Intera" : "Imposta Giornata Intera"}
                      </button>
                  )}
              </div>

              {!noSpecificTime ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Inizio Servizio</label>
                            <input 
                                type="time" 
                                required={!noSpecificTime}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 font-mono font-bold"
                                value={startTimeStr}
                                onChange={e => setStartTimeStr(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Fine Servizio</label>
                            <input 
                                type="time" 
                                required={!noSpecificTime}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 font-mono font-bold"
                                value={endTimeStr}
                                onChange={e => setEndTimeStr(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         <button 
                             type="button"
                             onClick={() => setIsNightShift(!isNightShift)}
                             className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isNightShift ? 'bg-indigo-900' : 'bg-gray-200'}`}
                         >
                             <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isNightShift ? 'translate-x-5' : 'translate-x-0'}`} />
                         </button>
                         <span className={`text-xs font-bold ${isNightShift ? 'text-indigo-900' : 'text-gray-500'}`}>
                             {isNightShift ? "Turno Notturno" : "Turno Diurno"}
                         </span>
                    </div>

                    {selectedProject?.shifts && selectedProject.shifts.length > 0 && (
                        <div className="pt-2 border-t border-gray-50">
                             <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Turni Predefiniti Cliente</p>
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                 {selectedProject.shifts.map(shift => (
                                     <button 
                                         key={shift.id}
                                         type="button"
                                         onClick={() => applyPreset(shift.startTime, shift.endTime)}
                                         className={`p-2 rounded-lg border text-[10px] transition-all text-left ${
                                             startTimeStr === shift.startTime && endTimeStr === shift.endTime
                                             ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' 
                                             : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                                         }`}
                                     >
                                         <div className="truncate mb-1">{shift.name}</div>
                                         <div className="opacity-75 font-mono font-bold">{shift.startTime}-{shift.endTime}</div>
                                     </button>
                                 ))}
                             </div>
                        </div>
                    )}
                  </>
              ) : (
                  <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <p className="text-gray-500 text-sm font-medium">Fatturazione a giornata intera.<br/>Nessun orario specifico richiesto.</p>
                  </div>
              )}
          </div>

          <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1">Note del Servizio (Opzionale)</label>
               <input 
                 type="text" 
                 className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={description}
                 onChange={e => setDescription(e.target.value)}
                 placeholder="Esempio: Sostituzione collega, Intervento straordinario..."
               />
          </div>

          <div className="border-t border-gray-100 pt-4">
             <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-500" /> Spese Extra / Rimborsi
                </h3>
                <button 
                  type="button"
                  onClick={handleAddExpense}
                  className="text-xs flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-bold transition-colors"
                >
                    <Plus size={14} /> Aggiungi
                </button>
             </div>
             
             <div className="space-y-3">
                 {expenses.map((exp) => (
                     <div key={exp.id} className="flex gap-2 items-center animate-slide-down">
                         <input 
                            type="text" 
                            placeholder="Descrizione (es. Parcheggio)"
                            className="flex-grow px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                            value={exp.description}
                            onChange={e => handleUpdateExpense(exp.id, 'description', e.target.value)}
                         />
                         <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                            <input 
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-24 pl-5 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 font-bold"
                                value={exp.amount}
                                onChange={e => handleUpdateExpense(exp.id, 'amount', parseFloat(e.target.value) || 0)}
                            />
                         </div>
                         <button 
                            type="button"
                            onClick={() => handleRemoveExpense(exp.id)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                         >
                             <Trash2 size={18} />
                         </button>
                     </div>
                 ))}
                 {expenses.length === 0 && (
                     <p className="text-xs text-gray-400 italic text-center py-2">Nessuna spesa extra inserita.</p>
                 )}
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
             <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
             >
                 Annulla
             </button>
             <button 
                type="submit" 
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 active:scale-95"
             >
                 Salva Servizio
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;
