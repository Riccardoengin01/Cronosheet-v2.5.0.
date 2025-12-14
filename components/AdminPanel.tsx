import React, { useEffect, useState } from 'react';
import { UserProfile, BillingInfo } from '../types';
import * as DB from '../services/db';
import { Shield, Trash2, RefreshCw, Crown, Star, UserCog, Search, Ban, CheckCircle, X, Save, Calendar, Users, ArrowRight, Receipt, MapPin, Copy, FileText, ChevronDown } from 'lucide-react';

const AdminPanel = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Edit Modal State
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    
    // Form fields for editing - PROFILE
    const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
    const [editPlan, setEditPlan] = useState<'trial' | 'active' | 'pro' | 'elite' | 'expired'>('trial');
    const [editCreatedAt, setEditCreatedAt] = useState('');
    const [editTrialEnds, setEditTrialEnds] = useState('');
    const [editFullName, setEditFullName] = useState('');

    // Form fields for editing - BILLING
    const [editBilling, setEditBilling] = useState<BillingInfo>({});

    // CAUSALE GENERATOR
    const [selectedCausale, setSelectedCausale] = useState('');
    const [customCausale, setCustomCausale] = useState('');
    const [copiedCausale, setCopiedCausale] = useState(false);

    const CAUSALI_PRESETS = [
        "Canone di utilizzo piattaforma gestionale Cronosheet - Piano Pro",
        "Servizio di elaborazione dati e timesheet in cloud",
        "Accesso ai servizi telematici di calcolo e reportistica"
    ];

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const list = await DB.getAllProfiles();
        setUsers(list);
        setLoading(false);
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm('Sei sicuro? Questo rimuoverà il profilo e tutti i dati associati.')) {
            try {
                await DB.deleteUserAdmin(userId);
                loadUsers();
            } catch (e) {
                alert("Errore eliminazione utente");
            }
        }
    };

    const getDaysRemaining = (user: UserProfile) => {
        if (user.subscription_status === 'elite') return 'infinity';
        if (!user.trial_ends_at) return null;
        const end = new Date(user.trial_ends_at).getTime();
        const now = new Date().getTime();
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return diff;
    };

    // --- MODAL HANDLERS ---
    
    const openEditModal = (user: UserProfile) => {
        setEditingUser(user);
        setEditRole(user.role);
        setEditPlan(user.subscription_status);
        setEditFullName(user.full_name || '');
        setEditBilling(user.billing_info || {});
        
        // Reset Causale
        setSelectedCausale('');
        setCustomCausale('');
        setCopiedCausale(false);
        
        // Format dates for input type="date" (YYYY-MM-DD)
        setEditCreatedAt(user.created_at ? new Date(user.created_at).toISOString().slice(0, 10) : '');
        setEditTrialEnds(user.trial_ends_at ? new Date(user.trial_ends_at).toISOString().slice(0, 10) : '');
    };

    const closeEditModal = () => {
        setEditingUser(null);
    };

    const setTrialSixtyDays = () => {
        if (!editCreatedAt) return;
        const start = new Date(editCreatedAt);
        const end = new Date(start.setDate(start.getDate() + 60));
        setEditTrialEnds(end.toISOString().slice(0, 10));
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;
        
        try {
            // Fix Fuso Orario Date
            const finalCreatedAt = editCreatedAt 
                ? new Date(editCreatedAt + 'T12:00:00').toISOString() 
                : editingUser.created_at;

            const finalTrialEnds = editTrialEnds 
                ? new Date(editTrialEnds + 'T23:59:59').toISOString() 
                : editingUser.trial_ends_at;

            await DB.updateUserProfileAdmin({
                id: editingUser.id,
                role: editRole,
                subscription_status: editPlan,
                full_name: editFullName,
                created_at: finalCreatedAt,
                trial_ends_at: finalTrialEnds,
                is_approved: editingUser.is_approved,
                billing_info: editBilling // Salva i dati fatturazione modificati
            });
            await loadUsers();
            closeEditModal();
        } catch (e) {
            console.error(e);
            alert("Errore salvataggio modifiche. Controlla la console.");
        }
    };

    const handleToggleApproval = async (user: UserProfile) => {
        const newStatus = !user.is_approved;
        try {
            await DB.updateUserProfileAdmin({ id: user.id, is_approved: newStatus });
            loadUsers();
        } catch (e) {
            alert("Errore aggiornamento stato");
        }
    };

    const handleCausaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCausale(val);
        setCustomCausale(val === 'custom' ? '' : val);
    };

    const copyCausale = () => {
        navigator.clipboard.writeText(customCausale);
        setCopiedCausale(true);
        setTimeout(() => setCopiedCausale(false), 2000);
    };

    // Helper per aggiornare lo stato billing annidato
    const updateBilling = (field: keyof BillingInfo, value: string) => {
        setEditBilling(prev => ({ ...prev, [field]: value }));
    };

    // --- STATS & FILTER ---
    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        u.id.includes(searchTerm)
    );

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        pro: users.filter(u => u.subscription_status === 'pro').length,
        elite: users.filter(u => u.subscription_status === 'elite').length,
        pending: users.filter(u => !u.is_approved).length
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header e Statistiche */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg md:col-span-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Shield className="text-emerald-400" /> Pannello Master
                        </h2>
                        <p className="text-slate-400">Gestione centralizzata utenti, licenze e dati fatturazione.</p>
                    </div>
                    <button onClick={loadUsers} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><Users size={24} /></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Totale Utenti</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600"><Star size={24} /></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Pro / Elite</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.pro + stats.elite}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600"><Shield size={24} /></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Admin</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.admins}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${stats.pending > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {stats.pending > 0 ? <Ban size={24} /> : <CheckCircle size={24} />}
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Sospesi/In Attesa</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
                    </div>
                </div>
            </div>

            {/* Lista Utenti */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
                    <div className="relative flex-grow max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Cerca per email, nome o ID..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-6 py-4 border-b border-gray-200">Utente</th>
                                <th className="px-6 py-4 border-b border-gray-200">Stato</th>
                                <th className="px-6 py-4 border-b border-gray-200">Piano</th>
                                <th className="px-6 py-4 border-b border-gray-200">Giorni Rim.</th>
                                <th className="px-6 py-4 text-right border-b border-gray-200">Gestione</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.length === 0 && !loading && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nessun utente trovato</td></tr>
                            )}
                            {filteredUsers.map(u => {
                                const daysLeft = getDaysRemaining(u);
                                return (
                                    <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${u.role === 'admin' ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                                                    {u.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800 flex items-center gap-2">
                                                        {u.full_name || u.email}
                                                        {u.role === 'admin' && <Crown size={14} className="text-amber-500 fill-amber-500" />}
                                                    </div>
                                                    <div className="text-xs text-gray-400 font-mono" title={u.id}>
                                                        {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                             <button 
                                                onClick={() => handleToggleApproval(u)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                                                    u.is_approved 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                                                    : 'bg-red-50 text-red-700 border-red-100 hover:bg-emerald-50 hover:text-emerald-700'
                                                }`}
                                            >
                                                {u.is_approved ? 'Attivo' : 'Sospeso'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                 {u.subscription_status === 'elite' && <Crown size={14} className="text-amber-500" />}
                                                 {u.subscription_status === 'pro' && <Star size={14} className="text-indigo-500" />}
                                                 <span className="capitalize text-sm font-medium">{u.subscription_status}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {daysLeft === 'infinity' ? (
                                                <span className="text-xs font-bold px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
                                                    <Crown size={12} /> Illimitato
                                                </span>
                                            ) : daysLeft !== null ? (
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${(daysLeft as number) < 0 ? 'bg-red-100 text-red-600' : (daysLeft as number) < 7 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                                                    {(daysLeft as number) < 0 ? `Scaduto (${Math.abs(daysLeft as number)}gg)` : `${daysLeft} giorni`}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => openEditModal(u)}
                                                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold"
                                                >
                                                    <UserCog size={16} /> Gestisci
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(u.id)}
                                                    className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EDIT USER MODAL */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white sticky top-0 z-10">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <UserCog /> Modifica & Fatturazione
                            </h3>
                            <button onClick={closeEditModal} className="hover:bg-slate-700 p-2 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* INFO UTENTE BASICHE */}
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Account</p>
                                    <p className="font-bold text-slate-800">{editingUser.email}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 font-bold uppercase">ID</p>
                                    <p className="text-xs text-gray-400 font-mono">{editingUser.id}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* COLONNA SX: Dati Anagrafici */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-800 border-b pb-2">Profilo</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Nome Completo</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={editFullName}
                                            onChange={e => setEditFullName(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Ruolo</label>
                                            <select 
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                value={editRole}
                                                onChange={e => setEditRole(e.target.value as 'admin' | 'user')}
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Piano</label>
                                            <select 
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white uppercase"
                                                value={editPlan}
                                                onChange={e => setEditPlan(e.target.value as any)}
                                            >
                                                <option value="trial">Trial</option>
                                                <option value="pro">Pro</option>
                                                <option value="elite">Elite</option>
                                                <option value="expired">Expired</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Iscritto Dal</label>
                                            <input 
                                                type="date" 
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={editCreatedAt}
                                                onChange={e => setEditCreatedAt(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Scadenza</label>
                                            <input 
                                                type="date" 
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={editTrialEnds}
                                                onChange={e => setEditTrialEnds(e.target.value)}
                                                disabled={editPlan === 'elite'} 
                                            />
                                            {editPlan === 'trial' && (
                                                <button onClick={setTrialSixtyDays} className="text-[10px] text-indigo-600 font-bold hover:underline self-start mt-1">
                                                    Reset 60gg
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* COLONNA DX: Dati Fatturazione (Editabili) */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                                        <Receipt size={16} className="text-indigo-600"/> Dati Fatturazione
                                    </h4>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Intestatario</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={editBilling.company_name || ''}
                                            onChange={e => updateBilling('company_name', e.target.value)}
                                            placeholder="Ragione Sociale o Nome"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">P.IVA</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                                value={editBilling.vat_number || ''}
                                                onChange={e => updateBilling('vat_number', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Cod. Fiscale</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                                value={editBilling.tax_code || ''}
                                                onChange={e => updateBilling('tax_code', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">SDI</label>
                                            <input 
                                                type="text" 
                                                maxLength={7}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase"
                                                value={editBilling.sdi_code || ''}
                                                onChange={e => updateBilling('sdi_code', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Indirizzo</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={editBilling.address || ''}
                                                onChange={e => updateBilling('address', e.target.value)}
                                                placeholder="Via, Città, CAP"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TOOL CAUSALE PER INGEGNERE */}
                            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                <h4 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
                                    <FileText size={16} /> Generatore Causale Fattura (Tool Interno)
                                </h4>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <select 
                                            value={selectedCausale}
                                            onChange={handleCausaleChange}
                                            className="w-full appearance-none bg-white border border-indigo-200 text-gray-700 py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium cursor-pointer"
                                        >
                                            <option value="" disabled>Seleziona una causale tecnica suggerita...</option>
                                            {CAUSALI_PRESETS.map((c, i) => (
                                                <option key={i} value={c}>{c}</option>
                                            ))}
                                            <option value="custom">-- Scrivi Manualmente --</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={16} />
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <textarea 
                                            className="w-full p-3 border border-indigo-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none font-mono"
                                            value={customCausale}
                                            onChange={e => setCustomCausale(e.target.value)}
                                            placeholder="Seleziona una voce sopra o scrivi qui la causale per la fattura elettronica..."
                                        />
                                        <button 
                                            onClick={copyCausale}
                                            disabled={!customCausale}
                                            className="bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-600 rounded-lg px-4 flex flex-col items-center justify-center gap-1 transition-colors min-w-[80px]"
                                            title="Copia negli appunti"
                                        >
                                            {copiedCausale ? <CheckCircle size={20} className="text-green-500"/> : <Copy size={20}/>}
                                            <span className="text-[10px] font-bold uppercase">{copiedCausale ? 'Copiato' : 'Copia'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white border-t border-gray-100 pb-2">
                                <button onClick={closeEditModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                                    Annulla
                                </button>
                                <button onClick={handleSaveEdit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2">
                                    <Save size={18} /> Salva Modifiche
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;