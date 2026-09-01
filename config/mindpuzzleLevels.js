/*
 * mindpuzzleLevels.js — Horse Academy (SmartGames) niveaudata til Mind Puzzle.
 *
 * 20 udvalgte challenges i stigende sværhedsgrad. Hvert niveau har:
 *  - book:  challenge-nummeret i SmartGames-hæftet (bruges til billedfil)
 *  - tier:  sværhedsgrad (vises på tablet)
 *  - questions: kontrolspørgsmål der KUN kan besvares ud fra den byggede løsning.
 *      { letter: 'T', correct: 'orange' }  → "Hvilken forhindring står tættest på bogstavet T?"
 *      { gate: true, correct: 'Y' }        → "Ved hvilket bogstav står den røde bom?" (kun Wizard,
 *                                            hvor start/mål ikke fremgår af opgavekortet)
 *  - colors: forhindringsfarver der indgår i løsningen — bruges som svarmuligheder,
 *            så man ikke kan udelukke noget ud fra opgavekortet.
 *
 * VIGTIGT: Løsningsbillederne må IKKE lægges i public/ — så kan holdene gætte URL'en.
 */

const COLOR_LABELS_EN = {
  orange: 'Orange', gul: 'Yellow', lyseblaa: 'Light blue', moerkeblaa: 'Dark blue',
  lysegroen: 'Light green', moerkegroen: 'Dark green', lilla: 'Purple', pink: 'Pink',
  brun: 'Brown', roedhvid: 'Red/white striped',
};

const COLOR_LABELS = {
  orange: 'Orange',
  gul: 'Gul',
  lyseblaa: 'Lyseblå',
  moerkeblaa: 'Mørkeblå',
  lysegroen: 'Lysegrøn',
  moerkegroen: 'Mørkegrøn',
  lilla: 'Lilla',
  pink: 'Pink',
  brun: 'Brun',
  roedhvid: 'Rød/hvid-stribet',
};

const GATE_LETTERS = ['T', 'U', 'W', 'X', 'Y', 'Z'];

const LEVELS = [
  // ---------- STARTER ----------
  { level: 1, book: 5, tier: 'Starter', colors: ['orange', 'gul', 'lyseblaa'],
    questions: [
      { letter: 'T', correct: 'orange' },
      { letter: 'W', correct: 'lyseblaa' },
    ] },
  { level: 2, book: 6, tier: 'Starter', colors: ['lysegroen', 'gul', 'lilla'],
    questions: [
      { letter: 'U', correct: 'lysegroen' },
      { letter: 'X', correct: 'gul' },
      { letter: 'W', correct: 'lilla' },
    ] },
  { level: 3, book: 7, tier: 'Starter', colors: ['gul', 'lysegroen', 'roedhvid', 'orange', 'pink'],
    questions: [
      { letter: 'Z', correct: 'lysegroen' },
      { letter: 'W', correct: 'pink' },
      { letter: 'T', correct: 'gul' },
    ] },
  { level: 4, book: 8, tier: 'Starter', colors: ['roedhvid', 'lyseblaa', 'gul', 'orange', 'lysegroen'],
    questions: [
      { letter: 'Z', correct: 'roedhvid' },
      { letter: 'X', correct: 'lysegroen' },
      { letter: 'U', correct: 'lyseblaa' },
    ] },

  // ---------- JUNIOR ----------
  { level: 5, book: 21, tier: 'Junior', colors: ['moerkeblaa', 'lyseblaa', 'orange', 'roedhvid', 'lysegroen'],
    questions: [
      { letter: 'Z', correct: 'orange' },
      { letter: 'U', correct: 'roedhvid' },
      { letter: 'Y', correct: 'lysegroen' },
    ] },
  { level: 6, book: 22, tier: 'Junior', colors: ['moerkegroen', 'lilla', 'lyseblaa', 'lysegroen', 'pink', 'orange'],
    questions: [
      { letter: 'Z', correct: 'moerkegroen' },
      { letter: 'U', correct: 'lysegroen' },
      { letter: 'X', correct: 'orange' },
    ] },
  { level: 7, book: 23, tier: 'Junior', colors: ['pink', 'roedhvid', 'lilla', 'gul', 'lysegroen', 'lyseblaa', 'brun'],
    questions: [
      { letter: 'W', correct: 'brun' },
      { letter: 'U', correct: 'gul' },
      { letter: 'Y', correct: 'lysegroen' },
    ] },
  { level: 8, book: 24, tier: 'Junior', colors: ['lilla', 'brun', 'gul', 'pink', 'lysegroen'],
    questions: [
      { letter: 'Y', correct: 'pink' },
      { letter: 'U', correct: 'gul' },
      { letter: 'X', correct: 'lysegroen' },
    ] },

  // ---------- EXPERT ----------
  { level: 9, book: 37, tier: 'Expert', colors: ['pink', 'roedhvid', 'lyseblaa', 'lysegroen', 'moerkeblaa', 'moerkegroen', 'orange', 'gul'],
    questions: [
      { letter: 'T', correct: 'roedhvid' },
      { letter: 'W', correct: 'gul' },
      { letter: 'X', correct: 'moerkegroen' },
    ] },
  { level: 10, book: 38, tier: 'Expert', colors: ['roedhvid', 'moerkegroen', 'brun', 'lilla', 'gul', 'pink', 'lysegroen'],
    questions: [
      { letter: 'Z', correct: 'roedhvid' },
      { letter: 'U', correct: 'gul' },
      { letter: 'Y', correct: 'pink' },
      { letter: 'W', correct: 'lysegroen' },
    ] },
  { level: 11, book: 39, tier: 'Expert', colors: ['gul', 'brun', 'moerkegroen', 'lysegroen', 'moerkeblaa', 'pink'],
    questions: [
      { letter: 'U', correct: 'lysegroen' },
      { letter: 'X', correct: 'pink' },
      { letter: 'Y', correct: 'moerkeblaa' },
    ] },
  { level: 12, book: 40, tier: 'Expert', colors: ['gul', 'lilla', 'roedhvid', 'orange', 'lysegroen', 'pink', 'moerkeblaa', 'lyseblaa'],
    questions: [
      { letter: 'T', correct: 'lilla' },
      { letter: 'U', correct: 'lysegroen' },
      { letter: 'Y', correct: 'lyseblaa' },
    ] },

  // ---------- MASTER ----------
  { level: 13, book: 53, tier: 'Master', colors: ['moerkeblaa', 'roedhvid', 'lysegroen', 'lilla', 'orange', 'pink', 'moerkegroen', 'lyseblaa', 'gul'],
    questions: [
      { letter: 'Z', correct: 'moerkeblaa' },
      { letter: 'W', correct: 'gul' },
      { letter: 'Y', correct: 'lyseblaa' },
      { letter: 'T', correct: 'lysegroen' },
    ] },
  { level: 14, book: 54, tier: 'Master', colors: ['gul', 'lysegroen', 'brun', 'lilla', 'moerkegroen', 'lyseblaa', 'orange'],
    questions: [
      { letter: 'Z', correct: 'gul' },
      { letter: 'Y', correct: 'lilla' },
      { letter: 'W', correct: 'orange' },
      { letter: 'T', correct: 'lysegroen' },
    ] },
  { level: 15, book: 55, tier: 'Master', colors: ['gul', 'brun', 'roedhvid', 'moerkeblaa', 'orange', 'lyseblaa', 'moerkegroen', 'pink', 'lysegroen'],
    questions: [
      { letter: 'Y', correct: 'lyseblaa' },
      { letter: 'U', correct: 'lysegroen' },
      { letter: 'W', correct: 'pink' },
    ] },
  { level: 16, book: 56, tier: 'Master', colors: ['orange', 'lysegroen', 'roedhvid', 'pink', 'moerkeblaa', 'gul', 'brun', 'lilla'],
    questions: [
      { letter: 'Z', correct: 'orange' },
      { letter: 'Y', correct: 'lilla' },
      { letter: 'W', correct: 'gul' },
    ] },

  // ---------- WIZARD (start/mål er ukendt på kortet → bom-spørgsmål er ekstra sikre) ----------
  { level: 17, book: 69, tier: 'Wizard', colors: ['gul', 'roedhvid', 'moerkegroen', 'lysegroen', 'orange', 'brun', 'moerkeblaa', 'lyseblaa'],
    questions: [
      { gate: true, correct: 'Y' },
      { letter: 'T', correct: 'gul' },
      { letter: 'U', correct: 'lysegroen' },
    ] },
  { level: 18, book: 70, tier: 'Wizard', colors: ['pink', 'roedhvid', 'moerkeblaa', 'lysegroen', 'orange', 'moerkegroen', 'gul'],
    questions: [
      { gate: true, correct: 'T' },
      { letter: 'W', correct: 'gul' },
      { letter: 'U', correct: 'roedhvid' },
    ] },
  { level: 19, book: 71, tier: 'Wizard', colors: ['pink', 'moerkeblaa', 'gul', 'orange', 'lyseblaa', 'moerkegroen', 'lilla', 'lysegroen'],
    questions: [
      { gate: true, correct: 'T' },
      { letter: 'Y', correct: 'lyseblaa' },
      { letter: 'Z', correct: 'gul' },
    ] },
  { level: 20, book: 72, tier: 'Wizard', colors: ['lyseblaa', 'orange', 'lysegroen', 'moerkeblaa', 'moerkegroen', 'brun', 'gul', 'pink'],
    questions: [
      { gate: true, correct: 'Y' },
      { letter: 'Z', correct: 'lysegroen' },
      { letter: 'T', correct: 'lyseblaa' },
    ] },
];

module.exports = { LEVELS, COLOR_LABELS, COLOR_LABELS_EN, GATE_LETTERS };
