
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry, UserProfile, AppView } from '../types';
import { formatCurrency, formatDuration, calculateEarnings, formatTime } from '../utils';
// Added Clock to the lucide-react imports to fix the "Cannot find name 'Clock'" error.
import { Printer, Calendar, Clock, CheckSquare, Square, MapPin, ChevronDown, Archive, Check, Pencil, X, Settings2, ListFilter, Download, ToggleRight, ToggleLeft, Loader2, Receipt, Wallet, Banknote } from 'lucide-react';
import * as DB from '../services/db';
import { useLanguage } from '../lib/i18n';

interface BillingProps {
  entries: TimeEntry[];
  projects: Project[];
  userProfile?: UserProfile | null;
  onEntriesChange?: () => void;
  view?: AppView; 
}

const Billing: React.FC<BillingProps> = ({ entries, projects, userProfile, onEntriesChange, view }) => {
  const isArchive = view === AppView.ARCHIVE;
  const { t, language } = useLanguage();
  
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  const [applyBollo, setApplyBollo] = useState(false);
  const [applyInarcassa, setApplyInarcassa] = useState(true);

  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set<string>());

  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState<string>('');
  const [showBulkRateInput, setShowBulkRateInput] = useState(false);
  const [bulkRateValue, setBulkRateValue] = useState<string>('');

  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
      const years = new Set(entries.map(e => new Date(e.startTime).getFullYear().toString()));
      const sorted = Array.from(years).sort().reverse();
      const current = new Date().getFullYear().toString();
      if (!sorted.includes(current)) sorted.unshift(current);
      return sorted;
  }, [entries]);

  const availableMonthsInYear = useMemo<string[]>(() => {
      const monthsSet = new Set<string>();
      entries.forEach(e => {
          const d = new Date(e.startTime);
          if (d.getFullYear().toString() === selectedYear) {
              monthsSet.add(d.toISOString().slice(0, 7));
          }
      });
      return [...monthsSet].sort().reverse();
  }, [entries, selectedYear]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
        const entryIsBilled = !!e.is_billed;
        if (!isArchive && entryIsBilled) return false;
        if (isArchive && !entryIsBilled) return false;
        
        const entryDate = new Date(e.startTime);
        const entryMonth = entryDate.toISOString().slice(0, 7);
        const entryYear = entryDate.getFullYear().toString();

        const matchesProject = selectedProjectIds.length === 0 || selectedProjectIds.includes(e.projectId);
        const matchesMonth = selectedMonths.length === 0 || selectedMonths.includes(entryMonth);
        const matchesYear = entryYear === selectedYear;

        return matchesProject && matchesMonth && matchesYear;
    }).sort((a, b) => a.startTime - b.startTime);
  }, [entries, selectedProjectIds, selectedMonths, isArchive, selectedYear]);

  const baseTotalAmount = useMemo(() => filteredEntries.reduce((acc, curr) => acc + calculateEarnings(curr), 0), [filteredEntries]);

  useEffect(() => {
      if (baseTotalAmount > 100) setApplyBollo(true);
      else setApplyBollo(false);
  }, [baseTotalAmount]);

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

  const bolloAmount = applyBollo ? 2.00 : 0;
  const cassaAmount = applyInarcassa ? (baseTotalAmount + bolloAmount) * 0.04 : 0;
  const grandTotalAmount = baseTotalAmount + bolloAmount + cassaAmount;

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

  const handleSelectAll = () => {
      if (selectedEntryIds.size === filteredEntries.length && filteredEntries.length > 0) {
          setSelectedEntryIds(new Set<string>());
      } else {
          setSelectedEntryIds(new Set<string>(filteredEntries.map(e => e.id)));
      }
  };

  const handleMarkAsBilled = async () => {
      if (selectedEntryIds.size === 0) return;
      if (!confirm(`Segnare come fatturati ${selectedEntryIds.size} servizi? Verranno spostati nell'Archivio.`)) return;
      
      setIsProcessing(true);
      const idsToMark = [...selectedEntryIds];
      
      try {
          await DB.markEntriesAsBilled(idsToMark);
          setSelectedEntryIds(new Set<string>()); 
          if (onEntriesChange) {
              await onEntriesChange();
          }
      } catch (e: any) { 
          alert("Errore durante lo spostamento."); 
      } finally { 
          setIsProcessing(false); 
      }
  };

  const handleMarkAsPaid = async (status: boolean = true) => {
      if (selectedEntryIds.size === 0) return;
      const action = status ? "incassati" : "stornati come non pagati";
      if (!confirm(`Segnare come ${action} ${selectedEntryIds.size} servizi selezionati?`)) return;
      
      setIsProcessing(true);
      try {
          await DB.markEntriesAsPaid([...selectedEntryIds], status);
          setSelectedEntryIds(new Set<string>());
          if (onEntriesChange) await onEntriesChange();
      } catch (e) {
          alert("Errore aggiornamento stato incasso");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleUpdateRate = async (entry: TimeEntry) => {
    const newRate = parseFloat(tempRate);
    if (isNaN(newRate)) return;
    setIsProcessing(true);
    try {
        await DB.saveEntry({ ...entry, hourlyRate: newRate }, userProfile?.id || '');
        if (onEntriesChange) await onEntriesChange();
        setEditingRateId(null);
    } catch (e) { alert("Errore aggiornamento tariffa"); } finally { setIsProcessing(false); }
  };

  const handleBulkUpdateRate = async () => {
      const newRate = parseFloat(bulkRateValue);
      if (isNaN(newRate) || selectedEntryIds.size === 0) return;
      if (!confirm(`Aggiornare la tariffa a ${formatCurrency(newRate)} per ${selectedEntryIds.size} servizi?`)) return;
      setIsProcessing(true);
      try {
          await DB.updateEntriesRate([...selectedEntryIds], newRate);
          setSelectedEntryIds(new Set<string>());
          setShowBulkRateInput(false);
          setBulkRateValue('');
          if (onEntriesChange) await onEntriesChange();
      } catch (e) { alert("Errore aggiornamento bulk"); } finally { setIsProcessing(false); }
  };

  const handleExportCSV = () => {
      if (filteredEntries.length === 0) return;
      const headers = ["Data", "Cliente", "Orario", "Descrizione", "Unità/Durata", "Tariffa (€)", "Extra (€)", "Totale (€)", "Stato Incasso"];
      const rows = filteredEntries.map(e => {
          const project = projects.find(p => p.id === e.projectId);
          const isDaily = e.billingType === 'daily';
          const durationH = (e.duration || 0) / 3600;
          const unit = isDaily ? '1 GG' : durationH.toFixed(2).replace('.', ',');
          const earnings = calculateEarnings(e);
          const expenses = e.expenses?.reduce((sum, ex) => sum + ex.amount, 0) || 0;
          return [
              new Date(e.startTime).toLocaleDateString('it-IT'),
              `"${project?.name || ''}"`,
              `${formatTime(e.startTime)} - ${e.endTime ? formatTime(e.endTime) : ''}`,
              `"${e.description || ''}"`,
              unit,
              (e.hourlyRate || 0).toFixed(2).replace('.', ','),
              expenses.toFixed(2).replace('.', ','),
              earnings.toFixed(2).replace('.', ','),
              e.is_paid ? 'INCASSATO' : 'PENDENTE'
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

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10 print:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">
               {isArchive ? "Archivio & Incassi" : "Emissione Riepilogo"}
           </h1>
           
           {selectedEntryIds.size > 0 && (
               <div className="animate-slide-up flex flex-wrap items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl shadow-sm">
                   <span className="text-xs font-black text-indigo-800 uppercase tracking-widest">{selectedEntryIds.size} {t('billing.selected')}</span>
                   {isArchive ? (
                       <div className="flex gap-2">
                           <button onClick={() => handleMarkAsPaid(true)} className="text-xs font-black bg-emerald-600 text-white px-4 py-1.5 rounded-xl hover:bg-emerald-700 flex items-center gap-1.5 uppercase tracking-widest shadow-lg shadow-emerald-100">
                               <Check size={14}/> Segna Incassato
                           </button>
                           <button onClick={() => handleMarkAsPaid(false)} className="text-xs font-black bg-white border border-slate-200 text-slate-400 px-4 py-1.5 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors uppercase tracking-widest">
                               Pendente
                           </button>
                       </div>
                   ) : (
                       <>
                           {!showBulkRateInput ? (
                               <button onClick={() => setShowBulkRateInput(true)} className="text-xs font-bold bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-xl hover:bg-indigo-100 flex items-center gap-1.5 shadow-sm">
                                   <Pencil size={14}/> Modifica Tariffe
                               </button>
                           ) : (
                               <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-indigo-300">
                                   <input type="number" step="0.01" autoFocus className="w-16 text-xs font-mono outline-none border-0 px-2" placeholder="0.00" value={bulkRateValue} onChange={e => setBulkRateValue(e.target.value)} />
                                   <button onClick={handleBulkUpdateRate} className="bg-indigo-600 text-white p-1 rounded-lg"><Check size={14}/></button>
                                   <button onClick={() => setShowBulkRateInput(false)} className="text-gray-400 p-1"><X size={14}/></button>
                               </div>
                           )}
                           <button onClick={handleMarkAsBilled} disabled={isProcessing} className="text-xs font-black bg-indigo-600 text-white px-4 py-1.5 rounded-xl hover:bg-indigo-700 flex items-center gap-1.5 shadow-lg shadow-indigo-100 uppercase tracking-widest">
                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <><Archive size={14}/> Fattura & Archivia</>}
                           </button>
                       </>
                   )}
               </div>
           )}
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-200 no-print grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2.5 uppercase tracking-tight">
                <Settings2 className="text-indigo-600" size={20} /> Filtri Elaborazione
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-4">
                 <div className="flex items-center bg-slate-100 p-1 rounded-2xl shrink-0">
                    {availableYears.map(year => (
                        <button key={year} onClick={() => setSelectedYear(year)} className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${selectedYear === year ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                            {year}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-auto" ref={clientDropdownRef}>
                    <button onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)} className="flex items-center justify-between gap-4 px-5 py-2.5 rounded-2xl text-sm font-bold border border-gray-100 text-slate-700 w-full hover:bg-gray-50 bg-white">
                        <MapPin size={18} className="text-indigo-500" /> 
                        <span>{selectedProjectIds.length === projects.length ? 'Tutti i Clienti' : `${selectedProjectIds.length} Selezionati`}</span>
                        <ChevronDown size={16} />
                    </button>
                    {isClientDropdownOpen && (
                        <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-4 animate-slide-up">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {projects.map(p => (
                                    <button key={p.id} onClick={() => setSelectedProjectIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])} className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-bold transition-colors ${selectedProjectIds.includes(p.id) ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-gray-50'}`}>
                                        {selectedProjectIds.includes(p.id) ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18} className="text-gray-300"/>} 
                                        <span className="truncate">{p.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-1.5"><ListFilter size={14}/> Mesi Disponibili</span>
                     <button onClick={toggleAllMonthsInYear} className="text-[10px] text-indigo-600 font-black hover:underline uppercase tracking-widest">
                         {availableMonthsInYear.every(m => selectedMonths.includes(m)) ? 'Deseleziona' : 'Tutti'}
                     </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {availableMonthsInYear.map(m => {
                        const isSelected = selectedMonths.includes(m);
                        const [y, mo] = m.split('-');
                        const label = new Date(parseInt(y), parseInt(mo)-1).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'short' });
                        return (
                            <button key={m} onClick={() => toggleMonth(m)} className={`px-5 py-2 rounded-full text-xs font-bold border transition-all capitalize ${isSelected ? 'bg-amber-50 border-amber-200 text-amber-800 shadow-sm' : 'bg-white border-gray-100 text-slate-500 hover:bg-gray-50'}`}>
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>

        <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-gray-100 pt-8 lg:pt-0 lg:pl-8 flex flex-col justify-center">
            <div className="bg-slate-900 text-white p-6 rounded-[2rem] w-full mb-6 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 -mr-4 -mb-4"><Receipt size={100} /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Totale {isArchive ? 'Visualizzato' : 'Documento'}</p>
                <p className="text-3xl font-black">{formatCurrency(isArchive ? baseTotalAmount : grandTotalAmount)}</p>
                {isArchive && (
                    <p className="text-[10px] font-bold text-emerald-400 mt-2 uppercase tracking-tighter">
                        Incassato: {formatCurrency(filteredEntries.filter(e => e.is_paid).reduce((acc, e) => acc + calculateEarnings(e), 0))}
                    </p>
                )}
            </div>
            <div className="flex flex-col gap-4">
                <button onClick={() => window.print()} disabled={filteredEntries.length === 0} className="w-full flex justify-center items-center gap-2 bg-indigo-600 disabled:bg-slate-200 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 font-black uppercase tracking-widest text-xs transition-all active:scale-95">
                    <Printer size={18} /> Genera PDF
                </button>
                <button onClick={handleExportCSV} disabled={filteredEntries.length === 0} className="w-full flex justify-center items-center gap-2 bg-white border border-gray-200 text-slate-700 px-8 py-4 rounded-2xl hover:bg-gray-50 shadow-sm font-black uppercase tracking-widest text-xs transition-all active:scale-95">
                    <Download size={18} /> Export CSV
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white p-8 md:p-14 rounded-none md:rounded-[3rem] shadow-2xl print:shadow-none print:w-full print:p-0 border border-gray-50">
          <div className="border-b-4 border-slate-900 pb-10 mb-10 flex flex-col md:flex-row justify-between items-start gap-6">
              <div>
                  <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">
                      {isArchive ? 'Libro Incassi' : 'Riepilogo Servizi'}
                  </h1>
                  <p className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em]">Registro Prestazioni Professionali d'Ingegneria</p>
              </div>
              <div className="text-left md:text-right">
                  <h3 className="text-xl font-black text-slate-900 uppercase">
                    {selectedProjectIds.length === 1 ? projects.find(p => p.id === selectedProjectIds[0])?.name : 'Contabilità Cumulativa'}
                  </h3>
                  <p className="text-slate-500 font-bold capitalize mt-1 text-sm">Periodo: {periodString}</p>
              </div>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-xs text-left border-collapse">
                  <thead className="text-gray-400 uppercase text-[9px] font-black tracking-[0.2em] border-b border-gray-100">
                      <tr>
                          <th className="px-4 py-5 w-12 print:hidden">
                              <button onClick={handleSelectAll} className="flex items-center text-slate-300 hover:text-indigo-600 transition-colors">
                                  {selectedEntryIds.size > 0 && selectedEntryIds.size === filteredEntries.length ? <CheckSquare size={20} /> : <Square size={20} />}
                              </button>
                          </th>
                          <th className="px-4 py-5">DATA</th>
                          <th className="px-4 py-5">DESCRIZIONE</th>
                          <th className="px-4 py-5 text-center">UNITÀ</th>
                          <th className="px-4 py-5 text-center">TARIFFA</th>
                          <th className="px-4 py-5 text-right">TOTALE</th>
                          {isArchive && <th className="px-4 py-5 text-right print:hidden">STATO</th>}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {filteredEntries.map(entry => {
                          const earnings = calculateEarnings(entry);
                          const project = projects.find(p => p.id === entry.projectId);
                          const isEditingRate = editingRateId === entry.id;
                          const isDaily = entry.billingType === 'daily';

                          return (
                              <tr key={entry.id} className={`hover:bg-slate-50/50 transition-colors print:break-inside-avoid ${selectedEntryIds.has(entry.id) ? 'bg-indigo-50/30' : ''}`}>
                                  <td className="px-4 py-5 print:hidden">
                                      <button 
                                          onClick={() => setSelectedEntryIds(prev => { const n = new Set<string>(prev); if(n.has(entry.id)) n.delete(entry.id); else n.add(entry.id); return n; })} 
                                          className={`flex items-center transition-colors ${selectedEntryIds.has(entry.id) ? 'text-indigo-600' : 'text-slate-200 hover:text-slate-300'}`}
                                      >
                                          {selectedEntryIds.has(entry.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                      </button>
                                  </td>
                                  <td className="px-4 py-5 font-black text-slate-900">
                                      {new Date(entry.startTime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                  </td>
                                  <td className="px-4 py-5">
                                      <div className="font-bold text-slate-800 uppercase text-[10px] tracking-tight">{project?.name}</div>
                                      <div className="text-slate-400 italic text-[10px] truncate max-w-[200px]">{entry.description || '-'}</div>
                                  </td>
                                  <td className="px-4 py-5 text-center font-black text-slate-900 font-mono">
                                      {isDaily ? `1 GG` : `${((entry.duration || 0)/3600).toFixed(1)}H`}
                                  </td>
                                  <td className="px-4 py-5 text-center" onClick={() => { if (!isArchive) { setEditingRateId(entry.id); setTempRate(entry.hourlyRate?.toString() || '0'); } }}>
                                      {isEditingRate ? (
                                          <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                                              <input type="number" step="0.01" autoFocus className="w-16 px-2 py-1 border-2 border-indigo-500 rounded-xl text-right font-mono font-bold shadow-lg outline-none" value={tempRate} onChange={e => setTempRate(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateRate(entry)} />
                                          </div>
                                      ) : (
                                          <span className="text-slate-700 font-bold font-mono">{formatCurrency(entry.hourlyRate || 0)}</span>
                                      )}
                                  </td>
                                  <td className="px-4 py-5 text-right font-black text-slate-900 text-sm">
                                      {formatCurrency(earnings)}
                                  </td>
                                  {isArchive && (
                                    <td className="px-4 py-5 text-right print:hidden">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black border ${entry.is_paid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                            {entry.is_paid ? <Banknote size={10}/> : <Clock size={10}/>}
                                            {entry.is_paid ? 'INCASSATO' : 'PENDENTE'}
                                        </div>
                                    </td>
                                  )}
                              </tr>
                          );
                      })}
                      {filteredEntries.length === 0 && (
                          <tr>
                              <td colSpan={isArchive ? 7 : 6} className="px-4 py-16 text-center text-slate-300 font-bold italic text-lg">
                                  Nessun servizio nel periodo selezionato.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>

          {filteredEntries.length > 0 && (
            <div className="mt-16 border-t-2 border-slate-100 pt-10 flex justify-end">
                <div className="w-full md:w-1/2 lg:w-2/5 space-y-4">
                    <div className="flex justify-between text-slate-400 text-[10px] font-black tracking-widest uppercase">
                        <span>IMPONIBILE SERVIZI:</span>
                        <span className="font-mono text-slate-900 text-base">{formatCurrency(baseTotalAmount)}</span>
                    </div>
                    
                    {!isArchive && applyBollo && (
                        <div className="flex justify-between text-slate-400 text-[10px] font-black tracking-widest uppercase">
                            <span className="italic normal-case font-bold">Imposta di Bollo (D.P.R. 642/72):</span>
                            <span className="font-mono text-slate-900">{formatCurrency(bolloAmount)}</span>
                        </div>
                    )}

                    {!isArchive && applyInarcassa && (
                        <div className="flex justify-between text-slate-400 text-[10px] font-black tracking-widest uppercase">
                            <span className="italic normal-case font-bold">Contributo Integrativo Inarcassa (4%):</span>
                            <span className="font-mono text-slate-900">{formatCurrency(cassaAmount)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center text-3xl font-black text-slate-900 pt-8 border-t-4 border-slate-900 mt-6">
                        <span className="tracking-tighter">TOTALE:</span>
                        <span className="text-indigo-600">{formatCurrency(isArchive ? baseTotalAmount : grandTotalAmount)}</span>
                    </div>
                    
                    {isArchive && (
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mt-4 flex justify-between items-center">
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Saldo Incassato Reale:</span>
                            <span className="text-xl font-black text-emerald-600">{formatCurrency(filteredEntries.filter(e => e.is_paid).reduce((acc, e) => acc + calculateEarnings(e), 0))}</span>
                        </div>
                    )}
                </div>
            </div>
          )}

          <div className="mt-20 text-center text-[8px] font-bold text-slate-300 border-t border-dashed border-slate-100 pt-8 flex justify-between uppercase tracking-widest">
              <span>Secure Professional Ledger System</span>
              <span>© {new Date().getFullYear()} Engineer Riccardo Righini</span>
          </div>
      </div>
    </div>
  );
};

export default Billing;
