/*
 * tasks.js — altid-tilgængelige opgaver + indhold til de tre pengeopgave-motorer.
 *
 *  - creativeTasks / puzzle: godkendes manuelt af host.
 *  - tip13:   auto-rettet quiz. Flere sæt roteres, så samme spørgsmål ikke gentages.
 *  - tidslinje: fælles pengeopgave — løses KUN på Tidslinje-stationen (egen tablet + fysiske kort).
 *  - dyst:    hold-mod-hold estimering. Nærmeste svar vinder hvert spørgsmål, bedst af 3.
 */

// ---------- Altid-tilgængelige (host godkender) ----------
const alwaysAvailableTasks = [
  {
    id: 'puzzle',
    name: 'Puslespil',
    type: 'oneTime',
    approvedByHost: true,
    description:
      'Et langt team-puslespil der er tilgængeligt fra start til finalen. Skal helst være færdigt før ' +
      'The Great Team Derby — det giver Derby-licens.',
  },
  {
    id: 'horseStyling',
    name: 'Pynt / style jeres hest',
    type: 'creative',
    approvedByHost: true,
    description:
      'Pynt jeres hobbyhest — fletninger, kappe, perler, aftagelig pynt. Må ikke ødelægges permanent. ' +
      'Bedømmes i den kreative showcase til sidst.',
  },
  {
    id: 'stableSign',
    name: 'Design jeres staldskilt / våbenskjold',
    type: 'creative',
    approvedByHost: true,
    description:
      'Dekorér jeres trykte staldskilt med farver, symboler og staldnavn, så det repræsenterer jeres stald. ' +
      'Bedømmes i den kreative showcase.',
  },
  // Valgfri, kan aktiveres senere:
  {
    id: 'hat',
    name: 'Fold en derby-hat',
    type: 'creative',
    approvedByHost: true,
    enabled: false,
    description: 'Valgfri kreativ opgave: fold/design en derby-hat.',
  },
];

// ---------- Tip en 13'er ----------
// Hvert spørgsmål: { q, options:[1, X, 2], correct: index }
const tip13Sets = [
  {
    id: 'A',
    questions: [
      { q: 'Hvor mange ben har en hest?', options: ['2', '4', '6'], correct: 1 },
      { q: 'Hvad hedder en ung hest?', options: ['Føl', 'Kalv', 'Lam'], correct: 0 },
      { q: 'Blå + gul giver hvilken farve?', options: ['Grøn', 'Lilla', 'Orange'], correct: 0 },
      { q: 'Hvor mange minutter er der i en time?', options: ['30', '60', '90'], correct: 1 },
      { q: 'Hvad er Danmarks hovedstad?', options: ['Aarhus', 'Odense', 'København'], correct: 2 },
      { q: 'Hvor mange dage er der i en uge?', options: ['5', '7', '10'], correct: 1 },
      { q: 'Hvilket dyr vrinsker?', options: ['Ko', 'Hest', 'Får'], correct: 1 },
      { q: 'Verdens største hav?', options: ['Atlanterhavet', 'Stillehavet', 'Middelhavet'], correct: 1 },
      { q: 'Hvor mange sider har en trekant?', options: ['3', '4', '5'], correct: 0 },
      { q: 'En kastreret hanhest kaldes?', options: ['Hingst', 'Vallak', 'Hoppe'], correct: 1 },
      { q: 'Hvilken planet er tættest på solen?', options: ['Jorden', 'Mars', 'Merkur'], correct: 2 },
      { q: 'Antal bogstaver i det danske alfabet?', options: ['26', '28', '29'], correct: 2 },
      { q: 'Rytteren i et væddeløb kaldes?', options: ['Jockey', 'Kusk', 'Dommer'], correct: 0 },
    ],
  },
  {
    id: 'B',
    questions: [
      { q: 'Hvor mange timer er der i et døgn?', options: ['12', '24', '36'], correct: 1 },
      { q: 'Hvad hedder en hunhest?', options: ['Hoppe', 'Hingst', 'Føl'], correct: 0 },
      { q: 'Hvilket land er kendt for Eiffeltårnet?', options: ['Italien', 'Frankrig', 'Spanien'], correct: 1 },
      { q: 'Antal spillere på et fodboldhold på banen?', options: ['9', '10', '11'], correct: 2 },
      { q: 'Hvad bruger man en saddel til?', options: ['At ride', 'At spise', 'At sove'], correct: 0 },
      { q: 'Hvilken farve er en moden banan?', options: ['Grøn', 'Gul', 'Rød'], correct: 1 },
      { q: 'Hvor mange måneder har et år?', options: ['10', '12', '14'], correct: 1 },
      { q: 'Hestens hurtigste gangart?', options: ['Skridt', 'Trav', 'Galop'], correct: 2 },
      { q: 'Hvilket tal kommer efter 99?', options: ['100', '101', '110'], correct: 0 },
      { q: 'Hvad er is lavet af?', options: ['Vand', 'Sand', 'Luft'], correct: 0 },
      { q: 'Hvor mange øjne har et menneske normalt?', options: ['1', '2', '3'], correct: 1 },
      { q: 'Hvor står Den Lille Havfrue?', options: ['København', 'Aarhus', 'Aalborg'], correct: 0 },
      { q: 'En gruppe heste kaldes en?', options: ['Flok', 'Sværm', 'Stime'], correct: 0 },
    ],
  },
];

// ---------- Tidslinje (Tidslinje-stationen — egen tablet + fysiske kort) ----------
// Hvert item har 'year' (facit, kun på serveren) og 'card' = nummeret trykt på det
// FYSISKE kort. Kortnumrene er bevidst blandede, så rækkefølgen 1-5 IKKE er kronologisk.
// Holdet lægger de fysiske kort i rækkefølge og taster kortnumrene ind på stationen.
// Årstal må aldrig sendes til klienten eller stå på kortene.
const tidslinjeSets = [
  {
    id: 'A',
    title: 'Verdensbegivenheder',
    items: [
      { card: 4, label: 'Den første mand på Månen', year: 1969 },
      { card: 1, label: 'Berlinmurens fald', year: 1989 },
      { card: 3, label: 'Danmark vinder EM i fodbold', year: 1992 },
      { card: 5, label: 'Den første iPhone', year: 2007 },
      { card: 2, label: 'COVID-19-pandemien starter', year: 2020 },
    ],
  },
  {
    id: 'B',
    title: 'Opfindelser',
    items: [
      { card: 2, label: 'Bogtrykkerkunsten', year: 1440 },
      { card: 5, label: 'Dampmaskinen', year: 1712 },
      { card: 1, label: 'Glødepæren', year: 1879 },
      { card: 4, label: 'Fjernsynet', year: 1927 },
      { card: 3, label: 'World Wide Web', year: 1989 },
    ],
  },
  {
    id: 'C',
    title: 'Danmarkshistorie',
    items: [
      { card: 3, label: 'Jellingstenen rejses', year: 965 },
      { card: 1, label: 'Grundloven underskrives', year: 1849 },
      { card: 4, label: 'Kvinder får valgret i Danmark', year: 1915 },
      { card: 5, label: 'Danmark besættes 9. april', year: 1940 },
      { card: 2, label: 'Øresundsbroen åbner', year: 2000 },
    ],
  },
  {
    id: 'D',
    title: 'Film & underholdning',
    items: [
      { card: 5, label: 'Snehvide — Disneys første tegnefilm i spillefilmslængde', year: 1937 },
      { card: 2, label: 'Den første Star Wars-film har premiere', year: 1977 },
      { card: 4, label: 'Titanic har premiere', year: 1997 },
      { card: 1, label: 'Ringenes Herre: Eventyret om Ringen har premiere', year: 2001 },
      { card: 3, label: 'Frost (Frozen) har premiere', year: 2013 },
    ],
  },
  {
    id: 'E',
    title: 'Sportshistorie',
    items: [
      { card: 2, label: 'De første moderne Olympiske Lege', year: 1896 },
      { card: 4, label: 'Den første Tour de France', year: 1903 },
      { card: 1, label: 'Det første VM i fodbold', year: 1930 },
      { card: 3, label: 'Den første Super Bowl', year: 1967 },
      { card: 5, label: 'Caroline Wozniacki bliver nr. 1 i verden', year: 2010 },
    ],
  },
  {
    id: 'F',
    title: 'Musikhistorie',
    items: [
      { card: 3, label: 'The Beatles går i opløsning', year: 1970 },
      { card: 1, label: 'MTV går i luften', year: 1981 },
      { card: 5, label: 'Spice Girls udgiver Wannabe', year: 1996 },
      { card: 2, label: 'Spotify lanceres', year: 2008 },
      { card: 4, label: 'Gangnam Style rammer 1 mia. visninger', year: 2012 },
    ],
  },
  {
    id: 'G',
    title: 'Teknologi',
    items: [
      { card: 4, label: 'Den første e-mail sendes', year: 1971 },
      { card: 1, label: 'Google grundlægges', year: 1998 },
      { card: 3, label: 'Facebook lanceres', year: 2004 },
      { card: 5, label: 'Netflix begynder at streame film', year: 2007 },
      { card: 2, label: 'ChatGPT lanceres', year: 2022 },
    ],
  },
  {
    id: 'H',
    title: 'Heste & væddeløb',
    items: [
      { card: 2, label: 'Mennesket tæmmer hesten på stepperne', year: -3500 },
      { card: 3, label: 'Det første Epsom Derby rides i England', year: 1780 },
      { card: 4, label: 'Ridebanespringning bliver olympisk disciplin', year: 1900 },
      { card: 5, label: 'Klampenborg Galopbane åbner', year: 1910 },
      { card: 1, label: 'Secretariat vinder Triple Crown i rekordtid', year: 1973 },
    ],
  },
];

// ---------- Dyst (estimering, nærmeste vinder) ----------
const dystQuestions = [
  { q: 'Hvor mange knogler har et voksent menneske?', answer: 206, unit: 'stk' },
  { q: 'Afstand Jorden–Månen i gennemsnit?', answer: 384400, unit: 'km' },
  { q: 'Hvor højt er Eiffeltårnet?', answer: 330, unit: 'm' },
  { q: 'Antal medlemslande i FN?', answer: 193, unit: 'lande' },
  { q: 'Hvor mange tænder har en voksen hest ca.?', answer: 40, unit: 'tænder' },
  { q: 'Vægt af en typisk fuldblodshest?', answer: 500, unit: 'kg' },
  { q: 'Hvor mange sekunder er der i et døgn?', answer: 86400, unit: 'sek' },
  { q: 'Hvor mange centimeter er en meter?', answer: 100, unit: 'cm' },
  { q: 'Hvor hurtigt kan en galophest løbe ca.?', answer: 65, unit: 'km/t' },
  { q: 'Hvor mange ringe er der i det olympiske symbol?', answer: 5, unit: 'ringe' },
  { q: 'Hvor mange indbyggere har Danmark ca.?', answer: 5900000, unit: 'personer' },
  { q: 'Hvor mange grader er der i en cirkel?', answer: 360, unit: 'grader' },
];

module.exports = {
  alwaysAvailableTasks,
  tip13Sets,
  tidslinjeSets,
  dystQuestions,
};
