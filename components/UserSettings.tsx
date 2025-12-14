import React, { useState } from 'react';
import { UserProfile, BillingInfo } from '../types';
import * as DB from '../services/db';
import { User, Shield, CheckCircle, Crown, Star, Clock, Zap, CreditCard, ArrowRight, Pencil, Save, X, Building, FileText, AlertCircle, ToggleLeft, ToggleRight, Calendar } from 'lucide-react';

interface UserSettingsProps {
    user: UserProfile;
    onProfileUpdate: () => void; // Funzione per forzare l'aggiornamento in App.tsx
}

const UserSettings: React.FC<UserSettingsProps> = ({ user, onProfileUpdate }) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    
    // Anagrafica Base
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(user.full_name || '');

    // Dati Fatturazione
    const [isEditingBilling, setIsEditingBilling] = useState(false);
    const [billingInfo, setBillingInfo] = useState<BillingInfo>(user.billing_info || {});
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    
    // Auto Renewal State
    const [autoRenew, setAutoRenew] = useState(user.auto_renew !== undefined ? user.auto_renew : true);
    const [updatingRenew, setUpdatingRenew] = useState(false);

    const getTrialEndDate = () => {
        if (!user.trial_ends_at) return new Date(); 
        return new Date(user.trial_ends_at);
    };

    const trialEnd = getTrialEndDate();
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    const totalTrialDays = 60;
    const progress = Math.max(0, Math.min(100, ((totalTrialDays - daysLeft) / totalTrialDays) * 100));

    const displayId = user.full_name && user.full_name.trim() !== '' ? user.full_name : user.email.split('@')[0];
    const memberSinceDate = user.created_at ? new Date(user.created_at) : new Date();

    const handleSaveName = async () => {
        try {
            await DB.updateUserProfile(user.id, { full_name: tempName });
            setIsEditingName(false);
            onProfileUpdate(); // Refresh global state
        } catch (error) {
            alert('Errore nel salvataggio del nome.');
        }
    };

    const handleSaveBilling = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveStatus('saving');
        try {
            await DB.updateUserProfile(user.id, { billing_info: billingInfo });
            setSaveStatus('success');
            setTimeout(() => {
                setIsEditingBilling(false);
                setSaveStatus('idle');
                onProfileUpdate(); // Refresh global state
            }, 1000);
        } catch (error) {
            console.error(error);
            setSaveStatus('error');
        }
    };
    
    const handleToggleAutoRenew = async () => {
        setUpdatingRenew(true);
        const newValue = !autoRenew;
        try {
            await DB.updateUserProfile(user.id, { auto_renew: newValue });
            setAutoRenew(newValue);
            onProfileUpdate(); // Refresh global state
        } catch (error) {
            console.error(error);
            alert("Errore salvataggio. Probabilmente manca la colonna 'auto_renew' nel database. Esegui lo script di migrazione in Database Setup.");
        } finally {
            setUpdatingRenew(false);
        }
    };

    const updateBillingField = (field: keyof BillingInfo, value: string) => {
        setBillingInfo(prev => ({ ...prev, [field]: value }));
    };

    const plans = [
        {
            id: 'trial',
            name: 'Start',
            price: 'Gratis',
            annualPrice: 'Gratis',
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
            features: ['Voci Illimitate', 'Statistiche Avanzate', 'Export Completo', 'Nessun Limite di Tempo'],
            current: user.subscription_status === 'pro',
            color: 'bg-white border-indigo-200 shadow-xl shadow-indigo-100 ring-1 ring-indigo-50',
            buttonColor: 'bg-indigo-600 text-white hover:bg-indigo-700',
            icon: <Star className="text-indigo-500 fill-indigo-500" />
        }
    ];

    const handleUpgrade = (planName: string) => {
        // Controllo validazione Dati Fiscali prima dell'acquisto
        const hasBillingInfo = user.billing_info && (user.billing_info.tax_code || user.billing_info.vat_number);
        
        if (!hasBillingInfo) {
            alert("⚠️ Attenzione: Per procedere all'acquisto e ricevere regolare fattura, devi prima compilare i 'Dati di Fatturazione' in questa pagina.");
            document.getElementById('billing-section')?.scrollIntoView({ behavior: 'smooth' });
            setIsEditingBilling(true);
            return;
        }

        const selectedPlan = plans.find(p => p.name === planName);
        const price = billingCycle === 'annual' ? selectedPlan?.annualPrice : selectedPlan?.price;
        alert(`Integrazione PayPal in arrivo.\n\nStai per acquistare il piano ${planName} (${billingCycle === 'annual' ? 'Annuale' : 'Mensile'}) a ${price}.`);
    };

    return (
        <div className="animate-fade-in space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Il mio Profilo</h1>
                    <p className="text-gray-500 mt-1">Gestisci le tue informazioni e il piano di abbonamento.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Colonna Sinistra: Anagrafica & Fatturazione */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* Card Utente */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-indigo-50 to-transparent"></div>
                        <div className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-lg border-4 border-white ${user.role === 'admin' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-700'}`}>
                            {user.email.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 break-all">{displayId}</h2>
                        <span className="text-sm text-gray-500 mb-4 break-all">{user.email}</span>
                        
                        <div className="flex flex-wrap justify-center gap-2">
                             <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase border border-slate-200 flex items-center gap-1">
                                 <User size={12} /> {user.role}
                             </span>
                        </div>
                    </div>

                    {/* Dettagli Base */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Shield size={18} className="text-indigo-500"/> Dettagli Account
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="py-2 border-b border-gray-50">
                                <span className="text-gray-500 block mb-1">Nome Visualizzato</span>
                                <div className="flex items-center justify-between gap-2">
                                    {isEditingName ? (
                                        <div className="flex items-center gap-2 w-full">
                                            <input 
                                                type="text" 
                                                value={tempName}
                                                onChange={(e) => setTempName(e.target.value)}
                                                className="w-full border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            <button onClick={handleSaveName} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Save size={16}/></button>
                                            <button onClick={() => setIsEditingName(false)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16}/></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-mono text-gray-700 text-sm font-bold bg-gray-100 px-2 py-1 rounded truncate max-w-[160px]" title={user.id}>
                                                {displayId}
                                            </span>
                                            <button onClick={() => { setTempName(user.full_name || displayId); setIsEditingName(true); }} className="text-gray-400 hover:text-indigo-600 p-1 transition-colors">
                                                <Pencil size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Membro dal</span>
                                <span className="text-gray-700 font-medium">{memberSinceDate.toLocaleDateString('it-IT')}</span> 
                            </div>
                        </div>
                    </div>

                    {/* Dati Fatturazione */}
                    <div id="billing-section" className={`bg-white rounded-2xl shadow-sm border p-6 transition-all ${isEditingBilling ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <FileText size={18} className="text-indigo-500"/> Dati di Fatturazione
                            </h3>
                            {!isEditingBilling && (
                                <button onClick={() => setIsEditingBilling(true)} className="text-sm text-indigo-600 font-bold hover:underline flex items-center gap-1">
                                    <Pencil size={14} /> Modifica
                                </button>
                            )}
                        </div>

                        {!isEditingBilling ? (
                            <div className="text-sm space-y-3">
                                {user.billing_info && (user.billing_info.tax_code || user.billing_info.vat_number) ? (
                                    <>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <p className="font-bold text-gray-800">{user.billing_info.company_name || user.full_name || 'N/D'}</p>
                                            <p className="text-gray-600">{user.billing_info.address}</p>
                                            <p className="text-gray-600">{user.billing_info.zip} {user.billing_info.city} ({user.billing_info.country})</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                            <div>
                                                <span className="block font-bold">P.IVA:</span> {user.billing_info.vat_number || '-'}
                                            </div>
                                            <div>
                                                <span className="block font-bold">Cod. Fiscale:</span> {user.billing_info.tax_code || '-'}
                                            </div>
                                            <div>
                                                <span className="block font-bold">SDI:</span> {user.billing_info.sdi_code || '-'}
                                            </div>
                                            <div>
                                                <span className="block font-bold">PEC:</span> {user.billing_info.pec || '-'}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-amber-600 bg-amber-50 p-3 rounded-lg text-xs flex gap-2 items-start">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <p>Nessun dato fiscale inserito. Necessario per l'emissione della fattura in caso di acquisto.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSaveBilling} className="space-y-3 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Ragione Sociale / Nome e Cognome *</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                        placeholder="Es. Mario Rossi o Rossi S.r.l."
                                        value={billingInfo.company_name || ''}
                                        onChange={e => updateBillingField('company_name', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Indirizzo *</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                            placeholder="Via Roma 1"
                                            value={billingInfo.address || ''}
                                            onChange={e => updateBillingField('address', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Città *</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                            value={billingInfo.city || ''}
                                            onChange={e => updateBillingField('city', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">CAP *</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                            value={billingInfo.zip || ''}
                                            onChange={e => updateBillingField('zip', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                                     <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Partita IVA</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none font-mono"
                                            placeholder="IT..."
                                            value={billingInfo.vat_number || ''}
                                            onChange={e => updateBillingField('vat_number', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Codice Fiscale *</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none font-mono uppercase"
                                            value={billingInfo.tax_code || ''}
                                            onChange={e => updateBillingField('tax_code', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Codice SDI</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none font-mono uppercase"
                                            maxLength={7}
                                            placeholder="0000000"
                                            value={billingInfo.sdi_code || ''}
                                            onChange={e => updateBillingField('sdi_code', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">PEC</label>
                                        <input 
                                            type="email" 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                            value={billingInfo.pec || ''}
                                            onChange={e => updateBillingField('pec', e.target.value)}
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex justify-end gap-2 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsEditingBilling(false)}
                                        className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium"
                                    >
                                        Annulla
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={saveStatus === 'saving'}
                                        className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 flex items-center gap-2"
                                    >
                                        {saveStatus === 'saving' ? 'Salvataggio...' : <><Save size={14}/> Salva Dati</>}
                                    </button>
                                </div>
                                {saveStatus === 'success' && <p className="text-xs text-green-600 font-bold text-center">Dati salvati correttamente!</p>}
                            </form>
                        )}
                    </div>
                </div>

                {/* Colonna Destra: Piani e Abbonamento */}
                <div className="lg:col-span-7 space-y-8">
                    
                    {/* Status Card */}
                    <div className="bg-slate-900 text-white rounded-2xl shadow-lg p-8 relative overflow-hidden">
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
                                    {user.subscription_status === 'elite' && "Licenza a vita. Nessuna scadenza."}
                                    
                                    {user.subscription_status === 'trial' && `Hai ancora ${daysLeft} giorni di prova gratuita.`}
                                    
                                    {user.subscription_status === 'pro' && (
                                        autoRenew 
                                        ? `Il tuo abbonamento è attivo e si rinnoverà il ${trialEnd.toLocaleDateString('it-IT')}.`
                                        : `Il tuo abbonamento scadrà il ${trialEnd.toLocaleDateString('it-IT')}. Non si rinnoverà.`
                                    )}
                                </p>
                            </div>

                            {user.subscription_status !== 'elite' && user.subscription_status !== 'pro' && (
                                <div className="bg-slate-800 p-1.5 rounded-xl inline-flex items-center border border-slate-700">
                                    <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}>
                                        Mensile
                                    </button>
                                    <button onClick={() => setBillingCycle('annual')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}>
                                        Annuale <span className="text-[10px] bg-green-500 text-white px-1.5 rounded-full ml-1">-17%</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* BARRA PROGRESSO: Solo per TRIAL */}
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
                        
                        {/* Indicazione rinnovo PRO e TOGGLE */}
                        {user.subscription_status === 'pro' && (
                             <div className="mt-8 bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className={autoRenew ? "text-emerald-400" : "text-amber-400"} size={20} />
                                    <div>
                                        <p className="text-sm font-bold text-white">
                                            {autoRenew ? 'Rinnovo Automatico Attivo' : 'Rinnovo Automatico Disattivato'}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {autoRenew 
                                                ? `Prossimo addebito: ${trialEnd.toLocaleDateString('it-IT')}`
                                                : `Scadenza servizio: ${trialEnd.toLocaleDateString('it-IT')}`
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleToggleAutoRenew}
                                    disabled={updatingRenew}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        autoRenew 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20' 
                                        : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                                    }`}
                                >
                                    {updatingRenew ? 'Aggiornamento...' : (
                                        <>
                                            {autoRenew ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                            {autoRenew ? 'Disabilita' : 'Abilita'}
                                        </>
                                    )}
                                </button>
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
                            <span>Pagamenti sicuri e fatturazione conforme normativa vigente.</span>
                        </div>
                        <a href="#" className="text-indigo-600 font-bold hover:underline">Scarica Fatture Precedenti</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserSettings;