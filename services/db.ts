
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Project, TimeEntry, UserProfile, AppTheme, Certification } from '../types';
import { generateId, COLORS } from '../utils';

// Default theme configuration for the application's sidebar and navigation.
export const DEFAULT_THEME: AppTheme = {
    trial: {
        sidebarBg: '#1e1b4b',
        itemColor: '#94a3b8',
        activeBg: '#4338ca',
        activeText: '#ffffff',
        accentColor: '#818cf8',
    },
    pro: {
        sidebarBg: '#2e1065',
        itemColor: '#a78bfa',
        activeBg: '#6d28d9',
        activeText: '#ffffff',
        accentColor: '#c084fc',
    },
    elite: {
        sidebarBg: '#0f172a',
        itemColor: '#94a3b8',
        activeBg: '#d97706',
        activeText: '#ffffff',
        accentColor: '#fbbf24',
    },
    admin: {
        sidebarBg: '#020617',
        itemColor: '#64748b',
        activeBg: '#312e81',
        activeText: '#ffffff',
        accentColor: '#4f46e5',
    }
};

// --- STORAGE ---
export const uploadCertificate = async (file: File, userId: string): Promise<string | null> => {
    if (!isSupabaseConfigured) {
        console.warn("Supabase non configurato, uso file demo.");
        return "https://placeholder.com/demo-cert.pdf";
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${generateId()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Caricamento nel bucket 'certifications'
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('certifications')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error('ERRORE STORAGE SUPABASE:', uploadError.message);
            return null;
        }

        const { data } = supabase.storage
            .from('certifications')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Error uploading file:', error);
        return null;
    }
};

// --- CERTIFICATIONS ---
export const getCertifications = async (userId: string): Promise<Certification[]> => {
    if (!isSupabaseConfigured) {
        return JSON.parse(localStorage.getItem('cronosheet_demo_train') || '[]')
            .filter((c: any) => c.user_id === userId);
    }

    try {
        const { data, error } = await supabase
            .from('certifications')
            .select('*')
            .eq('user_id', userId)
            .order('expiry_date', { ascending: true });

        if (error) {
            console.error("Errore fetch certificazioni:", error.message);
            return [];
        }

        return data.map((c: any) => ({
            id: c.id,
            user_id: c.user_id,
            name: c.name,
            course_type: c.course_type,
            organization: c.organization,
            issueDate: c.issue_date,
            expiryDate: c.expiry_date,
            document_url: c.document_url,
            details: c.details
        }));
    } catch (e) {
        console.error("Exception in getCertifications:", e);
        return [];
    }
};

export const saveCertification = async (cert: Certification, userId: string): Promise<Certification | null> => {
    if (!isSupabaseConfigured) {
        const all = JSON.parse(localStorage.getItem('cronosheet_demo_train') || '[]');
        const idx = all.findIndex((c: any) => c.id === cert.id);
        const newCert = { ...cert, user_id: userId };
        if (idx >= 0) all[idx] = newCert;
        else all.push(newCert);
        localStorage.setItem('cronosheet_demo_train', JSON.stringify(all));
        return newCert;
    }

    const dbCert = {
        id: cert.id.length > 20 ? cert.id : undefined, // Assicura UUID valido
        user_id: userId,
        name: cert.name,
        course_type: cert.course_type,
        organization: cert.organization,
        issue_date: cert.issueDate,
        expiry_date: cert.expiryDate,
        document_url: cert.document_url,
        details: cert.details
    };

    try {
        const { data, error } = await supabase
            .from('certifications')
            .upsert(dbCert)
            .select()
            .single();

        if (error) {
            console.error('ERRORE DATABASE SUPABASE:', error.message, error.details, error.hint);
            return null;
        }
        
        return {
            id: data.id,
            user_id: data.user_id,
            name: data.name,
            course_type: data.course_type,
            organization: data.organization,
            issueDate: data.issue_date,
            expiryDate: data.expiry_date,
            document_url: data.document_url,
            details: data.details
        };
    } catch (e) {
        console.error("Exception in saveCertification:", e);
        return null;
    }
};

export const deleteCertification = async (id: string) => {
    if (!isSupabaseConfigured) {
        const all = JSON.parse(localStorage.getItem('cronosheet_demo_train') || '[]').filter((c: any) => c.id !== id);
        localStorage.setItem('cronosheet_demo_train', JSON.stringify(all));
        return;
    }
    await supabase.from('certifications').delete().eq('id', id);
};

export const getAppTheme = async (): Promise<AppTheme> => {
    if (!isSupabaseConfigured) return DEFAULT_THEME;
    const { data } = await supabase.from('app_config').select('value').eq('key', 'theme').single();
    return (data?.value as AppTheme) || DEFAULT_THEME;
};

export const saveAppTheme = async (theme: AppTheme) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('app_config').upsert({ key: 'theme', value: theme });
};

export const createUserProfile = async (id: string, email: string) => {
    const p = { id, email, role: 'user', subscription_status: 'trial', trial_ends_at: new Date(Date.now() + 60*24*3600*1000).toISOString(), is_approved: true };
    if (!isSupabaseConfigured) return p;
    try {
        const { data, error } = await supabase.from('profiles').upsert(p).select().single();
        if (error) console.error("Errore creazione profilo:", error.message);
        return data;
    } catch (e) {
        return p;
    }
};

export const getUserProfile = async (id: string) => {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    return data;
};

export const getProjects = async (userId: string) => {
    if (!isSupabaseConfigured) return [];
    const { data } = await supabase.from('projects').select('*').eq('user_id', userId);
    return data?.map(p => ({ ...p, defaultHourlyRate: p.default_hourly_rate, defaultBillingType: p.default_billing_type })) || [];
};

export const saveProject = async (p: Project, userId: string) => {
    const dbP = { id: p.id.includes('-') ? p.id : undefined, user_id: userId, name: p.name, color: p.color, default_hourly_rate: p.defaultHourlyRate, default_billing_type: p.defaultBillingType, shifts: p.shifts };
    if (!isSupabaseConfigured) return;
    await supabase.from('projects').upsert(dbP);
};

export const deleteProject = async (id: string) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('projects').delete().eq('id', id);
};

export const getEntries = async (userId: string) => {
    if (!isSupabaseConfigured) return [];
    const { data } = await supabase.from('time_entries').select('*').eq('user_id', userId).order('start_time', { ascending: false });
    return data?.map(e => ({ id: e.id, projectId: e.project_id, description: e.description, startTime: e.start_time, endTime: e.end_time, duration: e.duration, hourlyRate: e.hourly_rate, billing_type: e.billing_type, expenses: e.expenses, is_night_shift: e.is_night_shift, is_billed: e.is_billed })) || [];
};

export const saveEntry = async (e: TimeEntry, userId: string) => {
    const dbE = { id: e.id, user_id: userId, project_id: e.projectId, description: e.description, start_time: e.startTime, end_time: e.endTime, duration: e.duration, hourly_rate: e.hourlyRate, billing_type: e.billingType, expenses: e.expenses, is_night_shift: e.isNightShift, is_billed: e.is_billed };
    if (!isSupabaseConfigured) return;
    await supabase.from('time_entries').upsert(dbE);
};

export const deleteEntry = async (id: string) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('time_entries').delete().eq('id', id);
};

export const markEntriesAsBilled = async (ids: string[]) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('time_entries').update({ is_billed: true }).in('id', ids);
};

export const updateEntriesRate = async (ids: string[], rate: number) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('time_entries').update({ hourly_rate: rate }).in('id', ids);
};

export const getAllProfiles = async () => {
    if (!isSupabaseConfigured) return [];
    const { data } = await supabase.from('profiles').select('*');
    return data || [];
};

export const updateUserProfile = async (id: string, updates: any) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('profiles').update(updates).eq('id', id);
};

export const updateUserProfileAdmin = async (updates: any) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('profiles').update(updates).eq('id', updates.id);
};

export const deleteUserAdmin = async (id: string) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('profiles').delete().eq('id', id);
};
