import React, { useState } from 'react';
import { Project, TimeEntry } from '../types';
import { analyzeTimeData } from '../services/geminiService';
import { Bot, Sparkles, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIAssistantProps {
  entries: TimeEntry[];
  projects: Project[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ entries, projects }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await analyzeTimeData(entries, projects);
    setAnalysis(result || 'No response from AI.');
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6 rounded-2xl shadow-xl animate-fade-in relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500 opacity-10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl pointer-events-none"></div>

        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <Bot size={24} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Gemini Assistant</h2>
            </div>

            <p className="text-indigo-100 mb-8 max-w-2xl text-lg leading-relaxed">
                Unlock insights into your productivity. Let Google's Gemini AI analyze your timesheet to summarize your week, draft status reports, and spot work patterns.
            </p>

            {!analysis && !loading && (
                <button
                    onClick={handleAnalyze}
                    className="group bg-white text-indigo-600 hover:bg-indigo-50 px-8 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center gap-3 active:scale-95"
                >
                    <Sparkles className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
                    Analyze My Week
                </button>
            )}

            {loading && (
                <div className="flex items-center gap-3 text-indigo-200 bg-white/10 p-4 rounded-xl w-fit">
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     <span>Connecting to Gemini...</span>
                </div>
            )}

            {analysis && (
                <div className="bg-white/95 text-slate-800 rounded-xl p-6 shadow-2xl backdrop-blur-sm border border-white/20 animate-slide-up">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-indigo-700 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> AI Analysis
                        </h3>
                        <button 
                            onClick={() => setAnalysis(null)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <XCircle size={20} />
                        </button>
                    </div>
                    
                    <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
                        <ReactMarkdown>{analysis}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default AIAssistant;