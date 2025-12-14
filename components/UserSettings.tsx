import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, Mail, Shield, CheckCircle, Crown, Star, Clock, Zap, CreditCard, ArrowRight } from 'lucide-react';

interface UserSettingsProps {
    user: UserProfile;
}

const UserSettings: React.FC<UserSettingsProps> = ({ user }) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

    const getTrialEndDate = () => {
        // Se la data nel DB è valida, la usiamo così com'è. 
        // Questo permette al conteggio di scendere realmente ogni giorno.
        return new Date(user.trial_ends_at);
    };

    const trialEnd = getTrialEndDate();
    const now = new Date();
    // Calcolo giorni rimanenti reali
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    // Barra progresso basata su 60 giorni totali
    const totalTrialDays = 60;
    const progress = Math.max(0, Math.min(100, ((totalTrialDays - daysLeft) / totalTrialDays) * 100));

    // Estrazione Username dall'email per visualizzazione User ID
    const username = user.email.split('@')[0];

    // Data di creazione (se manca, usa un calcolo approssimativo basato sulla fine della trial - 60gg)
    const memberSinceDate = user.created_at 
        ? new Date(user.created_at) 
        : new Date(new Date(user.trial_ends_at).getTime() - (60 * 24 * 60 * 60 * 1000));

    // Definiamo i piani prima per poter accedere ai prezzi nell'handler
    const plans = [
        {
            id: 'trial',
            name: 'Start',
            price: 'Gratis',
            annualPrice: 'Gratis',
            // Regola: Max 15 voci (non copre un mese lavorativo intero)
            features: ['Registro Orari (Max 15 voci)', 'Export PDF Base', 'Durata Limite: 60 giorni'],
            current: user.subscription_status === 'trial',
            color: 'bg-slate-100 border-slate-200',
            buttonColor: 'bg-slate-200 text-slate-600',
            icon: <Clock className="text-slate-500" />
        },
        {
            id: 'pro',
            name: 'Pro',
            price: '€9.99',
            annualPrice: '€99.00',
            saveLabel: '-17%',
            // Regola: Tolto Gemini e Supporto, tenuto Statistiche e Voci Illimitate
            features: ['Voci Illimitate', 'Statistiche Avanzate', 'Export Completo', 'Nessun Limite di Tempo'],
            current: user.subscription_status === 'pro',
            color: 'bg-white border-indigo-200 shadow-xl shadow-indigo-100 ring-1 ring-indigo-50',
            buttonColor: 'bg-indigo-600 text-white hover:bg-indigo-700',
            icon: <Star className="text-indigo-500 fill-indigo-500" />
        }
    ];

    const handleUpgrade = (planName: string) => {
        const selectedPlan = plans.find(p => p.name === planName);
        const price = billingCycle === 'annual' ? selectedPlan?.annualPrice : selectedPlan?.price;
        
        alert(`Integrazione PayPal in arrivo.\n\nStai per acquistare il piano ${planName} (${billingCycle === 'annual' ? 'Annuale' : 'Mensile'}) a ${price}.\n\nReindirizzamento al gateway sicuro PayPal...`);
    };

    return (
        <div className="animate-fade-in space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Il mio Profilo</h1>
                    <p className="text-gray-500 mt-1">Gestisci le tue informazioni e il piano di abbonamento.</p>
                </div>
                
                {/* User Header Summary for Mobile */}
                <div className="md:hidden flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${user.role === 'admin' ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                        {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800 truncate max-w-[150px]">{user.email}</p>
                        <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Colonna Sinistra: Info Utente (4/12) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-indigo-50 to-transparent"></div>
                        <div className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-lg border-4 border-white ${user.role === 'admin' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-700'}`}>
                            {user.email.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 break-all">{username}</h2>
                        <span className="text-sm text-gray-500 mb-4 break-all">{user.email}</span>
                        
                        <div className="flex flex-wrap justify-center gap-2">
                             <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase border border-slate-200 flex items-center gap-1">
                                 <User size={12} /> {user.role}
                             </span>
                             {user.is_approved && (
                                 <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold uppercase border border-emerald-100 flex items-center gap-1">
                                     <CheckCircle size={12} /> Verificato
                                 </span>
                             )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Shield size={18} className="text-indigo-500"/> Dettagli Account
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">User ID</span>
                                {/* QUI MOSTRIAMO LO USERNAME INVECE DELL'ID UUID */}
                                <span className="font-mono text-gray-700 text-sm font-bold bg-gray-100 px-2 py-1 rounded truncate max-w-[140px]" title={user.id}>
                                    {username}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Membro dal</span>
                                {/* QUI MOSTRIAMO LA DATA DI CREAZIONE ACCOUNT */}
                                <span className="text-gray-700 font-medium">{memberSinceDate.toLocaleDateString('it-IT')}</span> 
                            </div>
                            <div className="pt-2">
                                <button className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 w-full justify-center py-2 border border-indigo-100 rounded-lg hover:bg-indigo-50 transition-colors">
                                    <Mail size={12} /> Cambia Email / Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Colonna Destra: Piani e Pagamenti (8/12) */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Status Card & Billing Switch */}
                    <div className="bg-slate-900 text-white rounded-2xl shadow-lg p-8 relative overflow-hidden">
                        {/* Background pattern */}
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            {user.subscription_status === 'elite' ? <Crown size={150} /> : <Zap size={150} />}
                        </div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <p className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-1">Piano Attuale</p>
                                <h2 className="text-4xl font-bold text-white capitalize flex items-center gap-3">
                                    {user.subscription_status}
                                    {user.subscription_status === 'elite' && <Crown className="text-amber-400 fill-amber-400" size={32} />}
                                    {user.subscription_status === 'pro' && <Star className="text-indigo-400 fill-indigo-400" size={32} />}
                                </h2>
                                <p className="text-slate-400 mt-2 text-sm max-w-sm">
                                    {user.subscription_status === 'trial' 
                                        ? `Hai ancora ${daysLeft} giorni di prova gratuita.` 
                                        : user.subscription_status === 'elite' 
                                            ? 'Licenza Founder / Elite attiva.' 
                                            : 'Il tuo abbonamento è attivo e si rinnoverà automaticamente.'}
                                </p>
                            </div>

                            {/* Billing Cycle Switch */}
                            <div className="bg-slate-800 p-1.5 rounded-xl inline-flex items-center border border-slate-700">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Mensile
                                </button>
                                <button
                                    onClick={() => setBillingCycle('annual')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Annuale <span className="text-[10px] bg-green-500 text-white px-1.5 rounded-full ml-1">-17%</span>
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar for Trial */}
                        {user.subscription_status === 'trial' && (
                             <div className="mt-8">
                                <div className="flex justify-between text-xs font-semibold mb-2 text-slate-400">
                                    <span>Inizio Prova (60gg)</span>
                                    <span>Scadenza: {trialEnd.toLocaleDateString('it-IT')}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                </div>
                             </div>
                        )}
                    </div>

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {plans.map(plan => {
                            const currentPrice = billingCycle === 'annual' ? plan.annualPrice : plan.price;
                            const isCurrent = plan.current;
                            
                            return (
                                <div key={plan.id} className={`rounded-2xl p-6 border-2 transition-all flex flex-col relative ${isCurrent ? 'border-indigo-500 ring-4 ring-indigo-50/50 z-10 transform md:-translate-y-2' : 'border-gray-200 bg-white hover:border-gray-300'} ${plan.color}`}>
                                    
                                    {plan.saveLabel && billingCycle === 'annual' && (
                                        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg">
                                            Risparmia {plan.saveLabel}
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
                                            {plan.icon}
                                        </div>
                                        <h4 className="font-bold text-xl text-gray-800">{plan.name}</h4>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-2xl font-bold text-gray-900">{currentPrice}</span>
                                            {plan.price !== 'Gratis' && <span className="text-gray-500 text-sm">/{billingCycle === 'annual' ? 'anno' : 'mese'}</span>}
                                        </div>
                                    </div>

                                    <ul className="space-y-3 mb-8 flex-grow">
                                        {plan.features.map((feat, i) => (
                                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                <CheckCircle size={16} className={`shrink-0 mt-0.5 ${isCurrent ? 'text-indigo-600' : 'text-gray-400'}`} />
                                                <span className="leading-tight">{feat}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button 
                                        onClick={() => !isCurrent && handleUpgrade(plan.name)}
                                        disabled={isCurrent}
                                        className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${plan.buttonColor} ${isCurrent ? 'opacity-50 cursor-default' : 'shadow-lg shadow-indigo-100 hover:scale-[1.02]'}`}
                                    >
                                        {isCurrent ? (
                                            <>Piano Attuale</>
                                        ) : (
                                            <>Passa a {plan.name} <ArrowRight size={16}/></>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-3">
                            <CreditCard className="text-gray-400" />
                            <span>Pagamenti sicuri e crittografati tramite PayPal.</span>
                        </div>
                        <a href="#" className="text-indigo-600 font-bold hover:underline">Scarica Fatture Precedenti</a>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default UserSettings;