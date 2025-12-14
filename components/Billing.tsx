import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry } from '../types';
import { formatCurrency, formatDuration, calculateEarnings, formatTime } from '../utils';
import { Printer, Calendar, CheckSquare, Square, MapPin, ChevronDown, Search } from 'lucide-react';

interface BillingProps {
  entries: TimeEntry[];
  projects: Project[];
}

const Billing: React.FC<BillingProps> = ({ entries, projects }) => {
  // --- STATES ---
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  // UI States
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // --- DATA COMPUTED ---
  const availableYears = useMemo(() => {
      const years = new Set(entries.map(e => new Date(e.startTime).getFullYear().toString()));
      const sorted = Array.from(years).sort().reverse();
      const current = new Date().getFullYear().toString();
      if (!sorted.includes(current)) sorted.unshift(current);
      return sorted;
  }, [entries]);

  const availableMonthsInYear = useMemo(() => {
      const months = new Set(
          entries
            .filter(e => new Date(e.startTime).getFullYear().toString() === selectedYear)
            .map(e => new Date(e.startTime).toISOString().slice(0, 7)) // YYYY-MM
      );
      return Array.from(months).sort().reverse();
  }, [entries, selectedYear]);

  // --- EFFECTS ---
  useEffect(() => {
      if (projects.length > 0 && selectedProjectIds.length === 0) {
          setSelectedProjectIds(projects.map(p => p.id));
      }
      // Auto-select current month or first available
      if (availableMonthsInYear.length > 0 && selectedMonths.length === 0) {
           const currentMonth = new Date().toISOString().slice(0, 7);
           if (availableMonthsInYear.includes(currentMonth)) {
               setSelectedMonths([currentMonth]);
           } else {
               setSelectedMonths(availableMonthsInYear.slice(0, 1));
           }
      }
  }, [projects, availableMonthsInYear]);

  // Click outside listener
  useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
          if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
              setIsClientDropdownOpen(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- HANDLERS ---
  const toggleProject = (id: string) => {
      if (selectedProjectIds.includes(id)) {
          setSelectedProjectIds(selectedProjectIds.filter(pid => pid !== id));
      } else {
          setSelectedProjectIds([...selectedProjectIds, id]);
      }
  };

  const toggleAllProjects = () => {
      if (selectedProjectIds.length === projects.length) {
          setSelectedProjectIds([]);
      } else {
          setSelectedProjectIds(projects.map(p => p.id));
      }
  };

  const toggleMonth = (month: string) => {
      if (selectedMonths.includes(month)) {
          setSelectedMonths(selectedMonths.filter(m => m !== month));
      } else {
          setSelectedMonths([...selectedMonths, month]);
      }
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

  // --- FILTERING ---
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
        if (selectedProjectIds.length === 0 || selectedMonths.length === 0) return false;
        
        const entryMonth = new Date(e.startTime).toISOString().slice(0, 7);
        // Strict filtering: Project ID matches AND Month matches selected list
        return selectedProjectIds.includes(e.projectId) && selectedMonths.includes(entryMonth);
    }).sort((a, b) => a.startTime - b.startTime);
  }, [entries, selectedProjectIds, selectedMonths]);

  const totalAmount = filteredEntries.reduce((acc, curr) => acc + calculateEarnings(curr), 0);
  const totalHours = filteredEntries.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 3600;

  const handlePrint = () => {
      window.print();
  };

  const formatMonthLabel = (m: string) => {
      const [y, mo] = m.split('-');
      const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
      return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  };
  
  const formatShortMonth = (m: string) => {
      const [y, mo] = m.split('-');
      const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
      return date.toLocaleDateString('it-IT', { month: 'short' });
  };

  const periodString = useMemo(() => {
      if (selectedMonths.length === 0) return '-';
      if (selectedMonths.length === 1) return formatMonthLabel(selectedMonths[0]);
      
      const sorted = [...selectedMonths].sort();
      // Mostra solo i nomi dei mesi se stesso anno
      const firstYear = sorted[0].split('-')[0];
      const allSameYear = sorted.every(m => m.startsWith(firstYear));
      
      if (allSameYear) {
          return sorted.map(m => formatShortMonth(m).replace('.', '')).join(', ') + ' ' + firstYear;
      }
      return sorted.map(m => formatMonthLabel(m)).join(', ');
  }, [selectedMonths]);

  const showProjectColumn = selectedProjectIds.length > 1;
  const filteredProjectsList = projects.filter(p => p.name.toLowerCase().includes(clientSearchTerm.toLowerCase()));

  if (projects.length === 0) {
      return (
          <div className="text-center py-20 text-gray-400">
              Nessun cliente disponibile. Aggiungi clienti nella sezione "Gestione Clienti".
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* Controls - Hidden in print */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:hidden grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-5">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="text-indigo-600" />
                Configura Periodo e Clienti
            </h2>
            
            {/* 1. Year & Client Selector Row */}
            <div className="flex flex-col sm:flex-row gap-3">
                 {/* Year Tabs */}
                 <div className="flex items-center bg-gray-100 p-1 rounded-lg shrink-0">
                    {availableYears.map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-3 py-1.5 text-sm font-bold rounded-md transition-all ${
                                selectedYear === year 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {year}
                        </button>
                    ))}
                </div>

                {/* Client Dropdown */}
                <div className="relative w-full sm:w-auto" ref={clientDropdownRef}>
                    <button 
                        onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                        className={`flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sm font-medium border transition-all w-full ${
                            selectedProjectIds.length > 0 && selectedProjectIds.length < projects.length
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            <span>{selectedProjectIds.length === projects.length ? 'Tutti i Clienti' : `${selectedProjectIds.length} Selezionati`}</span>
                        </div>
                        <ChevronDown size={14} className={`transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isClientDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 animate-slide-down">
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Cerca cliente..." 
                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                                    value={clientSearchTerm}
                                    onChange={e => setClientSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-xs font-bold text-gray-400 uppercase">Lista</span>
                                <button onClick={toggleAllProjects} className="text-xs text-indigo-600 font-bold hover:underline">
                                    {selectedProjectIds.length === projects.length ? 'Deseleziona' : 'Tutti'}
                                </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                {filteredProjectsList.map(p => {
                                    const isSelected = selectedProjectIds.includes(p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => toggleProject(p.id)}
                                            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors text-left ${
                                                isSelected ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-gray-50 text-gray-600'
                                            }`}
                                        >
                                            {isSelected ? <CheckSquare size={14} className="shrink-0"/> : <Square size={14} className="shrink-0 text-gray-300"/>}
                                            <span className="truncate">{p.name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* 2. Months Row (Scrollable) */}
            <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mesi del {selectedYear}</span>
                     <button onClick={toggleAllMonthsInYear} className="text-xs text-indigo-600 font-bold hover:underline">
                         Seleziona Tutti
                     </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {availableMonthsInYear.length === 0 && (
                        <span className="text-sm text-gray-400 italic">Nessun dato.</span>
                    )}
                    {availableMonthsInYear.map(m => {
                        const isSelected = selectedMonths.includes(m);
                        return (
                            <button
                                key={m}
                                onClick={() => toggleMonth(m)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all capitalize ${
                                    isSelected 
                                    ? 'bg-amber-50 border-amber-200 text-amber-800 font-medium' 
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                {formatShortMonth(m)}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>

        <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-end">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 w-full mb-4">
                <p className="text-sm text-gray-500 mb-1">Totale Stimato</p>
                <p className="text-3xl font-bold text-gray-800">{formatCurrency(totalAmount)}</p>
                <p className="text-sm text-gray-600 mt-1">{filteredEntries.length} servizi selezionati</p>
            </div>
            <button 
                onClick={handlePrint}
                disabled={filteredEntries.length === 0}
                className="w-full flex justify-center items-center gap-2 bg-slate-800 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg hover:bg-slate-900 transition-colors shadow-lg active:scale-95"
            >
                <Printer size={20} /> Stampa / PDF
            </button>
            <p className="text-xs text-center text-gray-400 mt-3">
                Solo i mesi selezionati verranno inclusi.
            </p>
        </div>
      </div>

      {/* The Bill / Summary Document */}
      <div className="bg-white p-10 rounded-none md:rounded-xl shadow-lg print:shadow-none print:border-none print:w-full print:p-0 min-h-[800px]">
          
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
              <div>
                  <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wide">Riepilogo Servizi</h1>
                  <p className="text-slate-500 mt-2">Documento informativo prestazioni</p>
              </div>
              <div className="text-right max-w-sm">
                  <h3 className="text-xl font-bold text-indigo-600 truncate">
                      {selectedProjectIds.length === 1 
                        ? projects.find(p => p.id === selectedProjectIds[0])?.name 
                        : 'Riepilogo Multi-Cliente'}
                  </h3>
                  <p className="text-slate-600 font-medium capitalize mt-1">
                      Periodo: {periodString}
                  </p>
              </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead>
                      <tr className="bg-gray-100 text-gray-700 uppercase text-xs font-bold tracking-wider">
                          <th className="px-4 py-3 rounded-l-lg">Data</th>
                          {showProjectColumn && <th className="px-4 py-3">Cliente</th>}
                          <th className="px-4 py-3">Orario</th>
                          <th className="px-4 py-3">Descrizione</th>
                          <th className="px-4 py-3 text-right">Ore</th>
                          <th className="px-4 py-3 text-right">Tariffa</th>
                          <th className="px-4 py-3 text-right">Extra</th>
                          <th className="px-4 py-3 text-right rounded-r-lg">Totale</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredEntries.map(entry => {
                          const earnings = calculateEarnings(entry);
                          const expensesTotal = entry.expenses ? entry.expenses.reduce((s, x) => s + x.amount, 0) : 0;
                          const project = projects.find(p => p.id === entry.projectId);

                          return (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                                      {new Date(entry.startTime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                  </td>
                                  
                                  {showProjectColumn && (
                                     <td className="px-4 py-3 text-indigo-600 font-semibold text-xs uppercase tracking-wide">
                                         {project?.name || '-'}
                                     </td>
                                  )}

                                  <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                                      {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : '...'}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                                      {entry.description || '-'}
                                      {entry.isNightShift && <span className="ml-2 text-xs bg-slate-200 px-1 rounded">Notte</span>}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono">
                                      {formatDuration(entry.duration).slice(0, 5)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600">
                                      {formatCurrency(entry.hourlyRate || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600">
                                      {expensesTotal > 0 ? formatCurrency(expensesTotal) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                                      {formatCurrency(earnings)}
                                  </td>
                              </tr>
                          );
                      })}
                      {filteredEntries.length === 0 && (
                          <tr>
                              <td colSpan={showProjectColumn ? 8 : 7} className="px-4 py-8 text-center text-gray-400 italic">
                                  Nessuna voce trovata per i criteri selezionati.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>

          {/* Footer Totals */}
          <div className="mt-8 border-t-2 border-slate-200 pt-6 flex justify-end break-inside-avoid">
              <div className="w-full md:w-1/2 lg:w-1/3 space-y-3">
                  <div className="flex justify-between text-slate-600">
                      <span>Totale Ore Lavorate:</span>
                      <span className="font-mono font-medium">{totalHours.toFixed(2)} h</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                      <span>Totale Voci:</span>
                      <span className="font-mono font-medium">{filteredEntries.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xl font-bold text-slate-900 pt-4 border-t border-slate-200 mt-2">
                      <span>TOTALE DA FATTURARE</span>
                      <span className="text-indigo-700">{formatCurrency(totalAmount)}</span>
                  </div>
              </div>
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
              Generato con Cronosheet • © {new Date().getFullYear()} Engineer Riccardo Righini
          </div>
      </div>
    </div>
  );
};

export default Billing;