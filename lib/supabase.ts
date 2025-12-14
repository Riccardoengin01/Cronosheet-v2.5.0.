import { createClient } from '@supabase/supabase-js';

// Vercel/Vite injects variables prefixed with VITE_
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_KEY;

// Esportiamo un flag per sapere se Supabase è configurato
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey;

if (!isSupabaseConfigured) {
  console.warn("Supabase credentials not found. App will show setup screen.");
}

// Usiamo valori placeholder se mancano le chiavi per evitare il crash di createClient()
// L'App.tsx controllerà isSupabaseConfigured prima di fare richieste.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);