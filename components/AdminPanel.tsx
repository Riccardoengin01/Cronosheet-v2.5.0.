import React, { useEffect, useState } from 'react';
import { UserProfile, BillingInfo, AppTheme } from '../types';
import * as DB from '../services/db';
import { Shield, Trash2, RefreshCw, Crown, Star, UserCog, Search, Ban, CheckCircle, X, Save, Palette, Receipt, Copy, FileText, ChevronDown, Monitor, Users, Clock } from 'lucide-react';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'theme'>('users');
    
    // USERS STATE
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
    const [editPlan, setEditPlan] = useState<'trial' | 'active' | 'pro' | 'elite' | 'expired'>('trial');
    const [editCreatedAt, setEditCreatedAt] = useState('');
    const [editTrialEnds, setEditTrialEnds] = useState('');
    const [editFullName, setEditFullName] = useState('');
    const [editBilling, setEditBilling] = useState<BillingInfo>({});
    const [selectedCausale, setSelectedCausale] = useState('');
    const [customCausale, setCustomCausale] = useState('');
    const [copiedCausale, setCopiedCausale] = useState(false);

    // THEME STATE
    const [themeConfig, setThemeConfig] = useState<AppTheme>(DB.DEFAULT_THEME);
    const [selectedRoleTheme, setSelectedRoleTheme] = useState<'trial' | 'pro' | 'elite' | 'admin'>('trial');
    const [savingTheme, setSavingTheme] = useState(false);

    const CAUSALI_PRESETS = [
        "Canone di utilizzo piattaforma gestionale Cronosheet - Piano Pro",
        "Servizio di elaborazione dati e timesheet in cloud",
        "Accesso ai servizi telematici di calcolo e reportistica"
    ];

    useEffect(() => {
        loadUsers();
        loadTheme();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const list = await DB.getAllProfiles();
        setUsers(list);
        setLoading(false);
    };

    const loadTheme = async () => {
        const t = await DB.getAppTheme();
        setThemeConfig(t);
    };

    // --- THEME HANDLERS ---
    const handleThemeChange = (field: keyof typeof themeConfig.trial, value: string) => {
        setThemeConfig(prev => ({
            ...prev,
            [selectedRoleTheme]: {
                ...prev[selectedRoleTheme],
                [field]: value
            }
        }));
    };

    const saveTheme = async () => {
        setSavingTheme(true);
        try {
            await DB.saveAppTheme(themeConfig);
            alert("Tema salvato! Ricarica la pagina per vedere le modifiche alla tua sidebar.");
        } catch (e) {
            alert("Errore salvataggio tema");
        }
        setSavingTheme(false);
    };

    const resetTheme = () => {
        if(confirm("Ripristinare il tema di default?")) {
            setThemeConfig(DB.DEFAULT_THEME);
        }
    };

    // --- USER HANDLERS ---
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

    const openEditModal = (user: UserProfile) => {
        setEditingUser(user);
        setEditRole(user.role);
        setEditPlan(user.subscription_status);
        setEditFullName(user.full_name || '');
        setEditBilling(user.billing_info || {});
        setSelectedCausale('');
        setCustomCausale('');
        setCopiedCausale(false);
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
            const finalCreatedAt = editCreatedAt ? new Date(editCreatedAt + 'T12:00:00').toISOString() : editingUser.created_at;
            const finalTrialEnds = editTrialEnds ? new Date(editTrialEnds + 'T23:59:59').toISOString() : editingUser.trial_ends_at;

            await DB.updateUserProfileAdmin({
                id: editingUser.id,
                role: editRole,
                subscription_status: editPlan,
                full_name: editFullName,
                created_at: finalCreatedAt,
                trial_ends_at: finalTrialEnds,
                is_approved: editingUser.is_approved,
                billing_info: editBilling
            });
            await loadUsers();
            closeEditModal();
        } catch (e) {
            console.error(e);
            alert("Errore salvataggio modifiche.");
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

    const updateBilling = (field: keyof BillingInfo, value: string) => {
        setEditBilling(prev => ({ ...prev, [field]: value }));
    };

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        u.id.includes(searchTerm)
    );

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        trial: users.filter(u => u.subscription_status === 'trial').length,
        pro: users.filter(u => u.subscription_status === 'pro').length,
        elite: users.filter(u => u.subscription_status === 'elite').length,
        pending: users.filter(u => !u.is_approved).length
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header e Statistiche */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="text-emerald-400" /> Pannello Master
                    </h2>
                    <p className="text-slate-400">Gestione centralizzata utenti e personalizzazione.</p>
                </div>
                
                <div className="flex bg-slate-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <UserCog size={16} /> Utenti
                    </button>
                    <button 
                        onClick={() => setActiveTab('theme')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'theme' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Palette size={16} /> Personalizzazione UI
                    </button>
                </div>
            </div>

            {activeTab === 'users' ? (
                /* TAB UTENTI */
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><Users size={24} /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Totale Utenti</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="bg-slate-100 p-3 rounded-lg text-slate-600"><Clock size={24} /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Trial (Start)</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.trial}</p>
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
                            <div className={`p-3 rounded-lg ${stats.pending > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {stats.pending > 0 ? <Ban size={24} /> : <CheckCircle size={24} />}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">In Attesa</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
                            <div className="relative flex-grow max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Cerca utente..." 
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button onClick={loadUsers} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
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
                                                            <div className="text-xs text-gray-400 font-mono" title={u.id}>{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                     <button 
                                                        onClick={() => handleToggleApproval(u)}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                                                            u.is_approved 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-red-50 hover:text-red-600' 
                                                            : 'bg-red-50 text-red-700 border-red-100 hover:bg-emerald-50 hover:text-emerald-700'
                                                        }`}
                                                    >
                                                        {u.is_approved ? 'Attivo' : 'Sospeso'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 capitalize text-sm font-medium">
                                                         {u.subscription_status}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono text-gray-600">
                                                    {daysLeft === 'infinity' ? '∞' : `${daysLeft}gg`}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => openEditModal(u)}
                                                            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg"
                                                        >
                                                            <UserCog size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(u.id)}
                                                            className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg"
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
                </>
            ) : (
                /* TAB THEME CUSTOMIZATION */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
                    
                    {/* Sidebar Selector */}
                    <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 p-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Seleziona Ruolo</h3>
                        <div className="space-y-2">
                            {['trial', 'pro', 'elite', 'admin'].map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRoleTheme(role as any)}
                                    className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm capitalize flex items-center justify-between transition-colors ${
                                        selectedRoleTheme === role 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {role}
                                    {selectedRoleTheme === role && <CheckCircle size={16} />}
                                </button>
                            ))}
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <button 
                                onClick={resetTheme}
                                className="w-full py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg"
                            >
                                Ripristina Default
                            </button>
                        </div>
                    </div>

                    {/* Color Editor */}
                    <div className="flex-1 p-6 md:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 capitalize flex items-center gap-2">
                                <Palette className="text-indigo-600"/> Tema: {selectedRoleTheme}
                            </h3>
                            <button 
                                onClick={saveTheme}
                                disabled={savingTheme}
                                className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 shadow-lg flex items-center gap-2"
                            >
                                <Save size={18} /> {savingTheme ? 'Salvataggio...' : 'Salva Tema'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Visual Preview (Mock Sidebar) */}
                            <div className="bg-gray-100 rounded-xl p-4 border border-gray-200 flex justify-center items-center">
                                <div 
                                    className="w-48 h-64 rounded-xl shadow-2xl flex flex-col overflow-hidden relative"
                                    style={{ backgroundColor: themeConfig[selectedRoleTheme].sidebarBg }}
                                >
                                    {/* Mock Sidebar Header */}
                                    <div className="h-12 border-b border-white/10 flex items-center px-3 gap-2 bg-black/10">
                                        <div className="w-6 h-6 rounded bg-white/20"></div>
                                        <div className="w-20 h-3 bg-white/20 rounded"></div>
                                    </div>
                                    {/* Mock Items */}
                                    <div className="p-3 space-y-2">
                                        <div className="h-8 rounded w-full flex items-center px-2" style={{ backgroundColor: themeConfig[selectedRoleTheme].activeBg }}>
                                            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: themeConfig[selectedRoleTheme].accentColor }}></div>
                                            <div className="w-16 h-2 rounded" style={{ backgroundColor: themeConfig[selectedRoleTheme].activeText }}></div>
                                        </div>
                                        <div className="h-8 rounded w-full flex items-center px-2">
                                            <div className="w-4 h-4 rounded-full bg-white/10 mr-2"></div>
                                            <div className="w-16 h-2 rounded" style={{ backgroundColor: themeConfig[selectedRoleTheme].itemColor }}></div>
                                        </div>
                                        <div className="h-8 rounded w-full flex items-center px-2">
                                            <div className="w-4 h-4 rounded-full bg-white/10 mr-2"></div>
                                            <div className="w-16 h-2 rounded" style={{ backgroundColor: themeConfig[selectedRoleTheme].itemColor }}></div>
                                        </div>
                                    </div>
                                    {/* Top Line */}
                                    <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${themeConfig[selectedRoleTheme].activeBg}, ${themeConfig[selectedRoleTheme].accentColor})` }}></div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Sfondo Sidebar</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="color" 
                                            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                                            value={themeConfig[selectedRoleTheme].sidebarBg}
                                            onChange={e => handleThemeChange('sidebarBg', e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            className="flex-1 border border-gray-300 rounded px-3 text-sm font-mono"
                                            value={themeConfig[selectedRoleTheme].sidebarBg}
                                            onChange={e => handleThemeChange('sidebarBg', e.target.value)}
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Sfondo Voce Attiva</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="color" 
                                            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                                            value={themeConfig[selectedRoleTheme].activeBg}
                                            onChange={e => handleThemeChange('activeBg', e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            className="flex-1 border border-gray-300 rounded px-3 text-sm font-mono"
                                            value={themeConfig[selectedRoleTheme].activeBg}
                                            onChange={e => handleThemeChange('activeBg', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Colore Icone/Accento</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="color" 
                                                className="w-full h-8 rounded cursor-pointer border-0 p-0"
                                                value={themeConfig[selectedRoleTheme].accentColor}
                                                onChange={e => handleThemeChange('accentColor', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Testo Inattivo</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="color" 
                                                className="w-full h-8 rounded cursor-pointer border-0 p-0"
                                                value={themeConfig[selectedRoleTheme].itemColor}
                                                onChange={e => handleThemeChange('itemColor', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE DI EDIT UTENTE (Codice esistente per la modifica profilo) */}
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