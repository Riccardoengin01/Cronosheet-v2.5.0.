import { UserProfile, Project, TimeEntry } from '../types';
import { generateId, COLORS } from '../utils';

// CHIAVI LOCAL STORAGE
const KEYS = {
  USERS: 'cronosheet_mock_users',
  SESSION: 'cronosheet_mock_session',
  PROJECTS: 'cronosheet_mock_projects',
  ENTRIES: 'cronosheet_mock_entries'
};

// Admin Predefinito
const DEFAULT_ADMIN: UserProfile = {
    id: 'admin-1',
    email: 'admin@cronosheet.com',
    role: 'admin',
    subscription_status: 'pro',
    trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    is_approved: true,
    password: 'admin123' // In un'app reale non si salva in chiaro, ma questo è un mock
};

// --- AUTH MOCK ---

const getUsers = (): UserProfile[] => {
    const stored = localStorage.getItem(KEYS.USERS);
    if (!stored) {
        localStorage.setItem(KEYS.USERS, JSON.stringify([DEFAULT_ADMIN]));
        return [DEFAULT_ADMIN];
    }
    return JSON.parse(stored);
};

export const signIn = async (email: string, password: string): Promise<{ user: UserProfile | null, error: string | null }> => {
    await new Promise(r => setTimeout(r, 500)); // Simula ritardo rete
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (!user) return { user: null, error: 'Credenziali non valide' };
    
    // Salva sessione
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    return { user, error: null };
};

export const signUp = async (email: string, password: string): Promise<{ user: UserProfile | null, error: string | null }> => {
    await new Promise(r => setTimeout(r, 800));
    const users = getUsers();
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { user: null, error: 'Email già registrata' };
    }

    const newUser: UserProfile = {
        id: generateId(),
        email,
        password,
        role: 'user',
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 giorni trial
        is_approved: false // Richiede approvazione admin
    };

    users.push(newUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    
    return { user: newUser, error: null };
};

export const signOut = async () => {
    localStorage.removeItem(KEYS.SESSION);
};

export const getSession = async (): Promise<UserProfile | null> => {
    const stored = localStorage.getItem(KEYS.SESSION);
    return stored ? JSON.parse(stored) : null;
};

// --- DATA MOCK (ISOLATED PER USER) ---

const getAllProjects = (): Project[] => {
    const stored = localStorage.getItem(KEYS.PROJECTS);
    return stored ? JSON.parse(stored) : [];
};

const getAllEntries = (): TimeEntry[] => {
    const stored = localStorage.getItem(KEYS.ENTRIES);
    return stored ? JSON.parse(stored) : [];
};

export const getUserProjects = async (userId: string): Promise<Project[]> => {
    const all = getAllProjects();
    // Filtra per utente
    let userProjects = all.filter(p => p.user_id === userId);
    
    // Se l'utente non ha progetti, creane di default
    if (userProjects.length === 0) {
        const defaults: Project[] = [
            { 
                id: generateId(), user_id: userId, name: 'Esempio Cantiere A', color: COLORS[0], defaultHourlyRate: 15.00,
                shifts: [{ id: 's1', name: 'Mattina', startTime: '07:00', endTime: '15:00' }]
            }
        ];
        const newAll = [...all, ...defaults];
        localStorage.setItem(KEYS.PROJECTS, JSON.stringify(newAll));
        userProjects = defaults;
    }
    return userProjects;
};

export const saveUserProject = async (project: Project, userId: string): Promise<Project> => {
    const all = getAllProjects();
    const cleanProject = { ...project, user_id: userId };
    
    const existingIndex = all.findIndex(p => p.id === project.id);
    if (existingIndex >= 0) {
        all[existingIndex] = cleanProject;
    } else {
        all.push(cleanProject);
    }
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(all));
    return cleanProject;
};

export const deleteUserProject = async (projectId: string) => {
    const all = getAllProjects().filter(p => p.id !== projectId);
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(all));
};

export const getUserEntries = async (userId: string): Promise<TimeEntry[]> => {
    return getAllEntries().filter(e => e.user_id === userId);
};

export const saveUserEntry = async (entry: TimeEntry, userId: string): Promise<TimeEntry> => {
    const all = getAllEntries();
    const cleanEntry = { ...entry, user_id: userId };
    
    const existingIndex = all.findIndex(e => e.id === entry.id);
    if (existingIndex >= 0) {
        all[existingIndex] = cleanEntry;
    } else {
        all.push(cleanEntry);
    }
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(all));
    return cleanEntry;
};

export const deleteUserEntry = async (entryId: string) => {
    const all = getAllEntries().filter(e => e.id !== entryId);
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(all));
};

// --- ADMIN FEATURES ---

export const getAllUsers = async (): Promise<UserProfile[]> => {
    return getUsers();
};

export const updateUserProfile = async (updatedUser: UserProfile) => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index >= 0) {
        users[index] = updatedUser;
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
};

export const deleteUser = async (userId: string) => {
    const users = getUsers().filter(u => u.id !== userId);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    
    // Cleanup dati utente (opzionale ma pulito)
    const projs = getAllProjects().filter(p => p.user_id !== userId);
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projs));
    const entries = getAllEntries().filter(e => e.user_id !== userId);
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
};