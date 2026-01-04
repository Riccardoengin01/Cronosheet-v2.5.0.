
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry } from '../types';
import { groupEntriesByDay, formatDurationHuman, formatCurrency, calculateEarnings, toLocalISOString } from '../utils';
import { Trash2, MapPin, Pencil, CheckSquare, Square, ChevronDown, Archive, Clock, Target, Wallet, Calendar, Filter } from 'lucide-react';
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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  
  const [activeDropdown, setActiveDropdown] = useState<'year' | 'month' | 'client' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pendingEntries = useMemo(() => entries.filter(e => !e.is_billed), [entries]);

  const availableYears = useMemo(() => {
      const years = new Set(pendingEntries.map(e => new Date(e.startTime).getFullYear().toString()));
      const sorted = Array.from(years).sort().reverse();
      const current = new Date().getFullYear().toString();
      if (!sorted.includes(current)) sorted.unshift(current);
      return sorted;
  }, [pendingEntries]);

  const months = [
    { value: 'all', label: 'Tutti i mesi' },
    { value: '0', label: 'Gennaio' }, { value: '1', label: 'Febbraio' }, { value: '2', label: 'Marzo' },
    { value: '3', label: 'Aprile' }, { value: '4', label: 'Maggio' }, { value: '5', label: 'Giugno' },
    { value: '6', label: 'Luglio' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Settembre' },
    { value: '9', label: 'Ottobre' }, { value: '10', label: 'Novembre' }, { value: '11', label: 'Dicembre' }
  ];

  useEffect(() => {
      if (projects.length > 0 && selectedProjectIds.length === 0) {
          setSelectedProjectIds(projects.map(p => p.id));
      }
  }, [projects]);

  useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setActiveDropdown(null);
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
          const matchesYear = selectedYear === 'all' || entryDate.getFullYear().toString() === selectedYear;
          const matchesMonth = selectedMonth === 'all' || entryDate.getMonth().toString() === selectedMonth;
          return matchesProject && matchesYear && matchesMonth;
      });
  }, [pendingEntries, selectedProjectIds, selectedYear, selectedMonth]);

  const grouped = groupEntriesByDay(filteredEntries);
  const totalFilteredEarnings = filteredEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
  const totalFilteredSeconds = filteredEntries.reduce((acc, e) => acc + (e.duration || 0), 0);

  if (pendingEntries.length === 0) {
      return (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 max-w-5xl mx-auto shadow-sm">
              <Archive className="w-16 h-16 text-slate-100 mx-auto mb-6" />
              <h3 className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">Nessun servizio nel registro.</h3>
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto relative">
      {/* Nuova Barra Filtri Avanzata */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm no-print relative z-[60]" ref={dropdownRef}>
          <div className="flex flex-wrap items-center gap-3">
              
              {/* Dropdown Anno */}
              <div className="relative">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'year' ? null : 'year')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border border-slate-100 text-slate-600 bg-slate-50 hover:bg-white transition-all cursor-pointer min-w-[110px]"
                  >
                      <Calendar size={14} className="text-indigo-500" />
                      <span>{selectedYear === 'all' ? 'Tutti gli Anni' : selectedYear}</span>
                      <ChevronDown size={12} className={`ml-auto transition-transform ${activeDropdown === 'year' ? 'rotate-180' : ''}`} />
                  </button>
                  {activeDropdown === 'year' && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] p-2 animate-slide-up">
                          <button onClick={() => { setSelectedYear('all'); setActiveDropdown(null); }} className={`w-full text-left px-4 py-2 rounded-lg text-xs font-bold ${selectedYear === 'all' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}>Tutti gli Anni</button>
                          {availableYears.map(y => (
                              <button key={y} onClick={() => { setSelectedYear(y); setActiveDropdown(null); }} className={`w-full text-left px-4 py-2 rounded-lg text-xs font-bold ${selectedYear === y ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}>{y}</button>
                          ))}
                      </div>
                  )}
              </div>

              {/* Dropdown Mese */}
              <div className="relative">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'month' ? null : 'month')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border border-slate-100 text-slate-600 bg-slate-50 hover:bg-white transition-all cursor-pointer min-w-[130px]"
                  >
                      <Clock size={14} className="text-indigo-500" />
                      <span>{months.find(m => m.value === selectedMonth)?.label}</span>
                      <ChevronDown size={12} className={`ml-auto transition-transform ${activeDropdown === 'month' ? 'rotate-180' : ''}`} />
                  </button>
                  {activeDropdown === 'month' && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] p-2 animate-slide-up max-h-64 overflow-y-auto custom-scrollbar">
                          {months.map(m => (
                              <button key={m.value} onClick={() => { setSelectedMonth(m.value); setActiveDropdown(null); }} className={`w-full text-left px-4 py-2 rounded-lg text-xs font-bold ${selectedMonth === m.value ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}>{m.label}</button>
                          ))}
                      </div>
                  )}
              </div>

              {/* Dropdown Cliente */}
              <div className="relative">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'client' ? null : 'client')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border border-slate-100 text-slate-600 bg-slate-50 hover:bg-white transition-all cursor-pointer min-w-[160px]"
                  >
                      <MapPin size={14} className="text-indigo-500" /> 
                      <span className="truncate max-w-[100px]">{selectedProjectIds.length === projects.length ? 'Tutti i Clienti' : `${selectedProjectIds.length} Clienti`}</span>
                      <ChevronDown size={12} className={`ml-auto transition-transform ${activeDropdown === 'client' ? 'rotate-180' : ''}`} />
                  </button>
                  {activeDropdown === 'client' && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] p-3 animate-slide-up max-h-80 overflow-y-auto custom-scrollbar">
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

          <div className="flex items-center gap-6 pr-2">
              <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Ore Totali</p>
                  <p className="text-sm font-black text-slate-800 font-mono mt-0.5">{formatDurationHuman(totalFilteredSeconds)}</p>
              </div>
              <div className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-lg flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="opacity-40 text-[8px] font-black uppercase tracking-widest">Tot. Imponibile</span> 
                    <span className="text-base font-black font-mono">{formatCurrency(totalFilteredEarnings)}</span>
                  </div>
              </div>
          </div>
      </div>

      {/* Registro entries raggruppato */}
      <div className="space-y-4 relative z-10">
        {grouped.map((group, index) => {
            const dateObj = new Date(group.date + 'T12:00:00');
            const showMonthHeader = index === 0 || new Date(grouped[index - 1].date + 'T12:00:00').getMonth() !== dateObj.getMonth();
            
            return (
                <div key={group.date} className="space-y-4">
                    {showMonthHeader && (
                        <div className="pt-4 pb-2 px-6 flex items-center gap-4">
                            <div className="h-[2px] flex-grow bg-slate-100 rounded-full"></div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic">
                                {dateObj.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <div className="h-[2px] flex-grow bg-slate-100 rounded-full"></div>
                        </div>
                    )}
                    
                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex justify-between items-center text-slate-400">
                            <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-800 flex items-center gap-2">
                                <Calendar size={14} className="text-indigo-400" />
                                {dateObj.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <div className="flex items-center gap-2">
                                <Clock size={12} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{formatDurationHuman(group.totalDuration)}</span>
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
                                    <div key={entry.id} className="px-6 py-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors group">
                                        <div className="flex-grow min-w-0 flex items-center gap-5">
                                            <div className="w-1.5 h-12 rounded-full shrink-0" style={{ backgroundColor: project?.color || '#cbd5e1' }}></div>
                                            <div className="truncate">
                                                <div className="flex items-center gap-3">
                                                    <p className="font-black text-slate-800 text-sm leading-tight truncate uppercase tracking-tight">{entry.description || 'Intervento Tecnico'}</p>
                                                    {activityType && (
                                                        <span className="flex items-center gap-1 text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                                                            <Target size={10} /> {activityType.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{project?.name}</p>
                                                    {totalExpenses > 0 && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-md">
                                                            <Wallet size={10} className="text-amber-600" />
                                                            <span className="text-[8px] font-black text-amber-600 uppercase">Rimborsi: {formatCurrency(totalExpenses)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8 shrink-0">
                                            <div className="text-right min-w-[110px]">
                                                <div className="text-base font-black text-slate-900 font-mono leading-none tracking-tighter">{formatCurrency(totalEarnings)}</div>
                                                {totalExpenses > 0 && (
                                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                                        {formatCurrency(professionalFee)} ONORARIO
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onEdit(entry)} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all cursor-pointer"><Pencil size={18} /></button>
                                                <button onClick={() => onDelete(entry.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition-all cursor-pointer"><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default TimeLogTable;
