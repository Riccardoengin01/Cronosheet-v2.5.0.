import { GoogleGenAI } from "@google/genai";
import { TimeEntry, Project } from "../types";
import { formatDurationHuman, formatDate } from "../utils";

const getAI = () => {
    // Fix: The API key must be obtained exclusively from the environment variable process.env.API_KEY
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        console.error("API Key (process.env.API_KEY) not found in environment variables.");
        return null;
    }
    // Fix: Using correct initialization with named parameter
    return new GoogleGenAI({ apiKey });
}

export const analyzeTimeData = async (entries: TimeEntry[], projects: Project[]) => {
    const ai = getAI();
    if (!ai) return "Errore Configurazione: Manca la Chiave API di Google (process.env.API_KEY).";

    // Prepare data summary
    const projectMap = new Map(projects.map(p => [p.id, p.name]));
    
    // Filter last 7 days for relevance
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentEntries = entries.filter(e => e.startTime > oneWeekAgo);

    const dataSummary = recentEntries.map(e => ({
        date: formatDate(e.startTime),
        project: projectMap.get(e.projectId) || 'Unknown',
        description: e.description,
        duration: formatDurationHuman(e.duration || ((e.endTime || Date.now()) - e.startTime) / 1000)
    }));

    const prompt = `
    I am a freelancer/professional using a time tracking app called Cronosheet.
    Here is my time log for the last 7 days:
    ${JSON.stringify(dataSummary, null, 2)}

    Please provide a concise but insightful analysis of my week. 
    1. Summarize where most of my time went.
    2. Identify any potential productivity issues (e.g., too many short tasks, long hours on one thing).
    3. If I were to bill a client, write a short professional summary of work done.
    4. Maintain a professional, encouraging tone.
    `;

    try {
        // Fix: Switched to gemini-3-flash-preview for basic text tasks
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        // Fix: response.text is a property, not a method
        return response.text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Failed to generate analysis. Please try again later.";
    }
};

export const categorizeTask = async (description: string, projects: Project[]): Promise<string | null> => {
    const ai = getAI();
    if (!ai) return null;

    const projectNames = projects.map(p => p.name).join(", ");
    
    const prompt = `
    I have a list of project categories: [${projectNames}].
    I am about to start a task with this description: "${description}".
    Which project category does this best fit into? Return ONLY the exact project name from the list. If unsure, return "General".
    `;

    try {
        // Fix: Switched to gemini-3-flash-preview for basic text tasks
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        // Fix: response.text is a property, not a method
        const suggestedName = response.text?.trim();
        const project = projects.find(p => p.name.toLowerCase() === suggestedName?.toLowerCase());
        return project ? project.id : null;
    } catch (e) {
        return null;
    }
}