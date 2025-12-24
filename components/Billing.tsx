
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
  Archive as ArchiveIcon, 
  Check, 
  Pencil, 
  X, 
  Settings2, 
  ListFilter, 
  Download, 
  Loader2, 
  Receipt, 
  Banknote,
  Hash,
  MoreVertical,
  MoveHorizontal,
  Trash2,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  FileText,
  AlertCircle
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
  const isArchiveView = view === AppView.ARCHIVE;
  const { t, language } = useLanguage();
  
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [applyBollo, setApplyBollo] = useState(false);
  const [applyInarcassa, setApplyInarcassa] = useState(true);

  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set<string>());
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set<string>());

  const [isProcessing, setIsProcessing] = useState(false);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // --- FILTRI & DATI ---
  const filteredEntries = useMemo(() => {
    return (entries || []).filter(e => {
        const entryIsBilled = !!e.is_billed;
        if (!isArchiveView && entryIsBilled) return false;
        if (isArchiveView && !entryIsBilled) return false;
        
        const entryYear = new Date(e.startTime).getFullYear().toString();
        const matchesProject = selectedProjectIds.length === 0 || selectedProjectIds.includes(e.projectId);
        const matchesYear = entryYear === selectedYear;

        return matchesProject && matchesYear;
    }).sort((a, b) => b.startTime - a.startTime);
  }, [entries, selectedProjectIds, isArchiveView, selectedYear]);

  // Raggruppamento per Numero Fattura (Solo per Archivio)
  const groupedInvoices = useMemo(() => {
      if (!isArchiveView) return {};
      const groups: Record<string, TimeEntry[]> = {};
      filteredEntries.forEach(e => {
          const invNum = e.invoice_number || 'SENZA_NUMERO';
          if (!groups[invNum]) groups[invNum] = [];
          groups[invNum].push(e);
      });
      return groups;
  }, [filteredEntries, isArchiveView]);

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
  const cassaAmount = applyInarcassa ? (baseImponibile + bolloAmount) * 0.04 : 0;
  const grandTotalAmount = baseImponibile + bolloAmount + cassaAmount;

  // --- AZIONI ---

  const handleExportCSV = () => {
    const headers = ["Data", "Cliente", "Descrizione", "Durata", "Importo", "Stato", "Fattura"];
    const rows = filteredEntries.map(e => [
      new Date(e.startTime).toLocaleDateString(),
      projects.find(p => p.id === e.projectId)?.name || '',
      e.description || '',
      e.billingType === 'daily' ? '1 GG' : `${((e.duration || 0) / 3600).toFixed(1)}H`,
      calculateEarnings(e).toFixed(2),
      e.is_paid ? 'Pagato' : 'Pendente',
      e.invoice_number || '-'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `export_fluxledger_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleInvoiceExpand = (num: string) => {
      setExpandedInvoices(prev => {
          const n = new Set(prev);
          if (n.has(num)) n.delete(num);
          else n.add(num);
          return n;
      });
  };

  const handleMarkAsBilled = async () => {
      if (selectedEntryIds.size === 0) {
          alert("Seleziona almeno un servizio.");
          return;
      }
      if (!invoiceNumber.trim()) {
          alert("Inserisci un numero di fattura o nota di credito.");
          return;
      }
      setIsProcessing(true);
      try {
          await DB.markEntriesAsBilled([...selectedEntryIds], invoiceNumber.trim());
          setSelectedEntryIds(new Set());
          setInvoiceNumber('');
          if (onEntriesChange) await onEntriesChange();
      } catch (e) { 
          alert("Errore durante l'archiviazione. Verifica la connessione."); 
      } finally { 
          setIsProcessing(false); 
      }
  };

  const handleMoveEntries = async () => {
      const newNum = prompt("Sposta i servizi selezionati nella Fattura / Nota n.:");
      if (!newNum || selectedEntryIds.size === 0) return;
      setIsProcessing(true);
      try {
          await DB.markEntriesAsBilled([...selectedEntryIds], newNum);
          setSelectedEntryIds(new Set());
          if (onEntriesChange) await onEntriesChange();
      } catch (e) { alert("Errore spostamento"); } finally { setIsProcessing(false); }
  };

  const handleRenameInvoice = async (oldNum: string) => {
      const newNum = prompt(`Rinomina la Fattura n. ${oldNum} in:`, oldNum);
      if (!newNum || newNum === oldNum) return;
      const ids = groupedInvoices[oldNum].map(e => e.id);
      setIsProcessing(true);
      try {
          await DB.markEntriesAsBilled(ids, newNum);
          if (onEntriesChange) await onEntriesChange();
      } catch (e) { alert("Errore rinomina"); } finally { setIsProcessing(false); }
  };

  const handleUnbillEntries = async () => {
      if (!confirm(`Riportare i ${selectedEntryIds.size} servizi selezionati nello stato 'Da Fatturare'?`)) return;
      setIsProcessing(true);
      try {
          await DB.markEntriesAsBilled([...selectedEntryIds], undefined);
          setSelectedEntryIds(new Set());
          if (onEntriesChange) await onEntriesChange();
      } catch (e) { alert("Errore ripristino"); } finally { setIsProcessing(false); }
  };

  const handleMarkPaid = async (status: boolean) => {
      if (selectedEntryIds.size === 0) return;
      setIsProcessing(true);
      try {
          await DB.markEntriesAsPaid([...selectedEntryIds], status);
          setSelectedEntryIds(new Set());
          if (onEntriesChange) await onEntriesChange();
      } catch (e) { alert("Errore stato incasso"); } finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10 print:pb-0">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print px-2">
           <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
                   {isArchiveView ? <ArchiveIcon className="text-indigo-600" /> : <Receipt className="text-indigo-600" />}
                   {isArchiveView ? "Registro Fatture" : "Emissione Documento"}
               </h1>
           </div>
           
           {selectedEntryIds.size > 0 && (
               <div className="animate-slide-up flex flex-wrap items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-2xl shadow-2xl border border-indigo-700">
                   <span className="text-[10px] font-black uppercase tracking-widest mr-2">{selectedEntryIds.size} Selezionati</span>
                   
                   {isArchiveView ? (
                       <div className="flex gap-2">
                           <button onClick={() => handleMarkPaid(true)} className="text-[10px] font-black bg-emerald-500 px-4 py-1.5 rounded-xl hover:bg-emerald-600 uppercase tracking-widest">Segna Incassati</button>
                           <button onClick={handleMoveEntries} className="text-[10px] font-black bg-indigo-700 px-4 py-1.5 rounded-xl hover:bg-indigo-600 uppercase tracking-widest flex items-center gap-1.5"><MoveHorizontal size={14}/> Sposta...</button>
                           <button onClick={handleUnbillEntries} className="text-[10px] font-black bg-red-500/20 text-red-300 px-4 py-1.5 rounded-xl hover:bg-red-500 hover:text-white uppercase tracking-widest flex items-center gap-1.5"><X size={14}/> Rimuovi</button>
                       </div>
                   ) : (
                       <div className="flex items-center gap-2">
                           <div className="relative">
                               <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-300" size={14} />
                               <input 
                                  type="text" 
                                  placeholder="N. Fattura/Nota" 
                                  className="pl-8 pr-4 py-1.5 bg-indigo-800 border border-indigo-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-white w-32 placeholder:text-indigo-400" 
                                  value={invoiceNumber}
                                  onChange={e => setInvoiceNumber(e.target.value)}
                               />
                           </div>
                           <button onClick={handleMarkAsBilled} disabled={isProcessing} className="text-[10px] font-black bg-white text-indigo-900 px-4 py-1.5 rounded-xl hover:bg-indigo-50 uppercase tracking-widest">
                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : "Archivia Ora"}
                           </button>
                       </div>
                   )}
               </div>
           )}
      </div>

      {/* 2. Filtri Avanzati */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 no-print flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl shrink-0">
                {['2023', '2024', '2025'].map(year => (
                    <button key={year} onClick={() => setSelectedYear(year)} className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${selectedYear === year ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                        {year}
                    </button>
                ))}
            </div>

            <div className="flex-grow flex gap-4 w-full">
                <div className="relative flex-grow" ref={clientDropdownRef}>
                    <button onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)} className="flex items-center justify-between gap-4 px-6 py-3 rounded-2xl text-xs font-black border border-gray-100 text-slate-700 w-full hover:bg-gray-50 bg-white uppercase tracking-widest">
                        <MapPin size={16} className="text-indigo-500" /> 
                        <span>{selectedProjectIds.length === projects.length ? 'Tutti i Clienti' : `${selectedProjectIds.length} Clienti`}</span>
                        <ChevronDown size={16} />
                    </button>
                </div>
                
                <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Base Imponibile</p>
                    <p className="text-lg font-black font-mono">{formatCurrency(baseImponibile)}</p>
                </div>
            </div>

            <div className="flex gap-2 w-full lg:w-auto">
                <button onClick={() => window.print()} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100"><Printer size={16}/> Stampa</button>
                <button onClick={handleExportCSV} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50"><Download size={16}/> Excel</button>
            </div>
      </div>

      {/* 3. CONTENUTO PRINCIPALE */}
      <div className="space-y-6">
          {isArchiveView ? (
              /* --- VISTA REGISTRO FATTURE --- */
              <div className="space-y-4">
                  {(Object.entries(groupedInvoices) as [string, TimeEntry[]][]).sort((a,b) => b[0].localeCompare(a[0])).map(([invNum, items]) => {
                      const invTotal = items.reduce((acc, i) => acc + calculateEarnings(i), 0);
                      const isExpanded = expandedInvoices.has(invNum);
                      const isFullyPaid = items.every(i => i.is_paid);
                      const dateRange = `${new Date(items[items.length-1].startTime).toLocaleDateString()} - ${new Date(items[0].startTime).toLocaleDateString()}`;

                      return (
                          <div key={invNum} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all">
                              <div className={`p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors ${isExpanded ? 'border-b border-slate-50' : ''}`} onClick={() => toggleInvoiceExpand(invNum)}>
                                  <div className="flex items-center gap-5">
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isFullyPaid ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                                          <FileText size={24} />
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-3">
                                              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">N. {invNum}</h3>
                                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${isFullyPaid ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                                  {isFullyPaid ? 'Incassata' : 'In attesa'}
                                              </span>
                                          </div>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dateRange} • {items.length} prestazioni</p>
                                      </div>
                                  </div>

                                  <div className="flex items-center gap-8">
                                      <div className="text-right">
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Totale Lordo</p>
                                          <p className="text-xl font-black text-indigo-600 font-mono">{formatCurrency(invTotal)}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <button onClick={(e) => { e.stopPropagation(); handleRenameInvoice(invNum); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors" title="Rinomina"><Pencil size={18}/></button>
                                          {isExpanded ? <ChevronDownIcon size={20} className="text-slate-300" /> : <ChevronRight size={20} className="text-slate-300" />}
                                      </div>
                                  </div>
                              </div>

                              {isExpanded && (
                                  <div className="p-2 bg-slate-50/30">
                                      <table className="w-full text-xs text-left">
                                          <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                              <tr>
                                                  <th className="px-4 py-3 w-10">
                                                      <button onClick={(e) => {
                                                          e.stopPropagation();
                                                          const allIds = items.map(i => i.id);
                                                          setSelectedEntryIds(prev => {
                                                              const n = new Set(prev);
                                                              const hasAll = allIds.every(id => n.has(id));
                                                              if (hasAll) allIds.forEach(id => n.delete(id));
                                                              else allIds.forEach(id => n.add(id));
                                                              return n;
                                                          });
                                                      }} className="text-slate-300"><CheckSquare size={16}/></button>
                                                  </th>
                                                  <th className="px-4 py-3">DATA</th>
                                                  <th className="px-4 py-3">CLIENTE</th>
                                                  <th className="px-4 py-3">DESCRIZIONE</th>
                                                  <th className="px-4 py-3 text-right">IMPORTO</th>
                                                  <th className="px-4 py-3 text-right">INCASSO</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                              {items.map(item => (
                                                  <tr key={item.id} className={`hover:bg-white transition-colors group ${selectedEntryIds.has(item.id) ? 'bg-indigo-50/50' : ''}`}>
                                                      <td className="px-4 py-3">
                                                          <button onClick={(e) => { e.stopPropagation(); setSelectedEntryIds(prev => { const n = new Set(prev); if(n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })}} className={selectedEntryIds.has(item.id) ? 'text-indigo-600' : 'text-slate-200'}>
                                                              {selectedEntryIds.has(item.id) ? <CheckSquare size={18}/> : <Square size={18}/>}
                                                          </button>
                                                      </td>
                                                      <td className="px-4 py-3 font-bold text-slate-600">{new Date(item.startTime).toLocaleDateString()}</td>
                                                      <td className="px-4 py-3 font-black text-slate-800 uppercase text-[10px]">{projects.find(p => p.id === item.projectId)?.name}</td>
                                                      <td className="px-4 py-3 text-slate-500 italic truncate max-w-[200px]">{item.description}</td>
                                                      <td className="px-4 py-3 text-right font-black text-slate-900">{formatCurrency(calculateEarnings(item))}</td>
                                                      <td className="px-4 py-3 text-right">
                                                           <div className={`inline-block w-2 h-2 rounded-full ${item.is_paid ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                                      </td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              )}
                          </div>
                      );
                  })}

                  {Object.keys(groupedInvoices).length === 0 && (
                      <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                          <AlertCircle size={40} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nessuna fattura registrata per questi filtri.</p>
                      </div>
                  )}
              </div>
          ) : (
              /* --- VISTA EMISSIONE (DA FATTURARE) --- */
              <div className="bg-white p-8 md:p-14 rounded-[3rem] shadow-2xl print:shadow-none border border-slate-50 relative">
                  <div className="border-b-4 border-slate-900 pb-10 mb-10 flex flex-col md:flex-row justify-between items-start gap-6">
                      <div>
                          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">Riepilogo Pro-Forma</h1>
                          <p className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em]">Registro Analitico Commesse Professionali</p>
                      </div>
                      <div className="text-left md:text-right">
                          <h3 className="text-xl font-black text-slate-900 uppercase">
                            {selectedProjectIds.length === 1 ? projects.find(p => p.id === selectedProjectIds[0])?.name : 'Portfolio Clienti'}
                          </h3>
                          <p className="text-slate-500 font-bold mt-1 text-sm uppercase tracking-widest">Rif. {selectedYear}</p>
                      </div>
                  </div>

                  <div className="overflow-x-auto print:overflow-visible">
                      <table className="w-full text-xs text-left border-collapse">
                          <thead className="text-gray-400 uppercase text-[9px] font-black tracking-[0.2em] border-b border-gray-100">
                              <tr>
                                  <th className="px-4 py-5 w-12 print:hidden">
                                      <button onClick={() => {
                                          if (selectedEntryIds.size === filteredEntries.length) setSelectedEntryIds(new Set());
                                          else setSelectedEntryIds(new Set(filteredEntries.map(e => e.id)));
                                      }} className="text-slate-300 hover:text-indigo-600"><CheckSquare size={20}/></button>
                                  </th>
                                  <th className="px-4 py-5">DATA</th>
                                  <th className="px-4 py-5">CLIENTE</th>
                                  <th className="px-4 py-5">DESCRIZIONE</th>
                                  <th className="px-4 py-5 text-center">QUANTITÀ</th>
                                  <th className="px-4 py-5 text-right">IMPONIBILE</th>
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
                                              <button onClick={() => setSelectedEntryIds(prev => { const n = new Set(prev); if(n.has(entry.id)) n.delete(entry.id); else n.add(entry.id); return n; })} className={selectedEntryIds.has(entry.id) ? 'text-indigo-600' : 'text-slate-200'}>
                                                  {selectedEntryIds.has(entry.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                                              </button>
                                          </td>
                                          <td className="px-4 py-5 font-bold text-slate-500">{new Date(entry.startTime).toLocaleDateString()}</td>
                                          <td className="px-4 py-5 font-black text-slate-800 uppercase text-[10px] tracking-tight">{project?.name}</td>
                                          <td className="px-4 py-5 text-slate-400 italic truncate max-w-[200px]">{entry.description || '-'}</td>
                                          <td className="px-4 py-5 text-center font-black text-slate-900 font-mono">
                                              {isDaily ? `1 GG` : `${((entry.duration || 0)/3600).toFixed(1)}H`}
                                          </td>
                                          <td className="px-4 py-5 text-right font-black text-slate-900 text-sm">
                                              {formatCurrency(earnings)}
                                          </td>
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
                                <span>IMPONIBILE PRESTAZIONI:</span>
                                <span className="font-mono text-slate-900 text-base">{formatCurrency(baseImponibile)}</span>
                            </div>
                            
                            <div className="flex justify-between text-slate-400 text-[10px] font-black tracking-widest uppercase">
                                <span className="italic font-bold">Imposta di Bollo:</span>
                                <span className="font-mono text-slate-900">{formatCurrency(bolloAmount)}</span>
                            </div>

                            <div className="flex justify-between text-slate-400 text-[10px] font-black tracking-widest uppercase">
                                <span className="italic font-bold">Inarcassa (4%):</span>
                                <span className="font-mono text-slate-900">{formatCurrency(cassaAmount)}</span>
                            </div>

                            <div className="flex justify-between items-center text-3xl font-black text-slate-900 pt-8 border-t-4 border-slate-900 mt-6">
                                <span className="tracking-tighter uppercase">Totale Documento:</span>
                                <span className="text-indigo-600">{formatCurrency(grandTotalAmount)}</span>
                            </div>
                        </div>
                    </div>
                  )}
              </div>
          )}
      </div>

      <div className="pt-8 border-t border-slate-50 text-center no-print">
          <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.6em]">Proprietà Tecnica Certificata • Studio Engineering Systems</p>
      </div>
    </div>
  );
};

export default Billing;
