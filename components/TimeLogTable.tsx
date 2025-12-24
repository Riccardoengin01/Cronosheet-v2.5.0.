
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry } from '../types';
import { groupEntriesByDay, formatTime, formatDurationHuman, formatDuration, formatCurrency, calculateEarnings } from '../utils';
import { Trash2, MapPin, Clock, Pencil, Moon, Filter, X, CheckSquare, Square, Calendar, ChevronDown, Search, ListFilter, User, Archive } from 'lucide-react';
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

  // Filter out billed entries for the main active timesheet
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
      setSelectedProjectIds(prev => 
          prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      );
  };

  const toggleAllProjects = () => {
      if (selectedProjectIds.length === projects.length) {
          setSelectedProjectIds([]);
      } else {
          setSelectedProjectIds(projects.map(p => p.id));
      }
  };

  const toggleMonth = (month: string) => {
      setSelectedMonths(prev => 
          prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
      );
  };

  const toggleAllMonthsInYear = () => {
      const allSelected = availableMonthsInYear.every(m => selectedMonths.includes(m));
      if (allSelected) {
          setSelectedMonths(prev => prev.filter(m => !availableMonthsInYear.includes(m)));
      } else {
          const toAdd = availableMonthsInYear.filter(m => !selectedMonths.includes(m));
          setSelectedMonths(prev => [...prev, ...toAdd]);
      }
  };

  const filteredProjectsList = projects.filter(p => 
      p.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const filteredEntries = useMemo(() => {
      return pendingEntries.filter(entry => {
          const entryDate = new Date(entry.startTime);
          const entryMonth = entryDate.toISOString().slice(0, 7);
          const matchesProject = selectedProjectIds.length > 0 ? selectedProjectIds.includes(entry.projectId) : false;
          let matchesMonth = selectedMonths.length > 0 ? selectedMonths.includes(entryMonth) : entryDate.getFullYear().toString() === selectedYear;
          const matchesYear = entryDate.getFullYear().toString() === selectedYear;
          return matchesProject && (selectedMonths.length > 0 ? matchesMonth : matchesYear);
      });
  }, [pendingEntries, selectedProjectIds, selectedMonths, selectedYear]);

  const grouped = groupEntriesByDay(filteredEntries);
  const totalFilteredEarnings = filteredEntries.reduce((acc, e) => acc + calculateEarnings(e), 0);
  const totalDuration = filteredEntries.reduce((acc, e) => acc + (e.duration || 0), 0);

  const formatMonthLabel = (m: string) => {
      const [y, mo] = m.split('-');
      const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
      return date.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'long' });
  };

  if (pendingEntries.length === 0) {
      return (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
              <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Archive className="w-10 h-10 text-indigo-300" />
              </div>
              <h3 className="text-xl font-black text-gray-900">{t('log.no_entries_found')}</h3>
              <p className="text-gray-400 mt-2">Tutto il lavoro è stato fatturato o archiviato.</p>
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row gap-6 md:items-end border-b border-gray-100 pb-6">
                  <div className="w-full md:w-48">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <Calendar size={14} /> {t('log.year_ref')}
                      </label>
                      <div className="relative">
                          <select
                              value={selectedYear}
                              onChange={(e) => setSelectedYear(e.target.value)}
                              className="w-full appearance-none bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-lg py-3 pl-4 pr-10 rounded-2xl cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent"
                          >
                              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" size={20} />
                      </div>
                  </div>

                  <div className="w-full md:flex-grow relative" ref={clientDropdownRef}>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <MapPin size={14} /> {t('log.filter_client')}
                      </label>
                      <button 
                          onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                          className={`flex items-center justify-between w-full px-5 py-3 rounded-2xl text-base font-bold border transition-all ${
                              selectedProjectIds.length > 0 && selectedProjectIds.length < projects.length
                              ? 'bg-white border-indigo-300 text-indigo-700 shadow-sm ring-2 ring-indigo-50'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                          <div className="flex items-center gap-2 truncate">
                              <span>
                                  {selectedProjectIds.length === projects.length 
                                    ? t('log.all_clients') 
                                    : `${selectedProjectIds.length} ${t('log.selected_clients')}`}
                              </span>
                          </div>
                          <ChevronDown size={18} className={`transition-transform text-gray-400 ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isClientDropdownOpen && (
                          <div className="absolute top-full left-0 mt-3 w-full md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-4 animate-slide-up">
                              <div className="relative mb-4">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                  <input 
                                      type="text" 
                                      placeholder={t('log.search_placeholder')}
                                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50"
                                      value={clientSearchTerm}
                                      onChange={e => setClientSearchTerm(e.target.value)}
                                      autoFocus
                                  />
                              </div>
                              <div className="flex justify-between items-center mb-3 px-1">
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Clienti</span>
                                  <button onClick={toggleAllProjects} className="text-[10px] text-indigo-600 font-black hover:underline uppercase">
                                      {selectedProjectIds.length === projects.length ? t('billing.deselect_all') : t('billing.select_all')}
                                  </button>
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                                  {filteredProjectsList.map(p => {
                                      const isSelected = selectedProjectIds.includes(p.id);
                                      return (
                                          <button
                                              key={p.id}
                                              onClick={() => toggleProject(p.id)}
                                              className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                                                  isSelected ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-gray-50 text-gray-600'
                                              }`}
                                          >
                                              {isSelected ? <CheckSquare size={18} className="shrink-0 text-indigo-600"/> : <Square size={18} className="shrink-0 text-gray-300"/>}
                                              <span className="truncate font-bold">{p.name}</span>
                                          </button>
                                      )
                                  })}
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              <div>
                 <div className="flex justify-between items-center mb-3">
                     <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                         <ListFilter size={14} /> {t('log.months_available')}
                     </label>
                     <button 
                        onClick={toggleAllMonthsInYear} 
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase"
                     >
                         {availableMonthsInYear.every(m => selectedMonths.includes(m)) ? t('log.deselect_all') : t('log.select_all')}
                     </button>
                 </div>
                 
                 <div className="flex flex-wrap gap-2">
                      {availableMonthsInYear.length === 0 && (
                          <span className="text-sm text-gray-400 italic py-2">{t('log.no_data_year')} {selectedYear}</span>
                      )}
                      {availableMonthsInYear.map(m => {
                          const isSelected = selectedMonths.includes(m);
                          return (
                              <button
                                  key={m}
                                  onClick={() => toggleMonth(m)}
                                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs border transition-all capitalize shadow-sm font-bold ${
                                      isSelected 
                                      ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-50' 
                                      : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                                  }`}
                              >
                                  {isSelected ? <CheckSquare size={16} className="text-amber-600" /> : <Square size={16} className="text-gray-300" />}
                                  {formatMonthLabel(m)}
                              </button>
                          )
                      })}
                 </div>
              </div>
          </div>
      </div>
      
      {filteredEntries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl col-span-2 md:col-span-1">
                  <span className="text-indigo-200 text-[10px] font-black uppercase tracking-widest block mb-1">{t('log.total_earnings')}</span>
                  <span className="font-black text-3xl">{formatCurrency(totalFilteredEarnings)}</span>
              </div>
              <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm col-span-2 md:col-span-1">
                  <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-1">{t('log.total_hours')}</span>
                  <span className="font-black text-3xl text-slate-800">{formatDurationHuman(totalDuration)}</span>
              </div>
              <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm col-span-1">
                  <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-1">{t('log.entries')}</span>
                  <span className="font-black text-3xl text-slate-800">{filteredEntries.length}</span>
              </div>
              <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm col-span-1">
                  <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-1">{t('log.days_worked')}</span>
                  <span className="font-black text-3xl text-slate-800">{grouped.length}</span>
              </div>
          </div>
      )}

      {filteredEntries.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-3xl border border-gray-100">
              {t('log.no_entries_found')}
          </div>
      ) : (
        grouped.map(group => (
            <div key={group.date} className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-slate-50/50 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-black text-slate-800 capitalize tracking-tight text-lg">
                {new Date(group.date).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                        {formatDurationHuman(group.totalDuration)}
                    </div>
                </div>
            </div>
            
            <div className="divide-y divide-gray-50">
                {group.entries.map(entry => {
                const project = projects.find(p => p.id === entry.projectId);
                const earnings = calculateEarnings(entry);
                const isDaily = entry.billingType === 'daily';
                const hasNoTime = isDaily && !entry.endTime && entry.duration === 0;
                
                return (
                    <div key={entry.id} className="px-8 py-6 flex flex-col md:flex-row items-start md:items-center gap-6 hover:bg-slate-50/30 transition-colors group">
                        <div className="flex-grow min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span 
                                    className="text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm"
                                    style={{ color: project?.color, backgroundColor: `${project?.color}15`, border: `1px solid ${project?.color}30` }}
                                >
                                    <MapPin size={10} />
                                    {project?.name || 'Unknown'}
                                </span>
                                {isDaily && (
                                    <span className="text-[10px] px-3 py-1 rounded-full bg-slate-900 text-white font-black flex items-center gap-1.5 uppercase tracking-widest">
                                        {t('entry.daily_mode')}
                                    </span>
                                )}
                                {entry.isNightShift && !hasNoTime && (
                                    <span className="text-[10px] px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-black flex items-center gap-1.5 uppercase tracking-widest">
                                        <Moon size={10} /> {t('log.night')}
                                    </span>
                                )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg leading-tight truncate" title={entry.description}>
                                {entry.description || <span className="text-gray-300 font-medium italic">Senza note</span>}
                            </h4>
                            
                            {earnings > 0 && (
                                <div className="md:hidden mt-3 text-sm text-emerald-600 font-black">
                                    {formatCurrency(earnings)}
                                </div>
                            )}
                        </div>

                        <div className="hidden md:flex flex-col items-end w-40 shrink-0">
                            {earnings > 0 && (
                                <div className="text-emerald-600 font-black text-xl tracking-tight">
                                    {formatCurrency(earnings)}
                                </div>
                            )}
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {formatCurrency(entry.hourlyRate || 0)}{isDaily ? '/gg' : '/h'}
                            </div>
                        </div>

                        <div className="flex items-center justify-between w-full md:w-auto gap-8 border-t md:border-t-0 border-gray-50 pt-4 md:pt-0">
                            <div className="text-sm text-slate-600 font-bold bg-slate-100 px-4 py-2 rounded-2xl flex items-center gap-2.5">
                                <Clock size={16} className="text-slate-400" />
                                {hasNoTime ? "Giornata Intera" : <span className="font-mono">{formatTime(entry.startTime)} — {formatTime(entry.endTime)}</span>}
                            </div>

                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => onEdit(entry)}
                                    className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                                >
                                    <Pencil size={20} strokeWidth={2.5}/>
                                </button>
                                <button 
                                    onClick={() => onDelete(entry.id)}
                                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                >
                                    <Trash2 size={20} strokeWidth={2.5}/>
                                </button>
                            </div>
                        </div>
                    </div>
                );
                })}
            </div>
            </div>
        ))
      )}
    </div>
  );
};

export default TimeLogTable;
