
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry } from '../types';
import { groupEntriesByDay, formatTime, formatDurationHuman, formatCurrency, calculateEarnings } from '../utils';
import { Trash2, MapPin, Clock, Pencil, Moon, CheckSquare, Square, Calendar, ChevronDown, Search, ListFilter, Archive, Wallet, PlusCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface TimeLogTableProps {
  entries: TimeEntry[];
  projects: Project[];
  onDelete: (id: string) => void;
  onEdit: (entry: TimeEntry) => void;
}

const TimeLogTable: React.FC<TimeLogTableProps> = ({ entries, projects, onDelete, onEdit }) => {
  const { t, language } = useLanguage();
  
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
          <div className="text-center py-10 bg-white rounded-[2rem] border border-dashed border-gray-200">
              <Archive className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Nessun servizio pendente per fatturazione.</h3>
          </div>
      )
  }

  return (
    <div className="space-y-3 animate-fade-in max-w-5xl mx-auto">
      {/* Mini Top Filter */}
      <div className="flex flex-wrap items-center gap-3 px-1 no-print">
          <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-xl shadow-sm">
              {availableYears.map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${selectedYear === y ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>
                      {y}
                  </button>
              ))}
          </div>

          <div className="relative" ref={clientDropdownRef}>
              <button onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)} className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border border-slate-200 text-slate-700 bg-white shadow-sm hover:border-indigo-300">
                  <MapPin size={12} className="text-indigo-500" /> 
                  <span>{selectedProjectIds.length === projects.length ? 'Tutti i Clienti' : `${selectedProjectIds.length} Selezionati`}</span>
                  <ChevronDown size={12} />
              </button>
              {isClientDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-3 animate-slide-up">
                      <div className="max-h-40 overflow-y-auto custom-scrollbar">
                          {projects.map(p => (
                              <button key={p.id} onClick={() => toggleProject(p.id)} className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${selectedProjectIds.includes(p.id) ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-slate-50'}`}>
                                  {selectedProjectIds.includes(p.id) ? <CheckSquare size={14} className="text-indigo-600"/> : <Square size={14} className="text-slate-300"/>} 
                                  <span className="truncate">{p.name}</span>
                              </button>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          <div className="flex-grow flex justify-end">
              <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100">
                  Totale Periodo: {formatCurrency(totalFilteredEarnings)}
              </div>
          </div>
      </div>

      {/* Ultra Compact Table Body */}
      <div className="space-y-2">
        {grouped.map(group => (
            <div key={group.date} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50/50 px-4 py-1.5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-black text-slate-600 uppercase tracking-tighter text-[10px]">
                        {new Date(group.date).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </h3>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatDurationHuman(group.totalDuration)}</span>
                </div>
                
                <div className="divide-y divide-slate-50">
                    {group.entries.map(entry => {
                        const project = projects.find(p => p.id === entry.projectId);
                        const earnings = calculateEarnings(entry);
                        
                        return (
                            <div key={entry.id} className="px-4 py-2 flex items-center gap-4 hover:bg-indigo-50/20 transition-colors group">
                                <div className="flex-grow min-w-0 flex items-center gap-3">
                                    <div className="w-1 h-3 rounded-full shrink-0" style={{ backgroundColor: project?.color }}></div>
                                    <div className="truncate">
                                        <p className="font-bold text-slate-800 text-[11px] leading-tight truncate">{entry.description || 'Intervento Tecnico'}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter truncate">{project?.name}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right min-w-[60px]">
                                        <div className="text-[8px] font-black text-indigo-400 uppercase leading-none">Netto</div>
                                        <div className="text-[11px] font-black text-slate-900 font-mono leading-none mt-1">{formatCurrency(earnings)}</div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEdit(entry)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><Pencil size={12} /></button>
                                        <button onClick={() => onDelete(entry.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
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
