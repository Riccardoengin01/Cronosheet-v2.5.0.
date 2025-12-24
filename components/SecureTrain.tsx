
import React, { useState, useEffect, useMemo } from 'react';
import { Certification, UserProfile, CourseType } from '../types';
import * as DB from '../services/db';
import { generateId } from '../utils';
import { Award, Plus, Calendar, Trash2, Pencil, Search, ShieldCheck, AlertTriangle, Clock, X, Save, Building, FileText, ExternalLink, Info, Upload, Loader2, Tag, ListFilter } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface SecureTrainProps {
    user: UserProfile;
}

const COURSE_CONFIG: Record<CourseType, { label: string; validity: number; color: string }> = {
    'CSP': { label: 'Coordinatore Progettazione (CSP)', validity: 5, color: 'text-indigo-600 bg-indigo-50' },
    'CSE': { label: 'Coordinatore Esecuzione (CSE)', validity: 5, color: 'text-blue-600 bg-blue-50' },
    'RSPP': { label: 'RSPP (Moduli A+B+C)', validity: 5, color: 'text-purple-600 bg-purple-50' },
    'ASPP': { label: 'ASPP', validity: 5, color: 'text-violet-600 bg-violet-50' },
    'FIRST_AID': { label: 'Primo Soccorso', validity: 3, color: 'text-red-600 bg-red-50' },
    'FIRE_SAFETY': { label: 'Antincendio', validity: 5, color: 'text-orange-600 bg-orange-50' },
    'WORKER': { label: 'Lavoratore (Gen+Spec)', validity: 5, color: 'text-emerald-600 bg-emerald-50' },
    'PREPOSTO': { label: 'Formazione Preposto', validity: 2, color: 'text-cyan-600 bg-cyan-50' },
    'DIRIGENTE': { label: 'Formazione Dirigente', validity: 5, color: 'text-slate-600 bg-slate-50' },
    'EQUIPMENT': { label: 'Abilitazione Attrezzature', validity: 5, color: 'text-amber-600 bg-amber-50' },
    'MANUAL': { label: 'Altro (Inserimento Manuale)', validity: 1, color: 'text-gray-600 bg-gray-50' }
};

const FIRE_RISK_LEVELS = [
    { value: 'Livello 1 (Basso)', label: 'Livello 1 (ex Basso)' },
    { value: 'Livello 2 (Medio)', label: 'Livello 2 (ex Medio)' },
    { value: 'Livello 3 (Alto)', label: 'Livello 3 (ex Alto)' }
];

const SecureTrain: React.FC<SecureTrainProps> = ({ user }) => {
    const { t } = useLanguage();
    const [certs, setCerts] = useState<Certification[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    const handleEdit = (cert: Certification) => {
        setEditCert(cert);
        setCourseType(cert.course_type);
        setCustomName(cert.course_type === 'MANUAL' ? cert.name : '');
        setOrg(cert.organization);
        setIssueDate(cert.issueDate);
        setExpiryDate(cert.expiryDate);
        setDocUrl(cert.document_url || '');
        setDetails(cert.details || '');
        setIsModalOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const url = await DB.uploadCertificate(file, user.id);
        if (url) {
            setDocUrl(url);
        } else {
            alert("Errore caricamento fisico del file. Controlla lo Storage Bucket.");
        }
        setUploading(false);
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
        
        if (result && !result.error) {
            setIsModalOpen(false);
            fetchCerts();
        } else {
            // Se c'è un errore, lo mostriamo chiaramente
            const errorMsg = result?.error || "Errore sconosciuto nel database.";
            alert(`ERRORE DI SALVATAGGIO: ${errorMsg}\n\nAssicurati di aver eseguito lo script SQL di ripristino.`);
        }
    };

    const getStatus = (expiry: string) => {
        const now = new Date().getTime();
        const end = new Date(expiry).getTime();
        const diffDays = Math.ceil((end - now) / (1000 * 3600 * 24));
        if (diffDays <= 0) return { label: 'Scaduto', color: 'text-red-600 bg-red-50 border-red-200', icon: <AlertTriangle size={12}/> };
        if (diffDays <= 60) return { label: `Attenzione: ${diffDays} gg`, color: 'text-amber-600 bg-amber-50 border-amber-200', icon: <Clock size={12}/> };
        return { label: 'Conforme', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <ShieldCheck size={12}/> };
    };

    const filteredCerts = useMemo(() => {
        return certs.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.details && c.details.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [certs, searchTerm]);

    return (
        <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Secure Train <Award className="text-indigo-600" size={32} />
                    </h1>
                    <p className="text-gray-500 font-medium italic">Archivio Competenze Certificate - Ing. {user.email.split('@')[0]}</p>
                </div>
                <button 
                    onClick={() => { setEditCert(null); setDocUrl(''); setDetails(''); setOrg(''); setIsModalOpen(true); }}
                    className="flex items-center justify-center gap-2 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-200 active:scale-95"
                >
                    <Plus size={20} strokeWidth={3} /> {t('train.add')}
                </button>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Cerca per corso, livello o ente..." 
                        className="w-full pl-12 pr-4 py-3 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCerts.map(cert => {
                        const status = getStatus(cert.expiryDate);
                        const config = COURSE_CONFIG[cert.course_type];
                        return (
                            <div key={cert.id} className="bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-sm hover:shadow-2xl transition-all group overflow-hidden flex flex-col">
                                <div className="p-8 flex-grow">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-3 rounded-2xl ${config.color}`}>
                                            <Award size={24} />
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-2 ${status.color}`}>
                                            {status.icon} {status.label}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        {cert.details ? (
                                            <div className="flex items-center gap-2 text-white bg-indigo-600 px-4 py-2 rounded-xl w-fit text-xs font-black uppercase shadow-lg shadow-indigo-100 ring-2 ring-indigo-50">
                                                <Tag size={14} strokeWidth={3} /> {cert.details}
                                            </div>
                                        ) : (
                                            <div className="h-10"></div>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight min-h-[3rem]">{cert.name}</h3>

                                    <p className="text-gray-400 text-sm font-bold flex items-center gap-2 mb-6">
                                        <Building size={16} /> {cert.organization || 'Ente non specificato'}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">CONSEGUITO</p>
                                            <p className="text-xs font-bold text-slate-700 font-mono">{new Date(cert.issueDate).toLocaleDateString('it-IT')}</p>
                                        </div>
                                        <div className="bg-indigo-50/30 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">SCADENZA</p>
                                            <p className="text-xs font-bold text-indigo-700 font-mono">{new Date(cert.expiryDate).toLocaleDateString('it-IT')}</p>
                                        </div>
                                    </div>
                                    
                                    {cert.document_url ? (
                                        <a 
                                            href={cert.document_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="mt-6 w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-100"
                                        >
                                            <FileText size={18} /> APRI PDF <ExternalLink size={14} />
                                        </a>
                                    ) : (
                                        <div className="mt-6 w-full py-4 bg-slate-100 text-slate-400 rounded-2xl text-xs font-bold text-center border-2 border-dashed border-slate-200">
                                            NESSUN ALLEGATO
                                        </div>
                                    )}
                                </div>

                                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(cert)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm">
                                        <Pencil size={20} />
                                    </button>
                                    <button onClick={() => { if(confirm("Eliminare certificato?")) DB.deleteCertification(cert.id).then(fetchCerts); }} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {filteredCerts.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100 text-gray-400 font-bold">
                            Nessun certificato in archivio.
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                                    {editCert ? 'Aggiorna Titolo' : 'Nuovo Titolo'}
                                </h2>
                                <p className="text-indigo-500 text-xs font-bold uppercase mt-1">Gestione Documentazione Tecnica</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-4 hover:bg-white rounded-2xl transition-colors shadow-sm">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Percorso Formativo</label>
                                <select 
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800 text-lg appearance-none"
                                    value={courseType}
                                    onChange={e => {
                                        const val = e.target.value as CourseType;
                                        setCourseType(val);
                                        if (val !== 'FIRE_SAFETY' && val !== 'RSPP' && val !== 'ASPP') setDetails('');
                                    }}
                                >
                                    {Object.entries(COURSE_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 animate-slide-down space-y-4">
                                <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                                    <ListFilter size={16} /> Specifiche Titolo
                                </div>
                                
                                {courseType === 'FIRE_SAFETY' && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-3">Livello Rischio Incendio</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {FIRE_RISK_LEVELS.map((level) => (
                                                <button
                                                    key={level.value}
                                                    type="button"
                                                    onClick={() => setDetails(level.value)}
                                                    className={`px-5 py-3 text-left rounded-xl text-xs font-bold border transition-all ${details === level.value ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                                                >
                                                    {level.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(courseType === 'RSPP' || courseType === 'ASPP') && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-3">Moduli RSPP Conseguiti</label>
                                        <input 
                                            type="text" 
                                            placeholder="Es. Modulo A + B (SP1-2) + C"
                                            className="w-full px-5 py-4 bg-white border border-indigo-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                                            value={details}
                                            onChange={e => setDetails(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Ente di Formazione</label>
                                <input type="text" required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold" value={org} onChange={e => setOrg(e.target.value)} />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Conseguito il</label>
                                    <input type="date" required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">Scadenza Legale</label>
                                    <input type="date" className="w-full px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl font-black text-indigo-700 outline-none cursor-not-allowed" value={expiryDate} readOnly />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-dashed border-slate-200">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Allegato Certificato (PDF/IMG)</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex-grow flex items-center justify-center gap-3 px-8 py-5 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-500 transition-all group">
                                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />
                                        {uploading ? <Loader2 className="animate-spin text-indigo-600" size={24} /> : <Upload className="text-slate-400 group-hover:text-indigo-600" size={24} />}
                                        <span className="text-sm font-bold text-slate-500 group-hover:text-indigo-600">{docUrl ? "File Caricato ✓" : "Scegli File"}</span>
                                    </label>
                                    {docUrl && <button type="button" onClick={() => setDocUrl('')} className="p-5 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100"><X size={20}/></button>}
                                </div>
                                {uploading && <p className="text-[10px] text-indigo-600 font-bold text-center mt-2">Caricamento sul server in corso...</p>}
                            </div>

                            <div className="flex justify-end gap-4 pt-10">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-5 font-bold text-slate-400 hover:text-slate-600">Annulla</button>
                                <button type="submit" className="px-12 py-5 bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl shadow-indigo-200 flex items-center gap-3 active:scale-95 transition-all">
                                    <Save size={20} /> SALVA NEL REGISTRO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecureTrain;
