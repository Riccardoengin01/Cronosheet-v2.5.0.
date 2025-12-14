import { Project, TimeEntry } from '../types';
import { generateId, COLORS } from '../utils';

const KEYS = {
  PROJECTS: 'cronosheet_projects',
  ENTRIES: 'cronosheet_entries'
};

// Postazioni di default con turni di esempio
const DEFAULT_PROJECTS: Project[] = [
  { 
    id: '1', 
    name: 'Reception Ingresso', 
    color: COLORS[0], 
    defaultHourlyRate: 10.00,
    shifts: [
        { id: 's1', name: 'Mattina', startTime: '07:00', endTime: '15:00' },
        { id: 's2', name: 'Pomeriggio', startTime: '15:00', endTime: '23:00' }
    ]
  },
  { 
    id: '2', 
    name: 'Pattuglia Esterna', 
    color: COLORS[4], 
    defaultHourlyRate: 12.50,
    shifts: [
        { id: 's3', name: 'Notte', startTime: '22:00', endTime: '06:00' }
    ]
  }
];

export const getProjects = (): Project[] => {
  const stored = localStorage.getItem(KEYS.PROJECTS);
  if (!stored) {
    // Save defaults immediately so they can be edited/deleted properly
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(DEFAULT_PROJECTS));
    return DEFAULT_PROJECTS;
  }
  return JSON.parse(stored);
};

export const saveProject = (project: Project) => {
  const projects = getProjects();
  const exists = projects.find(p => p.id === project.id);
  let newProjects;
  if (exists) {
    newProjects = projects.map(p => p.id === project.id ? project : p);
  } else {
    newProjects = [...projects, project];
  }
  localStorage.setItem(KEYS.PROJECTS, JSON.stringify(newProjects));
  return newProjects;
};

export const deleteProject = (id: string) => {
    const projects = getProjects().filter(p => p.id !== id);
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
    return projects;
};

export const getEntries = (): TimeEntry[] => {
  const stored = localStorage.getItem(KEYS.ENTRIES);
  return stored ? JSON.parse(stored) : [];
};

export const saveEntry = (entry: TimeEntry) => {
  const entries = getEntries();
  const exists = entries.find(e => e.id === entry.id);
  let newEntries;
  if (exists) {
    newEntries = entries.map(e => e.id === entry.id ? entry : e);
  } else {
    newEntries = [entry, ...entries];
  }
  localStorage.setItem(KEYS.ENTRIES, JSON.stringify(newEntries));
  return newEntries;
};

export const deleteEntry = (id: string) => {
  const entries = getEntries().filter(e => e.id !== id);
  localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  return entries;
};