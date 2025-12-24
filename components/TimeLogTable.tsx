
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry } from '../types';
import { groupEntriesByDay, formatDurationHuman, formatCurrency, calculateEarnings } from '../utils';
import { Trash2, MapPin, Pencil, CheckSquare, Square, ChevronDown, Archive } from 'lucide-react';
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
          <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-slate-200">
              <Archive className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nessun servizio in attesa di fatturazione.</h3>
          </div>
      )
  }

  return (
    <div className="space-y-2 animate-fade-in max-w-5xl mx-auto">
      {/* Mini Top Header Statistics */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 no-print mb-1">
          <div className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-lg shadow-sm">
                  {availableYears.map(y => (
                      <button key={y} onClick={() => setSelectedYear(y)} className={`px-3 py-1 text-[8px] font-black uppercase rounded-md transition-all ${selectedYear === y ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>
                          {y}
                      </button>
                  ))}
              </div>

              <div className="relative" ref={clientDropdownRef}>
                  <button onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[8px] font-black uppercase border border-slate-200 text-slate-600 bg-white shadow-sm hover:border-indigo-300">
                      <MapPin size={10} className="text-indigo-500" /> 
                      <span>{selectedProjectIds.length === projects.length ? 'Tutti i Clienti' : `${selectedProjectIds.length} Selez.`}</span>
                      <ChevronDown size={10} />
                  </button>
                  {isClientDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 p-2 animate-slide-up">
                          <div className="max-h-32 overflow-y-auto custom-scrollbar">
                              {projects.map(p => (
                                  <button key={p.id} onClick={() => toggleProject(p.id)} className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[9px] font-bold transition-colors ${selectedProjectIds.includes(p.id) ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-slate-50'}`}>
                                      {selectedProjectIds.includes(p.id) ? <CheckSquare size={12} className="text-indigo-600"/> : <Square size={12} className="text-slate-300"/>} 
                                      <span className="truncate">{p.name}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>

          <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-lg shadow-indigo-100 flex items-center gap-2">
              <span className="opacity-70">Totale:</span> {formatCurrency(totalFilteredEarnings)}
          </div>
      </div>

      {/* Denso Grid */}
      <div className="space-y-1.5">
        {grouped.map(group => (
            <div key={group.date} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50/50 px-3 py-1 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-black text-slate-500 uppercase tracking-tighter text-[9px]">
                        {new Date(group.date).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </h3>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{formatDurationHuman(group.totalDuration)}</span>
                </div>
                
                <div className="divide-y divide-slate-50">
                    {group.entries.map(entry => {
                        const project = projects.find(p => p.id === entry.projectId);
                        const earnings = calculateEarnings(entry);
                        
                        return (
                            <div key={entry.id} className="px-3 py-1.5 flex items-center gap-3 hover:bg-slate-50 transition-colors group">
                                <div className="flex-grow min-w-0 flex items-center gap-2.5">
                                    <div className="w-0.5 h-4 rounded-full shrink-0" style={{ backgroundColor: project?.color }}></div>
                                    <div className="truncate">
                                        <p className="font-bold text-slate-700 text-[10px] leading-tight truncate">{entry.description || 'Intervento Professionale'}</p>
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter truncate">{project?.name}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right min-w-[50px]">
                                        <div className="text-[10px] font-black text-slate-900 font-mono leading-none">{formatCurrency(earnings)}</div>
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEdit(entry)} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors"><Pencil size={11} /></button>
                                        <button onClick={() => onDelete(entry.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
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
