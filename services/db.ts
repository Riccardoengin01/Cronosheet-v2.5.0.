
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Project, TimeEntry, UserProfile, AppTheme, Certification } from '../types';
import { generateId, COLORS } from '../utils';

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
    if (!isSupabaseConfigured) return "https://placeholder.com/demo.pdf";

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${generateId()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('certifications')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('certifications')
            .getPublicUrl(fileName);

        return data.publicUrl;
    } catch (error) {
        console.error('Upload Error:', error);
        return null;
    }
};

// --- CERTIFICATIONS ---
export const getCertifications = async (userId: string): Promise<Certification[]> => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('certifications').select('*').eq('user_id', userId);
    return error ? [] : data.map(c => ({
        id: c.id, user_id: c.user_id, name: c.name, course_type: c.course_type,
        organization: c.organization, issueDate: c.issue_date, expiryDate: c.expiry_date,
        document_url: c.document_url, details: c.details
    }));
};

export const saveCertification = async (cert: Certification, userId: string) => {
    if (!isSupabaseConfigured) return cert;
    const dbCert = {
        id: cert.id.length > 30 ? cert.id : undefined,
        user_id: userId,
        name: cert.name,
        course_type: cert.course_type,
        organization: cert.organization,
        issue_date: cert.issueDate,
        expiry_date: cert.expiryDate,
        document_url: cert.document_url,
        details: cert.details
    };
    const { data, error } = await supabase.from('certifications').upsert(dbCert).select().single();
    if (error) console.error("Save Cert Error:", error.message);
    return data;
};

export const deleteCertification = async (id: string) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('certifications').delete().eq('id', id);
};

// --- PROJECTS ---
export const getProjects = async (userId: string) => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('projects').select('*').eq('user_id', userId);
    if (error) return [];
    return data.map(p => ({
        id: p.id, user_id: p.user_id, name: p.name, color: p.color,
        defaultHourlyRate: p.default_hourly_rate, defaultBillingType: p.default_billing_type,
        shifts: p.shifts
    }));
};

export const saveProject = async (p: Project, userId: string) => {
    if (!isSupabaseConfigured) return;
    const dbP = {
        id: p.id.length > 30 ? p.id : undefined,
        user_id: userId,
        name: p.name,
        color: p.color,
        default_hourly_rate: p.defaultHourlyRate,
        default_billing_type: p.defaultBillingType,
        shifts: p.shifts
    };
    await supabase.from('projects').upsert(dbP);
};

export const deleteProject = async (id: string) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('projects').delete().eq('id', id);
};

// --- TIME ENTRIES ---
export const getEntries = async (userId: string) => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('time_entries').select('*').eq('user_id', userId).order('start_time', { ascending: false });
    if (error) return [];
    return data.map(e => ({
        id: e.id, projectId: e.project_id, description: e.description,
        startTime: e.start_time, endTime: e.end_time, duration: e.duration,
        hourlyRate: e.hourly_rate, billingType: e.billing_type, expenses: e.expenses,
        isNightShift: e.is_night_shift, is_billed: e.is_billed
    }));
};

export const saveEntry = async (e: TimeEntry, userId: string) => {
    if (!isSupabaseConfigured) return;
    const dbE = {
        id: e.id.length > 30 ? e.id : undefined,
        user_id: userId,
        project_id: e.projectId,
        description: e.description,
        start_time: e.startTime,
        end_time: e.endTime,
        duration: e.duration,
        hourly_rate: e.hourlyRate,
        billing_type: e.billingType,
        expenses: e.expenses,
        is_night_shift: e.isNightShift,
        is_billed: e.is_billed
    };
    const { error } = await supabase.from('time_entries').upsert(dbE);
    if (error) {
        console.error("Save Entry Error:", error.message, error.details);
        return null;
    }
    return true;
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

// --- PROFILES ---
export const getUserProfile = async (id: string) => {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    return data;
};

export const createUserProfile = async (id: string, email: string) => {
    const p = { id, email, role: 'user', subscription_status: 'trial', trial_ends_at: new Date(Date.now() + 60*24*3600*1000).toISOString(), is_approved: true };
    if (!isSupabaseConfigured) return p;
    const { data } = await supabase.from('profiles').upsert(p).select().single();
    return data || p;
};

export const getAllProfiles = async () => {
    if (!isSupabaseConfigured) return [];
    const { data } = await supabase.from('profiles').select('*');
    return data || [];
};

export const updateUserProfileAdmin = async (updates: any) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('profiles').update(updates).eq('id', updates.id);
};

export const deleteUserAdmin = async (id: string) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('profiles').delete().eq('id', id);
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
