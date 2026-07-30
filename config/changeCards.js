/*
 * changeCards.js — Forandringskort ("Stævnenyt").
 * Uventede hændelser, som hosten spiller for at træne forandringsparathed:
 * planen vælter, og holdene skal omstille sig her og nu.
 *
 * to typer effekter:
 *   auto    → udføres af serveren (skat, lukket opgave, multiplikator, rotation, timer, uvejr)
 *   manuel  → ren instruktion på storskærmen, som instruktøren håndhæver
 *
 * duration: 'until-ended' (host trykker "Afslut kort" → effekter rulles tilbage)
 *           'instant'     (engangs-effekt — kortet kan afsluttes når som helst, intet at rulle tilbage)
 */

const changeCards = [
  {
    id: 'regelaendring',
    emoji: '📜',
    title: 'Regelændring fra forbundet',
    text: 'Forbundet har talt: Tip en 13\'er er LUKKET indtil videre — til gengæld giver Tidslinjen DOBBELT belønning. Omstil jer!',
    hostHint: 'Auto: tip13 lukkes, tidslinje ×2 — indtil du afslutter kortet.',
    duration: 'until-ended',
    effects: [
      { type: 'disableTask', taskId: 'tip13' },
      { type: 'taskMultiplier', taskId: 'tidslinje', factor: 2 },
    ],
  },
  {
    id: 'foderkrise',
    emoji: '🌾',
    title: 'Foderkrise',
    text: 'Høsten er slået fejl, og foderpriserne eksploderer: alle HEST-investeringer koster 50% ekstra, indtil krisen driver over.',
    hostHint: 'Auto: hest-investeringer koster ×1,5 — indtil du afslutter kortet.',
    duration: 'until-ended',
    effects: [{ type: 'investMultiplier', assetType: 'horse', factor: 1.5 }],
  },
  {
    id: 'skattekontrol',
    emoji: '🧾',
    title: 'Skattekontrol',
    text: 'Væddeløbsmyndighederne banker på: stalde med over 5.000 DD i kontanter betaler 10% af det overskydende i staldskat — NU.',
    hostHint: 'Auto: engangs-skat trækkes med det samme.',
    duration: 'instant',
    effects: [{ type: 'tax', threshold: 5000, pct: 0.10 }],
  },
  {
    id: 'staldrotation',
    emoji: '🔄',
    title: 'Staldrotation',
    text: 'Ejerforeningen har stemt: ALLE auktionsøvelser roterer én stald videre. Jeres specialøvelse er nu naboens — og omvendt.',
    hostHint: 'Auto: ejede øvelser roterer mellem staldene med det samme.',
    duration: 'instant',
    effects: [{ type: 'rotateExercises' }],
  },
  {
    id: 'deadline',
    emoji: '⏱️',
    title: 'Deadline fremrykket',
    text: 'Stævneledelsen har fremrykket næste løb: RESTEN AF RUNDEN ER HALVERET. Prioritér benhårdt — hvad når I, og hvad dropper I?',
    hostHint: 'Auto: den kørende rundetimer halveres med det samme.',
    duration: 'instant',
    effects: [{ type: 'halveTimer' }],
  },
  {
    id: 'uvejr',
    emoji: '⛈️',
    title: 'Uvejr over banen',
    text: 'Sorte skyer trækker sammen: NÆSTE LØB bliver kaotisk med dobbelt så mange uventede hændelser på banen. Rust jer til alt.',
    hostHint: 'Auto: næste løb får dobbelt event-chance (nulstilles efter løbet).',
    duration: 'instant',
    effects: [{ type: 'stormNextRace' }],
  },
  {
    id: 'sponsorbesoeg',
    emoji: '🤝',
    title: 'Sponsorbesøg',
    text: 'En storsponsor står i døren UANMELDT og vil se jeres stald: pyntet hest og staldskilt frem NU. Instruktøren belønner de stalde, der er klar.',
    hostHint: 'Manuel: gå runden og belæn de klar (fx via godkendelser eller bonus).',
    duration: 'instant',
    effects: [],
  },
  {
    id: 'pressemoede',
    emoji: '🎤',
    title: 'Pressemøde',
    text: 'Pressen kræver svar: hver stald sender én talsperson til naboholdet og pitcher staldens strategi på 60 sekunder — inklusive plan B.',
    hostHint: 'Manuel: styr rotationen og tag tid. God energi-booster.',
    duration: 'instant',
    effects: [],
  },
  {
    id: 'sky-hest',
    emoji: '🐴',
    title: 'Hesten er sky',
    text: 'Jeres hest er blevet sky og stoler kun på nye hænder: ved næste officielle forsøg på jeres specialøvelse SKAL en ny person have hovedrollen.',
    hostHint: 'Manuel: instruktørerne håndhæver rollebyttet ved næste forsøg.',
    duration: 'instant',
    effects: [],
  },
];

module.exports = changeCards;
