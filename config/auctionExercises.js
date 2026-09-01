/*
 * auctionExercises.js — v3: de 6 FRIE STATIONER (ingen ejerskab, ingen auktion).
 * Alle giver Derby Dollars med aftagende belønning PR. STALD + cooldown pr. stald.
 * Involverings-reglen: HELE stalden skal være samlet ved det officielle forsøg.
 * (Filnavnet er historisk — øvelses-auktionen udgik i v3 til fordel for jockey-auktionen.)
 */

const auctionExercises = [
  {
    id: 'cornhole',
    name: 'Cornhole',
    nameEn: 'Cornhole',
    shortEn: 'It all comes down to the release.',
    descriptionEn: 'Classic cornhole board. You get 5 bean bags. Practise freely. Call a Race Director when you are ready for an official attempt. Success: at least 2 bags in the hole OR at least 4 bags on the board (bags in the hole also count as on the board).',
    category: 'money',
    short: 'Ram hullet — eller landing på pladen.',
    description:
      'Klassisk cornhole-board. I får 5 ærteposer. Øv frit. Når I vil have et officielt forsøg, ' +
      'kalder I på en instruktør. Succes: mindst 2 poser i hullet, ELLER mindst 4 poser på pladen ' +
      '(poser i hullet tæller også som på pladen).',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 1000, decreasePerSuccess: 50, min: 400 },
    cooldownSeconds: 180,
  },
  {
    id: 'hesteskohus',
    name: 'Hesteskohus',
    nameEn: 'Horseshoe House',
    shortEn: 'One shaky hand — and it all comes down.',
    descriptionEn: 'Build a house or a tower out of horseshoes. Call a Race Director when you are ready. Success: at least 20 cm tall and approved by a Race Director.',
    category: 'money',
    short: 'Byg et tårn af hestesko (min. 20 cm).',
    description:
      'Byg et hus/tårn af hestesko. Succeskriterie: mindst 20 cm højt. Når det er godkendt, får I DD. ' +
      'Belønningen falder for hver succes.',
    gives: 'Derby Dollars — aftagende belønning.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 1000, decreasePerSuccess: 50, min: 400 },
    cooldownSeconds: 180,
  },
  {
    id: 'jockeyguidning',
    name: 'Jockey Guidning',
    nameEn: 'Jockey Guiding',
    shortEn: 'Blind trust — literally.',
    descriptionEn: 'One stable member is the jockey: blindfolded and on the hobby horse. The rest of the stable guides horse and jockey through the obstacle course — using ONLY the strings. Call a Race Director for an official attempt. Success: complete the full course.',
    category: 'money',
    short: 'Blind tillid — bogstaveligt talt.',
    description:
      'Én fra stalden er jockey: bind for øjnene og op på kæphesten. Jockeyen skal ride gennem ' +
      'forhindringsbanen — uden at kunne se noget som helst. Resten af stalden guider hest og jockey ' +
      'gennem banen — KUN ved hjælp af snorene. Kald på en instruktør for et officielt forsøg. ' +
      'Succes: hele banen gennemføres.',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 1000, decreasePerSuccess: 50, min: 400 },
    cooldownSeconds: 180,
  },
  {
    id: 'jongler',
    name: 'Jonglér',
    nameEn: 'Juggle',
    shortEn: 'Keep the rhythm — or start over.',
    descriptionEn: 'Min. 3 participants, each holding a tray. One ball is passed between the trays — every active player must touch the ball before the same person may receive it again. Call a Race Director for an official attempt. Success: at least 10 valid passes.',
    category: 'money',
    short: 'Send bolden rundt — alle skal røre den.',
    description:
      'Min. 3 deltagere, hver med en krabbakke. Én bold sendes mellem bakker. Alle aktive skal have ' +
      'rørt bolden, før samme person må modtage den igen. Kald på en Løbsleder for et officielt forsøg. ' +
      'Succes: mindst 10 gyldige afleveringer.',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 1000, decreasePerSuccess: 50, min: 400 },
    cooldownSeconds: 180,
  },
  {
    id: 'baleofhay',
    name: 'Stabl Høballer',
    nameEn: 'Stack the Hay Bales',
    shortEn: 'Shared control — or shared collapse.',
    descriptionEn: 'Min. 3 participants. Round wooden board with strings — each participant holds exactly one string. Move the board and stack the hay bales into a tower. Official attempt: 3 minutes — the tower is measured when time runs out. Success: at least 2 hay bales high.',
    category: 'money',
    short: 'Stabl halmballer med snore — balance.',
    description:
      'Min. 3 deltagere. Rund træplade med snore. Hver deltager holder præcis én snor (ingen med to, ' +
      'ingen med nul). Flyt pladen og stabl høballerne i et tårn. Officielt forsøg: 3 minutter — ' +
      'tårnet måles NÅR tiden er nul. Succes: mindst 2 høballer højt.',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 1000, decreasePerSuccess: 50, min: 400 },
    cooldownSeconds: 180,
  },
  {
    id: 'aeblefarm',
    name: 'Æblefarm',
    nameEn: 'Apple Farm',
    shortEn: 'The chain is only as strong as the weakest throw.',
    descriptionEn: "The apples must pass through the stable's feeding chain in 5 steps: sorted, polished, energised, quality-checked and delivered to the horse's feed basket. 15 apples are thrown (not handed!) through all 5 steps in order. If an apple is dropped, it starts over. Success: complete in max. 60 seconds.",
    category: 'money',
    short: 'Send æblerne gennem foderkæden.',
    description:
      'Æblerne skal igennem staldens foderkæde med 5 trin, hvor de bliver sorteret, poleret, energiladet, ' +
      'kvalitetstjekket og sendt til hestens foderkurv. 15 æbler kastes (ikke rækkes) gennem alle 5 trin i ' +
      'rækkefølge. Tabes et æble, starter det forfra. Succes: gennemført på max 60 sekunder.',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 1000, decreasePerSuccess: 50, min: 400 },
    cooldownSeconds: 180,
  },
];

module.exports = auctionExercises;
