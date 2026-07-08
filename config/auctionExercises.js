/*
 * auctionExercises.js — de 6 special-øvelser der handles på auktion.
 * (Mind Puzzle er flyttet til fælles pengeopgaver; Påklæd din hest er udgået.)
 * category: 'money' | 'jockey' | 'horse'
 *   money   → giver SD (aftagende belønning + cooldown)
 *   jockey  → giver jockey-performance-point (resultatniveau)
 *   horse   → giver hest-performance-point (resultatniveau)
 */

const auctionExercises = [
  {
    id: 'cornhole',
    name: 'Cornhole',
    category: 'money',
    short: 'Ram hullet — eller landing på pladen.',
    description:
      'Klassisk cornhole-board. I får 5 ærteposer. Øv frit. Når I vil have et officielt forsøg, ' +
      'kalder I på en instruktør. Succes: mindst 2 poser i hullet, ELLER mindst 4 poser på pladen ' +
      '(poser i hullet tæller også som på pladen).',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    reward: { start: 1000, decreasePerSuccess: 50, min: 400 },
    cooldownSeconds: 180,
  },
  {
    id: 'hesteskohus',
    name: 'Hesteskohus',
    category: 'money',
    short: 'Byg et tårn af hestesko (min. 20 cm).',
    description:
      'Byg et hus/tårn af hestesko. Succeskriterie: mindst 20 cm højt. Når det er godkendt, får I DD. ' +
      'Belønningen falder for hver succes.',
    gives: 'Derby Dollars — aftagende belønning.',
    reward: { start: 1000, decreasePerSuccess: 50, min: 400 },
    cooldownSeconds: 180,
  },
  {
    id: 'jockeyguidning',
    name: 'Jockey Guidning',
    category: 'money',
    short: 'Blind tillid — bogstaveligt talt.',
    description:
      'Én fra stalden er jockey: bind for øjnene og op på kæphesten. Jockeyen skal ride gennem ' +
      'forhindringsbanen — uden at kunne se noget som helst. Resten af stalden guider hest og jockey ' +
      'gennem banen — KUN ved hjælp af snorene. Kald på en instruktør for et officielt forsøg. ' +
      'Succes: hele banen gennemføres.',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    reward: { start: 1000, decreasePerSuccess: 50, min: 400 },
    cooldownSeconds: 180,
  },
  {
    id: 'jongler',
    name: 'Jonglér',
    category: 'jockey',
    short: 'Send bolden rundt — alle skal røre den.',
    description:
      'Min. 3 deltagere, hver med en krabbakke. Én bold sendes mellem bakker. Alle aktive skal have ' +
      'rørt bolden, før samme person må modtage den igen. Få så mange gyldige afleveringer som muligt.',
    gives: 'Jockey-point (træner reaktion).',
    thresholds: { pass: 10, bronze: 20, silver: 35, gold: 50 },
  },
  {
    id: 'baleofhay',
    name: 'Stabl Høballer',
    category: 'jockey',
    short: 'Stabl halmballer med snore — balance.',
    description:
      'Min. 3 deltagere. Rund træplade med snore. Hver deltager holder præcis én snor (ingen med to, ' +
      'ingen med nul). Flyt pladen og stabl træklodser/halmballer i et tårn. Officielt forsøg: 3 minutter — ' +
      'tårnet måles NÅR tiden er nul (falder det 1 sekund før, tæller det).',
    gives: 'Jockey-point (træner balance).',
    thresholds: { pass: 2, bronze: 4, silver: 6, gold: 8 },
  },
  {
    id: 'aeblefarm',
    name: 'Æblefarm',
    category: 'horse',
    short: 'Send æblerne gennem foderkæden.',
    description:
      'Æblerne skal igennem staldens foderkæde med 5 trin, hvor de bliver sorteret, poleret, energiladet, ' +
      'kvalitetstjekket og sendt til hestens foderkurv. 15 æbler kastes (ikke rækkes) gennem alle 5 trin i ' +
      'rækkefølge. Tabes et æble, starter det forfra. Hurtigste tid vinder.',
    gives: 'Hest-point (energi/performance).',
    thresholds: { gold: 90, silver: 120, bronze: 160, pass: 220 }, // sekunder — lavere er bedre
    lowerIsBetter: true,
  },
];

module.exports = auctionExercises;
