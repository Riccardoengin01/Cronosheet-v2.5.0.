
import React, { useState } from 'react';
import { Project, Shift, ActivityType } from '../types';
import { generateId, COLORS, formatCurrency } from '../utils';
import { Trash2, Plus, Save, X, Pencil, Clock, ListChecks, Target, ChevronRight } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface ManageClientsProps {
  projects: Project[];
  onSave: (project: Project) => void;
  onDelete: (id: string) => void;
}

const ManageClients: React.FC<ManageClientsProps> = ({ projects, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { t } = useLanguage();
  
  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newBillingType, setNewBillingType] = useState<'hourly' | 'daily'>('hourly');
  const [newShifts, setNewShifts] = useState<Shift[]>([]);
  const [newActivityTypes, setNewActivityTypes] = useState<ActivityType[]>([]);

  // Local Add States
  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [activityName, setActivityName] = useState('');

  const startEdit = (project?: Project) => {
      setIsEditing(true);
      if (project) {
          setEditId(project.id);
          setNewName(project.name);
          setNewRate(project.defaultHourlyRate.toString());
          setNewColor(project.color);
          setNewBillingType(project.defaultBillingType || 'hourly');
          setNewShifts(project.shifts || []);
          setNewActivityTypes(project.activityTypes || []);
      } else {
          setEditId(null);
          setNewName('');
          setNewRate('');
          setNewColor(COLORS[0]);
          setNewBillingType('hourly');
          setNewShifts([]);
          setNewActivityTypes([
              { id: generateId(), name: 'Progettazione Preliminare' },
              { id: generateId(), name: 'Progettazione Definitiva' },
              { id: generateId(), name: 'Direzione Lavori' },
              { id: generateId(), name: 'Sopralluoghi' }
          ]);
      }
      setShiftName('');
      setShiftStart('');
      setShiftEnd('');
      setActivityName('');
  };

  const handleAddActivity = () => {
      if (!activityName.trim()) return;
      setNewActivityTypes([...newActivityTypes, { id: generateId(), name: activityName }]);
      setActivityName('');
  };

  const handleRemoveActivity = (id: string) => {
      setNewActivityTypes(newActivityTypes.filter(a => a.id !== id));
  };

  const handleAddShift = () => {
      if (!shiftName || !shiftStart || !shiftEnd) return;
      const newShift: Shift = { id: generateId(), name: shiftName, startTime: shiftStart, endTime: shiftEnd };
      setNewShifts([...newShifts, newShift]);
      setShiftName(''); setShiftStart(''); setShiftEnd('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const projectToSave: Project = {
      id: editId || generateId(),
      name: newName,
      color: newColor,
      defaultHourlyRate: parseFloat(newRate) || 0,
      defaultBillingType: newBillingType,
      shifts: newShifts,
      activityTypes: newActivityTypes
    };
    onSave(projectToSave);
    setIsEditing(false);
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center px-1">
        <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Portfolio Clienti & Ritmi</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Gestione Analitica Commesse</p>
        </div>
        {!isEditing && (
            <button 
                onClick={() => startEdit()}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 font-black uppercase text-xs tracking-widest"
            >
                <Plus size={18} strokeWidth={3} /> Nuovo Cliente
            </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSave} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl mb-8 animate-slide-up space-y-8">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
                {editId ? <Pencil size={24} className="text-indigo-600"/> : <Plus size={24} className="text-indigo-600"/>}
                {editId ? "Edit Ledger Entry" : "Create Client Ledger"}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ragione Sociale / Cantiere</label>
                    <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metodo Billing</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button type="button" onClick={() => setNewBillingType('hourly')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${newBillingType === 'hourly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Hourly</button>
                        <button type="button" onClick={() => setNewBillingType('daily')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${newBillingType === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Daily</button>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tariffa Base (€)</label>
                    <input type="number" step="0.01" className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl font-black font-mono" value={newRate} onChange={e => setNewRate(e.target.value)} />
                </div>
            </div>

            {/* SEZIONE RITMI / FASI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Target size={16} /> Ritmi & Fasi di Progetto
                    </label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Definisci le fasi analitiche per questo cliente.</p>
                    
                    <div className="space-y-2">
                        {newActivityTypes.map(act => (
                            <div key={act.id} className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-xl group">
                                <span className="text-xs font-bold text-slate-700">{act.name}</span>
                                <button type="button" onClick={() => handleRemoveActivity(act.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Aggiungi fase (es. Varianti)" className="flex-grow px-4 py-2 bg-slate-50 border-0 rounded-xl text-xs font-bold" value={activityName} onChange={e => setActivityName(e.target.value)} />
                        <button type="button" onClick={handleAddActivity} className="bg-slate-900 text-white p-2 rounded-xl cursor-pointer"><Plus size={18}/></button>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Clock size={16} /> Turni Predefiniti
                    </label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Configura orari rapidi per il log.</p>
                    <div className="space-y-2">
                        {newShifts.map(s => (
                            <div key={s.id} className="flex items-center justify-between bg-indigo-50/50 px-4 py-2 rounded-xl border border-indigo-100 group">
                                <span className="text-xs font-black text-indigo-800 uppercase tracking-tighter">{s.name} ({s.startTime}-{s.endTime})</span>
                                <button type="button" onClick={() => setNewShifts(newShifts.filter(x => x.id !== s.id))} className="text-indigo-300 hover:text-red-500 opacity-0 group-hover:opacity-100 cursor-pointer"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Nome Turno" className="col-span-2 px-4 py-2 bg-slate-50 border-0 rounded-xl text-xs font-bold" value={shiftName} onChange={e => setShiftName(e.target.value)} />
                        <input type="time" className="px-4 py-2 bg-slate-50 border-0 rounded-xl text-xs font-bold" value={shiftStart} onChange={e => setShiftStart(e.target.value)} />
                        <input type="time" className="px-4 py-2 bg-slate-50 border-0 rounded-xl text-xs font-bold" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} />
                        <button type="button" onClick={handleAddShift} className="col-span-2 bg-indigo-600 text-white py-2 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer">Aggiungi Orario</button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-8 border-t border-slate-50">
                <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all cursor-pointer">Annulla</button>
                <button type="submit" className="px-10 py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl hover:bg-indigo-900 transition-all cursor-pointer">Salva Cliente nel Ledger</button>
            </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
          {projects.map(project => (
              <div key={project.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm hover:shadow-xl transition-all group flex flex-col min-h-[320px]">
                  <div className="flex-grow">
                      <div className="flex items-start gap-4 mb-6">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-inner shrink-0" style={{ backgroundColor: project.color }}>
                              {project.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                              <h3 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tighter whitespace-normal break-words">
                                {project.name}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">
                                  {formatCurrency(project.defaultHourlyRate)} / {project.defaultBillingType === 'daily' ? 'GG' : 'H'}
                              </p>
                          </div>
                      </div>
                      
                      <div className="space-y-2 mb-6">
                          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Fasi Attive</p>
                          <div className="flex flex-wrap gap-1.5">
                              {project.activityTypes && project.activityTypes.length > 0 ? (
                                  project.activityTypes.map(a => (
                                      <span key={a.id} className="px-2 py-0.5 bg-slate-50 text-[9px] font-bold text-slate-600 uppercase rounded-md border border-slate-100 whitespace-normal break-words leading-tight">
                                          {a.name}
                                      </span>
                                  ))
                              ) : <span className="text-[8px] text-slate-300 italic uppercase">Nessun ritmo definito</span>}
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t border-slate-50 mt-auto">
                      <button onClick={() => startEdit(project)} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5 cursor-pointer">
                          <Pencil size={12} /> Modifica
                      </button>
                      <button onClick={() => onDelete(project.id)} className="text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                          Elimina
                      </button>
                  </div>
              </div>
          ))}
          
          {projects.length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-300 font-black uppercase tracking-[0.4em] border-2 border-dashed border-slate-100 rounded-[3rem] bg-white text-xs">
                  Portfolio Vuoto • Inizia l'inserimento
              </div>
          )}
      </div>
    </div>
  );
};

export default ManageClients;
