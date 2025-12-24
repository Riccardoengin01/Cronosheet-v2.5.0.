
import React, { useState, useEffect } from 'react';
import { Play, Square, Timer as TimerIcon, ChevronDown } from 'lucide-react';
import { Project, TimeEntry } from '../types';
import { formatDuration } from '../utils';

interface TimerProps {
  projects: Project[];
  activeEntry: TimeEntry | undefined;
  onStart: (desc: string, pid: string) => void;
  onStop: () => void;
}

const Timer: React.FC<TimerProps> = ({ projects, activeEntry, onStart, onStop }) => {
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (activeEntry) {
      setDescription(activeEntry.description);
      setProjectId(activeEntry.projectId);
      
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - activeEntry.startTime) / 1000));
      }, 1000);
      
      setElapsed(Math.floor((Date.now() - activeEntry.startTime) / 1000));
      return () => clearInterval(interval);
    } else {
      setElapsed(0);
    }
  }, [activeEntry]);

  const handleStart = () => {
    if (!projectId && projects.length > 0) {
        onStart(description, projects[0].id);
    } else {
        onStart(description, projectId);
    }
  };

  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <div className="bg-white/70 backdrop-blur-xl p-2 rounded-3xl shadow-2xl border border-white/50 flex flex-col md:flex-row items-center gap-2 transition-all sticky top-0 z-20">
      <div className="flex-grow w-full relative">
        <input
          type="text"
          placeholder="A cosa stai lavorando?"
          className="w-full px-6 py-4 rounded-2xl border-0 bg-transparent text-lg font-bold text-gray-800 placeholder:text-gray-300 focus:ring-0 focus:outline-none transition-all"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!!activeEntry}
        />
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto p-2">
        {activeEntry ? (
           <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100">
               <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse"></div>
               <span className="font-bold text-sm text-indigo-900 truncate max-w-[120px]">
                   {selectedProject?.name}
               </span>
           </div>
        ) : (
            <div className="relative group">
                <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="appearance-none bg-gray-50 border border-gray-100 text-gray-700 font-bold text-sm py-3 pl-5 pr-12 rounded-2xl cursor-pointer hover:bg-white hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                    {projects.map(p => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                    ))}
                    {projects.length === 0 && <option value="">Nessun cliente</option>}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                    <ChevronDown size={18} />
                </div>
            </div>
        )}
        
        <div className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl min-w-[120px] shadow-lg shadow-slate-200">
          <TimerIcon size={16} className={activeEntry ? "animate-spin text-indigo-400" : "text-gray-500"} />
          <span className="font-mono text-xl font-black tracking-wider">
            {formatDuration(elapsed)}
          </span>
        </div>

        {activeEntry ? (
          <button
            onClick={onStop}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-xl shadow-red-200 active:scale-95 transform"
          >
            <Square size={16} fill="currentColor" /> Stop
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-xl shadow-indigo-200 active:scale-95 transform"
          >
            <Play size={16} fill="currentColor" /> Start
          </button>
        )}
      </div>
    </div>
  );
};

export default Timer;
