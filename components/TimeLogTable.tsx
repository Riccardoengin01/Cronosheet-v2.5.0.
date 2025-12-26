
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry } from '../types';
import { groupEntriesByDay, formatDurationHuman, formatCurrency, calculateEarnings } from '../utils';
import { Trash2, MapPin, Pencil, CheckSquare, Square, ChevronDown, Archive, Clock, Target, Wallet } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface TimeLogTableProps {
  entries: TimeEntry[];
  projects: Project[];
  onDelete: (id: string) => void;
  onEdit: (entry: TimeEntry) => void;
}

const TimeLogTable: React.FC<TimeLogTableProps> = ({ entries, projects, onDelete, onEdit }) => {
  const { language } = useLanguage();
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const pendingEntries = useMemo(() => entries.filter(e => !e.is_billed), [entries]);

  const availableYears = useMemo(() => {
      const years = new Set(pendingEntries.map(e => new Date(e.startTime).getFullYear().toString()));
      const sorted = Array.from(years).sort().reverse();
      const current = new Date().getFullYear().toString();
      if (!sorted.includes(current)) sorted.unshift(current);
      return sorted;
  }, [pendingEntries]);

  useEffect(() => {
      if (projects.length > 0 && selectedProjectIds.length === 0) {
          setSelectedProjectIds(projects.map(p => p.id));
      }
  }, [projects]);

  useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
          if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
              setIsClientDropdownOpen(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleProject = (id: string) => {
      setSelectedProjectIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const filteredEntries = useMemo(() => {
      return pendingEntries.filter(entry => {
          const entryDate = new Date(entry.startTime);
          const matchesProject = selectedProjectIds.includes(entry.projectId);
          const matchesYear = entryDate.getFullYear().toString() === selectedYear;
          return matchesProject && matchesYear;
      });
  }, [pendingEntries, selectedProjectIds, selectedYear]);

  const grouped = groupEntriesByDay(filteredEntries);
  const totalFilteredEarnings = filteredEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);

  if (pendingEntries.length === 0) {
      return (
          <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
              <Archive className="w-10 h-10 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Nessun servizio in attesa.</h3>
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto relative">
      <div className="flex flex-wrap items-center justify-between gap-4 px-2 no-print relative z-[60]">
          <div className="flex items-center gap-3">
              <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                  {availableYears.map(y => (
                      <button key={y} onClick={() => setSelectedYear(y)} className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${selectedYear === y ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                          {y}
                      </button>
                  ))}
              </div>

              <div className="relative" ref={clientDropdownRef}>
                  <button onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase border border-slate-200 text-slate-600 bg-white hover:border-indigo-200 transition-all shadow-sm cursor-pointer">
                      <MapPin size={14} className="text-indigo-400" /> 
                      <span className="pointer-events-none">{selectedProjectIds.length === projects.length ? 'Tutti i Clienti' : `${selectedProjectIds.length} Clienti`}</span>
                      <ChevronDown size={14} className={`transition-transform pointer-events-none ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isClientDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] p-3 animate-slide-up max-h-80 overflow-y-auto">
                          <div className="flex justify-between mb-2 pb-2 border-b border-slate-50">
                             <button onClick={() => setSelectedProjectIds(projects.map(p => p.id))} className="text-[9px] font-black text-indigo-600 uppercase hover:underline cursor-pointer">Tutti</button>
                             <button onClick={() => setSelectedProjectIds([])} className="text-[9px] font-black text-slate-400 uppercase hover:underline cursor-pointer">Nessuno</button>
                          </div>
                          <div className="space-y-1">
                              {projects.map(p => (
                                  <button key={p.id} onClick={() => toggleProject(p.id)} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${selectedProjectIds.includes(p.id) ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-slate-50'}`}>
                                      {selectedProjectIds.includes(p.id) ? <CheckSquare size={16} className="text-indigo-600"/> : <Square size={16} className="text-slate-300"/>} 
                                      <span className="truncate text-left flex-grow">{p.name}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>

          <div className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase shadow-lg shadow-indigo-100 flex flex-col items-end">
              <div className="flex items-center gap-3">
                <span className="opacity-70 text-xs uppercase tracking-widest">Imponibile Totale:</span> 
                {formatCurrency(totalFilteredEarnings)}
              </div>
              <span className="text-[8px] opacity-60 mt-0.5 tracking-[0.1em] font-bold uppercase">Prestazioni + Rimborsi Spese</span>
          </div>
      </div>

      <div className="space-y-4 relative z-10">
        {grouped.map(group => (
            <div key={group.date} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100 flex justify-between items-center text-slate-400">
                    <h3 className="font-black uppercase tracking-widest text-[10px]">
                        {new Date(group.date).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span className="text-xs font-black uppercase tracking-widest">{formatDurationHuman(group.totalDuration)}</span>
                    </div>
                </div>
                
                <div className="divide-y divide-slate-50">
                    {group.entries.map(entry => {
                        const project = projects.find(p => p.id === entry.projectId);
                        const totalEarnings = calculateEarnings(entry);
                        const activityType = project?.activityTypes?.find(a => a.id === entry.activityTypeId);
                        
                        const totalExpenses = (entry.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
                        const professionalFee = totalEarnings - totalExpenses;
                        
                        return (
                            <div key={entry.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors group">
                                <div className="flex-grow min-w-0 flex items-center gap-4">
                                    <div className="w-1 h-12 rounded-full shrink-0" style={{ backgroundColor: project?.color }}></div>
                                    <div className="truncate">
                                        <div className="flex items-center gap-3">
                                            <p className="font-black text-slate-800 text-sm leading-tight truncate">{entry.description || 'Intervento Tecnico'}</p>
                                            {activityType && (
                                                <span className="flex items-center gap-1 text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                                                    <Target size={10} /> {activityType.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">{project?.name}</p>
                                            {totalExpenses > 0 && (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-md">
                                                    <Wallet size={10} className="text-amber-600" />
                                                    <span className="text-[8px] font-black text-amber-600 uppercase">Rimborsi: {formatCurrency(totalExpenses)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 shrink-0">
                                    <div className="text-right min-w-[100px]">
                                        <div className="text-sm font-black text-slate-900 font-mono leading-none">{formatCurrency(totalEarnings)}</div>
                                        {totalExpenses > 0 && (
                                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                                {formatCurrency(professionalFee)} + Spese
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEdit(entry)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all cursor-pointer"><Pencil size={16} /></button>
                                        <button onClick={() => onDelete(entry.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all cursor-pointer"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default TimeLogTable;
