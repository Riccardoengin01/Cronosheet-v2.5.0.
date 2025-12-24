
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Lock, Loader2, CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';
import { useLanguage } from '../lib/i18n';

interface AuthProps {
    onLoginSuccess: (user: UserProfile) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const { t } = useLanguage();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });

        if (error) throw error;
        
        if (data.user && data.user.identities && data.user.identities.length === 0) {
             setMessage({ type: 'error', text: 'Utente già registrato. Prova ad accedere.' });
        } else {
             setMessage({ type: 'success', text: 'Registrazione inviata! Controlla la tua email e clicca sul link per confermare.' });
             setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Errore durante l\'autenticazione' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-90"></div>
            <div className="relative z-10">
                <div className="flex justify-center mb-4">
                    <ShieldCheck className="w-16 h-16 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2 italic tracking-tighter">FluxLedger ERP</h1>
                <p className="text-indigo-100 text-xs font-black uppercase tracking-widest">Digital Rights Protected</p>
            </div>
        </div>

        <div className="p-8">
            <h2 className="text-xl font-black text-gray-800 mb-6 text-center uppercase tracking-tight">
                {isSignUp ? "Crea Account Professionale" : "Accesso Sistema Ledger"}
            </h2>

            {message && (
                <div className={`p-4 rounded-lg mb-6 text-sm flex items-start gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {message.type === 'success' ? <CheckCircle size={16} className="mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email di Lavoro</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="email" 
                            required
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                            placeholder="tu@studio.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="password" 
                            required
                            minLength={6}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 flex justify-center items-center gap-2"
                >
                    {loading && <Loader2 className="animate-spin" size={18} />}
                    {isSignUp ? "Registrati al Portale" : "Entra nel Ledger"}
                </button>
            </form>

            <div className="mt-8 text-center border-t border-gray-100 pt-6">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-tighter">
                    {isSignUp ? "Hai già un account?" : "Nuovo professionista?"}
                    <button 
                        onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
                        className="text-indigo-600 font-black ml-2 hover:underline"
                    >
                        {isSignUp ? "Accedi" : "Crea Profilo"}
                    </button>
                </p>
                <div className="mt-6 pt-6 border-t border-gray-50">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-relaxed">
                        Developed and Protected by<br/>
                        <span className="text-slate-900">Engineer Riccardo Righini</span><br/>
                        © {new Date().getFullYear()} • All Rights Reserved
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
