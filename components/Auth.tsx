import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Lock, Loader2, CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // CORREZIONE QUI: Aggiungiamo emailRedirectTo
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin // Reindirizza all'URL attuale (Vercel)
          }
        });

        if (error) throw error;
        
        // Check if user already exists but fake confirm
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
        // onLoginSuccess is handled by the auth state listener in App.tsx
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
                <h1 className="text-3xl font-bold text-white mb-2">Cronosheet SaaS</h1>
                <p className="text-indigo-200">Gestione orari Cloud & Sicura</p>
            </div>
        </div>

        <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
                {isSignUp ? 'Crea il tuo profilo' : 'Accedi al tuo profilo'}
            </h2>

            {message && (
                <div className={`p-4 rounded-lg mb-6 text-sm flex items-start gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {message.type === 'success' ? <CheckCircle size={16} className="mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="email" 
                            required
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="password" 
                            required
                            minLength={6}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex justify-center items-center gap-2"
                >
                    {loading && <Loader2 className="animate-spin" size={18} />}
                    {isSignUp ? 'Registrati' : 'Accedi'}
                </button>
            </form>

            <div className="mt-6 text-center border-t border-gray-100 pt-6">
                <p className="text-gray-600 text-sm">
                    {isSignUp ? 'Hai già un account?' : 'Non hai un profilo?'}
                    <button 
                        onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
                        className="text-indigo-600 font-bold ml-2 hover:underline"
                    >
                        {isSignUp ? 'Accedi' : 'Registrati ora'}
                    </button>
                </p>
                {isSignUp && (
                    <p className="text-xs text-gray-400 mt-2">
                        60 giorni di prova inclusi.
                    </p>
                )}
                <div className="mt-4">
                    <button 
                        onClick={() => setShowPolicy(true)}
                        className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 w-full"
                    >
                        <FileText size={12} /> Privacy & Policy Dati
                    </button>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 text-[10px] text-gray-400 font-medium">
                     © {new Date().getFullYear()} Engineer Riccardo Righini
                </div>
            </div>
        </div>
      </div>

      {/* Privacy Modal */}
      {showPolicy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Privacy & Isolamento Dati</h3>
                  <div className="prose prose-sm text-gray-600 space-y-3">
                      <p>
                          <strong>Database Cloud Sicuro:</strong> I tuoi dati sono salvati su server sicuri (Supabase/PostgreSQL) e non nel tuo browser.
                      </p>
                      <p>
                          <strong>Isolamento Utenti:</strong> Ogni profilo utente è strettamente isolato tramite Row Level Security (RLS). Il database rifiuta automaticamente qualsiasi richiesta di leggere dati che non appartengono al tuo User ID.
                      </p>
                      <p>
                          <strong>Nessuna Sovrapposizione:</strong> È tecnicamente impossibile vedere i clienti o gli orari di un altro utente.
                      </p>
                  </div>
                  <button 
                    onClick={() => setShowPolicy(false)}
                    className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg font-bold"
                  >
                      Ho capito
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Auth;