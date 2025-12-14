import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import * as DB from '../services/db';
import { Check, Shield, Trash2, RefreshCw, Crown, Star, Clock, UserCog, User, Search, Ban, CheckCircle, Pencil, X, Save, Calendar, Users, ArrowRight, Receipt, MapPin } from 'lucide-react';

const AdminPanel = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Edit Modal State
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    // Form fields for editing
    const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
    const [editPlan, setEditPlan] = useState<'trial' | 'active' | 'pro' | 'elite' | 'expired'>('trial');
    const [editCreatedAt, setEditCreatedAt] = useState('');
    const [editTrialEnds, setEditTrialEnds] = useState('');
    const [editFullName, setEditFullName] = useState('');

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
        // Elite non scade mai
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
        // Aggiungi 60 giorni
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
                is_approved: editingUser.is_approved
            });
            await loadUsers();
            closeEditModal();
        } catch (e) {
            console.error(e);
            alert("Errore salvataggio modifiche");
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

    // --- STATS & FILTER ---
    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        pro: users.filter(u => u.subscription_status === 'pro').length,
        elite: users.filter(u => u.subscription_status === 'elite').length,
        pending: users.filter(u => !u.is_approved).length
    };

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        u.id.includes(searchTerm)
    );

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header e Statistiche */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg md:col-span-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Shield className="text-emerald-400" /> Pannello Master
                        </h2>
                        <p className="text-slate-400">Gestione centralizzata utenti, licenze e date.</p>
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
                                        {/* Utente */}
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

                                        {/* Stato */}
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

                                        {/* Piano */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                 {u.subscription_status === 'elite' && <Crown size={14} className="text-amber-500" />}
                                                 {u.subscription_status === 'pro' && <Star size={14} className="text-indigo-500" />}
                                                 <span className="capitalize text-sm font-medium">{u.subscription_status}</span>
                                            </div>
                                        </td>

                                        {/* Giorni Rimanenti */}
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

                                        {/* Azioni */}
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white sticky top-0 z-10">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <UserCog /> Modifica Utente
                            </h3>
                            <button onClick={closeEditModal} className="hover:bg-slate-700 p-2 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                                <p className="text-xs text-gray-500 font-bold uppercase">Utente Selezionato</p>
                                <p className="font-bold text-slate-800">{editingUser.email}</p>
                                <p className="text-xs text-gray-400 font-mono">{editingUser.id}</p>
                            </div>

                            {/* Form fields... */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={editFullName}
                                    onChange={e => setEditFullName(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Ruolo</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        value={editRole}
                                        onChange={e => setEditRole(e.target.value as 'admin' | 'user')}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Piano</label>
                                    <select 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white uppercase"
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

                            {/* Dati Fatturazione Cliente - NEW SECTION */}
                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                                    <Receipt size={16} /> Dati Fatturazione Cliente
                                </h4>
                                {editingUser.billing_info && (editingUser.billing_info.tax_code || editingUser.billing_info.vat_number) ? (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm space-y-1">
                                        <p><strong className="text-slate-500">Intestatario:</strong> {editingUser.billing_info.company_name}</p>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            <p><strong className="text-slate-500">P.IVA:</strong> <span className="font-mono">{editingUser.billing_info.vat_number || '-'}</span></p>
                                            <p><strong className="text-slate-500">C.F.:</strong> <span className="font-mono">{editingUser.billing_info.tax_code}</span></p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <p><strong className="text-slate-500">SDI:</strong> <span className="font-mono">{editingUser.billing_info.sdi_code || '-'}</span></p>
                                            <p><strong className="text-slate-500">PEC:</strong> {editingUser.billing_info.pec || '-'}</p>
                                        </div>
                                        <p className="flex items-start gap-1 mt-1">
                                            <MapPin size={14} className="shrink-0 mt-0.5 text-slate-400"/> 
                                            {editingUser.billing_info.address}, {editingUser.billing_info.city} ({editingUser.billing_info.zip})
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-700 text-xs italic">
                                        Nessun dato fiscale inserito dall'utente.
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="text-sm font-bold text-indigo-600 mb-3 flex items-center gap-2">
                                    <Calendar size={16} /> Gestione Temporale
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Membro Dal</label>
                                        <input 
                                            type="date" 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={editCreatedAt}
                                            onChange={e => setEditCreatedAt(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Scadenza Piano</label>
                                        <input 
                                            type="date" 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-1"
                                            value={editTrialEnds}
                                            onChange={e => setEditTrialEnds(e.target.value)}
                                            disabled={editPlan === 'elite'} // Disabilita per Elite
                                        />
                                        {editPlan === 'trial' && (
                                            <button 
                                                onClick={setTrialSixtyDays}
                                                className="text-[10px] text-indigo-600 font-bold hover:underline self-start flex items-center gap-1"
                                            >
                                                <ArrowRight size={10} /> Reset 60gg
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white border-t border-gray-100 pb-2">
                                <button onClick={closeEditModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                                    Annulla
                                </button>
                                <button onClick={handleSaveEdit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2">
                                    <Save size={18} /> Salva
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