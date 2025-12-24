
import React, { useState } from 'react';
import { Project, Shift } from '../types';
import { generateId, COLORS, formatCurrency } from '../utils';
import { Trash2, Plus, Save, X, Briefcase, Pencil, Clock, ListChecks } from 'lucide-react';
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

  // Shift Input State
  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');

  const startEdit = (project?: Project) => {
      setIsEditing(true);
      if (project) {
          setEditId(project.id);
          setNewName(project.name);
          setNewRate(project.defaultHourlyRate.toString());
          setNewColor(project.color);
          setNewBillingType(project.defaultBillingType || 'hourly');
          setNewShifts(project.shifts || []);
      } else {
          setEditId(null);
          setNewName('');
          setNewRate('');
          setNewColor(COLORS[0]);
          setNewBillingType('hourly');
          setNewShifts([]);
      }
      setShiftName('');
      setShiftStart('');
      setShiftEnd('');
  };

  const handleAddShift = () => {
      if (!shiftName || !shiftStart || !shiftEnd) return;
      
      const newShift: Shift = {
          id: generateId(),
          name: shiftName,
          startTime: shiftStart,
          endTime: shiftEnd
      };
      
      setNewShifts([...newShifts, newShift]);
      setShiftName('');
      setShiftStart('');
      setShiftEnd('');
  };

  const handleRemoveShift = (shiftId: string) => {
      setNewShifts(newShifts.filter(s => s.id !== shiftId));
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
      shifts: newShifts
    };

    onSave(projectToSave);
    setIsEditing(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Anagrafica Clienti</h2>
            <p className="text-gray-500">Gestisci i tuoi clienti, le tariffe e i turni predefiniti.</p>
        </div>
        {!isEditing && (
            <button 
                onClick={() => startEdit()}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md font-bold"
            >
                <Plus size={18} /> Nuovo Cliente
            </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border-2 border-indigo-100 shadow-xl mb-8 animate-slide-up">
            <h3 className="text-xl font-bold mb-6 text-indigo-900 flex items-center gap-2">
                {editId ? <Pencil size={20}/> : <Plus size={20}/>}
                {editId ? "Modifica Cliente" : "Crea Nuovo Cliente"}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Cliente / Cantiere</label>
                    <input 
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Es. Reception Ingresso"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Modo Fatturazione</label>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            type="button"
                            onClick={() => setNewBillingType('hourly')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newBillingType === 'hourly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            A Ore
                        </button>
                        <button 
                            type="button"
                            onClick={() => setNewBillingType('daily')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newBillingType === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            A Giornata
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {newBillingType === 'hourly' ? "Paga Oraria (€/h)" : "Paga Giornaliera (€/gg)"}
                    </label>
                    <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                        placeholder="0.00"
                        value={newRate}
                        onChange={e => setNewRate(e.target.value)}
                    />
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Colore Distintivo</label>
                <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setNewColor(c)}
                            className={`w-8 h-8 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 shadow-lg' : 'hover:scale-110'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Clock size={16} /> Configura Turni Predefiniti
                </label>
                <p className="text-xs text-gray-500 mb-4">Aggiungi i turni standard per questo cliente per caricarli velocemente nel registro.</p>
                
                <div className="space-y-2 mb-4">
                    {newShifts.map((shift) => (
                        <div key={shift.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                            <span className="font-bold text-indigo-900 flex-grow px-2">{shift.name}</span>
                            <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                {shift.startTime} - {shift.endTime}
                            </span>
                            <button 
                                type="button"
                                onClick={() => handleRemoveShift(shift.id)}
                                className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                    {newShifts.length === 0 && (
                        <p className="text-sm text-gray-400 italic px-2">Nessun turno salvato.</p>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-2 items-end">
                    <div className="flex-grow w-full">
                        <input 
                            type="text" 
                            placeholder="Nome Turno (es. Mattina)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={shiftName}
                            onChange={e => setShiftName(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-32">
                        <input 
                            type="time" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={shiftStart}
                            onChange={e => setShiftStart(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-32">
                        <input 
                            type="time" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={shiftEnd}
                            onChange={e => setShiftEnd(e.target.value)}
                        />
                    </div>
                    <button 
                        type="button"
                        onClick={handleAddShift}
                        disabled={!shiftName || !shiftStart || !shiftEnd}
                        className="w-full md:w-auto px-4 py-2 bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-sm font-bold hover:bg-slate-900 shadow-sm"
                    >
                        Aggiungi
                    </button>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                    Annulla
                </button>
                <button 
                    type="submit" 
                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2"
                >
                    <Save size={18} /> Salva Cliente
                </button>
            </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
              <div key={project.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all group hover:shadow-md">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm"
                            style={{ backgroundColor: project.color }}
                          >
                              {project.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                              <h3 className="font-bold text-gray-800 text-lg leading-tight truncate w-40">{project.name}</h3>
                              <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-tight">
                                  {formatCurrency(project.defaultHourlyRate)} {project.defaultBillingType === 'daily' ? 'giornata' : 'all\'ora'}
                              </p>
                          </div>
                      </div>
                  </div>
                  
                  <div className="mb-4 space-y-1">
                      {project.shifts && project.shifts.length > 0 ? (
                          project.shifts.map(s => (
                              <div key={s.id} className="text-[10px] text-gray-500 flex justify-between bg-gray-50 px-2 py-1 rounded font-medium">
                                  <span>{s.name}</span>
                                  <span className="font-mono">{s.startTime}-{s.endTime}</span>
                              </div>
                          ))
                      ) : (
                          <div className="text-[10px] text-gray-400 italic px-2">Nessun turno configurato.</div>
                      )}
                  </div>

                  <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                      <button 
                        onClick={() => startEdit(project)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors font-bold"
                      >
                          <Pencil size={14} /> Modifica
                      </button>
                      <button 
                        onClick={() => onDelete(project.id)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                          <Trash2 size={14} /> Elimina
                      </button>
                  </div>
              </div>
          ))}
          
          {projects.length === 0 && (
              <div className="col-span-full text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                  Nessun cliente in anagrafica. Comincia cliccando su "Nuovo Cliente".
              </div>
          )}
      </div>
    </div>
  );
};

export default ManageClients;
