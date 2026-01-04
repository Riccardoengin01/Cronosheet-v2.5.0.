
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
  Square,
  Calendar,
  Clock,
  RotateCcw,
  CheckCircle2,
  Circle
} from 'lucide-react';
import * as DB from '../services/db';

interface BillingProps {
  entries: TimeEntry[];
  projects: Project[];
  userProfile?: UserProfile | null;
  onEntriesChange?: () => void;
  view?: AppView; 
}

const STORAGE_KEYS = {
  YEAR: 'flux_billing_year',
  MONTH: 'flux_billing_month',
  CLIENTS: 'flux_billing_clients'
};

const Billing: React.FC<BillingProps> = ({ entries, projects, userProfile, onEntriesChange, view }) => {
  const isArchiveView = view === AppView.ARCHIVE;
  
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.YEAR) || new Date().getFullYear().toString();
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.MONTH) || 'all';
  });
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [applyBollo, setApplyBollo] = useState(false);
  const [applyInarcassa, setApplyInarcassa] = useState(true);

  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set<string>());
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set<string>());

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'year' | 'month' | 'client' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const months = [
    { value: 'all', label: 'Tutti i mesi' },
    { value: '0', label: 'Gennaio' }, { value: '1', label: 'Febbraio' }, { value: '2', label: 'Marzo' },
    { value: '3', label: 'Aprile' }, { value: '4', label: 'Maggio' }, { value: '5', label: 'Giugno' },
    { value: '6', label: 'Luglio' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Settembre' },
    { value: '9', label: 'Ottobre' }, { value: '10', label: 'Novembre' }, { value: '11', label: 'Dicembre' }
  ];

  const availableYears = useMemo(() => {
    const years = new Set((entries || []).map(e => new Date(e.startTime).getFullYear().toString()));
    const sorted = Array.from(years).sort().reverse();
    const current = new Date().getFullYear().toString();
    if (!sorted.includes(current)) sorted.unshift(current);
    return sorted;
  }, [entries]);

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.YEAR, selectedYear);
  }, [selectedYear]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MONTH, selectedMonth);
  }, [selectedMonth]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(selectedProjectIds));
  }, [selectedProjectIds]);

  useEffect(() => {
    setSelectedEntryIds(new Set());
  }, [isArchiveView, selectedProjectIds, selectedYear, selectedMonth]);

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

  const handleResetFilters = () => {
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedMonth('all');
    setSelectedProjectIds(projects.map(p => p.id));
  };

  const filteredEntries = useMemo(() => {
    return (entries || []).filter(e => {
        const entryIsBilled = !!e.is_billed;
        if (!isArchiveView && entryIsBilled) return false;
        if (isArchiveView && !entryIsBilled) return false;
        
        const d = new Date(e.startTime);
        const entryYear = d.getFullYear().toString();
        const entryMonth = d.getMonth().toString();

        const matchesProject = selectedProjectIds.length === 0 || selectedProjectIds.includes(e.projectId);
        const matchesYear = selectedYear === 'all' || entryYear === selectedYear;
        const matchesMonth = selectedMonth === 'all' || entryMonth === selectedMonth;

        return matchesProject && matchesYear && matchesMonth;
    }).sort((a, b) => b.startTime - a.startTime);
  }, [entries, selectedProjectIds, isArchiveView, selectedYear, selectedMonth]);

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

  // Bollo logic: Auto-detection as a starting point, but user can toggle
  useEffect(() => {
      if (baseImponibile > 77.47) setApplyBollo(true);
      else setApplyBollo(false);
  }, [baseImponibile]);

  useEffect(() => {
      if (projects.length > 0 && selectedProjectIds.length === 0) {
          const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
          if (!saved || JSON.parse(saved).length === 0) {
              setSelectedProjectIds(projects.map(p => p.id));
          }
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

  const isFilterActive = selectedYear !== new Date().getFullYear().toString() || 
                         selectedMonth !== 'all' || 
                         selectedProjectIds.length !== projects.length;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-10 print:pb-0">
      
      {/* Header Professionale */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print px-2 relative z-[70]">
           <div className="flex flex-col gap-1">
               <div className="flex items-center gap-4">
                  <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-100">
                    <Receipt size={32} />
                  </div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                    {isArchiveView ? "Registro Fatture" : "Emissione Pro-Forma"}
                  </h1>
               </div>
               <div className="flex items-center gap-4 mt-1 opacity-60">
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full border border-indigo-600 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full border border-indigo-600"></div>
                    </div>
                    <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">FluxLedger Digital Compliance</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Studio Engineering Systems</span>
               </div>
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

      {/* Barra Filtri Pill-Style coordinata con screenshot */}
      <div className="bg-white p-3 rounded-[3rem] shadow-sm border border-slate-100 no-print flex flex-wrap lg:flex-nowrap gap-4 items-center relative z-60 w-full lg:w-fit mx-auto" ref={dropdownRef}>
            
            {/* Anno Pill */}
            <div className="relative">
                <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'year' ? null : 'year')}
                    className="flex items-center gap-2 px-6 py-3 rounded-[2rem] text-[10px] font-black uppercase border border-slate-100 text-slate-700 bg-slate-50/50 hover:bg-white transition-all cursor-pointer min-w-[150px] whitespace-nowrap"
                >
                    <Calendar size={16} className="text-indigo-500" />
                    <span>{selectedYear === 'all' ? 'Tutti gli Anni' : selectedYear}</span>
                    <ChevronDown size={14} className={`ml-auto transition-transform ${activeDropdown === 'year' ? 'rotate-180' : ''}`} />
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

            {/* Mese Pill */}
            <div className="relative">
                <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'month' ? null : 'month')}
                    className="flex items-center gap-2 px-6 py-3 rounded-[2rem] text-[10px] font-black uppercase border border-slate-100 text-slate-700 bg-slate-50/50 hover:bg-white transition-all cursor-pointer min-w-[150px] whitespace-nowrap"
                >
                    <Clock size={16} className="text-indigo-500" />
                    <span>{selectedMonth === 'all' ? 'Tutti i Mesi' : months.find(m => m.value === selectedMonth)?.label}</span>
                    <ChevronDown size={14} className={`ml-auto transition-transform ${activeDropdown === 'month' ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === 'month' && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] p-2 animate-slide-up max-h-64 overflow-y-auto custom-scrollbar">
                        {months.map(m => (
                            <button key={m.value} onClick={() => { setSelectedMonth(m.value); setActiveDropdown(null); }} className={`w-full text-left px-4 py-2 rounded-lg text-xs font-bold ${selectedMonth === m.value ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}>{m.label}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* Clienti Pill */}
            <div className="relative">
                <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'client' ? null : 'client')}
                    className="flex items-center gap-2 px-6 py-3 rounded-[2rem] text-[10px] font-black border border-slate-100 text-slate-700 min-w-[180px] hover:bg-slate-50 bg-white uppercase tracking-widest shadow-sm cursor-pointer whitespace-nowrap"
                >
                    <MapPin size={18} className="text-indigo-500" /> 
                    <span className="truncate max-w-[100px]">{selectedProjectIds.length === projects.length ? 'Tutti i Clienti' : `${selectedProjectIds.length} Clienti`}</span>
                    <ChevronDown size={18} className={`ml-auto transition-transform ${activeDropdown === 'client' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'client' && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] p-4 animate-slide-up max-h-80 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between mb-4 pb-2 border-b border-slate-50">
                        <button onClick={() => setSelectedProjectIds(projects.map(p => p.id))} className="text-[9px] font-black text-indigo-600 uppercase hover:underline cursor-pointer">Tutti</button>
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

            {/* Tot Selezione dark pill */}
            <div className="bg-slate-900 text-white px-8 py-3.5 rounded-[2rem] flex items-center gap-4 shadow-xl min-w-[220px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Tot. Selezione</p>
                <p className="text-xl font-black font-mono">{formatCurrency(baseImponibile)}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
                <button onClick={() => window.print()} className="flex items-center justify-center gap-3 bg-indigo-600 text-white px-8 py-3.5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 cursor-pointer active:scale-95 transition-all"><Printer size={20}/> Stampa</button>
                <button onClick={handleExportCSV} className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 px-8 py-3.5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"><Download size={20}/> Excel</button>
            </div>
      </div>

      {/* Toggle Fiscali per Bollo e Inarcassa (Nuova Sezione Richiesta) */}
      {!isArchiveView && (
          <div className="no-print bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap items-center gap-10">
              <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Opzioni Fiscali Selezione:</span>
                  <div className="h-8 w-[2px] bg-slate-100"></div>
              </div>
              <button 
                  onClick={() => setApplyBollo(!applyBollo)}
                  className={`flex items-center gap-3 px-5 py-2.5 rounded-xl border transition-all cursor-pointer ${applyBollo ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
              >
                  {applyBollo ? <CheckCircle2 size={18}/> : <Circle size={18}/>}
                  <span className="text-[11px] font-black uppercase tracking-widest">Imposta di Bollo (2€)</span>
              </button>
              <button 
                  onClick={() => setApplyInarcassa(!applyInarcassa)}
                  className={`flex items-center gap-3 px-5 py-2.5 rounded-xl border transition-all cursor-pointer ${applyInarcassa ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
              >
                  {applyInarcassa ? <CheckCircle2 size={18}/> : <Circle size={18}/>}
                  <span className="text-[11px] font-black uppercase tracking-widest">Contributo Inarcassa (4%)</span>
              </button>
          </div>
      )}

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
                                                          <td className="px-6 py-4 text-slate-500 italic whitespace-normal break-words">{item.description}</td>
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
                          <div className="flex items-center gap-4 mt-1 opacity-60">
                            <div className="flex items-center gap-1">
                                <div className="w-5 h-5 rounded-full border border-indigo-600 flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 rounded-full border border-indigo-600"></div>
                                </div>
                                <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Revisione Ledger Commesse</span>
                            </div>
                            <span className="text-slate-300">•</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Studio Engineering Systems</span>
                          </div>
                      </div>
                      <div className="text-left md:text-right">
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                            {selectedProjectIds.length === 1 ? projects.find(p => p.id === selectedProjectIds[0])?.name : 'Portfolio Professionale Combinato'}
                          </h3>
                          <p className="text-slate-400 font-bold mt-2 text-base uppercase tracking-widest">
                            {selectedYear === 'all' ? 'Tutti gli Anni' : `Esercizio Fiscale ${selectedYear}`}
                          </p>
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
                                      <td className="px-6 py-6 text-slate-500 italic leading-relaxed whitespace-normal break-words">{entry.description || 'Prestazione Ingegneristica'}</td>
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
