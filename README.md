# DriftRapport

Intern rapporteringsplattform for Likestillingssenteret KUN og Likestillingssenteret på Vestlandet.

## Teknologi Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel + Supabase Cloud

## Funksjonalitet

- Brukeradministrasjon med rollebasert tilgang
- Aktivitetshåndtering (deltakelse, arrangementer, publikasjoner)
- Prosjektstyring og finansiering
- Emneområder og faglig ledelse
- Avansert søk og filtrering
- Rapportgenerering (PDF/DOCX)
- Audit logging
- WCAG 2.1 AA tilgjengelighet

## Komme i gang

### 1. Klon repo og installer dependencies

```bash
git clone <repository-url>
cd drift-rapport
npm install
```

### 2. Sett opp Supabase

1. Opprett nytt Supabase prosjekt på [supabase.com](https://supabase.com)
2. Kjør SQL-skriptet i `supabase/schema.sql` i Supabase SQL Editor
3. Hent prosjekt-URL og API-nøkler fra Supabase Settings

### 3. Konfigurer miljøvariabler

Kopier `.env.example` til `.env.local`:

```bash
cp .env.example .env.local
```

Fyll inn dine Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=DriftRapport
```

### 4. Start utviklingsserver

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.

## Database Schema

Se `supabase/schema.sql` for komplett database-struktur med:

- Organisasjoner
- Brukere og roller
- Emneområder
- Aktiviteter
- Prosjekter
- Rapporter
- Audit logging

## Roller og Tilganger

- **admin**: Full tilgang til alt
- **leder**: Organisasjons-administrasjon
- **nesteder**: Team-ledelse
- **kommunikasjonsrådgiver**: Innhold og publikasjoner
- **regnskap**: Prosjektøkonomi
- **subject_area_leader**: Emneområder
- **employee**: Egen profil og aktiviteter

## Utvikling

### Prosjektstruktur

```
src/
├── app/              # Next.js App Router
├── components/       # UI komponenter
├── contexts/         # React contexts
├── lib/              # Utility funksjoner
├── types/            # TypeScript typer
└── hooks/            # Custom hooks
```

### Kodekvalitet

- Strict TypeScript
- ESLint og Prettier
- Komponent-testing
- Accessibility testing

### Bygg og Deploy

```bash
npm run build
npm start
```

Deploy til Vercel med `vercel` CLI eller GitHub integration.

## Sikkerhet

- Row Level Security (RLS) i Supabase
- Server-side validering
- CSRF beskyttelse
- Rate limiting
- Sikker filopplasting

## Lisens

Intern bruk for Likestillingssenteret KUN og Likestillingssenteret på Vestlandet.
