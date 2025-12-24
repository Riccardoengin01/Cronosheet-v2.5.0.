
import React, { useState, useEffect, useMemo } from 'react';
import { Certification, UserProfile, CourseType } from '../types';
import * as DB from '../services/db';
import { generateId } from '../utils';
import { Award, Plus, Calendar, Trash2, Pencil, Search, ShieldCheck, AlertTriangle, Clock, X, Save, Building, FileText, Upload, Loader2, Tag, ListFilter, Eye, Maximize2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface SecureTrainProps {
    user: UserProfile;
}

const COURSE_CONFIG: Record<CourseType, { label: string; validity: number; color: string; bg: string }> = {
    'CSP': { label: 'CSP', validity: 5, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    'CSE': { label: 'CSE', validity: 5, color: 'text-blue-600', bg: 'bg-blue-50' },
    'RSPP': { label: 'RSPP', validity: 5, color: 'text-purple-600', bg: 'bg-purple-50' },
    'ASPP': { label: 'ASPP', validity: 5, color: 'text-violet-600', bg: 'bg-violet-50' },
    'FIRST_AID': { label: 'Primo Soccorso', validity: 3, color: 'text-red-600', bg: 'bg-red-50' },
    'FIRE_SAFETY': { label: 'Antincendio', validity: 5, color: 'text-orange-600', bg: 'bg-orange-50' },
    'WORKER': { label: 'Lavoratore', validity: 5, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    'PREPOSTO': { label: 'Preposto', validity: 2, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    'DIRIGENTE': { label: 'Dirigente', validity: 5, color: 'text-slate-600', bg: 'bg-slate-50' },
    'EQUIPMENT': { label: 'Attrezzature', validity: 5, color: 'text-amber-600', bg: 'bg-amber-50' },
    'MANUAL': { label: 'Altro', validity: 1, color: 'text-gray-600', bg: 'bg-gray-50' }
};

const SecureTrain: React.FC<SecureTrainProps> = ({ user }) => {
    const { t } = useLanguage();
    const [certs, setCerts] = useState<Certification[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [editCert, setEditCert] = useState<Certification | null>(null);
    const [courseType, setCourseType] = useState<CourseType>('CSP');
    const [customName, setCustomName] = useState('');
    const [org, setOrg] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
    const [expiryDate, setExpiryDate] = useState('');
    const [docUrl, setDocUrl] = useState('');
    const [details, setDetails] = useState('');

    useEffect(() => {
        fetchCerts();
    }, [user.id]);

    useEffect(() => {
        if (issueDate && courseType) {
            const date = new Date(issueDate);
            const validity = COURSE_CONFIG[courseType].validity;
            date.setFullYear(date.getFullYear() + validity);
            setExpiryDate(date.toISOString().slice(0, 10));
        }
    }, [issueDate, courseType]);

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
            course_type: courseType,
            name: courseType === 'MANUAL' ? customName : COURSE_CONFIG[courseType].label,
            organization: org,
            issueDate,
            expiryDate,
            document_url: docUrl,
            details: details
        };
        const result = await DB.saveCertification(cert, user.id);
        if (result && !result.error) { setIsModalOpen(false); fetchCerts(); }
    };

    const getStatus = (expiry: string) => {
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
            c.organization.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [certs, searchTerm]);

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
                        Secure Train <Award className="text-indigo-600" size={24} />
                    </h1>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Digital Compliance Portfolio</p>
                </div>
                <button 
                    onClick={() => { setEditCert(null); setDocUrl(''); setDetails(''); setOrg(''); setIsModalOpen(true); }}
                    className="flex items-center gap-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest"
                >
                    <Plus size={16} strokeWidth={3} /> {t('train.add')}
                </button>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                        type="text" 
                        placeholder="Cerca titolo o ente..." 
                        className="w-full pl-11 pr-4 py-2 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold placeholder:text-gray-300"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
            ) : (
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Titolo</th>
                                <th className="px-6 py-4">Ente / Dettaglio</th>
                                <th className="px-6 py-4 text-center">Data</th>
                                <th className="px-6 py-4 text-center">Scadenza</th>
                                <th className="px-6 py-4 text-center">Stato</th>
                                <th className="px-6 py-4 text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {filteredCerts.map(cert => {
                                const status = getStatus(cert.expiryDate);
                                const config = COURSE_CONFIG[cert.course_type];
                                return (
                                    <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${config.bg} ${config.color} shrink-0`}>
                                                    <Award size={16} />
                                                </div>
                                                <span className="font-black text-slate-800">{cert.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-500 text-xs">{cert.organization}</p>
                                            {cert.details && <span className="text-[10px] text-indigo-500 font-black uppercase tracking-tighter">{cert.details}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">
                                            {new Date(cert.issueDate).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-xs font-black text-slate-700">
                                            {new Date(cert.expiryDate).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black border ${status.color}`}>
                                                {status.icon} {status.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {cert.document_url && (
                                                    <button onClick={() => setViewerUrl(cert.document_url!)} className="p-2 text-slate-400 hover:text-indigo-600"><Eye size={16}/></button>
                                                )}
                                                <button onClick={() => { setEditCert(cert); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Pencil size={16}/></button>
                                                <button onClick={() => { if(confirm("Elimina?")) DB.deleteCertification(cert.id).then(fetchCerts); }} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredCerts.length === 0 && (
                        <div className="py-20 text-center text-slate-300 italic text-xs">Nessun titolo registrato.</div>
                    )}
                </div>
            )}

            {/* VIEWER MODAL */}
            {viewerUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-xs font-black text-slate-900 uppercase">Anteprima Certificato</h3>
                            <button onClick={() => setViewerUrl(null)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><X size={20}/></button>
                        </div>
                        <iframe src={viewerUrl} className="flex-grow border-0" />
                    </div>
                </div>
            )}

            {/* FORM MODAL - Più compatto */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editCert ? 'Aggiorna Titolo' : 'Nuovo Titolo'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Tipologia Percorso</label>
                                    <select className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl font-bold text-sm" value={courseType} onChange={e => setCourseType(e.target.value as any)}>
                                        {Object.entries(COURSE_CONFIG).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Conseguito il</label>
                                    <input type="date" required className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl font-bold text-sm" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Scadenza Calcolata</label>
                                    <input type="date" readOnly className="w-full px-4 py-2.5 bg-indigo-50 border-0 rounded-xl font-bold text-sm text-indigo-600" value={expiryDate} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Ente di Formazione</label>
                                    <input type="text" required className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl font-bold text-sm" value={org} onChange={e => setOrg(e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Moduli / Specifiche (Note)</label>
                                    <input type="text" className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl font-bold text-sm" value={details} onChange={e => setDetails(e.target.value)} />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-indigo-100 mt-6">
                                Salva nel Portfolio
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecureTrain;
