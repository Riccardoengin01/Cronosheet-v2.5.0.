
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign, Clock, Calendar, ToggleLeft, ToggleRight, ListChecks } from 'lucide-react';
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
        setDescription(initialEntry.description);
        setProjectId(initialEntry.projectId);
        setDateStr(toDateStr(initialEntry.startTime));
        setStartTimeStr(toTimeStr(initialEntry.startTime));
        setEndTimeStr(initialEntry.endTime ? toTimeStr(initialEntry.endTime) : '');
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
        setHourlyRate(defaultProj?.defaultHourlyRate.toString() || '0');
        setExpenses([]);
        setIsNightShift(false);
        setBillingType('hourly');
      }
    }
  }, [isOpen, initialEntry, projects]);

  const handleProjectChange = (newProjectId: string) => {
      setProjectId(newProjectId);
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
    const start = new Date(`${dateStr}T${startTimeStr}`).getTime();
    let end = new Date(`${dateStr}T${endTimeStr}`).getTime();
    if (end < start) end += 24 * 60 * 60 * 1000;
    const duration = (end - start) / 1000;

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
            {initialEntry ? t('entry.edit_title') : t('entry.new_title')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <ListChecks className="text-indigo-600" size={20} />
                  <span className="text-sm font-bold text-indigo-900">{t('entry.billing_mode')}</span>
              </div>
              <div className="flex bg-white p-1 rounded-lg border border-indigo-200">
                  <button 
                    type="button"
                    onClick={() => setBillingType('hourly')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${billingType === 'hourly' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      {t('entry.hourly_mode')}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBillingType('daily')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${billingType === 'daily' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      {t('entry.daily_mode')}
                  </button>
              </div>
          </div>

          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('entry.client_label')}</label>
              <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg font-medium"
                  value={projectId}
                  onChange={e => handleProjectChange(e.target.value)}
              >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
          </div>

          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('entry.date_label')}</label>
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

          {selectedProject?.shifts && selectedProject.shifts.length > 0 && (
             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-2">{t('entry.shift_select')}</label>
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

          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t('entry.start_time')}</label>
                  <input 
                      type="time" 
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                      value={startTimeStr}
                      onChange={e => setStartTimeStr(e.target.value)}
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t('entry.end_time')}</label>
                  <input 
                      type="time" 
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                      value={endTimeStr}
                      onChange={e => setEndTimeStr(e.target.value)}
                  />
              </div>
          </div>

          <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
               <div className="flex-1">
                   <label className="block text-sm font-medium text-gray-600 mb-1">{t('entry.type')}</label>
                   <div className="flex items-center gap-2 mt-2">
                       <button 
                         type="button"
                         onClick={() => setIsNightShift(!isNightShift)}
                         className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isNightShift ? 'bg-indigo-900' : 'bg-gray-200'}`}
                       >
                           <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isNightShift ? 'translate-x-5' : 'translate-x-0'}`} />
                       </button>
                       <span className={`text-sm font-medium ${isNightShift ? 'text-indigo-900' : 'text-gray-500'}`}>
                           {isNightShift ? t('entry.nocturnal') : t('entry.diurnal')}
                       </span>
                   </div>
               </div>
               <div className="flex-1">
                   <label className="block text-sm font-medium text-gray-600 mb-1">
                       {billingType === 'hourly' ? t('entry.rate_hourly') : t('entry.rate_daily')}
                   </label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <span className="text-gray-400 font-bold">€</span>
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        className="w-full pl-6 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        value={hourlyRate}
                        onChange={e => setHourlyRate(e.target.value)}
                      />
                   </div>
               </div>
          </div>

          <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">{t('entry.notes')}</label>
               <input 
                 type="text" 
                 className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={description}
                 onChange={e => setDescription(e.target.value)}
                 placeholder={t('entry.notes_placeholder')}
               />
          </div>

          <div className="border-t border-gray-100 pt-4">
             <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-800 flex items-center gap-2">
                    <DollarSign size={16} /> {t('entry.extra_expenses')}
                </h3>
                <button 
                  type="button"
                  onClick={handleAddExpense}
                  className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    <Plus size={16} /> {t('entry.add')}
                </button>
             </div>
             
             <div className="space-y-3">
                 {expenses.length === 0 && (
                     <p className="text-sm text-gray-400 italic">{t('entry.no_extra')}</p>
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
                 {t('entry.cancel')}
             </button>
             <button 
                type="submit" 
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
             >
                 {t('entry.save')}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;
