import React, { useState, useMemo } from 'react';
import { Project, TimeEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { formatDurationHuman, formatCurrency } from '../utils';
import { Calendar, Filter, ArrowDownToLine, TrendingUp } from 'lucide-react';

interface ReportsProps {
  entries: TimeEntry[];
  projects: Project[];
}

type TimeRange = '7d' | '14d' | 'month';

const Reports: React.FC<ReportsProps> = ({ entries, projects }) => {
  const [range, setRange] = useState<TimeRange>('7d');

  // 1. Calcola intervallo date in base alla selezione
  const { startDate, daysArray, rangeLabel } = useMemo(() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Midnight today
      let start = new Date(today);
      let daysCount = 7;
      let label = 'Ultimi 7 Giorni';

      if (range === '14d') {
          start.setDate(today.getDate() - 13); // 14 days inclusive
          daysCount = 14;
          label = 'Ultimi 14 Giorni';
      } else if (range === 'month') {
          start = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month
          // Giorni passati nel mese corrente (incluso oggi)
          const diffTime = Math.abs(today.getTime() - start.getTime());
          daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
          label = 'Mese Corrente';
      } else {
          start.setDate(today.getDate() - 6);
      }

      // Genera array di date stringhe per il grafico (YYYY-MM-DD)
      const arr = [];
      for (let i = 0; i < daysCount; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          arr.push(d.toISOString().split('T')[0]);
      }

      return { startDate: start, daysArray: arr, rangeLabel: label };
  }, [range]);

  // 2. Filtra le voci in base all'intervallo
  const filteredEntries = useMemo(() => {
      const startMs = startDate.getTime();
      return entries.filter(e => e.startTime >= startMs);
  }, [entries, startDate]);

  // 3. Dati per Pie Chart (Progetti nel periodo selezionato)
  const projectData = useMemo(() => {
      return projects.map(project => {
        const totalSeconds = filteredEntries
          .filter(e => e.projectId === project.id)
          .reduce((acc, curr) => {
            const duration = curr.duration || (curr.endTime ? (curr.endTime - curr.startTime) / 1000 : 0);
            return acc + duration;
          }, 0);
        
        return {
          name: project.name,
          value: totalSeconds / 3600, // Hours
          color: project.color
        };
      }).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
  }, [projects, filteredEntries]);

  // 4. Dati per Bar Chart (Attività giornaliera)
  const dailyData = useMemo(() => {
      return daysArray.map(dateStr => {
        const dayEntries = filteredEntries.filter(e => {
            const eDate = new Date(e.startTime).toISOString().split('T')[0];
            return eDate === dateStr;
        });
        
        const hours = dayEntries.reduce((acc, curr) => {
             const duration = curr.duration || (curr.endTime ? (curr.endTime - curr.startTime) / 1000 : 0);
             return acc + duration;
        }, 0) / 3600;

        const dateObj = new Date(dateStr);
        // Label formattata: es. "Lun 15"
        const label = dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });

        return {
            date: label,
            fullDate: dateStr,
            hours: hours
        };
      });
  }, [daysArray, filteredEntries]);

  // 5. Calcoli Sommario
  const totalSeconds = filteredEntries.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const totalHours = totalSeconds / 3600;
  // Media giornaliera basata sui giorni visualizzati nel grafico (non 30 fissi, ma giorni trascorsi)
  const avgDailyHours = daysArray.length > 0 ? totalHours / daysArray.length : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                  <Filter size={20} />
              </div>
              <span>Periodo Analisi:</span>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                  onClick={() => setRange('7d')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${range === '7d' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  7 Giorni
              </button>
              <button 
                  onClick={() => setRange('14d')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${range === '14d' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  14 Giorni
              </button>
              <button 
                  onClick={() => setRange('month')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${range === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <Calendar size={14} /> Mese Corrente
              </button>
          </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ore Totali ({rangeLabel})</p>
              <p className="text-3xl font-bold text-indigo-600">
                  {formatDurationHuman(totalSeconds)}
              </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Media Giornaliera</p>
              <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-emerald-600">
                      {avgDailyHours.toFixed(1)}h
                  </p>
                  <span className="text-xs text-gray-400">/ giorno</span>
              </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Progetto Top</p>
              <p className="text-xl font-bold text-slate-800 truncate" title={projectData[0]?.name}>
                  {projectData[0]?.name || '-'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                 {projectData[0] ? `${((projectData[0].value / totalHours) * 100).toFixed(0)}% del tempo` : ''}
              </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Totale Voci</p>
              <p className="text-3xl font-bold text-slate-800">
                  {filteredEntries.length}
              </p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
             <PieChart className="w-5 h-5 text-indigo-500"/> Ripartizione Progetti
          </h3>
          <div className="h-72 flex-grow">
            {projectData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={projectData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {projectData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <Tooltip 
                   formatter={(value: number) => [`${value.toFixed(1)} ore`, 'Durata']}
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                 />
                 <Legend verticalAlign="bottom" height={36} iconType="circle" />
               </PieChart>
             </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                  <Filter size={48} className="opacity-20" />
                  <p>Nessun dato nel periodo selezionato</p>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
             <TrendingUp className="w-5 h-5 text-indigo-500"/> Andamento Giornaliero
          </h3>
          <div className="h-72 flex-grow">
          {filteredEntries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                    dataKey="date" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#6b7280' }}
                    interval={range === 'month' ? 2 : 0} // Salta label se sono troppe (mese)
                />
                <YAxis 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `${val}h`} 
                    tick={{ fill: '#6b7280' }}
                />
                <Tooltip 
                    cursor={{fill: '#f9fafb'}}
                    formatter={(value: number) => [`${value.toFixed(1)} ore`, 'Lavorate']}
                    labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                    dataKey="hours" 
                    fill="#6366f1" 
                    radius={[6, 6, 0, 0]} 
                    barSize={range === 'month' ? 12 : 32} // Barre più sottili se mostriamo un mese intero
                />
              </BarChart>
            </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                    <TrendingUp size={48} className="opacity-20" />
                    <p>Nessuna attività registrata</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;