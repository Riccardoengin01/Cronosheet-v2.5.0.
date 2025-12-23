import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry, UserProfile } from '../types';
import { formatCurrency, formatDuration, calculateEarnings, formatTime } from '../utils';
import { Printer, Calendar, CheckSquare, Square, MapPin, ChevronDown, Archive, CheckCircle2, History, Check, Pencil, X, Settings2, ListFilter, Download, ToggleRight, ToggleLeft } from 'lucide-react';
import * as DB from '../services/db';
import { useLanguage } from '../lib/i18n';

interface BillingProps {
  entries: TimeEntry[];
  projects: Project[];
  userProfile?: UserProfile | null;
  onEntriesChange?: () => void;
}

const Billing: React.FC<BillingProps> = ({ entries, projects, userProfile, onEntriesChange }) => {
  // --- STATES ---
  const [viewMode, setViewMode] = useState<'pending' | 'billed'>('pending');
  const { t, language } = useLanguage();
  
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  // Fiscal Toggles (Manual override requested)
  const [applyBollo, setApplyBollo] = useState(false);
  const [applyInarcassa, setApplyInarcassa] = useState(true);

  // Selection State for Bulk Actions
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  // Inline & Bulk Edit State
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState<string>('');
  const [showBulkRateInput, setShowBulkRateInput] = useState(false);
  const [bulkRateValue, setBulkRateValue] = useState<string>('');

  // UI States
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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

  // --- FILTERING ---
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
        const isBilled = !!e.is_billed;
        if (viewMode === 'pending' && isBilled) return false;
        if (viewMode === 'billed' && !isBilled) return false;
        if (selectedProjectIds.length === 0 || selectedMonths.length === 0) return false;
        const entryMonth = new Date(e.startTime).toISOString().slice(0, 7);
        return selectedProjectIds.includes(e.projectId) && selectedMonths.includes(entryMonth);
    }).sort((a, b) => a.startTime - b.startTime);
  }, [entries, selectedProjectIds, selectedMonths, viewMode]);

  // --- FISCAL LOGIC ---
  const baseTotalAmount = useMemo(() => filteredEntries.reduce((acc, curr) => acc + calculateEarnings(curr), 0), [filteredEntries]);
  const totalHours = useMemo(() => filteredEntries.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 3600, [filteredEntries]);

  // Auto-suggestion for Bollo (but user can override)
  useEffect(() => {
      if (baseTotalAmount > 100) setApplyBollo(true);
      else setApplyBollo(false);
  }, [baseTotalAmount]);

  const bolloAmount = applyBollo ? 2.00 : 0;
  const cassaAmount = applyInarcassa ? (baseTotalAmount + bolloAmount) * 0.04 : 0;
  const grandTotalAmount = baseTotalAmount + bolloAmount + cassaAmount;

  // --- EFFECTS ---
  useEffect(() => {
      if (projects.length > 0 && selectedProjectIds.length === 0) {
          setSelectedProjectIds(projects.map(p => p.id));
      }
      if (availableMonthsInYear.length > 0 && selectedMonths.length === 0) {
           const currentMonth = new Date().toISOString().slice(0, 7);
           if (availableMonthsInYear.includes(currentMonth)) {
               setSelectedMonths([currentMonth]);
           } else {
               setSelectedMonths([availableMonthsInYear[0]]);
           }
      }
  }, [projects, availableMonthsInYear]);

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

  const handleMarkAsBilled = async () => {
      if (selectedEntryIds.size === 0) return;
      if (!confirm(`Segnare come fatturati ${selectedEntryIds.size} servizi?`)) return;
      setIsProcessing(true);
      try {
          await DB.markEntriesAsBilled(Array.from(selectedEntryIds));
          if (onEntriesChange) onEntriesChange();
          setSelectedEntryIds(new Set());
      } catch (e) { alert("Errore"); } finally { setIsProcessing(false); }
  };

  const handleUpdateRate = async (entry: TimeEntry) => {
    const newRate = parseFloat(tempRate);
    if (isNaN(newRate)) return;
    setIsProcessing(true);
    try {
        await DB.saveEntry({ ...entry, hourlyRate: newRate }, userProfile?.id || '');
        if (onEntriesChange) onEntriesChange();
        setEditingRateId(null);
    } catch (e) { alert("Errore"); } finally { setIsProcessing(false); }
  };

  const handleBulkUpdateRate = async () => {
      const newRate = parseFloat(bulkRateValue);
      if (isNaN(newRate) || selectedEntryIds.size === 0) return;
      if (!confirm(`Aggiornare la tariffa a ${formatCurrency(newRate)} per ${selectedEntryIds.size} servizi?`)) return;
      setIsProcessing(true);
      try {
          await DB.updateEntriesRate(Array.from(selectedEntryIds), newRate);
          if (onEntriesChange) onEntriesChange();
          setSelectedEntryIds(new Set());
          setShowBulkRateInput(false);
          setBulkRateValue('');
      } catch (e) { alert("Errore"); } finally { setIsProcessing(false); }
  };

  const handleExportCSV = () => {
      if (filteredEntries.length === 0) return;
      const headers = ["Data", "Cliente", "Orario", "Descrizione", "Durata (h)", "Tariffa (€/h)", "Extra (€)", "Totale (€)"];
      const rows = filteredEntries.map(e => {
          const project = projects.find(p => p.id === e.projectId);
          const durationH = (e.duration || 0) / 3600;
          const expenses = e.expenses?.reduce((sum, ex) => sum + ex.amount, 0) || 0;
          const earnings = calculateEarnings(e);
          return [
              new Date(e.startTime).toLocaleDateString('it-IT'),
              `"${project?.name || ''}"`,
              `${formatTime(e.startTime)} - ${e.endTime ? formatTime(e.endTime) : ''}`,
              `"${e.description || ''}"`,
              durationH.toFixed(2).replace('.', ','),
              (e.hourlyRate || 0).toFixed(2).replace('.', ','),
              expenses.toFixed(2).replace('.', ','),
              earnings.toFixed(2).replace('.', ',')
          ];
      });
      const csvContent = [headers, ...rows].map(r => r.join(";")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `export_cronosheet_${selectedYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const periodString = useMemo(() => {
      if (selectedMonths.length === 0) return '-';
      return [...selectedMonths].sort().map(m => {
          const [y, mo] = m.split('-');
          return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'long', year: 'numeric' });
      }).join(', ');
  }, [selectedMonths, language]);

  const showProjectColumn = selectedProjectIds.length > 1;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      
      {/* ACTIONS - NO PRINT */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
           <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
               <button onClick={() => setViewMode('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'pending' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                   <CheckCircle2 size={16} /> {t('billing.pending')}
               </button>
               <button onClick={() => setViewMode('billed')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'billed' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                   <History size={16} /> {t('billing.billed')}
               </button>
           </div>
           
           {selectedEntryIds.size > 0 && (
               <div className="animate-slide-up flex flex-wrap items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl shadow-sm">
                   <span className="text-xs font-bold text-indigo-800">{selectedEntryIds.size} {t('billing.selected')}</span>
                   {viewMode === 'pending' && (
                       <>
                           {!showBulkRateInput ? (
                               <button onClick={() => setShowBulkRateInput(true)} className="text-xs font-bold bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 flex items-center gap-1 shadow-sm">
                                   <Pencil size={14}/> {t('billing.bulk_edit_rate')}
                               </button>
                           ) : (
                               <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-indigo-300">
                                   <input type="number" step="0.01" autoFocus className="w-16 text-xs font-mono outline-none border-0 px-2" placeholder="0.00" value={bulkRateValue} onChange={e => setBulkRateValue(e.target.value)} />
                                   <button onClick={handleBulkUpdateRate} className="bg-indigo-600 text-white p-1 rounded"><Check size={14}/></button>
                                   <button onClick={() => setShowBulkRateInput(false)} className="text-gray-400 p-1"><X size={14}/></button>
                               </div>
                           )}
                           <button onClick={handleMarkAsBilled} disabled={isProcessing} className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-1 shadow-sm">
                                {isProcessing ? '...' : <><Archive size={14}/> {t('billing.mark_billed')}</>}
                           </button>
                       </>
                   )}
               </div>
           )}
      </div>

      {/* CONTROLS - NO PRINT */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 no-print grid grid-cols-1 lg:grid-cols-3 gap-6 relative overflow-hidden">
        <div className="lg:col-span-2 space-y-5">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Settings2 className="text-indigo-600" /> Configura Documento</h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
                 <div className="flex items-center bg-gray-100 p-1 rounded-lg shrink-0">
                    {availableYears.map(year => (
                        <button key={year} onClick={() => setSelectedYear(year)} className={`px-3 py-1.5 text-sm font-bold rounded-md transition-all ${selectedYear === year ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {year}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-auto" ref={clientDropdownRef}>
                    <button onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)} className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 w-full hover:bg-gray-50">
                        <MapPin size={16} /> <span>{selectedProjectIds.length === projects.length ? 'Tutti i Clienti' : `${selectedProjectIds.length} Selezionati`}</span>
                        <ChevronDown size={14} />
                    </button>
                    {isClientDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 animate-slide-down">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {projects.map(p => (
                                    <button key={p.id} onClick={() => setSelectedProjectIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])} className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm ${selectedProjectIds.includes(p.id) ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-gray-50'}`}>
                                        {selectedProjectIds.includes(p.id) ? <CheckSquare size={14}/> : <Square size={14}/>} {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MONTH SELECTOR */}
            <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><ListFilter size={14}/> Mesi Disponibili</span>
                     <button onClick={toggleAllMonthsInYear} className="text-xs text-indigo-600 font-bold hover:underline">
                         {availableMonthsInYear.every(m => selectedMonths.includes(m)) ? 'Deseleziona' : 'Seleziona Tutti'}
                     </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {availableMonthsInYear.length === 0 && <span className="text-sm text-gray-400 italic">Nessun dato.</span>}
                    {availableMonthsInYear.map(m => {
                        const isSelected = selectedMonths.includes(m);
                        const [y, mo] = m.split('-');
                        const label = new Date(parseInt(y), parseInt(mo)-1).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'short' });
                        return (
                            <button key={m} onClick={() => toggleMonth(m)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-all capitalize ${isSelected ? 'bg-amber-50 border-amber-200 text-amber-800 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                {isSelected ? <CheckSquare size={14} /> : <Square size={14} />} {label}
                            </button>
                        );
                    })}
                </div>
            </div>
            
            {/* FISCAL SETTINGS - MANUAL SELECTION */}
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Settings2 size={20} className="text-indigo-600" />
                        <span className="text-sm font-bold text-indigo-900">Configurazione Fiscale Manuale</span>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                        onClick={() => setApplyBollo(!applyBollo)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${applyBollo ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-gray-200 opacity-60'}`}
                    >
                        <span className="text-xs font-medium text-gray-700">Applica Bollo (€ 2,00)</span>
                        {applyBollo ? <ToggleRight className="text-indigo-600" size={24} /> : <ToggleLeft className="text-gray-400" size={24} />}
                    </button>
                    <button 
                        onClick={() => setApplyInarcassa(!applyInarcassa)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${applyInarcassa ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-gray-200 opacity-60'}`}
                    >
                        <span className="text-xs font-medium text-gray-700">Applica Inarcassa (4%)</span>
                        {applyInarcassa ? <ToggleRight className="text-indigo-600" size={24} /> : <ToggleLeft className="text-gray-400" size={24} />}
                    </button>
                </div>
            </div>
        </div>

        <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-center">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 w-full mb-4">
                <p className="text-sm text-gray-500 mb-1">Totale Documento</p>
                <p className="text-3xl font-bold text-indigo-600">{formatCurrency(grandTotalAmount)}</p>
                <p className="text-sm text-gray-600 mt-1">{filteredEntries.length} servizi inclusi</p>
            </div>
            <div className="flex flex-col gap-3">
                <button onClick={() => window.print()} disabled={filteredEntries.length === 0} className="w-full flex justify-center items-center gap-2 bg-slate-800 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg hover:bg-slate-900 shadow-lg active:scale-95">
                    <Printer size={20} /> {t('billing.print')}
                </button>
                <button onClick={handleExportCSV} disabled={filteredEntries.length === 0} className="w-full flex justify-center items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 shadow-sm active:scale-95 transition-all">
                    <Download size={20} /> Export Excel / CSV
                </button>
            </div>
        </div>
      </div>

      {/* DOCUMENT - PRINTABLE SECTION */}
      <div className="bg-white p-6 md:p-10 rounded-none md:rounded-xl shadow-lg print:shadow-none print:w-full print:p-0 min-h-screen overflow-visible">
          {/* Document Header matching screenshot */}
          <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
              <div>
                  <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">RIEPILOGO SERVIZI</h1>
                  <p className="text-slate-500 mt-1 text-sm">Documento informativo prestazioni professionali</p>
              </div>
              <div className="text-right">
                  <h3 className="text-xl font-bold text-indigo-600">
                    {selectedProjectIds.length === 1 ? projects.find(p => p.id === selectedProjectIds[0])?.name : 'Riepilogo Multi-Cliente'}
                  </h3>
                  <p className="text-slate-600 font-medium capitalize mt-1 text-sm">Periodo: {periodString}</p>
              </div>
          </div>

          {/* Table matching screenshot */}
          <div className="border-t border-gray-100 rounded-lg overflow-visible flex flex-col">
            <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-[11px] md:text-xs text-left print:table min-w-[850px] border-collapse">
                    <thead className="bg-gray-50/80 text-gray-400 uppercase text-[10px] font-bold tracking-widest border-b border-gray-100 sticky top-0 z-20 print:static">
                        <tr>
                            <th className="px-4 py-4 w-10 print:hidden"></th>
                            <th className="px-4 py-4">DATA</th>
                            <th className="px-4 py-4">CLIENTE</th>
                            <th className="px-4 py-4">ORARIO</th>
                            <th className="px-4 py-4">DESCRIZIONE</th>
                            <th className="px-4 py-4 text-center">ORE</th>
                            <th className="px-4 py-4 text-center">TARIFFA</th>
                            <th className="px-4 py-4 text-center">EXTRA</th>
                            <th className="px-4 py-4 text-right">TOTALE</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                        {filteredEntries.map(entry => {
                            const earnings = calculateEarnings(entry);
                            const expensesTotal = entry.expenses?.reduce((s, x) => s + x.amount, 0) || 0;
                            const project = projects.find(p => p.id === entry.projectId);
                            const isEditingRate = editingRateId === entry.id;

                            return (
                                <tr key={entry.id} className={`hover:bg-indigo-50/20 transition-colors print:break-inside-avoid ${selectedEntryIds.has(entry.id) ? 'bg-indigo-50/40' : ''}`}>
                                    <td className="px-4 py-4 print:hidden">
                                        <button 
                                            onClick={() => setSelectedEntryIds(prev => { const n = new Set(prev); if(n.has(entry.id)) n.delete(entry.id); else n.add(entry.id); return n; })} 
                                            className={`flex items-center transition-colors ${selectedEntryIds.has(entry.id) ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-400'}`}
                                        >
                                            {selectedEntryIds.has(entry.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-4 font-bold text-slate-800">
                                        {new Date(entry.startTime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-4 text-indigo-600 font-bold uppercase truncate max-w-[150px]">
                                        {project?.name || '-'}
                                    </td>
                                    <td className="px-4 py-4 font-medium text-slate-500 font-mono text-[10px]">
                                        {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : '...'}
                                    </td>
                                    <td className="px-4 py-4 text-slate-400 italic">
                                        {entry.description || '-'}
                                    </td>
                                    <td className="px-4 py-4 text-center font-bold text-slate-800 font-mono">
                                        {formatDuration(entry.duration).slice(0, 5)}
                                    </td>
                                    <td className="px-4 py-4 text-center bg-gray-50/30 group/cell" onClick={() => { if (viewMode === 'pending') { setEditingRateId(entry.id); setTempRate(entry.hourlyRate?.toString() || '0'); } }}>
                                        {isEditingRate ? (
                                            <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                                                <input type="number" step="0.01" autoFocus className="w-16 px-1 py-0.5 border border-indigo-400 rounded text-right font-mono text-xs shadow-sm outline-none" value={tempRate} onChange={e => setTempRate(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateRate(entry)} />
                                                <button onClick={() => handleUpdateRate(entry)} className="p-1 bg-indigo-600 text-white rounded"><Check size={12} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1 cursor-pointer">
                                                <span className="text-slate-500 font-mono">{formatCurrency(entry.hourlyRate || 0)}</span>
                                                <Pencil size={10} className="text-indigo-400 opacity-0 group-hover/cell:opacity-100 transition-opacity no-print" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-center text-slate-400 font-mono">
                                        {expensesTotal > 0 ? formatCurrency(expensesTotal) : '-'}
                                    </td>
                                    <td className="px-4 py-4 text-right font-black text-slate-900">
                                        {formatCurrency(earnings)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          </div>

          {/* Footer matching screenshot */}
          <div className="mt-12 border-t border-gray-100 pt-8 flex justify-end print:break-inside-avoid">
              <div className="w-full md:w-1/2 lg:w-2/5 space-y-3">
                  <div className="flex justify-between text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                      <span>IMPONIBILE SERVIZI:</span>
                      <span className="font-mono text-slate-800">{formatCurrency(baseTotalAmount)}</span>
                  </div>
                  
                  {applyBollo && (
                      <div className="flex justify-between text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                          <span className="italic normal-case font-medium">Imposta di Bollo:</span>
                          <span className="font-mono text-slate-800">{formatCurrency(bolloAmount)}</span>
                      </div>
                  )}

                  {applyInarcassa && (
                      <div className="flex justify-between text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                          <span className="italic normal-case font-medium">Contributo Integrativo Inarcassa (4%):</span>
                          <span className="font-mono text-slate-800">{formatCurrency(cassaAmount)}</span>
                      </div>
                  )}

                  <div className="flex justify-between items-center text-3xl font-black text-slate-900 pt-6 border-t border-gray-100 mt-4">
                      <span>TOTALE:</span>
                      <span className="text-indigo-600">{formatCurrency(grandTotalAmount)}</span>
                  </div>
                  
                  <div className="pt-4 text-[9px] text-slate-300 font-bold uppercase tracking-widest flex justify-between">
                      <span>TOTALE ORE: {totalHours.toFixed(2)} H</span>
                      <span>VOCI: {filteredEntries.length}</span>
                  </div>
              </div>
          </div>

          <div className="mt-16 text-center text-[10px] text-gray-300 border-t border-dashed border-gray-200 pt-6 print:mt-24">
              Documento generato da Cronosheet • © {new Date().getFullYear()} Ing. Riccardo Righini - Soluzioni Software per Ingegneri
          </div>
      </div>
    </div>
  );
};

export default Billing;