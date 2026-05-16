# Eurovision Song Contest Ranking 2026

Bewertungs- und Bingo-App für den Eurovision Song Contest 2026 – gebaut mit React, Vite, TypeScript und Supabase.

## Features

### Bewertung
- **37 Teilnehmerländer** mit echten Länder-Flaggen (via flagcdn.com)
- **6 Bewertungskategorien** (1–5 Sterne je Kategorie):
  - Musik & Song
  - Performance
  - Kostüm & Styling
  - Show & Staging
  - Wow-Faktor
  - ESC-Feeling
- Künstlerbild automatisch von Wikipedia geladen (mit lokalem Cache)
- Eigene Pressefotos per `pressImageUrl` in den Kandidatendaten hinterlegbar

### Auswertung
- Persönliches Ranking mit Podium, Gesamtranking und Kategorie-Rankings
- **Globales Ranking**: Durchschnittsbewertungen aller Nutzer, Bewertungsmatrix (Heatmap), Ranking pro Nutzer
- **Bingo-Ranking**: Wer hat wie viele Bingos erreicht – live aus der Datenbank

### Bingo
- Eigenes 5×5-Bingo-Board erstellen (bis zu 25 Begriffe eingeben oder ESC-Standardbegriffe laden)
- Felder per Klick markieren
- Automatische Bingo-Erkennung (Zeilen, Spalten, Diagonalen)
- Board-Zustand wird im localStorage gespeichert und in Supabase synchronisiert
- Bingo-Rangliste auf der Auswertungsseite: zeigt alle Nutzer mit mindestens einem Bingo

### Multiplayer
- Login per Benutzername (wird in Supabase gespeichert)
- Bewertungen werden in Supabase synchronisiert und sind für alle sichtbar
- Bingo-Boards werden pro Nutzer gespeichert

## Tech Stack

- React 18 + TypeScript
- Vite
- React Router v6
- CSS Modules
- Inter (Google Fonts)
- Supabase (PostgreSQL + Row Level Security)

## Setup

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Supabase konfigurieren

`.env`-Datei im Projektroot anlegen:

```
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

Beide Werte findest du im Supabase Dashboard unter **Settings → API**.

### 3. Datenbank-Migrationen ausführen

Im Supabase Dashboard unter **SQL Editor** die drei Migrationsdateien nacheinander ausführen:

```
supabase/migrations/001_init.sql      – users + ratings Tabellen
supabase/migrations/002_realtime.sql  – Realtime-Einstellungen
supabase/migrations/003_bingo.sql     – bingo_boards Tabelle
```

### 4. App starten

```bash
npm run dev
```

Öffne [http://localhost:5173](http://localhost:5173) im Browser.

## Build

```bash
npm run build
npm run preview
```

## Projektstruktur

```
src/
  components/       # StarRating, NotificationToast
  context/          # UserContext (Login-State, Supabase-Sync)
  data/             # contestants.ts (Kandidatendaten)
  lib/              # supabase.ts (Datenbankfunktionen)
  pages/
    LoginPage       # Namenseingabe
    HomePage        # Kandidatenliste
    RatingPage      # Bewertungsformular pro Land
    ResultsPage     # Auswertung (Mein Ranking / Globales Ranking / Bingo-Ranking)
    BingoPage       # Bingo-Board Setup + Spielmodus
  types.ts          # Typen + Kategoriedefinitionen
  storage.ts        # localStorage-Hilfsfunktionen
supabase/
  migrations/       # SQL-Migrationsdateien
```

## Datenbankschema

| Tabelle         | Zweck                                              |
|-----------------|----------------------------------------------------|
| `users`         | Benutzername + UUID                                |
| `ratings`       | Bewertungen pro Nutzer und Land (6 Kategorien)     |
| `bingo_boards`  | Bingo-Board + markierte Felder + Bingo-Anzahl      |
