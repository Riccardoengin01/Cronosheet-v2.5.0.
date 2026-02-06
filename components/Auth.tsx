
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Lock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Registrazione inviata! Controlla la tua email per confermare il profilo.' });
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Errore durante l\'autenticazione' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 grid lg:grid-cols-[1.1fr_1fr]">
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-950 via-indigo-900 to-indigo-600 p-12 text-white">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_55%)]"></div>
          <div className="relative z-10 space-y-6">
            <ShieldCheck className="w-16 h-16 text-white drop-shadow-2xl" />
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter uppercase">FluxLedger</h1>
              <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em]">Professional Rights Management</p>
            </div>
            <div className="space-y-4 text-sm font-semibold text-indigo-100">
              <div className="flex items-center gap-3">
                <CheckCircle size={18} />
                <span>Monitoraggio ore in tempo reale con report avanzati.</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={18} />
                <span>Billing smart con esportazioni e riepiloghi mensili.</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={18} />
                <span>Accesso sicuro con profili professionali verificati.</span>
              </div>
            </div>
          </div>
          <div className="relative z-10 text-xs uppercase tracking-[0.2em] text-indigo-100/80">
            Software by Ingi.RiccardoRighini • © 2026 Tutti i diritti riservati
          </div>
        </div>

        <div className="p-8 sm:p-12">
          <div className="lg:hidden text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-600 shadow-xl">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">FluxLedger</h1>
            <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.3em]">Professional Rights Management</p>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl mb-6 text-sm flex items-start gap-3 font-bold ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Professionale</label>
              <input 
                type="email" required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                placeholder="studio@azienda.it"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chiave d'Accesso</label>
              <input 
                type="password" required minLength={6}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl active:scale-95 flex justify-center items-center gap-3 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : isSignUp ? "Crea Account Professionale" : "Entra nel Sistema"}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline cursor-pointer"
            >
              {isSignUp ? "Ho già un profilo" : "Richiedi Registrazione"}
            </button>
            
            <div className="mt-10 pt-8 border-t border-slate-50">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-relaxed">
                Ingi.RiccardoRighini<br/>
                © 2026 • Tutti i diritti riservati
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
