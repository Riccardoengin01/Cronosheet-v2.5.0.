
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry, UserProfile, AppView } from '../types';
import { formatCurrency, calculateEarnings } from '../utils';
import { 
  Printer, 
  MapPin, 
  ChevronDown, 
  Archive as ArchiveIcon, 
  Download, 
  Loader2, 
  Receipt, 
  Hash,
  Trash2,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  FileText,
  Target,
  CheckSquare,
  Square
} from 'lucide-react';
import * as DB from '../services/db';

interface BillingProps {
  entries: TimeEntry[];
  projects: Project[];
  userProfile?: UserProfile | null;
  onEntriesChange?: () => void;
  view?: AppView; 
}

const Billing: React.FC<BillingProps> = ({ entries, projects, userProfile, onEntriesChange, view }) => {
  const isArchiveView = view === AppView.ARCHIVE;
  
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

  useEffect(() => {
    setSelectedEntryIds(new Set());
  }, [isArchiveView, selectedProjectIds, selectedYear]);

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

  const baseImponibile = useMemo(() => {
      const targetEntries = selectedEntryIds.size > 0 
        ? filteredEntries.filter(e => selectedEntryIds.has(e.id))
        : filteredEntries;
      return targetEntries.reduce((acc, curr) => acc + calculateEarnings(curr), 0);
  }, [filteredEntries, selectedEntryIds]);

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

  const handleExportCSV = () => {
    const headers = ["Data", "Cliente", "Descrizione", "Importo", "Stato", "Fattura"];
    const rows = filteredEntries.map(e => [
      new Date(e.startTime).toLocaleDateString(),
      projects.find(p => p.id === e.projectId)?.name || '',
      e.description || '',
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

  const handleMarkAsBilled = async () => {
      if (selectedEntryIds.size === 0) {
          alert("Seleziona manualmente i singoli servizi desiderati prima di procedere.");
          return;
      }
      if (!invoiceNumber.trim()) {
          alert("Inserisci un riferimento per l'archiviazione.");
          return;
      }
      setIsProcessing(true);
      try {
          await DB.markEntriesAsBilled([...selectedEntryIds], invoiceNumber.trim());
          setSelectedEntryIds(new Set());
          setInvoiceNumber('');
          if (onEntriesChange) await onEntriesChange();
      } catch (e) { alert("Errore operazione."); } finally { setIsProcessing(false); }
  };

  const handleUnbillEntries = async () => {
      if (selectedEntryIds.size === 0) {
          alert("Seleziona i servizi specifici da rimuovere dall'archivio.");
          return;
      }
      if (!confirm(`Riportare i ${selectedEntryIds.size} servizi selezionati allo stato 'Da Fatturare'?`)) return;
      setIsProcessing(true);
      try {
          // Rimuoviamo il flag billed solo per gli ID selezionati
          await DB.markEntriesAsBilled([...selectedEntryIds], undefined);
          setSelectedEntryIds(new Set());
          if (onEntriesChange) await onEntriesChange();
      } catch (e) { alert("Errore ripristino."); } finally { setIsProcessing(false); }
  };

  const handleMarkPaid = async (status: boolean) => {
      if (selectedEntryIds.size === 0) return;
      setIsProcessing(true);
      try {
          await DB.markEntriesAsPaid([...selectedEntryIds], status);
          setSelectedEntryIds(new Set());
          if (onEntriesChange) await onEntriesChange();
      } catch (e) { alert("Errore aggiornamento incasso."); } finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-10 print:pb-0">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print px-2 relative z-[60]">
           <div>
               <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-4 italic">
                   {isArchiveView ? <ArchiveIcon size={32} className="text-indigo-600" /> : <Receipt size={32} className="text-indigo-600" />}
                   {isArchiveView ? "Registro Fatture" : "Emissione Pro-Forma"}
               </h1>
               <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                   <Target size={14} /> FluxLedger Digital Compliance • Developed by Ing. Righini
               </p>
           </div>
           
           {selectedEntryIds.size > 0 && (
               <div className="animate-slide-up flex flex-wrap items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl border border-slate-700">
                   <span className="text-[11px] font-black uppercase tracking-widest mr-3">{selectedEntryIds.size} Selezionati</span>
                   
                   {isArchiveView ? (
                       <div className="flex gap-2">
                           <button onClick={() => handleMarkPaid(true)} className="text-[10px] font-black bg-emerald-600 px-5 py-2 rounded-xl hover:bg-emerald-500 uppercase tracking-widest cursor-pointer">Incassati</button>
                           <button onClick={handleUnbillEntries} className="text-[10px] font-black bg-red-600/20 text-red-400 px-5 py-2 rounded-xl hover:bg-red-600 hover:text-white uppercase tracking-widest flex items-center gap-2 cursor-pointer"><Trash2 size={16}/> Rimuovi Selezione</button>
                       </div>
                   ) : (
                       <div className="flex items-center gap-3">
                           <div className="relative">
                               <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={16} />
                               <input 
                                  type="text" 
                                  placeholder="Rif. Fattura" 
                                  className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 w-40 placeholder:text-slate-500" 
                                  value={invoiceNumber}
                                  onChange={e => setInvoiceNumber(e.target.value)}
                               />
                           </div>
                           <button onClick={handleMarkAsBilled} disabled={isProcessing} className="text-[10px] font-black bg-white text-slate-900 px-5 py-2 rounded-xl hover:bg-indigo-50 uppercase tracking-widest cursor-pointer">
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : "Archivia Selezione"}
                           </button>
                       </div>
                   )}
               </div>
           )}
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 no-print flex flex-col lg:flex-row gap-8 items-center relative z-50">
            <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl shrink-0">
                {['2023', '2024', '2025'].map(year => (
                    <button key={year} onClick={() => setSelectedYear(year)} className={`px-6 py-2.5 text-xs font-black uppercase rounded-xl transition-all ${selectedYear === year ? 'bg-white text-indigo-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600 cursor-pointer'}`}>
                        {year}
                    </button>
                ))}
            </div>

            <div className="flex-grow flex gap-4 w-full">
                <div className="relative flex-grow" ref={clientDropdownRef}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsClientDropdownOpen(!isClientDropdownOpen); }} 
                      className="flex items-center justify-between gap-4 px-6 py-3.5 rounded-2xl text-xs font-black border border-slate-100 text-slate-700 w-full hover:bg-slate-50 bg-white uppercase tracking-widest shadow-sm cursor-pointer"
                    >
                        <MapPin size={18} className="text-indigo-500" /> 
                        <span>{selectedProjectIds.length === projects.length ? 'Tutti i Clienti' : `${selectedProjectIds.length} Clienti`}</span>
                        <ChevronDown size={18} className={`transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isClientDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] p-4 animate-slide-up max-h-80 overflow-y-auto custom-scrollbar">
                         <div className="flex justify-between mb-4 pb-2 border-b border-slate-50">
                            <button onClick={() => setSelectedProjectIds(projects.map(p => p.id))} className="text-[9px] font-black text-indigo-600 uppercase hover:underline cursor-pointer">Seleziona Tutti</button>
                            <button onClick={() => setSelectedProjectIds([])} className="text-[9px] font-black text-slate-400 uppercase hover:underline cursor-pointer">Deseleziona</button>
                         </div>
                         <div className="space-y-1">
                            {projects.map(p => (
                                <button key={p.id} onClick={(e) => { e.stopPropagation(); toggleProject(p.id); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${selectedProjectIds.includes(p.id) ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-slate-50'}`}>
                                    {selectedProjectIds.includes(p.id) ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18} className="text-slate-300"/>} 
                                    <span className="truncate">{p.name}</span>
                                </button>
                            ))}
                         </div>
                      </div>
                    )}
                </div>
                
                <div className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl flex items-center gap-4 shadow-xl">
                    <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400">{selectedEntryIds.size > 0 ? 'Tot. Selezione' : 'Tot. Potenziale'}</p>
                    <p className="text-xl font-black font-mono">{formatCurrency(baseImponibile)}</p>
                </div>
            </div>

            <div className="flex gap-3 w-full lg:w-auto">
                <button onClick={() => window.print()} className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 cursor-pointer"><Printer size={18}/> Stampa</button>
                <button onClick={handleExportCSV} className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 cursor-pointer"><Download size={18}/> Excel</button>
            </div>
      </div>

      <div className="space-y-8 relative z-10">
          {isArchiveView ? (
              <div className="space-y-6">
                  {(Object.entries(groupedInvoices) as [string, TimeEntry[]][]).sort((a,b) => b[0].localeCompare(a[0])).map(([invNum, items]) => {
                      const invTotal = items.reduce((acc, i) => acc + calculateEarnings(i), 0);
                      const isExpanded = expandedInvoices.has(invNum);
                      const isFullyPaid = items.every(i => i.is_paid);

                      return (
                          <div key={invNum} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all">
                              <div className={`p-8 flex flex-wrap items-center justify-between gap-6 cursor-pointer hover:bg-slate-50/50 transition-colors ${isExpanded ? 'border-b border-slate-100' : ''}`} onClick={() => {
                                  const n = new Set(expandedInvoices);
                                  if (n.has(invNum)) n.delete(invNum); else n.add(invNum);
                                  setExpandedInvoices(n);
                              }}>
                                  <div className="flex items-center gap-6">
                                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isFullyPaid ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                                          <FileText size={28} />
                                      </div>
                                      <div>
                                          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Documento n. {invNum}</h3>
                                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{items.length} prestazioni collegate</p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-10">
                                      <div className="text-right">
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valore Fatturato</p>
                                          <p className="text-2xl font-black text-indigo-600 font-mono">{formatCurrency(invTotal)}</p>
                                      </div>
                                      {isExpanded ? <ChevronDownIcon size={24} className="text-slate-300" /> : <ChevronRight size={24} className="text-slate-300" />}
                                  </div>
                              </div>
                              {isExpanded && (
                                  <div className="p-4 bg-slate-50/30">
                                      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-inner">
                                          <table className="w-full text-sm text-left">
                                              <thead className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] border-b border-slate-100 bg-slate-50/50">
                                                  <tr>
                                                      <th className="px-6 py-4 w-12 text-center">SEL.</th>
                                                      <th className="px-6 py-4">DATA</th>
                                                      <th className="px-6 py-4">CLIENTE</th>
                                                      <th className="px-6 py-4">DESCRIZIONE</th>
                                                      <th className="px-6 py-4 text-right">IMPONIBILE</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100">
                                                  {items.map(item => (
                                                      <tr key={item.id} className={`hover:bg-slate-50/30 transition-colors cursor-pointer ${selectedEntryIds.has(item.id) ? 'bg-indigo-50/30' : ''}`} onClick={(e) => {
                                                          const n = new Set(selectedEntryIds);
                                                          if (n.has(item.id)) n.delete(item.id); else n.add(item.id);
                                                          setSelectedEntryIds(n);
                                                      }}>
                                                          <td className="px-6 py-4 text-center">
                                                              {selectedEntryIds.has(item.id) ? <CheckSquare size={20} className="text-indigo-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                                          </td>
                                                          <td className="px-6 py-4 font-bold text-slate-600">{new Date(item.startTime).toLocaleDateString()}</td>
                                                          <td className="px-6 py-4 font-black text-slate-800 uppercase text-xs truncate max-w-[120px]">{projects.find(p => p.id === item.projectId)?.name}</td>
                                                          <td className="px-6 py-4 text-slate-500 italic truncate max-w-[200px]">{item.description}</td>
                                                          <td className="px-6 py-4 text-right font-black text-slate-900 font-mono">{formatCurrency(calculateEarnings(item))}</td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      </div>
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          ) : (
              <div className="bg-white p-10 md:p-20 rounded-[3rem] shadow-2xl print:shadow-none border border-slate-50 relative">
                  <div className="border-b-8 border-slate-900 pb-12 mb-12 flex flex-col md:flex-row justify-between items-start gap-8">
                      <div>
                          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4 italic">Riepilogo Pro-Forma</h1>
                          <p className="text-indigo-600 font-black text-sm uppercase tracking-[0.3em] flex items-center gap-2">
                             <Target size={18} /> Revisione Ledger Commesse • Developed by Ing. Righini
                          </p>
                      </div>
                      <div className="text-left md:text-right">
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                            {selectedProjectIds.length === 1 ? projects.find(p => p.id === selectedProjectIds[0])?.name : 'Portfolio Professionale Combinato'}
                          </h3>
                          <p className="text-slate-400 font-bold mt-2 text-base uppercase tracking-widest">Esercizio Fiscale {selectedYear}</p>
                      </div>
                  </div>

                  <div className="overflow-x-auto print:overflow-visible">
                      <table className="w-full text-sm text-left border-collapse">
                          <thead className="text-slate-400 uppercase text-[11px] font-black tracking-[0.2em] border-b-2 border-slate-100">
                              <tr>
                                  <th className="px-6 py-6 w-14 print:hidden text-center">
                                      <button onClick={() => {
                                          if (selectedEntryIds.size === filteredEntries.length) setSelectedEntryIds(new Set());
                                          else setSelectedEntryIds(new Set(filteredEntries.map(e => e.id)));
                                      }} className="text-slate-300 hover:text-indigo-600 cursor-pointer"><CheckSquare size={24}/></button>
                                  </th>
                                  <th className="px-6 py-6">DATA</th>
                                  <th className="px-6 py-6">CLIENTE</th>
                                  <th className="px-6 py-6">DESCRIZIONE ANALITICA</th>
                                  <th className="px-6 py-6 text-center">UNITÀ</th>
                                  <th className="px-6 py-6 text-right">IMPONIBILE (€)</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {filteredEntries.map(entry => (
                                  <tr key={entry.id} className={`hover:bg-slate-50/50 transition-colors print:break-inside-avoid cursor-pointer ${selectedEntryIds.has(entry.id) ? 'bg-indigo-50/50' : ''}`} onClick={() => {
                                      const n = new Set(selectedEntryIds);
                                      if (n.has(entry.id)) n.delete(entry.id); else n.add(entry.id);
                                      setSelectedEntryIds(new Set(n));
                                  }}>
                                      <td className="px-6 py-6 print:hidden text-center">
                                          {selectedEntryIds.has(entry.id) ? <CheckSquare size={24} className="text-indigo-600 mx-auto"/> : <Square size={24} className="text-slate-200 mx-auto"/>}
                                      </td>
                                      <td className="px-6 py-6 font-bold text-slate-500 whitespace-nowrap">{new Date(entry.startTime).toLocaleDateString()}</td>
                                      <td className="px-6 py-6 font-black text-slate-800 uppercase text-xs tracking-tight">{projects.find(p => p.id === entry.projectId)?.name}</td>
                                      <td className="px-6 py-6 text-slate-500 italic max-w-[300px] leading-relaxed">{entry.description || 'Prestazione Ingegneristica'}</td>
                                      <td className="px-6 py-6 text-center font-black text-slate-900 font-mono">
                                          {entry.billingType === 'daily' ? `1 GG` : `${((entry.duration || 0)/3600).toFixed(1)}H`}
                                      </td>
                                      <td className="px-6 py-6 text-right font-black text-slate-900 text-base font-mono">
                                          {formatCurrency(calculateEarnings(entry))}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  {filteredEntries.length > 0 && (
                    <div className="mt-20 border-t-4 border-slate-100 pt-12 flex justify-end">
                        <div className="w-full md:w-3/5 lg:w-2/5 space-y-6">
                            <div className="flex justify-between text-slate-400 text-xs font-black tracking-widest uppercase">
                                <span>{selectedEntryIds.size > 0 ? 'IMPONIBILE SELEZIONE:' : 'IMPONIBILE TOTALE:'}</span>
                                <span className="font-mono text-slate-900 text-lg">{formatCurrency(baseImponibile)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 text-xs font-black tracking-widest uppercase">
                                <span className="italic font-bold">Imposta di Bollo (D.P.R. 642/72):</span>
                                <span className="font-mono text-slate-900">{formatCurrency(bolloAmount)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 text-xs font-black tracking-widest uppercase">
                                <span className="italic font-bold">Contributo Integrativo Inarcassa (4%):</span>
                                <span className="font-mono text-slate-900">{formatCurrency(cassaAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-4xl font-black text-slate-900 pt-10 border-t-8 border-slate-900 mt-8">
                                <span className="tracking-tighter uppercase italic">Lordo Documento:</span>
                                <span className="text-indigo-600 font-mono">{formatCurrency(grandTotalAmount)}</span>
                            </div>
                        </div>
                    </div>
                  )}
              </div>
          )}
      </div>

      <div className="pt-16 border-t border-slate-100 text-center no-print">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] mb-4">FluxLedger ERP Professional • Studio Engineering Systems</p>
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] leading-relaxed">
              Software Architecture & Legal Rights Protected by <br/>
              <span className="text-slate-900 text-[11px]">Engineer Riccardo Righini</span><br/>
              © {new Date().getFullYear()} • STUDIO ENGINEERING SYSTEMS • All Rights Reserved
          </p>
      </div>
    </div>
  );
};

export default Billing;
