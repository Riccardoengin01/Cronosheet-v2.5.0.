import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Project, TimeEntry, UserProfile } from '../types';
import { generateId, COLORS } from '../utils';

// --- MOCK DATA FOR DEMO MODE ---
const MOCK_DELAY = 500;
const LOCAL_STORAGE_KEYS = {
    PROJECTS: 'cronosheet_demo_projects',
    ENTRIES: 'cronosheet_demo_entries',
    PROFILES: 'cronosheet_demo_profiles'
};

const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocal = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

// --- PROJECTS ---

export const getProjects = async (userId?: string): Promise<Project[]> => {
  if (!isSupabaseConfigured) {
      await new Promise(r => setTimeout(r, MOCK_DELAY));
      const all = getLocal(LOCAL_STORAGE_KEYS.PROJECTS);
      if (all.length === 0) {
          const defaults = [
              { id: 'p1', user_id: userId, name: 'Demo Cliente A', color: COLORS[0], defaultHourlyRate: 20, shifts: [] },
              { id: 'p2', user_id: userId, name: 'Demo Cantiere B', color: COLORS[2], defaultHourlyRate: 15, shifts: [] }
          ];
          setLocal(LOCAL_STORAGE_KEYS.PROJECTS, defaults);
          return defaults;
      }
      return all.filter((p: any) => p.user_id === userId);
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return data.map((p: any) => ({
    ...p,
    defaultHourlyRate: p.default_hourly_rate
  }));
};

export const saveProject = async (project: Project, userId: string): Promise<Project | null> => {
  if (!isSupabaseConfigured) {
      await new Promise(r => setTimeout(r, MOCK_DELAY));
      const all = getLocal(LOCAL_STORAGE_KEYS.PROJECTS);
      const newProj = { ...project, user_id: userId };
      const idx = all.findIndex((p: any) => p.id === project.id);
      if (idx >= 0) all[idx] = newProj;
      else all.push(newProj);
      setLocal(LOCAL_STORAGE_KEYS.PROJECTS, all);
      return newProj;
  }

  const dbProject = {
    id: project.id,
    user_id: userId,
    name: project.name,
    color: project.color,
    default_hourly_rate: project.defaultHourlyRate,
    shifts: project.shifts
  };

  const { data, error } = await supabase
    .from('projects')
    .upsert(dbProject)
    .select()
    .single();

  if (error) {
    console.error('Error saving project:', error);
    return null;
  }

  return {
    ...data,
    defaultHourlyRate: data.default_hourly_rate
  };
};

export const deleteProject = async (id: string) => {
  if (!isSupabaseConfigured) {
      const all = getLocal(LOCAL_STORAGE_KEYS.PROJECTS).filter((p: any) => p.id !== id);
      setLocal(LOCAL_STORAGE_KEYS.PROJECTS, all);
      return;
  }
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) console.error('Error deleting project:', error);
};

// --- ENTRIES ---

export const getEntries = async (userId?: string): Promise<TimeEntry[]> => {
  if (!isSupabaseConfigured) {
      await new Promise(r => setTimeout(r, MOCK_DELAY));
      return getLocal(LOCAL_STORAGE_KEYS.ENTRIES).filter((e: any) => e.user_id === userId).sort((a: any, b: any) => b.startTime - a.startTime);
  }

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching entries:', error);
    return [];
  }

  return data.map((e: any) => ({
    id: e.id,
    description: e.description,
    projectId: e.project_id,
    startTime: parseInt(e.start_time),
    endTime: e.end_time ? parseInt(e.end_time) : null,
    duration: parseFloat(e.duration),
    hourlyRate: parseFloat(e.hourly_rate),
    expenses: e.expenses,
    isNightShift: e.is_night_shift,
    user_id: e.user_id
  }));
};

export const saveEntry = async (entry: TimeEntry, userId: string): Promise<TimeEntry | null> => {
  if (!isSupabaseConfigured) {
      await new Promise(r => setTimeout(r, MOCK_DELAY));
      const all = getLocal(LOCAL_STORAGE_KEYS.ENTRIES);
      const newEntry = { ...entry, user_id: userId };
      const idx = all.findIndex((e: any) => e.id === entry.id);
      if (idx >= 0) all[idx] = newEntry;
      else all.push(newEntry);
      setLocal(LOCAL_STORAGE_KEYS.ENTRIES, all);
      return newEntry;
  }

  const dbEntry = {
    id: entry.id,
    user_id: userId,
    project_id: entry.projectId,
    description: entry.description,
    start_time: entry.startTime,
    end_time: entry.endTime,
    duration: entry.duration,
    hourly_rate: entry.hourlyRate,
    expenses: entry.expenses,
    is_night_shift: entry.isNightShift
  };

  const { data, error } = await supabase
    .from('time_entries')
    .upsert(dbEntry)
    .select()
    .single();

  if (error) {
    console.error('Error saving entry:', error);
    return null;
  }
  
  return entry;
};

export const deleteEntry = async (id: string) => {
  if (!isSupabaseConfigured) {
      const all = getLocal(LOCAL_STORAGE_KEYS.ENTRIES).filter((e: any) => e.id !== id);
      setLocal(LOCAL_STORAGE_KEYS.ENTRIES, all);
      return;
  }
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) console.error('Error deleting entry:', error);
};

// --- PROFILES / ADMIN ---

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!isSupabaseConfigured) {
      const profiles = getLocal(LOCAL_STORAGE_KEYS.PROFILES);
      return profiles.find((p: any) => p.id === userId) || null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  
  return {
      ...data,
      billing_info: data.billing_info || {},
      auto_renew: data.auto_renew ?? true 
  };
};

export const createUserProfile = async (userId: string, email: string): Promise<UserProfile | null> => {
    const trialEnds = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    
    if (!isSupabaseConfigured) {
        const profiles = getLocal(LOCAL_STORAGE_KEYS.PROFILES);
        const newProfile: UserProfile = {
            id: userId,
            email: email,
            role: 'admin', 
            subscription_status: 'trial',
            trial_ends_at: trialEnds,
            created_at: new Date().toISOString(),
            is_approved: true,
            billing_info: {},
            auto_renew: true
        };
        profiles.push(newProfile);
        setLocal(LOCAL_STORAGE_KEYS.PROFILES, profiles);
        return newProfile;
    }

    const newProfile = {
        id: userId,
        email: email,
        role: 'user',
        subscription_status: 'trial',
        trial_ends_at: trialEnds,
        is_approved: true,
        billing_info: {},
        auto_renew: true
    };

    const { data, error } = await supabase
        .from('profiles')
        .upsert(newProfile, { onConflict: 'id', ignoreDuplicates: true }) 
        .select()
        .single();
    
    if (error) {
        console.error("Error creating/upserting profile:", error);
        return getUserProfile(userId);
    }
    
    if (data) return { ...data, billing_info: data.billing_info || {} };
    
    return getUserProfile(userId);
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
    if (!isSupabaseConfigured) {
        const profiles = getLocal(LOCAL_STORAGE_KEYS.PROFILES);
        const idx = profiles.findIndex((p: any) => p.id === userId);
        if (idx >= 0) {
            profiles[idx] = { ...profiles[idx], ...updates };
            setLocal(LOCAL_STORAGE_KEYS.PROFILES, profiles);
        }
        return;
    }

    // SANITIZZAZIONE: Creiamo un oggetto pulito
    const dbUpdates: any = {};
    if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name;
    if (updates.billing_info !== undefined) dbUpdates.billing_info = updates.billing_info;
    // IMPORTANTE: Questo assicura che false venga passato correttamente
    if (typeof updates.auto_renew === 'boolean') dbUpdates.auto_renew = updates.auto_renew;

    // Se l'oggetto è vuoto, non fare nulla
    if (Object.keys(dbUpdates).length === 0) return;

    const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId);

    if (error) throw error;
};

export const updateUserProfileAdmin = async (profile: Partial<UserProfile> & { id: string }) => {
    if (!isSupabaseConfigured) {
        const profiles = getLocal(LOCAL_STORAGE_KEYS.PROFILES);
        const idx = profiles.findIndex((p: any) => p.id === profile.id);
        if (idx >= 0) {
            profiles[idx] = { ...profiles[idx], ...profile };
            setLocal(LOCAL_STORAGE_KEYS.PROFILES, profiles);
        }
        return;
    }

    const updates: any = {
        is_approved: profile.is_approved,
        subscription_status: profile.subscription_status,
        role: profile.role,
        full_name: profile.full_name,
        created_at: profile.created_at,
        trial_ends_at: profile.trial_ends_at,
        billing_info: profile.billing_info,
        auto_renew: profile.auto_renew
    };

    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);
    
    if (error) throw error;
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
    if (!isSupabaseConfigured) {
        return getLocal(LOCAL_STORAGE_KEYS.PROFILES);
    }
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching all profiles", error);
        return [];
    }
    return data.map((p: any) => ({
        ...p,
        billing_info: p.billing_info || {}
    }));
};

export const deleteUserAdmin = async (userId: string) => {
    if (!isSupabaseConfigured) {
        const profiles = getLocal(LOCAL_STORAGE_KEYS.PROFILES).filter((p: any) => p.id !== userId);
        setLocal(LOCAL_STORAGE_KEYS.PROFILES, profiles);
        return;
    }
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw error;
};