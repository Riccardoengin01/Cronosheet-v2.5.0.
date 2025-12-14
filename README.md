# Cronosheet SaaS

Un'applicazione moderna per la gestione delle ore, turni e fatturazione, con supporto multi-utente e sicurezza dei dati tramite Supabase.

## 🚀 Guida alla Pubblicazione (Vercel + Supabase)

### 1. Configura Supabase (Database)
1. Vai su [Supabase.com](https://supabase.com) e crea un progetto.
2. Vai su **SQL Editor** e incolla lo script SQL per creare le tabelle (fornito separatamente).
3. Vai su **Settings (icona ingranaggio) > API**.
4. Tieni aperta questa pagina, ti serviranno:
   - **Project URL**
   - **anon public key**

### 2. Configura Vercel (Hosting)
1. Carica questo codice su **GitHub**.
2. Vai su [Vercel](https://vercel.com), fai "Add New Project" e seleziona il tuo repository GitHub.
3. **PRIMA** di cliccare Deploy, trova la sezione **Environment Variables**.
4. Aggiungi queste 3 variabili (copia i nomi ESATTI):

| Nome Variabile (Key) | Valore (Value) | Dove lo trovo? |
|----------------------|----------------|----------------|
| `VITE_SUPABASE_URL` | `https://...` | Supabase > Settings > API > Project URL |
| `VITE_SUPABASE_KEY` | `eyJh...` | Supabase > Settings > API > Project API Keys (anon) |
| `VITE_GOOGLE_API_KEY` | `AIza...` | Google AI Studio (API Key) |

5. Clicca **Deploy**.

## 🔐 Credenziali Admin
Il primo utente che registri sarà un utente "base". Per renderlo amministratore:
1. Vai su Supabase > Table Editor > tabella `profiles`.
2. Trova la riga del tuo utente.
3. Modifica la colonna `role` in `admin`.
4. Modifica la colonna `is_approved` in `TRUE`.

## 🛠 Sviluppo Locale
Se lavori sul tuo computer, crea un file `.env` nella cartella principale:
```ini
VITE_SUPABASE_URL=https://tuo-url.supabase.co
VITE_SUPABASE_KEY=tua-chiave-anon
VITE_GOOGLE_API_KEY=tua-chiave-google
```
