# Cronosheet SaaS

Un'applicazione moderna per la gestione delle ore, turni e fatturazione, con supporto multi-utente, intelligenza artificiale e sicurezza dei dati tramite Supabase.

---

## 📘 Manuale Utente & Funzionalità

### 1. Core: Gestione Tempi
*   **Timer in Tempo Reale**: Avvio/Stop rapido con assegnazione cliente.
*   **Inserimento Manuale**: Aggiunta ore a posteriori con rilevamento automatico turni notturni.
*   **Spese Extra**: Gestione rimborsi e costi accessori per ogni sessione.
*   **Smart Shifts**: Preset di turni predefiniti (es. "Turno Mattina") per inserimento con 1 click.

### 2. Gestione Clienti
*   **Anagrafica**: Clienti/Progetti illimitati con colore distintivo.
*   **Tariffe**: Impostazione tariffa oraria specifica per cliente.
*   **Configurazione Turni**: Definizione orari standard per ogni cantiere/cliente.

### 3. Dashboard & AI (Gemini)
*   **Analisi AI**: L'assistente Gemini analizza la settimana lavorativa e fornisce report su produttività e consigli.
*   **Grafici**:
    *   Torta: Ripartizione ore per cliente.
    *   Barre: Andamento giornaliero.
*   **Filtri**: Visualizzazione dati per 7 giorni, 14 giorni o mese corrente.

### 4. Fatturazione & Export
*   **Generatore Fatture**: Creazione documento di riepilogo pronto per la stampa.
*   **Export CSV**: (Funzione Pro) Scaricamento dati grezzi per Excel/commercialista.
*   **Filtri Avanzati**: Selezione multipla di clienti e mesi per generare report combinati.

### 5. Piani & Pagamenti (PayPal)
*   **Trial (Start)**: 60 giorni di prova o 15 inserimenti max.
*   **Pro**: Abbonamento mensile/annuale (sblocca Export e AI).
*   **Pagamento Sicuro**: Integrazione PayPal Checkout.
*   **Rinnovo Automatico**: Gestione stato abbonamento e scadenze.

### 6. Pannello Admin (Master)
*   **Gestione Utenti**: Lista globale iscritti, ban/approvazione manuale.
*   **Editor Temi**: Personalizzazione colori della sidebar per i vari ruoli (Trial, Pro, Admin).
*   **Accesso**: Riservato agli utenti con ruolo 'admin'.

---

## 🚀 Guida all'Installazione (Vercel + Supabase)

### 1. Configura Supabase (Database)
1. Vai su [Supabase.com](https://supabase.com) e crea un progetto.
2. Vai su **SQL Editor** e incolla lo script SQL fornito nell'app (schermata Database Setup).
3. Vai su **Settings > API** e copia:
   - **Project URL**
   - **anon public key**

### 2. Configura Vercel (Hosting)
1. Carica questo codice su **GitHub**.
2. Vai su [Vercel](https://vercel.com), "Add New Project" e importa il repository.
3. In **Environment Variables**, aggiungi:

| Nome Variabile (Key) | Valore (Value) |
|----------------------|----------------|
| `VITE_SUPABASE_URL` | `https://...` (da Supabase) |
| `VITE_SUPABASE_KEY` | `eyJh...` (da Supabase) |
| `VITE_GOOGLE_API_KEY` | `AIza...` (da Google AI Studio) |
| `VITE_PAYPAL_CLIENT_ID`| `AbCd...` (da PayPal Developer) |

4. Clicca **Deploy**.

### 3. Credenziali Admin
Il primo utente registrato è "user". Per diventare Admin:
1. Registrati nell'app.
2. Vai su Supabase > Table Editor > `profiles`.
3. Cambia il tuo `role` in `admin`, `is_approved` in `TRUE`, `subscription_status` in `elite`.

---

## 🛠 Sviluppo Locale
Crea un file `.env` nella root:
```ini
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...
VITE_GOOGLE_API_KEY=...
VITE_PAYPAL_CLIENT_ID=test
```

## © Copyright
Developed by Ingi.RiccardoRighini.
