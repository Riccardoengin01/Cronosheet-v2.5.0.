
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
  Download,
  FileText,
  ExternalLink
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
            e.target.value = '';
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
                contents: `Analizza questa certificazione per ingegneri: "${certName}". 
                In base al D.Lgs 81/08, qual è il periodo di validità standard? Rispondi in max 8 parole.`,
            });
            setAiTip(response.text);
        } catch (e) {
            setAiTip("Nessun suggerimento disponibile.");
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
        if (diffDays <= 90) return { label: `${diffDays} GG`, color: 'text-amber-500 bg-amber-50', icon: <Clock size={10}/> };
        return { label: 'VALIDO', color: 'text-emerald-500 bg-emerald-50', icon: <ShieldCheck size={10}/> };
    };

    const filteredCerts = useMemo(() => {
        return certs.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.organization.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [certs, searchTerm]);

    const isPdf = (url: string) => url.includes('application/pdf') || url.toLowerCase().includes('.pdf');

    return (
        <div className="space-y-4 animate-fade-in max-w-4xl mx-auto px-2">
            <div className="flex justify-between items-center gap-2 pt-2">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                        Archivio Abilitazioni <Award className="text-indigo-600" size={24} />
                    </h1>
                    <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest italic">Digital Compliance Portfolio</p>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="flex items-center gap-2 text-[10px] font-black text-white bg-slate-900 hover:bg-indigo-600 px-4 py-3 rounded-xl transition-all shadow-md uppercase tracking-widest active:scale-95"
                >
                    <Plus size={16} strokeWidth={3} /> Aggiungi
                </button>
            </div>

            <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                        type="text" 
                        placeholder="Cerca per titolo o ente..." 
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-0 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm font-bold placeholder:text-slate-300 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filteredCerts.map(cert => {
                        const status = getStatus(cert.expiryDate);
                        return (
                            <div key={cert.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900"></div>
                                
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ${status.color}`}>
                                            {status.label}
                                        </span>
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest truncate">{cert.organization}</span>
                                    </div>
                                    <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight leading-tight mb-1">{cert.name}</h3>
                                    {cert.details && (
                                        <div className="flex items-center gap-1.5 text-indigo-500">
                                            <Tag size={10} />
                                            <p className="text-[9px] font-bold uppercase truncate">{cert.details}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-50 pt-4 md:pt-0">
                                    <div className="flex gap-6">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Scadenza</p>
                                            <p className={`font-mono font-black text-[11px] ${cert.expiryDate ? 'text-slate-900' : 'text-indigo-500'}`}>
                                                {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString('it-IT') : 'PERMANENTE'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        {cert.document_url && (
                                            <button onClick={() => setViewerUrl(cert.document_url!)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Visualizza">
                                                <Eye size={18}/>
                                            </button>
                                        )}
                                        <button onClick={() => openModal(cert)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Modifica">
                                            <Pencil size={18}/>
                                        </button>
                                        <button onClick={() => { if(confirm("Eliminare record?")) DB.deleteCertification(cert.id).then(fetchCerts); }} className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Elimina">
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* VIEWER DOCUMENTO CON FALLBACK MOBILE */}
            {viewerUrl && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 bg-slate-900/90 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/20">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Documentazione</h3>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Verifica integrità file</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <a href={viewerUrl} download="certificato-originale" className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 text-[9px] font-black uppercase shadow-lg">
                                    <Download size={16} /> <span className="hidden sm:inline">Download</span>
                                </a>
                                <button onClick={() => setViewerUrl(null)} className="p-2.5 bg-white border border-slate-200 text-red-500 rounded-xl hover:bg-red-50 transition-all shadow-sm"><X size={20}/></button>
                            </div>
                        </div>
                        <div className="flex-grow overflow-auto p-3 bg-slate-100 flex justify-center items-start">
                            {isPdf(viewerUrl) ? (
                                <div className="w-full h-full flex flex-col">
                                    <iframe 
                                        src={viewerUrl} 
                                        className="w-full h-full rounded-xl border-0 bg-white shadow-xl" 
                                        title="PDF Viewer"
                                    />
                                    <div className="mt-4 p-4 bg-white/50 rounded-xl border border-white/20 text-center sm:hidden">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">Se l'anteprima non carica, usa il tasto download</p>
                                        <button onClick={() => window.open(viewerUrl, '_blank')} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase flex items-center gap-2 mx-auto">
                                            <ExternalLink size={14} /> Apri in nuova scheda
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <img src={viewerUrl} className="max-w-full rounded-xl shadow-2xl border border-white" alt="Certificato" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FORM MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-slate-900/95 backdrop-blur-xl animate-fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-slide-up border border-white/10">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">{editCert ? 'Modifica' : 'Inserimento'} Abilitazione</h2>
                                <p className="text-[8px] text-indigo-600 font-black uppercase tracking-widest mt-0.5">Registro Tecnico Professionale</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-all p-2 bg-white rounded-xl shadow-sm"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Award size={12} className="text-indigo-600" /> Titolo Certificazione
                                    </label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            required 
                                            className="flex-grow px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm text-slate-800 placeholder:text-slate-200" 
                                            placeholder="es. CSP/CSE, RSPP..."
                                            value={certName} 
                                            onChange={e => setCertName(e.target.value)} 
                                        />
                                        <button 
                                          type="button"
                                          onClick={handleSuggestExpiry}
                                          disabled={!certName || aiSuggesting}
                                          className="bg-indigo-600 text-white px-3.5 rounded-xl hover:bg-slate-900 transition-all disabled:opacity-30 flex items-center justify-center shadow-lg active:scale-95"
                                        >
                                            {aiSuggesting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        </button>
                                    </div>
                                    {aiTip && (
                                        <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2">
                                            <Info size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                                            <p className="text-[9px] font-bold text-indigo-900 uppercase leading-tight italic">{aiTip}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Conseguito</label>
                                        <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Scadenza</label>
                                        <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-red-600" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Ente Formatore</label>
                                        <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs" placeholder="es. Ordine Ingegneri" value={org} onChange={e => setOrg(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Moduli / Rif.</label>
                                        <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs" placeholder="es. 40 ore, Mod. B" value={details} onChange={e => setDetails(e.target.value)} />
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center relative hover:border-indigo-400 hover:bg-indigo-50/20 transition-all group">
                                    <input 
                                        type="file" 
                                        accept="application/pdf,image/*" 
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center">
                                        {docUrl ? (
                                            <div className="text-emerald-600 flex flex-col items-center">
                                                <FileCheck size={40} />
                                                <p className="text-[9px] font-black uppercase mt-2 tracking-[0.2em]">Scansione Caricata</p>
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 flex flex-col items-center group-hover:text-indigo-600 transition-colors">
                                                <Upload size={40} />
                                                <p className="text-[9px] font-black uppercase mt-2 tracking-[0.1em]">Allega Documento (PDF/IMG)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95 italic mt-2">
                                <Save size={16} className="inline mr-2" /> Salva nel Registro
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecureTrain;
