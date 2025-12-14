import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import * as DB from '../services/db';
import { Check, Shield, Trash2, RefreshCw, Crown, Star, Clock, UserCog, User, Search, TrendingUp, Users, AlertCircle, Ban, CheckCircle } from 'lucide-react';

const AdminPanel = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const list = await DB.getAllProfiles();
        setUsers(list);
        setLoading(false);
    };

    const handleToggleApproval = async (user: UserProfile) => {
        const newStatus = !user.is_approved;
        if (!newStatus && !window.confirm("Sei sicuro di voler sospendere questo utente? Non potrà più accedere.")) {
            return;
        }
        try {
            await DB.updateUserProfileAdmin({ id: user.id, is_approved: newStatus });
            loadUsers();
        } catch (e) {
            alert("Errore durante l'aggiornamento dello stato");
        }
    };

    const handleChangePlan = async (userId: string, newStatus: string) => {
        // Cast string to specific union type safely
        const status = newStatus as 'trial' | 'pro' | 'elite' | 'active' | 'expired';
        try {
            await DB.updateUserProfileAdmin({ id: userId, subscription_status: status });
            loadUsers();
        } catch (e) {
            alert("Errore modifica piano");
        }
    };

    const handleToggleRole = async (user: UserProfile) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        if (newRole === 'user' && !window.confirm("Sei sicuro di voler rimuovere i permessi di Admin a questo utente?")) {
            return;
        }
        try {
            await DB.updateUserProfileAdmin({ id: user.id, role: newRole });
            loadUsers();
        } catch (e) {
            alert("Errore modifica ruolo");
        }
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

    // Statistiche
    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        pro: users.filter(u => u.subscription_status === 'pro').length,
        elite: users.filter(u => u.subscription_status === 'elite').length,
        pending: users.filter(u => !u.is_approved).length
    };

    // Filtro
    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
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
                        <p className="text-slate-400">Gestione centralizzata utenti e licenze.</p>
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
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
                    <div className="relative flex-grow max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Cerca per email o ID..." 
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
                                <th className="px-6 py-4 border-b border-gray-200 w-1/3">Utente</th>
                                <th className="px-6 py-4 border-b border-gray-200">Accesso</th>
                                <th className="px-6 py-4 border-b border-gray-200">Ruolo</th>
                                <th className="px-6 py-4 border-b border-gray-200">Licenza</th>
                                <th className="px-6 py-4 text-right border-b border-gray-200">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.length === 0 && !loading && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nessun utente trovato</td></tr>
                            )}
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                                    {/* Utente */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${u.role === 'admin' ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                                                {u.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                                    {u.email}
                                                    {u.role === 'admin' && <Crown size={14} className="text-amber-500 fill-amber-500" />}
                                                </div>
                                                <div className="text-xs text-gray-400 font-mono" title={u.id}>
                                                    {u.id}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Stato Approvazione (Accesso) */}
                                    <td className="px-6 py-4">
                                        {u.is_approved ? (
                                            <button
                                                onClick={() => handleToggleApproval(u)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all group/status"
                                                title="Clicca per Sospendere"
                                            >
                                                <span className="block group-hover/status:hidden">Attivo</span>
                                                <span className="hidden group-hover/status:block">Sospendi</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover/status:bg-red-500"></div>
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleToggleApproval(u)}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold hover:bg-emerald-100 hover:text-emerald-700 transition-colors border border-red-200 shadow-sm"
                                            >
                                                <Ban size={12} /> Sospeso
                                            </button>
                                        )}
                                    </td>

                                    {/* Ruolo */}
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => handleToggleRole(u)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                u.role === 'admin' 
                                                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' 
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {u.role === 'admin' ? <Shield size={14} /> : <User size={14} />}
                                            {u.role.toUpperCase()}
                                        </button>
                                    </td>

                                    {/* Licenza */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <select 
                                                value={u.subscription_status}
                                                onChange={(e) => handleChangePlan(u.id, e.target.value)}
                                                className={`appearance-none pl-8 pr-8 py-1.5 rounded-lg text-xs font-bold border outline-none cursor-pointer transition-colors uppercase tracking-wide
                                                    ${u.subscription_status === 'elite' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                                                      u.subscription_status === 'pro' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 
                                                      'bg-blue-50 border-blue-200 text-blue-700'}
                                                `}
                                                style={{ 
                                                    backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="gray" viewBox="0 0 16 16"><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>')`,
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPosition: 'right 8px center'
                                                }}
                                            >
                                                <option value="trial">Trial</option>
                                                <option value="pro">Pro</option>
                                                <option value="elite">Elite</option>
                                                <option value="expired">Scaduto</option>
                                            </select>
                                            
                                            <div className="absolute ml-2 pointer-events-none">
                                                {u.subscription_status === 'elite' && <Crown size={12} className="text-amber-600" />}
                                                {u.subscription_status === 'pro' && <Star size={12} className="text-indigo-600" />}
                                                {u.subscription_status === 'trial' && <Clock size={12} className="text-blue-600" />}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Azioni */}
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleDelete(u.id)}
                                            className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Elimina Utente per sempre"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;