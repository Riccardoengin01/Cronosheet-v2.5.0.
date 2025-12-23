import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry, UserProfile } from '../types';
import { formatCurrency, formatDuration, calculateEarnings, formatTime } from '../utils';
import { Printer, Calendar, CheckSquare, Square, MapPin, ChevronDown, Search, FileDown, Lock, Archive, CheckCircle2, History, AlertCircle, Check, Pencil, DollarSign, X, Settings2 } from 'lucide-react';
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
  
  // Selection State for Bulk Actions
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  // Inline & Bulk Edit State
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState<string>('');
  const [showBulkRateInput, setShowBulkRateInput] = useState(false);
  const [bulkRateValue, setBulkRateValue] = useState<string>('');

  // Tax Logic States
  const [applyBollo, setApplyBollo] = useState(false);
  const [applySurcharge, setApplySurcharge] = useState(false);
  const [surchargeLabel, setSurchargeLabel] = useState('IMS (4%)');

  // UI States
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
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
               setSelectedMonths(availableMonthsInYear.slice(0, 1));
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

  useEffect(() => {
      setSelectedEntryIds(new Set());
      setShowBulkRateInput(false);
  }, [viewMode, selectedProjectIds, selectedMonths, selectedYear]);

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

  const baseTotalAmount = filteredEntries.reduce((acc, curr) => acc + calculateEarnings(curr), 0);
  const totalHours = filteredEntries.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 3600;

  // --- CALCOLO TASSE NUOVA LOGICA ---
  const bolloAmount = applyBollo ? 2.00 : 0;
  const subtotalWithBollo = baseTotalAmount + bolloAmount;
  
  // Applichiamo il 4% sul totale (Base + Bollo) se la somma supera € 100
  const canApplySurcharge = subtotalWithBollo > 100;
  const surchargeAmount = (applySurcharge && canApplySurcharge) ? (subtotalWithBollo * 0.04) : 0;
  const grandTotalAmount = subtotalWithBollo + surchargeAmount;

  // --- HANDLERS ---
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

  const periodString = useMemo(() => {
      if (selectedMonths.length === 0) return '-';
      return selectedMonths.map(m => {
          const [y, mo] = m.split('-');
          return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'long', year: 'numeric' });
      }).join(', ');
  }, [selectedMonths]);

  const showProjectColumn = selectedProjectIds.length > 1;
  const isPro = userProfile?.subscription_status !== 'trial' || userProfile?.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* ACTIONS */}
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

      {/* CONTROLS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 no-print grid grid-cols-1 lg:grid-cols-3 gap-6 relative overflow-hidden">
        <div className="lg:col-span-2 space-y-5">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Calendar className="text-indigo-600" /> Configura Documento</h2>
            
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

            {/* OPZIONI FISCALI */}
            <div className="pt-4 border-t border-gray-100 bg-gray-50/50 p-4 rounded-xl space-y-4">
                 <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase"><Settings2 size={14} /> Opzioni Fiscali</div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <input type="checkbox" className="w-4 h-4 rounded text-indigo-600" checked={applyBollo} onChange={e => setApplyBollo(e.target.checked)} />
                        <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Aggiungi Bollo</span><span className="text-[10px] text-gray-400">+ € 2,00</span></div>
                     </label>
                     <label className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer transition-colors ${!canApplySurcharge ? 'opacity-40 grayscale' : 'hover:bg-gray-100'}`}>
                        <input type="checkbox" disabled={!canApplySurcharge} className="w-4 h-4 rounded text-indigo-600" checked={applySurcharge && canApplySurcharge} onChange={e => setApplySurcharge(e.target.checked)} />
                        <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Rivalsa/Contanti (4%)</span><span className="text-[10px] text-gray-400">Solo se > € 100</span></div>
                     </label>
                 </div>
                 {applySurcharge && canApplySurcharge && (
                     <div className="flex flex-col gap-1">
                         <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Etichetta 4%</label>
                         <input type="text" className="w-full px-3 py-1.5 text-xs border border-indigo-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-medium" value={surchargeLabel} onChange={e => setSurchargeLabel(e.target.value)} />
                     </div>
                 )}
            </div>
        </div>

        <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-center">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 w-full mb-4">
                <p className="text-sm text-gray-500 mb-1">Totale Documento</p>
                <p className="text-3xl font-bold text-indigo-600">{formatCurrency(grandTotalAmount)}</p>
                <p className="text-sm text-gray-600 mt-1">{filteredEntries.length} servizi</p>
            </div>
            <div className="flex flex-col gap-3">
                <button onClick={() => window.print()} disabled={filteredEntries.length === 0} className="w-full flex justify-center items-center gap-2 bg-slate-800 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg hover:bg-slate-900 shadow-lg active:scale-95">
                    <Printer size={20} /> {t('billing.print')}
                </button>
            </div>
        </div>
      </div>

      {/* DOCUMENT */}
      <div className="bg-white p-6 md:p-10 rounded-none md:rounded-xl shadow-lg print:shadow-none print:w-full print:p-0 min-h-[600px] overflow-hidden">
          <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
              <div><h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wide">{viewMode === 'pending' ? 'Riepilogo Servizi' : 'Archivio Fatture'}</h1><p className="text-slate-500 mt-2">Documento informativo prestazioni</p></div>
              <div className="text-right max-w-sm"><h3 className="text-xl font-bold text-indigo-600 truncate">{selectedProjectIds.length === 1 ? projects.find(p => p.id === selectedProjectIds[0])?.name : 'Riepilogo Multi-Cliente'}</h3><p className="text-slate-600 font-medium capitalize mt-1 text-sm">Periodo: {periodString}</p></div>
          </div>

          <div className="border border-gray-100 rounded-lg overflow-hidden flex flex-col">
            <div className="overflow-x-auto overflow-y-scroll max-h-[650px] print:overflow-visible print:max-h-none custom-scrollbar">
                <table className="w-full text-sm text-left print:table min-w-[850px] border-collapse">
                    <thead className="bg-gray-50 text-gray-700 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-20 print:static print:bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 w-10 print:hidden"></th>
                            <th className="px-4 py-3">Data</th>
                            {showProjectColumn && <th className="px-4 py-3">Cliente</th>}
                            <th className="px-4 py-3">Orario</th>
                            <th className="px-4 py-3">Descrizione</th>
                            <th className="px-4 py-3 text-right">Ore</th>
                            <th className="px-4 py-3 text-right">Tariffa</th>
                            <th className="px-4 py-3 text-right">Extra</th>
                            <th className="px-4 py-3 text-right">Totale</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredEntries.map(entry => {
                            const earnings = calculateEarnings(entry);
                            const expensesTotal = entry.expenses?.reduce((s, x) => s + x.amount, 0) || 0;
                            const project = projects.find(p => p.id === entry.projectId);
                            const isEditingRate = editingRateId === entry.id;

                            return (
                                <tr key={entry.id} className={`hover:bg-indigo-50/30 transition-colors print:break-inside-avoid ${selectedEntryIds.has(entry.id) ? 'bg-indigo-50/50' : ''}`} onClick={() => setSelectedEntryIds(prev => { const n = new Set(prev); if(n.has(entry.id)) n.delete(entry.id); else n.add(entry.id); return n; })}>
                                    <td className="px-4 py-3 print:hidden" onClick={e => e.stopPropagation()}><button onClick={() => setSelectedEntryIds(prev => { const n = new Set(prev); if(n.has(entry.id)) n.delete(entry.id); else n.add(entry.id); return n; })} className={`flex items-center ${selectedEntryIds.has(entry.id) ? 'text-indigo-600' : 'text-gray-300'}`}>{selectedEntryIds.has(entry.id) ? <CheckSquare size={16} /> : <Square size={16} />}</button></td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{new Date(entry.startTime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</td>
                                    {showProjectColumn && <td className="px-4 py-3 text-indigo-600 font-semibold text-xs uppercase">{project?.name || '-'}</td>}
                                    <td className="px-4 py-3 font-mono text-slate-600 text-xs">{formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : '...'}</td>
                                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate text-xs">{entry.description || '-'}</td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">{formatDuration(entry.duration).slice(0, 5)}</td>
                                    <td className="px-4 py-3 text-right bg-indigo-50/20 group/cell" onClick={(e) => { e.stopPropagation(); if (viewMode === 'pending') { setEditingRateId(entry.id); setTempRate(entry.hourlyRate?.toString() || '0'); } }}>
                                        {isEditingRate ? (
                                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                <input type="number" step="0.01" autoFocus className="w-16 px-1 py-0.5 border border-indigo-400 rounded text-right font-mono text-xs shadow-sm" value={tempRate} onChange={e => setTempRate(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateRate(entry)} />
                                                <button onClick={() => handleUpdateRate(entry)} className="p-1 bg-indigo-600 text-white rounded"><Check size={10} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1 cursor-pointer">
                                                <span className="text-slate-600 font-mono text-xs">{formatCurrency(entry.hourlyRate || 0)}</span>
                                                <Pencil size={10} className="text-indigo-400 opacity-50 group-hover/cell:opacity-100 transition-opacity no-print" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600 text-xs">{expensesTotal > 0 ? formatCurrency(expensesTotal) : '-'}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800 text-xs">{formatCurrency(earnings)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          </div>

          <div className="mt-8 border-t-2 border-slate-200 pt-6 flex justify-end">
              <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
                  <div className="flex justify-between text-slate-500 text-xs uppercase font-bold"><span>Imponibile Servizi:</span><span className="font-mono">{formatCurrency(baseTotalAmount)}</span></div>
                  {applyBollo && <div className="flex justify-between text-slate-600 text-sm italic"><span>Imposta di Bollo:</span><span className="font-mono">{formatCurrency(2.00)}</span></div>}
                  {applySurcharge && canApplySurcharge && <div className="flex justify-between text-slate-600 text-sm italic"><span>{surchargeLabel}:</span><span className="font-mono">{formatCurrency(surchargeAmount)}</span></div>}
                  <div className="flex justify-between items-center text-2xl font-bold text-slate-900 pt-4 border-t border-slate-200 mt-2"><span>TOTALE:</span><span className="text-indigo-700">{formatCurrency(grandTotalAmount)}</span></div>
                  <div className="pt-4 text-[10px] text-slate-400 font-bold uppercase flex justify-between"><span>Totale Ore: {totalHours.toFixed(2)} h</span><span>Voci: {filteredEntries.length}</span></div>
              </div>
          </div>

          <div className="mt-12 text-center text-[10px] text-gray-400 border-t pt-4 border-dashed border-gray-200">
              Generato con Cronosheet • © {new Date().getFullYear()} Ing. Riccardo Righini - All Rights Reserved.
          </div>
      </div>
    </div>
  );
};

export default Billing;