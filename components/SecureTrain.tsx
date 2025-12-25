
import React, { useState, useEffect, useMemo } from 'react';
import { Certification, UserProfile, CourseType } from '../types';
import * as DB from '../services/db';
import { GoogleGenAI } from "@google/genai";
import { generateId } from '../utils';
import { 
  Award, 
  Plus, 
  Trash2, 
  Pencil, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  X, 
  Save, 
  Building, 
  Eye, 
  Loader2, 
  Tag, 
  Sparkles,
  Info,
  CalendarDays,
  Upload,
  FileCheck,
  FileText
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface SecureTrainProps {
    user: UserProfile;
}

const SecureTrain: React.FC<SecureTrainProps> = ({ user }) => {
    const { t } = useLanguage();
    const [certs, setCerts] = useState<Certification[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [editCert, setEditCert] = useState<Certification | null>(null);
    
    // Form State
    const [certName, setCertName] = useState('');
    const [org, setOrg] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
    const [expiryDate, setExpiryDate] = useState('');
    const [docUrl, setDocUrl] = useState('');
    const [details, setDetails] = useState('');
    
    // AI Suggestion State
    const [aiSuggesting, setAiSuggesting] = useState(false);
    const [aiTip, setAiTip] = useState<string | null>(null);

    useEffect(() => {
        fetchCerts();
    }, [user.id]);

    const fetchCerts = async () => {
        setLoading(true);
        const data = await DB.getCertifications(user.id);
        setCerts(data);
        setLoading(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setDocUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSuggestExpiry = async () => {
        if (!certName) return;
        setAiSuggesting(true);
        setAiTip(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Analizza questa certificazione per ingegneri/professionisti sicurezza: "${certName}". 
                In base alla normativa italiana (D.Lgs 81/08, Accordi Stato-Regioni, ecc.), qual è il periodo di validità standard prima dell'aggiornamento? 
                Rispondi in modo brevissimo (max 15 parole) indicando gli anni di validità.`,
            });
            setAiTip(response.text);
        } catch (e) {
            setAiTip("Impossibile contattare l'assistente normativo.");
        } finally {
            setAiSuggesting(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const cert: Certification = {
            id: editCert?.id || generateId(),
            user_id: user.id,
            course_type: 'MANUAL' as CourseType,
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
        setAiTip(null);
        if (cert) {
            setEditCert(cert);
            setCertName(cert.name);
            setOrg(cert.organization);
            setIssueDate(cert.issueDate);
            setExpiryDate(cert.expiryDate || '');
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
        if (diffDays <= 90) return { label: `SCADE TRA ${diffDays} GG`, color: 'text-amber-500 bg-amber-50', icon: <Clock size={10}/> };
        return { label: 'VALIDO', color: 'text-emerald-500 bg-emerald-50', icon: <ShieldCheck size={10}/> };
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4 uppercase italic">
                        Portfolio Competenze <Award className="text-indigo-600" size={32} />
                    </h1>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic">Registro Tecnico Professionale Digitale</p>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="flex items-center gap-3 text-xs font-black text-white bg-slate-900 hover:bg-indigo-600 px-8 py-4 rounded-2xl transition-all shadow-xl active:scale-95 uppercase tracking-widest"
                >
                    <Plus size={20} strokeWidth={3} /> Aggiungi Abilitazione
                </button>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input 
                        type="text" 
                        placeholder="Cerca per titolo, ente (INAIL, Ordine...) o modulo specifico..." 
                        className="w-full pl-14 pr-4 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold placeholder:text-slate-300 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-32"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredCerts.map(cert => {
                        const status = getStatus(cert.expiryDate);
                        return (
                            <div key={cert.id} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col md:flex-row md:items-center gap-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900"></div>
                                
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-4 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${status.color}`}>
                                            {status.label}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Doc. Rif: {cert.organization}</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">{cert.name}</h3>
                                    {cert.details && (
                                        <div className="flex items-center gap-2 text-indigo-600">
                                            <Tag size={12} />
                                            <p className="text-[10px] font-black uppercase tracking-widest truncate">{cert.details}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-8 shrink-0 md:text-center">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Conseguito</p>
                                        <p className="font-mono font-black text-slate-900 text-sm italic">{new Date(cert.issueDate).toLocaleDateString('it-IT')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Scadenza</p>
                                        <p className={`font-mono font-black text-sm italic ${cert.expiryDate ? 'text-slate-900' : 'text-indigo-500'}`}>
                                            {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString('it-IT') : 'PERMANENTE'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-slate-50 pt-4 md:pt-0 md:pl-8">
                                    {cert.document_url && (
                                        <button onClick={() => setViewerUrl(cert.document_url!)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                            <Eye size={16}/> Visualizza
                                        </button>
                                    )}
                                    <button onClick={() => openModal(cert)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                        <Pencil size={16}/> Modifica
                                    </button>
                                    <button onClick={() => { if(confirm("Eliminare definitivamente questo record?")) DB.deleteCertification(cert.id).then(fetchCerts); }} className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                        <Trash2 size={16}/> Elimina
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {filteredCerts.length === 0 && (
                        <div className="py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                            <Award size={64} className="mx-auto text-slate-100 mb-6" />
                            <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-xs italic">Nessuna abilitazione registrata</p>
                        </div>
                    )}
                </div>
            )}

            {/* VIEWER MODAL */}
            {viewerUrl && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="px-10 py-6 border-b flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Documentazione Allegata</h3>
                            <button onClick={() => setViewerUrl(null)} className="p-3 hover:bg-red-50 text-red-500 rounded-2xl transition-all"><X size={24}/></button>
                        </div>
                        <div className="flex-grow overflow-auto p-4 bg-slate-200 flex justify-center items-start">
                            {viewerUrl.startsWith('data:application/pdf') ? (
                                <iframe src={viewerUrl} className="w-full h-full rounded-2xl border-0 shadow-lg bg-white" />
                            ) : (
                                <img src={viewerUrl} className="max-w-full rounded-2xl shadow-lg" alt="Documento" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FORM MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-white/10">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">{editCert ? 'Modifica Record' : 'Nuova Registrazione'}</h2>
                                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mt-2">Database Sicurezza & Compliance Professionale</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-all p-2 rounded-full hover:bg-red-50"><X size={32}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 italic">
                                        <Award size={14} className="text-indigo-600" /> Titolo Certificato / Abilitazione / Ruolo
                                    </label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            required 
                                            className="flex-grow px-6 py-4 bg-slate-50 border-0 rounded-2xl font-black text-base text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="es. CSP/CSE, RSPP Modulo B, BLSD..."
                                            value={certName} 
                                            onChange={e => setCertName(e.target.value)} 
                                        />
                                        <button 
                                          type="button"
                                          onClick={handleSuggestExpiry}
                                          disabled={!certName || aiSuggesting}
                                          className="bg-indigo-600 text-white px-5 rounded-2xl hover:bg-slate-900 transition-all flex items-center justify-center disabled:opacity-30 shadow-lg"
                                          title="Chiedi scadenza a Gemini"
                                        >
                                            {aiSuggesting ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                        </button>
                                    </div>
                                    {aiTip && (
                                        <div className="mt-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3 animate-slide-up">
                                            <Info size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                                            <p className="text-[10px] font-bold text-indigo-900 leading-tight uppercase tracking-tight">{aiTip}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Data di Conseguimento</label>
                                        <input 
                                            type="date" 
                                            required 
                                            className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-black text-sm text-slate-800" 
                                            value={issueDate} 
                                            onChange={e => setIssueDate(e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Data di Scadenza / Aggiornamento</label>
                                        <input 
                                            type="date" 
                                            className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-black text-sm text-red-600" 
                                            value={expiryDate} 
                                            onChange={e => setExpiryDate(e.target.value)}
                                            placeholder="Senza scadenza"
                                        />
                                        <p className="text-[9px] text-slate-400 mt-2 italic">* Lascia vuoto per abilitazioni permanenti</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 italic">
                                            <Building size={14} className="text-indigo-600" /> Ente Formativo / Ordine
                                        </label>
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-black text-sm" 
                                            placeholder="es. Ordine Ingegneri, INAIL, ecc."
                                            value={org} 
                                            onChange={e => setOrg(e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 italic">
                                            <Tag size={14} className="text-indigo-600" /> Moduli Specifici / Fasi
                                        </label>
                                        <input 
                                            type="text" 
                                            className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-black text-sm" 
                                            placeholder="es. Modulo B (SP2), 40 ore CSP/CSE..."
                                            value={details} 
                                            onChange={e => setDetails(e.target.value)} 
                                        />
                                    </div>
                                </div>

                                {/* FILE UPLOAD SECTION */}
                                <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center relative hover:border-indigo-400 transition-colors group">
                                    <input 
                                        type="file" 
                                        accept="application/pdf,image/*" 
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center">
                                        {docUrl ? (
                                            <div className="text-emerald-600 animate-bounce-slow">
                                                <FileCheck size={48} />
                                                <p className="text-[10px] font-black uppercase tracking-widest mt-2">Documento Allegato</p>
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                <Upload size={48} />
                                                <p className="text-[10px] font-black uppercase tracking-widest mt-2">Carica Scansione Certificato (PDF/IMG)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 italic">
                                        <CalendarDays size={14} className="text-indigo-600" /> Note Libere
                                    </label>
                                    <textarea 
                                        className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm min-h-[100px] resize-none" 
                                        placeholder="Inserisci qui i riferimenti normativi aggiuntivi..."
                                        value={details} 
                                        onChange={e => setDetails(e.target.value)} 
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="w-full py-6 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.4em] rounded-2xl shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 mt-4 italic"
                            >
                                <Save size={20} className="inline mr-3 mb-1" /> Salva nel Registro Professionale
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecureTrain;
