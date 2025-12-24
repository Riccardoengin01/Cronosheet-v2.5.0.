
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry } from '../types';
import { groupEntriesByDay, formatTime, formatDurationHuman, formatCurrency, calculateEarnings } from '../utils';
import { Trash2, MapPin, Clock, Pencil, Moon, CheckSquare, Square, Calendar, ChevronDown, Search, ListFilter, Archive, Wallet, PlusCircle } from 'lucide-react';
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
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const pendingEntries = useMemo(() => entries.filter(e => !e.is_billed), [entries]);

  const availableYears = useMemo(() => {
      const years = new Set(pendingEntries.map(e => new Date(e.startTime).getFullYear().toString()));
      const sorted = Array.from(years).sort().reverse();
      const current = new Date().getFullYear().toString();
      if (!sorted.includes(current)) sorted.unshift(current);
      return sorted;
  }, [pendingEntries]);

  const availableMonthsInYear = useMemo<string[]>(() => {
      const months = new Set<string>(
          pendingEntries
            .filter(e => new Date(e.startTime).getFullYear().toString() === selectedYear)
            .map(e => new Date(e.startTime).toISOString().slice(0, 7)) 
      );
      return Array.from(months).sort().reverse();
  }, [pendingEntries, selectedYear]);

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
          const entryMonth = entryDate.toISOString().slice(0, 7);
          const matchesProject = selectedProjectIds.length > 0 ? selectedProjectIds.includes(entry.projectId) : false;
          let matchesMonth = selectedMonths.length > 0 ? selectedMonths.includes(entryMonth) : entryDate.getFullYear().toString() === selectedYear;
          return matchesProject && (selectedMonths.length > 0 ? matchesMonth : entryDate.getFullYear().toString() === selectedYear);
      });
  }, [pendingEntries, selectedProjectIds, selectedMonths, selectedYear]);

  const grouped = groupEntriesByDay(filteredEntries);
  const totalFilteredEarnings = filteredEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
  const totalDuration = filteredEntries.reduce((acc, e) => acc + (e.duration || 0), 0);

  if (pendingEntries.length === 0) {
      return (
          <div className="text-center py-10 bg-white rounded-[2rem] border border-dashed border-gray-200">
              <Archive className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{t('log.no_entries_found')}</h3>
          </div>
      )
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-5xl mx-auto">
      {/* Filtri Compatti */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 no-print flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              {availableYears.map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${selectedYear === y ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>
                      {y}
                  </button>
              ))}
          </div>

          <div className="relative shrink-0" ref={clientDropdownRef}>
              <button onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)} className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border border-gray-100 text-slate-700 bg-white">
                  <MapPin size={14} className="text-indigo-500" /> 
                  <span>{selectedProjectIds.length === projects.length ? 'Tutti i Clienti' : `${selectedProjectIds.length} Selezionati`}</span>
                  <ChevronDown size={14} />
              </button>
              {isClientDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-3 animate-slide-up">
                      <div className="max-h-40 overflow-y-auto custom-scrollbar">
                          {projects.map(p => (
                              <button key={p.id} onClick={() => toggleProject(p.id)} className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${selectedProjectIds.includes(p.id) ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-gray-50'}`}>
                                  {selectedProjectIds.includes(p.id) ? <CheckSquare size={14} className="text-indigo-600"/> : <Square size={14} className="text-gray-300"/>} 
                                  <span className="truncate">{p.name}</span>
                              </button>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          <div className="flex flex-grow justify-end gap-2 text-xs font-black text-indigo-600 font-mono">
                <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-sm">
                    {formatCurrency(totalFilteredEarnings)}
                </div>
                <div className="bg-white border border-slate-100 text-slate-500 px-3 py-1.5 rounded-xl">
                    {formatDurationHuman(totalDuration)}
                </div>
          </div>
      </div>

      {/* Lista Log Denso */}
      <div className="space-y-3">
        {grouped.map(group => (
            <div key={group.date} className="bg-white border border-gray-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                <div className="bg-slate-50/50 px-6 py-2 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-tighter text-[11px]">
                        {new Date(group.date).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { weekday: 'short', day: 'numeric', month: 'long' })}
                    </h3>
                    <span className="text-[10px] font-black text-slate-400">{formatDurationHuman(group.totalDuration)}</span>
                </div>
                
                <div className="divide-y divide-gray-50">
                    {group.entries.map(entry => {
                        const project = projects.find(p => p.id === entry.projectId);
                        const earnings = calculateEarnings(entry);
                        const totalExpenses = entry.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
                        const baseEarnings = earnings - totalExpenses;
                        
                        return (
                            <div key={entry.id} className="px-6 py-3 flex flex-col md:flex-row items-center gap-4 hover:bg-slate-50/30 transition-colors group">
                                <div className="flex-grow min-w-0 flex items-center gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: project?.color }}></div>
                                    <div className="truncate">
                                        <p className="font-black text-slate-800 text-xs leading-none mb-1 truncate">{entry.description || 'Intervento Tecnico'}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{project?.name}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 shrink-0">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <div className="text-[8px] font-black text-slate-400 uppercase">Tariffa</div>
                                                <div className="text-[10px] font-bold text-slate-600 font-mono">{formatCurrency(baseEarnings)}</div>
                                            </div>
                                            {totalExpenses > 0 && (
                                                <div className="text-right pl-2 border-l border-slate-100">
                                                    <div className="text-[8px] font-black text-amber-500 uppercase">Extra</div>
                                                    <div className="text-[10px] font-bold text-amber-600 font-mono">+{formatCurrency(totalExpenses)}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right min-w-[70px]">
                                        <div className="text-[8px] font-black text-indigo-500 uppercase">Totale</div>
                                        <div className="text-xs font-black text-slate-900 font-mono">{formatCurrency(earnings)}</div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                        <button onClick={() => onEdit(entry)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><Pencil size={14} /></button>
                                        <button onClick={() => onDelete(entry.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
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
