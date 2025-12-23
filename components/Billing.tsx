import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, TimeEntry, UserProfile } from '../types';
import { formatCurrency, formatDuration, calculateEarnings, formatTime } from '../utils';
import { Printer, Calendar, CheckSquare, Square, MapPin, ChevronDown, Search, FileDown, Lock, Archive, CheckCircle2, History, AlertCircle, Check, Pencil, DollarSign, X } from 'lucide-react';
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
      // Auto-select current month or first available if none selected
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

  // Reset selection when filtering changes
  useEffect(() => {
      setSelectedEntryIds(new Set());
      setShowBulkRateInput(false);
  }, [viewMode, selectedProjectIds, selectedMonths, selectedYear]);

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
        // 1. Filter by Status (Pending vs Billed)
        const isBilled = !!e.is_billed;
        if (viewMode === 'pending' && isBilled) return false;
        if (viewMode === 'billed' && !isBilled) return false;

        // 2. Filter by Project & Date
        if (selectedProjectIds.length === 0 || selectedMonths.length === 0) return false;
        
        const entryMonth = new Date(e.startTime).toISOString().slice(0, 7);
        // Strict filtering: Project ID matches AND Month matches selected list
        return selectedProjectIds.includes(e.projectId) && selectedMonths.includes(entryMonth);
    }).sort((a, b) => a.startTime - b.startTime);
  }, [entries, selectedProjectIds, selectedMonths, viewMode]);

  const totalAmount = filteredEntries.reduce((acc, curr) => acc + calculateEarnings(curr), 0);
  const totalHours = filteredEntries.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 3600;

  // --- SELECTION HANDLERS ---
  const toggleEntrySelection = (id: string) => {
      const newSet = new Set(selectedEntryIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedEntryIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedEntryIds.size === filteredEntries.length) {
          setSelectedEntryIds(new Set());
      } else {
          setSelectedEntryIds(new Set(filteredEntries.map(e => e.id)));
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
      } catch (e) {
          alert("Errore durante l'aggiornamento.");
          console.error(e);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleRestoreToPending = async () => {
      if (selectedEntryIds.size === 0) return;
      if (!confirm(`Ripristinare ${selectedEntryIds.size} servizi in "Da Fatturare"?`)) return;

      setIsProcessing(true);
      try {
          await DB.markEntriesAsUnbilled(Array.from(selectedEntryIds));
          if (onEntriesChange) onEntriesChange();
          setSelectedEntryIds(new Set());
      } catch (e) {
          alert("Errore durante l'aggiornamento.");
          console.error(e);
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
        if (onEntriesChange) onEntriesChange();
        setEditingRateId(null);
    } catch (e) {
        alert("Errore nell'aggiornamento della tariffa.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleBulkUpdateRate = async () => {
      const newRate = parseFloat(bulkRateValue);
      if (isNaN(newRate)) return;
      if (selectedEntryIds.size === 0) return;

      if (!confirm(`Aggiornare la tariffa a ${formatCurrency(newRate)} per ${selectedEntryIds.size} servizi?`)) return;

      setIsProcessing(true);
      try {
          await DB.updateEntriesRate(Array.from(selectedEntryIds), newRate);
          if (onEntriesChange) onEntriesChange();
          setSelectedEntryIds(new Set());
          setShowBulkRateInput(false);
          setBulkRateValue('');
      } catch (e) {
          alert("Errore nell'aggiornamento delle tariffe.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handlePrint = () => {
      window.print();
  };

  const handleExportCSV = () => {
    // Check Pro
    if (userProfile?.subscription_status === 'trial' && userProfile?.role !== 'admin') {
        alert("🔒 Funzionalità Pro\n\nL'esportazione dei dati grezzi (CSV/Excel) è riservata agli utenti Pro.\n\nPassa a Pro per sbloccare questa funzione.");
        return;
    }

    if (filteredEntries.length === 0) return;

    // Build CSV Content
    const headers = ["Data", "Cliente", "Orario Inizio", "Orario Fine", "Descrizione", "Durata (Ore)", "Tariffa Oraria", "Extra", "Totale (€)", "Stato"];
    
    const rows = filteredEntries.map(e => {
        const date = new Date(e.startTime).toLocaleDateString('it-IT');
        const projName = projects.find(p => p.id === e.projectId)?.name || 'N/D';
        const start = formatTime(e.startTime);
        const end = e.endTime ? formatTime(e.endTime) : '-';
        const desc = (e.description || '').replace(/,/g, ' '); // remove commas for CSV safety
        const duration = (e.duration / 3600).toFixed(2).replace('.', ',');
        const rate = (e.hourlyRate || 0).toFixed(2).replace('.', ',');
        const extra = (e.expenses ? e.expenses.reduce((s, x) => s + x.amount, 0) : 0).toFixed(2).replace('.', ',');
        const total = calculateEarnings(e).toFixed(2).replace('.', ',');
        const status = e.is_billed ? 'Fatturato' : 'Da Fatturare';

        return [date, projName, start, end, desc, duration, rate, extra, total, status].join(";"); // Semi-colon for Excel EUR compatibility
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(";"), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cronosheet_export_${viewMode}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatMonthLabel = (m: string) => {
      const [y, mo] = m.split('-');
      const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
      return date.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'long', year: 'numeric' });
  };
  
  const formatShortMonth = (m: string) => {
      const [y, mo] = m.split('-');
      const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
      return date.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { month: 'short' });
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
             {t('billing.no_data')}
          </div>
      );
  }

  const isPro = userProfile?.subscription_status !== 'trial' || userProfile?.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* HEADER TABS & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           {/* View Toggle Tabs */}
           <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
               <button 
                  onClick={() => setViewMode('pending')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'pending' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
               >
                   <CheckCircle2 size={16} /> {t('billing.pending')}
               </button>
               <button 
                  onClick={() => setViewMode('billed')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'billed' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
               >
                   <History size={16} /> {t('billing.billed')}
               </button>
           </div>
           
           {/* Bulk Action Buttons */}
           {selectedEntryIds.size > 0 && (
               <div className="animate-slide-up flex flex-wrap items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl shadow-sm">
                   <span className="text-xs font-bold text-indigo-800">{selectedEntryIds.size} {t('billing.selected')}</span>
                   <div className="h-4 w-px bg-indigo-200 mx-1 hidden sm:block"></div>
                   
                   {viewMode === 'pending' ? (
                       <>
                           {!showBulkRateInput ? (
                               <button 
                                    onClick={() => setShowBulkRateInput(true)}
                                    className="text-xs font-bold bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 shadow-sm"
                                >
                                    <Pencil size={14}/> {t('billing.bulk_edit_rate')}
                               </button>
                           ) : (
                               <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-indigo-300">
                                   <div className="pl-2 pr-1 text-gray-400"><DollarSign size={12}/></div>
                                   <input 
                                        type="number" 
                                        step="0.01"
                                        autoFocus
                                        className="w-16 text-xs font-mono outline-none border-0"
                                        placeholder="0.00"
                                        value={bulkRateValue}
                                        onChange={e => setBulkRateValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleBulkUpdateRate()}
                                   />
                                   <button onClick={handleBulkUpdateRate} className="bg-indigo-600 text-white p-1 rounded hover:bg-indigo-700"><Check size={14}/></button>
                                   <button onClick={() => setShowBulkRateInput(false)} className="text-gray-400 p-1 hover:text-red-500"><X size={14}/></button>
                               </div>
                           )}

                           <button 
                                onClick={handleMarkAsBilled}
                                disabled={isProcessing}
                                className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 shadow-sm"
                            >
                                {isProcessing ? '...' : <><Archive size={14}/> {t('billing.mark_billed')}</>}
                           </button>
                       </>
                   ) : (
                       <button 
                            onClick={handleRestoreToPending}
                            disabled={isProcessing}
                            className="text-xs font-bold bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                        >
                             {isProcessing ? '...' : t('billing.restore')}
                       </button>
                   )}
               </div>
           )}
      </div>

      {/* Controls - Hidden in print */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:hidden grid grid-cols-1 lg:grid-cols-3 gap-6 relative overflow-hidden">
        {/* Decorative background for Billed Mode */}
        {viewMode === 'billed' && (
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <History size={120} className="text-indigo-900" />
            </div>
        )}

        <div className="lg:col-span-2 space-y-5 relative z-10">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="text-indigo-600" />
                {t('billing.config_period')}
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
                            <span>{selectedProjectIds.length === projects.length ? t('billing.all_clients') : `${selectedProjectIds.length} ${t('billing.selected')}`}</span>
                        </div>
                        <ChevronDown size={14} className={`transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isClientDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 animate-slide-down">
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder={t('billing.search_client')}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                                    value={clientSearchTerm}
                                    onChange={e => setClientSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-xs font-bold text-gray-400 uppercase">Lista</span>
                                <button onClick={toggleAllProjects} className="text-xs text-indigo-600 font-bold hover:underline">
                                    {selectedProjectIds.length === projects.length ? t('billing.deselect_all') : t('billing.select_all')}
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
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('billing.months_available')}</span>
                     <button onClick={toggleAllMonthsInYear} className="text-xs text-indigo-600 font-bold hover:underline">
                         {t('billing.select_all')}
                     </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {availableMonthsInYear.length === 0 && (
                        <span className="text-sm text-gray-400 italic">{t('billing.no_data')}</span>
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
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
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

        <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-end relative z-10">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 w-full mb-4">
                <p className="text-sm text-gray-500 mb-1">
                    {viewMode === 'pending' ? t('billing.total_pending') : t('billing.total_archived')}
                </p>
                <p className={`text-3xl font-bold ${viewMode === 'pending' ? 'text-indigo-600' : 'text-gray-600'}`}>
                    {formatCurrency(totalAmount)}
                </p>
                <p className="text-sm text-gray-600 mt-1">{filteredEntries.length} servizi</p>
            </div>
            
            <div className="flex flex-col gap-3">
                <button 
                    onClick={handlePrint}
                    disabled={filteredEntries.length === 0}
                    className="w-full flex justify-center items-center gap-2 bg-slate-800 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg hover:bg-slate-900 transition-colors shadow-lg active:scale-95"
                >
                    <Printer size={20} /> {t('billing.print')}
                </button>
                
                <button 
                    onClick={handleExportCSV}
                    disabled={filteredEntries.length === 0}
                    className={`w-full flex justify-center items-center gap-2 px-6 py-3 rounded-lg transition-colors border active:scale-95 ${
                        isPro 
                        ? 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm' 
                        : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed hover:bg-gray-100'
                    }`}
                >
                    {isPro ? <FileDown size={20} /> : <Lock size={16} />}
                    {isPro ? t('billing.export') : 'Export CSV (Pro)'}
                </button>
            </div>
            
            <p className="text-xs text-center text-gray-400 mt-3">
                {viewMode === 'pending' ? "Seleziona le voci per archiviarle o modificarne la tariffa." : "Storico delle voci già elaborate."}
            </p>
        </div>
      </div>

      {/* The Bill / Summary Document */}
      <div className="bg-white p-6 md:p-10 rounded-none md:rounded-xl shadow-lg print:shadow-none print:border-none print:w-full print:p-0 min-h-[600px] print:h-auto print:min-h-0">
          
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
              <div>
                  <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wide">
                      {viewMode === 'pending' ? t('billing.summary_title') : t('billing.archive_title')}
                  </h1>
                  <p className="text-slate-500 mt-2">{t('billing.doc_info')}</p>
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

          {/* Table Container with Vertical Scroll - FIX: Ensure scrollbar is always available */}
          <div className="border border-gray-100 rounded-lg overflow-hidden flex flex-col">
            <div className="overflow-x-auto overflow-y-auto max-h-[700px] print:max-h-none print:overflow-visible custom-scrollbar">
                <table className="w-full text-sm text-left print:table min-w-[850px]">
                    <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold tracking-wider sticky top-0 z-20 print:static print:bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg print:rounded-none w-10 print:hidden">
                                <button onClick={toggleSelectAll} className="flex items-center text-gray-500 hover:text-indigo-600">
                                    {selectedEntryIds.size > 0 && selectedEntryIds.size === filteredEntries.length ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>
                            </th>
                            <th className="px-4 py-3">{t('billing.date')}</th>
                            {showProjectColumn && <th className="px-4 py-3">{t('billing.client')}</th>}
                            <th className="px-4 py-3">{t('billing.time')}</th>
                            <th className="px-4 py-3">{t('billing.description')}</th>
                            <th className="px-4 py-3 text-right">{t('billing.hours')}</th>
                            <th className="px-4 py-3 text-right">{t('billing.rate_col')}</th>
                            <th className="px-4 py-3 text-right">{t('billing.extra')}</th>
                            <th className="px-4 py-3 text-right rounded-r-lg print:rounded-none">{t('billing.total')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredEntries.map(entry => {
                            const earnings = calculateEarnings(entry);
                            const expensesTotal = entry.expenses ? entry.expenses.reduce((s, x) => s + x.amount, 0) : 0;
                            const project = projects.find(p => p.id === entry.projectId);
                            const isSelected = selectedEntryIds.has(entry.id);
                            const isEditingRate = editingRateId === entry.id;

                            return (
                                <tr 
                                    key={entry.id} 
                                    className={`hover:bg-gray-50 transition-colors print:break-inside-avoid print:page-break-inside-avoid cursor-pointer ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                    onClick={() => toggleEntrySelection(entry.id)}
                                >
                                    <td className="px-4 py-3 print:hidden" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => toggleEntrySelection(entry.id)} className={`flex items-center ${isSelected ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-400'}`}>
                                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                                        {new Date(entry.startTime).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: '2-digit' })}
                                    </td>
                                    
                                    {showProjectColumn && (
                                        <td className="px-4 py-3 text-indigo-600 font-semibold text-xs uppercase tracking-wide">
                                            {project?.name || '-'}
                                        </td>
                                    )}

                                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                                        {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : '...'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate print:whitespace-normal print:overflow-visible">
                                        {entry.description || '-'}
                                        {entry.isNightShift && <span className="ml-2 text-xs bg-slate-200 px-1 rounded font-bold">N</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {formatDuration(entry.duration).slice(0, 5)}
                                    </td>
                                    
                                    {/* Editable Rate Column */}
                                    <td 
                                        className="px-4 py-3 text-right"
                                        onClick={(e) => {
                                            if (viewMode === 'pending') {
                                                e.stopPropagation();
                                                setEditingRateId(entry.id);
                                                setTempRate(entry.hourlyRate?.toString() || '0');
                                            }
                                        }}
                                    >
                                        {isEditingRate ? (
                                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    autoFocus
                                                    className="w-16 px-1 py-0.5 border border-indigo-400 rounded text-right font-mono text-xs outline-none shadow-sm"
                                                    value={tempRate}
                                                    onChange={e => setTempRate(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleUpdateRate(entry);
                                                        if (e.key === 'Escape') setEditingRateId(null);
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleUpdateRate(entry)}
                                                    className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                                                >
                                                    <Check size={10} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1 group/rate">
                                                <span className="text-slate-600 font-mono">
                                                    {formatCurrency(entry.hourlyRate || 0)}
                                                </span>
                                                {viewMode === 'pending' && (
                                                    <Pencil size={10} className="text-gray-300 opacity-0 group-hover/rate:opacity-100 transition-opacity" />
                                                )}
                                            </div>
                                        )}
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
                                <td colSpan={showProjectColumn ? 9 : 8} className="px-4 py-12 text-center text-gray-400 italic">
                                    {viewMode === 'pending' ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <CheckCircle2 size={32} className="opacity-20" />
                                            <p>{t('billing.empty_pending')}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Archive size={32} className="opacity-20" />
                                            <p>{t('billing.empty_archive')}</p>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>

          {/* Footer Totals */}
          <div className="mt-8 border-t-2 border-slate-200 pt-6 flex justify-end break-inside-avoid print:break-inside-avoid">
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
                      <span>{viewMode === 'pending' ? t('billing.total_pending') : t('billing.total_archived')}</span>
                      <span className="text-indigo-700">{formatCurrency(totalAmount)}</span>
                  </div>
              </div>
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
              {t('billing.generated_by')} • © {new Date().getFullYear()} Engineer Riccardo Righini
          </div>
      </div>
    </div>
  );
};

export default Billing;
