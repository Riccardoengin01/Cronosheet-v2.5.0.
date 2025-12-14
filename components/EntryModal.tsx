import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign, Clock, Calendar } from 'lucide-react';
import { Project, TimeEntry, Expense } from '../types';
import { generateId } from '../utils';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: TimeEntry) => void;
  initialEntry?: TimeEntry;
  projects: Project[];
}

const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onClose, onSave, initialEntry, projects }) => {
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dateStr, setDateStr] = useState(''); // YYYY-MM-DD
  const [startTimeStr, setStartTimeStr] = useState(''); // HH:mm
  const [endTimeStr, setEndTimeStr] = useState(''); // HH:mm
  const [hourlyRate, setHourlyRate] = useState<string>('0');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isNightShift, setIsNightShift] = useState(false);

  // Helpers
  const pad = (n: number) => n < 10 ? '0' + n : n;
  const toDateStr = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const toTimeStr = (ts: number) => {
    const d = new Date(ts);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const selectedProject = projects.find(p => p.id === projectId);

  useEffect(() => {
    if (isOpen) {
      if (initialEntry) {
        // Edit mode
        setDescription(initialEntry.description);
        setProjectId(initialEntry.projectId);
        setDateStr(toDateStr(initialEntry.startTime));
        setStartTimeStr(toTimeStr(initialEntry.startTime));
        setEndTimeStr(initialEntry.endTime ? toTimeStr(initialEntry.endTime) : '');
        setHourlyRate(initialEntry.hourlyRate ? initialEntry.hourlyRate.toString() : '0');
        setExpenses(initialEntry.expenses || []);
        setIsNightShift(!!initialEntry.isNightShift);
      } else {
        // Create mode
        const now = new Date();
        setDescription('');
        
        // Select first project or maintain existing if just switching
        const defaultProj = projects[0];
        setProjectId(defaultProj?.id || '');
        
        setDateStr(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
        setStartTimeStr('08:00');
        setEndTimeStr('16:00');
        setHourlyRate(defaultProj?.defaultHourlyRate.toString() || '0');
        setExpenses([]);
        setIsNightShift(false);
      }
    }
  }, [isOpen, initialEntry, projects]);

  const handleProjectChange = (newProjectId: string) => {
      setProjectId(newProjectId);
      // Update rate if creating new entry
      if (!initialEntry) {
          const proj = projects.find(p => p.id === newProjectId);
          if (proj) {
              setHourlyRate(proj.defaultHourlyRate.toString());
          }
      }
  };

  const applyPreset = (start: string, end: string) => {
      setStartTimeStr(start);
      setEndTimeStr(end);
      
      // Auto-detect night shift based on start/end
      const s = parseInt(start.split(':')[0]);
      const e = parseInt(end.split(':')[0]);
      // If end is smaller than start (e.g. 06 < 22) or simply if it crosses midnight logic typically
      // Simple logic: if start is late (>20) or end is early (<07)
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
    
    // Construct Timestamps
    const start = new Date(`${dateStr}T${startTimeStr}`).getTime();
    let end = new Date(`${dateStr}T${endTimeStr}`).getTime();

    // Handle overnight shifts (end time is smaller than start time, assumes next day)
    if (end < start) {
        end += 24 * 60 * 60 * 1000; // Add 24 hours
    }

    const duration = (end - start) / 1000;

    const entryToSave: TimeEntry = {
        id: initialEntry ? initialEntry.id : generateId(),
        description,
        projectId,
        startTime: start,
        endTime: end,
        duration,
        hourlyRate: parseFloat(hourlyRate),
        expenses,
        isNightShift
    };

    onSave(entryToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {initialEntry ? 'Modifica Servizio' : 'Nuovo Servizio'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* 1. Selezione Postazione */}
          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente / Postazione</label>
              <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg font-medium"
                  value={projectId}
                  onChange={e => handleProjectChange(e.target.value)}
              >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
          </div>

          {/* 2. Data */}
          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Data Servizio</label>
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

          {/* 3. Preset Orari (Turni Dinamici) */}
          {selectedProject?.shifts && selectedProject.shifts.length > 0 && (
             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-2">Seleziona Turno</label>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                   {selectedProject.shifts.map(shift => (
                       <button 
                           key={shift.id}
                           type="button"
                           onClick={() => applyPreset(shift.startTime, shift.endTime)}
                           className={`p-2 rounded-lg border text-sm transition-all text-left group ${
                               startTimeStr === shift.startTime && endTimeStr === shift.endTime
                               ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                               : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                           }`}
                       >
                           <div className="font-semibold">{shift.name}</div>
                           <div className="text-xs opacity-75 font-mono group-hover:opacity-100">{shift.startTime} - {shift.endTime}</div>
                       </button>
                   ))}
               </div>
             </div>
          )}

          {/* 4. Orari Manuali */}
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Ora Inizio</label>
                  <input 
                      type="time" 
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                      value={startTimeStr}
                      onChange={e => setStartTimeStr(e.target.value)}
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Ora Fine</label>
                  <input 
                      type="time" 
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                      value={endTimeStr}
                      onChange={e => setEndTimeStr(e.target.value)}
                  />
              </div>
          </div>

          {/* 5. Giorno/Notte & Paga */}
          <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
               <div className="flex-1">
                   <label className="block text-sm font-medium text-gray-600 mb-1">Tipologia</label>
                   <div className="flex items-center gap-2 mt-2">
                       <button 
                         type="button"
                         onClick={() => setIsNightShift(!isNightShift)}
                         className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isNightShift ? 'bg-indigo-900' : 'bg-gray-200'}`}
                       >
                           <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isNightShift ? 'translate-x-5' : 'translate-x-0'}`} />
                       </button>
                       <span className={`text-sm font-medium ${isNightShift ? 'text-indigo-900' : 'text-gray-500'}`}>
                           {isNightShift ? 'Notturno' : 'Diurno'}
                       </span>
                   </div>
               </div>
               <div className="flex-1">
                   <label className="block text-sm font-medium text-gray-600 mb-1">Paga Oraria (€)</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <span className="text-gray-400 font-bold">€</span>
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        step="0.50"
                        className="w-full pl-6 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        value={hourlyRate}
                        onChange={e => setHourlyRate(e.target.value)}
                      />
                   </div>
               </div>
          </div>

          {/* Note Opzionali */}
          <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Note (Opzionale)</label>
               <input 
                 type="text" 
                 className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={description}
                 onChange={e => setDescription(e.target.value)}
                 placeholder="Dettagli attività..."
               />
          </div>

          {/* Expenses */}
          <div className="border-t border-gray-100 pt-4">
             <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-800 flex items-center gap-2">
                    <DollarSign size={16} /> Spese Extra
                </h3>
                <button 
                  type="button"
                  onClick={handleAddExpense}
                  className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    <Plus size={16} /> Aggiungi
                </button>
             </div>
             
             <div className="space-y-3">
                 {expenses.length === 0 && (
                     <p className="text-sm text-gray-400 italic">Nessuna spesa extra.</p>
                 )}
                 {expenses.map((exp) => (
                     <div key={exp.id} className="flex gap-2 items-center">
                         <input 
                            type="text" 
                            placeholder="Es. Pasto"
                            className="flex-grow px-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-indigo-500"
                            value={exp.description}
                            onChange={e => handleUpdateExpense(exp.id, 'description', e.target.value)}
                         />
                         <input 
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="€"
                            className="w-20 px-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-indigo-500"
                            value={exp.amount}
                            onChange={e => handleUpdateExpense(exp.id, 'amount', parseFloat(e.target.value) || 0)}
                         />
                         <button 
                            type="button"
                            onClick={() => handleRemoveExpense(exp.id)}
                            className="p-2 text-gray-400 hover:text-red-500"
                         >
                             <Trash2 size={16} />
                         </button>
                     </div>
                 ))}
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
             <button 
                type="button" 
                onClick={onClose}
                className="px-5 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
             >
                 Annulla
             </button>
             <button 
                type="submit" 
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
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