/**
 * Legal terms and license agreement authored for Erik Trogen / Hillstas.
 * Strictly drafted under Swedish law.
 */

export const LEGAL_TERMS_VERSION = 'v1.2.0-2026';
export const COPYRIGHT_NOTICE = '© Erik Trogen, Hillstas. Alla rättigheter förbehållna.';
export const RIGHTS_HOLDER = 'Erik Trogen / Hillstas';

export interface LegalTermsSection {
  id: string;
  number: number;
  title: string;
  summary: string;
  content: string;
}

export const LEGAL_SECTIONS: LegalTermsSection[] = [
  {
    id: 'ip-rights',
    number: 1,
    title: '1. Immateriella rättigheter (IP) & Företagshemligheter',
    summary: 'All källkod, metodik, AI-prompter, arkitektur och affärslogik tillhör exklusivt Erik Trogen / Hillstas.',
    content: `Samtliga immateriella rättigheter, innefattande men inte begränsat till upphovsrätt (inklusive källkod, objektskod, skript, databasmodeller och gränssnittsdesign), patentbara uppfinningar, mönsterrättigheter, varumärken, metodik för 5-Gate jobbpaket, logik för materialspärrar, AI-prompter, systeminstruktioner och företagshemligheter i och relaterade till applikationen "Jobbpaket & Leveranskontroll", tillhör oinskränkt och exklusivt Erik Trogen / Hillstas.

Genom att acceptera detta avtal erhåller användaren ("Licenstagaren") en strikt begränsad, personlig, icke-exklusiv, icke-överlåtbar och när som helst återkallelig licens att använda applikationen uteslutande för internt, operativt bruk inom ramen för ordinarie underhållsverksamhet. Inga immateriella rättigheter eller företagshemligheter övergår till Licenstagaren eller dennes arbetsgivare/uppdragsgivare.`,
  },
  {
    id: 'anti-reverse-engineering',
    number: 2,
    title: '2. Förbud mot kopiering, Reverse Engineering & Avtalsvite',
    summary: 'Strikt förbud mot dekompilering, kopiering och plagiering. Brott medför omedelbar avstängning och avtalsvite om 250 000 SEK per överträdelse.',
    content: `Det är uttryckligen och strikt förbjudet för användaren eller tredje part att:
a) Kopiera, duplicera, mångfaldiga eller distribuera hela eller delar av applikationens källkod, arkitektur, metodologiska flöden eller gränssnitt.
b) Dekompilera, disassemblera, bakåtutveckla (reverse engineer), inspektera källkod i webbläsarens utvecklarverktyg eller på annat sätt försöka härleda underliggande affärslogik, beräkningsmodeller eller AI-systemprompter.
c) Skapa härledda verk eller bygga en konkurrerande eller liknande applikation, modul eller tjänst baserad på de koncept, arbetsmetoder eller Gate-strukturer som utvecklats av Erik Trogen / Hillstas.
d) Kringgå, demontera eller manipulera applikationens åtkomstkontroller, autentiseringsmekanismer eller licensspärrar.

Överträdelse av denna bestämmelse utgör ett väsentligt avtalsbrott och medför omedelbar och permanent avstängning från applikationen. Vid varje enskild överträdelse av detta förbud förbinder sig Licenstagaren och/eller dennes organisation att omedelbart utge ett standardiserat avtalsvite om 250 000 SEK (tvåhundrafemtio tusen svenska kronor) per överträdelse till Erik Trogen / Hillstas. Utgivande av avtalsvite inskränker inte Erik Trogen / Hillstas rätt att därutöver kräva fullt skadestånd för all ytterligare faktisk skada, följdskada och utebliven vinst som överträdelsen orsakat.`,
  },
  {
    id: 'liability-limitation',
    number: 3,
    title: '3. Maximal ansvarsbegränsning ("Befintligt skick" / As-Is)',
    summary: 'Applikationen tillhandahålls i befintligt skick utan garantier. Erik Trogen / Hillstas ansvarar under inga omständigheter för driftstopp, skador eller ekonomiska förluster.',
    content: `Applikationen "Jobbpaket & Leveranskontroll" och samtliga dess funktioner, beräkningar och rekommendationer tillhandahålls strikt "I BEFINTLIGT SKICK" (AS-IS) och "I MÅN AV TILLGÄNGLIGHET", utan några som helst garantier av något slag, varken uttryckliga eller underförstådda, inklusive men inte begränsat till garantier avseende säljbarhet, lämplighet för ett visst ändamål, driftsäkerhet eller felfrihet.

I den maximala utsträckning som tillåts enligt tillämplig svensk lag friskriver sig Erik Trogen / Hillstas från allt skadeståndsansvar och all ersättningsskyldighet gentemot Licenstagaren eller tredje man för:
- Direkta skador, indirekta skador, följdskador, incidentiella skador eller allmänna förluster.
- Produktionsstopp, driftavbrott, stilleståndskostnader eller förlorad anläggningstillgänglighet.
- Utebliven vinst, uteblivna besparingar, förlorade intäkter eller förlust av goodwill.
- Felaktiga reservdelsleveranser, felaktigt kitterat material, felaktiga hyllplatser eller försenade underhållsstopp.
- Förlust, förvanskning eller läckage av data eller information.

Erik Trogen / Hillstas totala skadeståndsansvar gentemot Licenstagaren för samtliga anspråk som kan uppstå ur eller i samband med detta avtal ska under alla omständigheter vara begränsat till maximalt 0 SEK (noll kronor), alternativt det belopp som Licenstagaren faktiskt erlagt direkt till Erik Trogen / Hillstas för licensen under de senaste tre (3) månaderna före skadetillfället.`,
  },
  {
    id: 'ai-disclaimer',
    number: 4,
    title: '4. AI-friskrivning & Operatörens eget besiktningsansvar',
    summary: 'AI-analyser utgör endast rådgivande stöd. Licenstagaren har fullt eget ansvar att fysiskt kontrollera anläggning, LOTO och säkerhet innan arbete påbörjas.',
    content: `Applikationen kan innehålla funktioner för artificiell intelligens (AI), maskininlärning eller automatiserad granskning av jobbpaket, reservdelslistor och kontrollpunkter.

Erik Trogen / Hillstas friskriver sig uttryckligen och fullständigt från allt ansvar gällande riktigheten, fullständigheten, tillförlitligheten eller lämpligheten hos AI-genererade analyser, bedömningar, textförslag, riskklassificeringar eller kontrollpunkter. AI-funktionerna utgör uteslutande ett orienterande planeringsstöd och kan innehålla felaktigheter, hallucinationer eller ofullständiga data.

DET ÄR ALLTID OCH UTESLUTANDE LICENSTAGARENS, BEREDARENS OCH DEN FYSISKA UNDERHÅLLSPERSONALENS EGET ANSVAR ATT:
1. I den fysiska verkligheten på anläggningen självständigt kontrollera, inspektera och verifiera att samtliga säkerhetsåtgärder är vidtagna.
2. Formellt och manuellt verifiera att bryt- och låsning (LOTO), spänningslöshet, trycklöshet och dränering är fysiskt genomförda och säkrade innan arbete påbörjas.
3. Säkerställa att rätt reservdelar, rätt verktyg och behörig personal finns på plats och uppfyller anläggningens gällande säkerhetsföreskrifter och lagkrav.
4. Granska och godkänna samtliga leveranskontroller (Flik A & Flik B) innan ett jobb släpps förbi Gate 3 eller Gate 5.`,
  },
  {
    id: 'user-data',
    number: 5,
    title: '5. Användardata, Sekretess och Dataskydd (GDPR)',
    summary: 'Licenstagaren ansvarar för att inmatad anläggnings- och personinformation är laglig och efterlever GDPR samt företagssekretess.',
    content: `Licenstagaren behåller äganderätten till den specifika anläggningsdata och de arbetsordernoteringar som matas in i applikationen. Licenstagaren garanterar och ansvarar fullt ut för att all data, text, dokumentation, ritningsreferenser, personnamn eller fotografier som matas in i systemet:
a) Är lagliga och inhämtade i enlighet med gällande dataskyddslagstiftning (GDPR/Dataskyddsförordningen).
b) Inte gör intrång i tredje parts upphovsrätt, patent, varumärken eller företagshemligheter.
c) Inte innehåller sekretessbelagd försvarsinformation eller säkerhetskänslig information som strider mot svensk säkerhetsskyddslag.

Erik Trogen / Hillstas behandlar uteslutande data i syfte att tillhandahålla systemets funktionalitet och tillämpar principen om dataminimering. Inga personuppgifter säljs eller överförs till obehörig tredje part.`,
  },
  {
    id: 'governing-law',
    number: 6,
    title: '6. Tillämplig lag, Avtalsgiltighet och Tvistlösning',
    summary: 'Svensk materiell rätt gäller. Tvister ska slutligt avgöras i svensk allmän domstol med Stockholms tingsrätt som första instans.',
    content: `Detta avtal, dess tolkning, giltighet och samtliga utomobligatoriska eller inomobligatoriska förpliktelser som härrör ur eller i samband därmed, ska uteslutande regleras av och tolkas i enlighet med svensk materiell rätt, utan beaktande av dess lagvalsregler.

Skulle någon bestämmelse i detta avtal eller del därav befinnas vara ogiltig eller icke verkställbar av behörig domstol, ska detta inte påverka giltigheten av övriga bestämmelser i avtalet, vilka ska förbli i full kraft och verkan.

Eventuella tvister, meningsskiljaktigheter eller anspråk som uppstår ur eller i samband med detta avtal, eller dess brott, uppsägning eller ogiltighet, ska slutligt avgöras vid svensk allmän domstol med Stockholms tingsrätt som exklusiv första instans.`,
  },
];

export interface TermsAcceptanceRecord {
  userId: string;
  userName: string;
  userEmail: string;
  version: string;
  acceptedAt: string; // ISO timestamp
  clientSignatureHash: string;
  clientIpHint?: string;
}

export const TERMS_STORAGE_KEY = 'erik_trogen_terms_accepted_v1';
