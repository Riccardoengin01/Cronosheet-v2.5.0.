
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry, UserProfile, AppView } from '../types';
import { formatCurrency, formatDuration, calculateEarnings, formatTime } from '../utils';
import { 
  Printer, 
  Calendar, 
  Clock, 
  CheckSquare, 
  Square, 
  MapPin, 
  ChevronDown, 
  Archive, 
  Check, 
  Pencil, 
  X, 
  Settings2, 
  ListFilter, 
  Download, 
  Loader2, 
  Receipt, 
  Banknote,
  Hash
} from 'lucide-react';
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
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
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
      const years = new Set((entries || []).map(e => new Date(e.startTime).getFullYear().toString()));
      const sorted = Array.from(years).sort().reverse();
      const current = new Date().getFullYear().toString();
      if (!sorted.includes(current)) sorted.unshift(current);
      return sorted;
  }, [entries]);

  const availableMonthsInYear = useMemo<string[]>(() => {
      const monthsSet = new Set<string>();
      (entries || []).forEach(e => {
          const d = new Date(e.startTime);
          if (d.getFullYear().toString() === selectedYear) {
              monthsSet.add(d.toISOString().slice(0, 7));
          }
      });
      return [...monthsSet].sort().reverse();
  }, [entries, selectedYear]);

  const filteredEntries = useMemo(() => {
    return (entries || []).filter(e => {
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

  // Base Imponibile (Prestazioni Pure)
  const baseImponibile = useMemo(() => filteredEntries.reduce((acc, curr) => acc + calculateEarnings(curr), 0), [filteredEntries]);

  useEffect(() => {
      if (baseImponibile > 77.47) setApplyBollo(true);
      else setApplyBollo(false);
  }, [baseImponibile]);

  useEffect(() => {
      if (projects.length > 0 && selectedProjectIds.length === 0) {
          setSelectedProjectIds(projects.map(p => p.id));
      }
  }, [projects]);

  const bolloAmount = applyBollo ? 2.00 : 0;
  // Per Ingegneri: 4% calcolato su (Base + Bollo)
  const cassaAmount = applyInarcassa ? (baseImponibile + bolloAmount) * 0.04 : 0;
  const grandTotalAmount = baseImponibile + bolloAmount + cassaAmount;

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
      if (!invoiceNumber) {
          alert("Inserisci un Numero Fattura prima di procedere.");
          return;
      }
      if (!confirm(`Archiviare ${selectedEntryIds.size} servizi con Fattura n. ${invoiceNumber}?`)) return;
      
      setIsProcessing(true);
      try {
          await DB.markEntriesAsBilled([...selectedEntryIds], invoiceNumber);
          setSelectedEntryIds(new Set<string>()); 
          setInvoiceNumber('');
          if (onEntriesChange) await onEntriesChange();
      } catch (e: any) { 
          alert("Errore durante l'archiviazione."); 
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

  const handleExportCSV = () => {
      if (filteredEntries.length === 0) return;
      const headers = ["Fattura", "Data", "Cliente", "Descrizione", "Unità", "Tariffa (€)", "Totale (€)", "Stato"];
      const rows = filteredEntries.map(e => {
          const project = projects.find(p => p.id === e.projectId);
          const earnings = calculateEarnings(e);
          return [
              e.invoice_number || '-',
              new Date(e.startTime).toLocaleDateString('it-IT'),
              `"${project?.name || ''}"`,
              `"${e.description || ''}"`,
              e.billingType === 'daily' ? '1 GG' : `${((e.duration || 0)/3600).toFixed(2)}H`,
              (e.hourlyRate || 0).toFixed(2),
              earnings.toFixed(2),
              e.is_paid ? 'PAGATO' : 'PENDENTE'
          ];
      });
      const csvContent = [headers, ...rows].map(r => r.join(";")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `export_fluxledger_${selectedYear}.csv`);
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
           <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
               {isArchive ? "Registro Archivio" : "Emissione Documento"}
           </h1>
           
           {selectedEntryIds.size > 0 && (
               <div className="animate-slide-up flex flex-wrap items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl shadow-sm">
                   <span className="text-xs font-black text-indigo-800 uppercase tracking-widest">{selectedEntryIds.size} Selezionati</span>
                   {isArchive ? (
                       <button onClick={() => handleMarkAsPaid(true)} className="text-xs font-black bg-emerald-600 text-white px-4 py-1.5 rounded-xl hover:bg-emerald-700 flex items-center gap-1.5 uppercase tracking-widest shadow-lg shadow-emerald-100">
                           <Check size={14}/> Segna Incassato
                       </button>
                   ) : (
                       <div className="flex items-center gap-2">
                           <div className="relative">
                               <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-300" size={14} />
                               <input 
                                  type="text" 
                                  placeholder="N. Fattura" 
                                  className="pl-8 pr-4 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 w-28" 
                                  value={invoiceNumber}
                                  onChange={e => setInvoiceNumber(e.target.value)}
                               />
                           </div>
                           <button onClick={handleMarkAsBilled} disabled={isProcessing} className="text-xs font-black bg-indigo-600 text-white px-4 py-1.5 rounded-xl hover:bg-indigo-700 flex items-center gap-1.5 shadow-lg shadow-indigo-100 uppercase tracking-widest">
                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <><Archive size={14}/> Archivia Fattura</>}
                           </button>
                       </div>
                   )}
               </div>
           )}
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-200 no-print grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2.5 uppercase tracking-tight">
                <Receipt className="text-indigo-600" size={20} /> Parametri Analisi
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
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-1.5"><ListFilter size={14}/> Mesi Disponibili</span>
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
                <div className="absolute right-0 bottom-0 opacity-10 -mr-4 -mb-4"><Banknote size={100} /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Lordo Fattura Stimato</p>
                <p className="text-3xl font-black">{formatCurrency(isArchive ? baseImponibile : grandTotalAmount)}</p>
                {isArchive && (
                    <p className="text-[10px] font-bold text-emerald-400 mt-2 uppercase tracking-tighter">
                        Incassato ad oggi: {formatCurrency(filteredEntries.filter(e => e.is_paid).reduce((acc, e) => acc + calculateEarnings(e), 0))}
                    </p>
                )}
            </div>
            <div className="flex flex-col gap-4">
                <button onClick={() => window.print()} disabled={filteredEntries.length === 0} className="w-full flex justify-center items-center gap-2 bg-indigo-600 disabled:bg-slate-200 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 font-black uppercase tracking-widest text-xs transition-all active:scale-95">
                    <Printer size={18} /> Stampa Documento
                </button>
                <button onClick={handleExportCSV} disabled={filteredEntries.length === 0} className="w-full flex justify-center items-center gap-2 bg-white border border-gray-200 text-slate-700 px-8 py-4 rounded-2xl hover:bg-gray-50 shadow-sm font-black uppercase tracking-widest text-xs transition-all active:scale-95">
                    <Download size={18} /> Export Excel
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white p-8 md:p-14 rounded-none md:rounded-[3rem] shadow-2xl print:shadow-none print:w-full print:p-0 border border-gray-50">
          <div className="border-b-4 border-slate-900 pb-10 mb-10 flex flex-col md:flex-row justify-between items-start gap-6">
              <div>
                  <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">
                      {isArchive ? 'Analisi Incassi' : 'Riepilogo Prestazioni'}
                  </h1>
                  <p className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em]">Registro Analitico Professionale Ingegneri</p>
              </div>
              <div className="text-left md:text-right">
                  <h3 className="text-xl font-black text-slate-900 uppercase">
                    {selectedProjectIds.length === 1 ? projects.find(p => p.id === selectedProjectIds[0])?.name : 'Portfolio Clienti'}
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
                          <th className="px-4 py-5">FATTURA</th>
                          <th className="px-4 py-5">DATA</th>
                          <th className="px-4 py-5">DESCRIZIONE SERVIZIO</th>
                          <th className="px-4 py-5 text-center">QUANTITÀ</th>
                          <th className="px-4 py-5 text-right">IMPONIBILE</th>
                          {isArchive && <th className="px-4 py-5 text-right print:hidden">STATO</th>}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {filteredEntries.map(entry => {
                          const earnings = calculateEarnings(entry);
                          const project = projects.find(p => p.id === entry.projectId);
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
                                  <td className="px-4 py-5 font-black text-indigo-600">
                                      {entry.invoice_number ? `FAT. ${entry.invoice_number}` : '-'}
                                  </td>
                                  <td className="px-4 py-5 text-slate-500 font-bold">
                                      {new Date(entry.startTime).toLocaleDateString('it-IT')}
                                  </td>
                                  <td className="px-4 py-5">
                                      <div className="font-bold text-slate-800 uppercase text-[10px]">{project?.name}</div>
                                      <div className="text-slate-400 italic text-[10px] truncate max-w-[200px]">{entry.description || '-'}</div>
                                  </td>
                                  <td className="px-4 py-5 text-center font-black text-slate-900 font-mono">
                                      {isDaily ? `1 GG` : `${((entry.duration || 0)/3600).toFixed(1)}H`}
                                  </td>
                                  <td className="px-4 py-5 text-right font-black text-slate-900 text-sm">
                                      {formatCurrency(earnings)}
                                  </td>
                                  {isArchive && (
                                    <td className="px-4 py-5 text-right print:hidden">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black border ${entry.is_paid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                            {entry.is_paid ? 'INCASSATO' : 'PENDENTE'}
                                        </div>
                                    </td>
                                  )}
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>

          {filteredEntries.length > 0 && (
            <div className="mt-16 border-t-2 border-slate-100 pt-10 flex justify-end">
                <div className="w-full md:w-1/2 lg:w-2/5 space-y-4">
                    <div className="flex justify-between text-slate-400 text-[10px] font-black tracking-widest uppercase">
                        <span>TOTALE PRESTAZIONI (IMPONIBILE):</span>
                        <span className="font-mono text-slate-900 text-base">{formatCurrency(baseImponibile)}</span>
                    </div>
                    
                    {!isArchive && (
                        <>
                            <div className="flex justify-between text-slate-400 text-[10px] font-black tracking-widest uppercase">
                                <span className="italic">Imposta di Bollo:</span>
                                <span className="font-mono text-slate-900">{formatCurrency(bolloAmount)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 text-[10px] font-black tracking-widest uppercase">
                                <span className="italic">Integrativo Inarcassa (4% su Prest.+Bollo):</span>
                                <span className="font-mono text-slate-900">{formatCurrency(cassaAmount)}</span>
                            </div>
                        </>
                    )}

                    <div className="flex justify-between items-center text-3xl font-black text-slate-900 pt-8 border-t-4 border-slate-900 mt-6">
                        <span className="tracking-tighter">TOTALE LORDO:</span>
                        <span className="text-indigo-600">{formatCurrency(isArchive ? baseImponibile : grandTotalAmount)}</span>
                    </div>
                    {!isArchive && (
                        <p className="text-[9px] text-slate-400 italic text-right mt-2 uppercase font-bold">
                            Nota: I servizi archiviati verranno salvati al netto di cassa e bollo per il calcolo fiscale.
                        </p>
                    )}
                </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default Billing;
