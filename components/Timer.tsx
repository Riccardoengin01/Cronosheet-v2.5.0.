import React, { useState, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
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
      
      // Initial set
      setElapsed(Math.floor((Date.now() - activeEntry.startTime) / 1000));

      return () => clearInterval(interval);
    } else {
      setElapsed(0);
      // Don't clear description to allow quick restart of similar task
    }
  }, [activeEntry]);

  const handleStart = () => {
    onStart(description, projectId);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center gap-4 transition-all sticky top-0 z-10">
      <div className="flex-grow w-full relative">
        <input
          type="text"
          placeholder="What are you working on?"
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!!activeEntry}
        />
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
        {activeEntry ? (
           <div className="flex items-center gap-2">
               <span className="font-semibold text-lg font-mono text-gray-700 min-w-[5rem]">
                   {projects.find(p => p.id === projectId)?.name}
               </span>
           </div>
        ) : (
            <div className="relative">
                <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500"
                >
                    {projects.map(p => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        )}
        
        <div className="font-mono text-xl font-bold w-24 text-center text-slate-700">
          {formatDuration(elapsed)}
        </div>

        {activeEntry ? (
          <button
            onClick={onStop}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transform"
          >
            <Square size={18} fill="currentColor" /> Stop
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transform"
          >
            <Play size={18} fill="currentColor" /> Start
          </button>
        )}
      </div>
    </div>
  );
};

export default Timer;