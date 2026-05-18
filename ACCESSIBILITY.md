# Accessibility Compliance (WCAG 2.1 AA)

DriftRapport er designet for å være i samsvar med WCAG 2.1 AA (Web Content Accessibility Guidelines) for å sikre at plattformen er tilgjengelig for alle brukere, inkludert de med nedsatt funksjonsevne.

## Oversikt

Dette dokumentet beskriver hvordan DriftRapport oppfyller WCAG 2.1 AA-kravene og hvilke tiltak som er implementert for å sikre universell tilgang.

## Implementerte Tiltak

### 1. Perceivable (Oppfattbar)

#### 1.1 Text Alternatives
- **1.1.1 Non-text Content**: Alle bilder har alt-tekster som beskriver innholdet
- **1.2.1 Audio-only and Video-only**: Videoer har teksting og beskrivelser

#### 1.2 Time-based Media
- **1.2.2 Captions (Prerecorded)**: Videoer har teksting
- **1.2.3 Audio Description or Media Alternative**: Media har alternative beskrivelser

#### 1.3 Adaptable
- **1.3.1 Info and Relationships**: Semantisk HTML brukes for struktur
- **1.3.2 Meaningful Sequence**: Innhold er logisk strukturert
- **1.3.3 Sensory Characteristics**: Informasjon er ikke kun avhengig av sanser

#### 1.4 Distinguishable
- **1.4.1 Use of Color**: Farge brukes ikke som eneste visuelle indikator
- **1.4.2 Audio Control**: Lyd kan kontrolleres av brukeren
- **1.4.3 Contrast (Minimum)**: Tekst har kontrastforhold på minst 4.5:1
- **1.4.4 Resize Text**: Tekst kan skaleres uten å miste funksjonalitet
- **1.4.5 Images of Text**: Bilder av tekst brukes kun til dekorasjon

### 2. Operable (Brukbar)

#### 2.1 Keyboard Accessible
- **2.1.1 Keyboard**: All funksjonalitet er tilgjengelig via tastatur
- **2.1.2 No Keyboard Trap**: Fokus kan alltid navigeres ut av elementer
- **2.1.3 Character Key Shortcuts**: Tastatursnarveier kan deaktiveres

#### 2.2 Enough Time
- **2.2.1 Timing Adjustable**: Tidsfrister kan justeres
- **2.2.2 Pause, Stop, Hide**: Bevegelig innhold kan pauses/stoppes
- **2.2.3 No Blinks**: Ingen blinkende innhold som kan forårsake anfall
- **2.2.4 Interruptions**: Bruker kan kontrollere avbrudd

#### 2.3 Seizures and Physical Reactions
- **3.2.1 Three Flashes or Below**: Ingen innhold med mer enn 3 blink per sekund

#### 2.4 Navigable
- **2.4.1 Bypass Blocks**: "Hopp til innhold"-lenke er implementert
- **2.4.2 Page Titled**: Alle sider har meningsfulle titler
- **2.4.3 Focus Order**: Logisk tabulatorrekkefølge
- **2.4.4 Link Purpose**: Lenker har beskrivende tekst
- **2.4.5 Multiple Ways**: Flere måter å navigere til innhold
- **2.4.6 Headings and Labels**: Struktur med overskrifter og etiketter
- **2.4.7 Focus Visible**: Fokus er tydelig synlig

### 3. Understandable (Forståelig)

#### 3.1 Readable
- **3.1.1 Language of Page**: Språk er definert i HTML
- **3.1.2 Language of Parts**: Språkendringer er markert
- **3.1.3 Pronunciation**: Forklaringer til uttale er tilgjengelige

#### 3.2 Predictable
- **3.2.1 On Focus**: Fokusendringer forårsaker ikke uventede endringer
- **3.2.2 On Input**: Inndata forårsaker ikke uventede endringer
- **3.2.3 Consistent Navigation**: Navigasjon er konsistent på tvers av sider
- **3.2.4 Consistent Identification**: Elementer er konsistent identifisert

#### 3.3 Input Assistance
- **3.3.1 Error Identification**: Feilmeldinger er tydelige
- **3.3.2 Labels or Instructions**: Skjemaelementer har etiketter
- **3.3.3 Error Suggestion**: Forslag til feilretting
- **3.3.4 Error Prevention (Legal, Financial, Data)**: Bekreftelse for viktige handlinger

### 4. Robust (Robust)

#### 4.1 Compatible
- **4.1.1 Parsing**: Valid HTML uten parsingfeil
- **4.1.2 Name, Role, Value**: ARIA brukes korrekt
- **4.1.3 Status Messages**: Statusmeldinger er tilgjengelige for skjermlesere

## Tekniske Implementeringer

### HTML-struktur
- Semantisk HTML5-elementer (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`)
- Riktig heading-struktur (h1 → h2 → h3)
- Landmarks for navigasjon (`role="navigation"`, `role="main"`, etc.)

### Tastaturnavigasjon
- Full tastatertilgang til alle interaktive elementer
- Logisk tabulatorrekkefølge
- Synlig fokus-indikator
- Tastatursnarveier for vanlige handlinger

### Farger og Kontrast
- Tekstkontrast minimum 4.5:1
- Kontrast for viktige elementer minimum 3:1
- Ikke avhengig av farge alene for informasjon

### Skjermleser-støtte
- ARIA-labeler og -beskrivelser
- Live regions for dynamisk innhold
- Roler og states for komplekse komponenter
- Announcements for statusendringer

### Mobil og Touch
- Tilstrekkelig stor klikkflate (minst 44x44px)
- God avstand mellom interaktive elementer
- Støtte for skjermlesere på mobile enheter

## Test og Verifisering

### Automatiske Tester
- axe-core for tilgjengelighetstesting
- Lighthouse accessibility audit
- WAVE verktøy for visuell testing

### Manuell Testing
- Tastaturnavigasjon uten mus
- Skjermleser-testing (NVDA, JAWS, VoiceOver)
- Zoom-testing (200% zoom)
- Fargekontrast-verifisering
- Mobil testing med skjermleser

## Brukerstøtte

### Hjelpetekster
- Tastatursnarveier er dokumentert
- Hjelp-seksjon med tilgjengelighetstips
- Kontaktinformasjon for tilgjengelighetshjelp

### Tilpasningsmuligheter
- Tekststørrelse kan justeres
- Høyt kontrast-modus støttes
- Redusert bevegelse støttes

## Vedlikehold og Kontinuitet

### Opplæring
- Utviklere har opplæring i tilgjengelighet
- Code review inkluderer tilgjengelighetssjekk
- Dokumentasjon oppdateres jevnlig

### Kontinuerlig Forbedring
- Brukerfeedback om tilgjengelighet
- Regelmessig testing med nye assistentteknologier
- Oppfølging av WCAG-oppdateringer

## Spesifikke Implementeringer i DriftRapport

### Navigasjon
- Skip link for å hoppe til hovedinnhold
- Breadcrumb-navigasjon
- Konsistent menystruktur
- Søk med tastatursnarvei

### Skjemaer
- Tydelige etiketter for alle felt
- Feilmeldinger med spesifikke instruksjoner
- Validering i sanntid
- Gruppering av relaterte felt

### Tabeller
- Caption for tabelldetaljer
- Scope attributter for header-celler
- Responsiv design for mobilvisning

### Dialoger og Modals
- Fokus-trapping inne i dialoger
- Escape-tast for å lukke
- ARIA-labeler for dialog-innhold

### Grafikk og Visualisering
- Alt-tekster for meningsfylt grafikk
- Tekst-alternativer for diagrammer
- Fargeblind-vennlige paletter

## Samsvarserklæring

DriftRapport er utviklet for å oppfylle WCAG 2.1 AA-nivå. Vi gjennomfører jevnlig testing og justeringer for å sikre fortsatt samsvar.

### Dato for siste evaluering
- 10. mai 2026

### Kontaktperson for tilgjengelighet
- [Navn på kontaktperson]
- [E-post]
- [Telefon]

## Ressurser

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe Accessibility Testing](https://www.deque.com/axe/)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

---

Dette dokumentet vil bli oppdatert jevnlig for å reflektere endringer i plattformen og WCAG-kravene.
