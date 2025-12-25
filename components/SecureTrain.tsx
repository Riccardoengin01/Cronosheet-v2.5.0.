
import React, { useState, useEffect, useMemo } from 'react';
import { Certification, UserProfile, CourseType } from '../types';
import * as DB from '../services/db';
import { generateId } from '../utils';
import { Award, Plus, Calendar, Trash2, Pencil, Search, ShieldCheck, AlertTriangle, Clock, X, Save, Building, FileText, Upload, Loader2, Tag, ListFilter, Eye, Maximize2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface SecureTrainProps {
    user: UserProfile;
}

// Configurazione estetica per i titoli comuni, ma il sistema ora accetta TUTTO
const UI_SUGGESTIONS = [
    'CSP / CSE (Coordinatore Sicurezza)',
    'RSPP Modulo A',
    'RSPP Modulo B',
    'RSPP Modulo C',
    'BLSD / Primo Soccorso',
    'Antincendio Rischio Elevato',
    'Abilitazione Lavori in Quota',
    'Formatore per la Sicurezza',
    'Professionista Antincendio (Ex 818)',
    'Certificatore Energetico'
];

const SecureTrain: React.FC<SecureTrainProps> = ({ user }) => {
    const { t } = useLanguage();
    const [certs, setCerts] = useState<Certification[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [editCert, setEditCert] = useState<Certification | null>(null);
    
    // Form State (Free Text)
    const [certName, setCertName] = useState('');
    const [org, setOrg] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
    const [expiryDate, setExpiryDate] = useState('');
    const [docUrl, setDocUrl] = useState('');
    const [details, setDetails] = useState('');

    useEffect(() => {
        fetchCerts();
    }, [user.id]);

    const fetchCerts = async () => {
        setLoading(true);
        const data = await DB.getCertifications(user.id);
        setCerts(data);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const cert: Certification = {
            id: editCert?.id || generateId(),
            user_id: user.id,
            course_type: 'MANUAL' as CourseType, // Supporto legacy
            name: certName,
            organization: org,
            issueDate,
            expiryDate,
            document_url: docUrl,
            details: details
        };
        const result = await DB.saveCertification(cert, user.id);
        if (result && !result.error) { 
            setIsModalOpen(false); 
            fetchCerts(); 
        } else if (result?.error) {
            alert("Errore salvataggio: " + result.error);
        }
    };

    const openModal = (cert?: Certification) => {
        if (cert) {
            setEditCert(cert);
            setCertName(cert.name);
            setOrg(cert.organization);
            setIssueDate(cert.issueDate);
            setExpiryDate(cert.expiryDate);
            setDocUrl(cert.document_url || '');
            setDetails(cert.details || '');
        } else {
            setEditCert(null);
            setCertName('');
            setOrg('');
            setIssueDate(new Date().toISOString().slice(0, 10));
            setExpiryDate('');
            setDocUrl('');
            setDetails('');
        }
        setIsModalOpen(true);
    };

    const getStatus = (expiry: string) => {
        if (!expiry) return { label: 'PERMANENTE', color: 'text-indigo-500 bg-indigo-50', icon: <ShieldCheck size={10}/> };
        const now = new Date().getTime();
        const end = new Date(expiry).getTime();
        const diffDays = Math.ceil((end - now) / (1000 * 3600 * 24));
        if (diffDays <= 0) return { label: 'SCADUTO', color: 'text-red-500 bg-red-50', icon: <AlertTriangle size={10}/> };
        if (diffDays <= 60) return { label: `${diffDays} GG`, color: 'text-amber-500 bg-amber-50', icon: <Clock size={10}/> };
        return { label: 'OK', color: 'text-emerald-500 bg-emerald-50', icon: <ShieldCheck size={10}/> };
    };

    const filteredCerts = useMemo(() => {
        return certs.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.details && c.details.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [certs, searchTerm]);

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase italic">
                        Secure Train <Award className="text-indigo-600" size={32} />
                    </h1>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Archivio Competenze & Abilitazioni Tecniche</p>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="flex items-center gap-3 text-xs font-black text-white bg-slate-900 hover:bg-indigo-600 px-8 py-4 rounded-2xl transition-all shadow-xl active:scale-95 uppercase tracking-widest"
                >
                    <Plus size={18} strokeWidth={3} /> {t('train.add')}
                </button>
            </div>

            <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                    <input 
                        type="text" 
                        placeholder="Cerca titolo, ente o modulo specifico..." 
                        className="w-full pl-14 pr-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold placeholder:text-gray-300"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-6">Certificazione / Abilitazione</th>
                                    <th className="px-8 py-6">Ente Formativo</th>
                                    <th className="px-8 py-6 text-center">Conseguito</th>
                                    <th className="px-8 py-6 text-center">Scadenza</th>
                                    <th className="px-8 py-6 text-center">Status</th>
                                    <th className="px-8 py-6 text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {filteredCerts.map(cert => {
                                    const status = getStatus(cert.expiryDate);
                                    return (
                                        <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-lg">
                                                        <Award size={24} />
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-slate-800 text-base block leading-none">{cert.name}</span>
                                                        {cert.details && <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1 block">{cert.details}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="font-bold text-slate-600 uppercase text-xs tracking-tight flex items-center gap-2">
                                                    <Building size={14} className="text-slate-300" /> {cert.organization}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6 text-center font-mono text-xs text-slate-400">
                                                {new Date(cert.issueDate).toLocaleDateString('it-IT')}
                                            </td>
                                            <td className="px-8 py-6 text-center font-mono text-xs font-black text-slate-700">
                                                {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString('it-IT') : '∞'}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black border ${status.color}`}>
                                                    {status.icon} {status.label}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {cert.document_url && (
                                                        <button onClick={() => setViewerUrl(cert.document_url!)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Eye size={18}/></button>
                                                    )}
                                                    <button onClick={() => openModal(cert)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Pencil size={18}/></button>
                                                    <button onClick={() => { if(confirm("Eliminare definitivamente questo certificato?")) DB.deleteCertification(cert.id).then(fetchCerts); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filteredCerts.length === 0 && (
                        <div className="py-32 text-center">
                            <Award size={64} className="mx-auto text-slate-100 mb-4" />
                            <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-xs">Portfolio Competenze Vuoto</p>
                        </div>
                    )}
                </div>
            )}

            {/* VIEWER MODAL */}
            {viewerUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="px-10 py-6 border-b flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Documentazione Tecnica</h3>
                            <button onClick={() => setViewerUrl(null)} className="p-3 hover:bg-red-50 text-red-500 rounded-2xl transition-all"><X size={24}/></button>
                        </div>
                        <iframe src={viewerUrl} className="flex-grow border-0 w-full" />
                    </div>
                </div>
            )}

            {/* FORM MODAL (MANUALE) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-slide-up border border-white/10">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">{editCert ? 'Aggiorna Certificato' : 'Nuovo Inserimento'}</h2>
                                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Registro Digitale Professionale</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={28}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-10 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Award size={14} className="text-indigo-600" /> Titolo Certificato / Abilitazione
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            required 
                                            list="course-suggestions"
                                            className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-black text-sm text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="es. RSPP Modulo B / BLSD / CSP"
                                            value={certName} 
                                            onChange={e => setCertName(e.target.value)} 
                                        />
                                        <datalist id="course-suggestions">
                                            {UI_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                                        </datalist>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Conseguito il</label>
                                        <input 
                                            type="date" 
                                            required 
                                            className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm" 
                                            value={issueDate} 
                                            onChange={e => setIssueDate(e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Scadenza</label>
                                        <input 
                                            type="date" 
                                            className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-black text-sm text-red-600" 
                                            value={expiryDate} 
                                            onChange={e => setExpiryDate(e.target.value)}
                                            placeholder="Lascia vuoto se permanente"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Building size={14} className="text-indigo-600" /> Ente di Formazione
                                    </label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm" 
                                        placeholder="es. Ordine Ingegneri / Inail"
                                        value={org} 
                                        onChange={e => setOrg(e.target.value)} 
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Tag size={14} className="text-indigo-600" /> Moduli / Specifiche Analitiche
                                    </label>
                                    <textarea 
                                        className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm min-h-[100px] resize-none" 
                                        placeholder="Inserisci dettagli aggiuntivi o riferimenti legislativi..."
                                        value={details} 
                                        onChange={e => setDetails(e.target.value)} 
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="w-full py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 mt-8 italic"
                            >
                                <Save size={18} className="inline mr-2 mb-1" /> Salva nel Registro Sicurezza
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecureTrain;
