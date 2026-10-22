/*
 * auctionExercises.js — v3: de 6 FRIE STATIONER (ingen ejerskab, ingen auktion).
 * Alle giver Derby Dollars med aftagende belønning PR. STALD + cooldown pr. stald.
 * Involverings-reglen: HELE stalden skal være samlet ved det officielle forsøg.
 * Tekster matcher de GODKENDTE stationskort 20/10-26 ("Stationskort - godkendte tekster til Katja.docx")
 * — de erstatter Katjas tryk fra 3/9. (Filnavnet er historisk — øvelses-auktionen udgik i v3.)
 */

const auctionExercises = [
  {
    id: 'cornhole',
    name: 'Cornhole',
    nameEn: 'Cornhole',
    shortEn: 'It all comes down to the release.',
    descriptionEn: 'Classic cornhole board with 5 bean bags. Practise freely. Official attempt: Call a Race Director when you are ready. Success: At least 2 bags in the hole OR at least 4 bags on the board (bags in the hole also count as on the board).',
    category: 'money',
    short: 'Alt afgøres i slippet.',
    description:
      'Klassisk cornhole-board med 5 ærteposer. Øv frit. Officielt forsøg: Kald på en løbsleder, ' +
      'når I er klar. Succes: Mindst 2 poser i hullet ELLER mindst 4 poser på pladen ' +
      '(poser i hullet tæller også som på pladen).',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 2000, decreasePercent: 10, min: 800 }, // v3.4: -10 % pr. succes
    cooldownSeconds: 300,
  },
  {
    id: 'hesteskohus',
    name: 'Hesteskohus',
    nameEn: 'Horseshoe House',
    shortEn: 'One shaky hand — and it all comes crashing down.',
    descriptionEn: 'Build a house or a tower out of horseshoes. Official attempt: Call a Race Director when you are ready. Success: At least 25 cm tall and approved by a Race Director.',
    category: 'money',
    short: 'Én rystende hånd — og alt vælter.',
    description:
      'Byg et hus eller tårn af hestesko. Officielt forsøg: Kald på en løbsleder, når I er klar. ' +
      'Succes: Mindst 25 cm højt og godkendt af en løbsleder.',
    gives: 'Derby Dollars — aftagende belønning.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 2000, decreasePercent: 10, min: 800 }, // v3.4: -10 % pr. succes
    cooldownSeconds: 300,
  },
  {
    id: 'jockeyguidning',
    name: 'Jockey Guiding',
    nameEn: 'Jockey Guiding',
    shortEn: 'Blind trust — literally.',
    descriptionEn: 'Two stable members are jockeys: blindfolded and mounted on the hobby horses. The horses ride in tandem — the rear of the front horse is tied to the front of the rear horse. The rest of the stable guides them through the obstacle course — using ONLY the strings. Practise first — you will need it. Official attempt: Call a Race Director when you are ready. Success: Complete the full course in under 90 seconds — without knocking over any obstacles.',
    category: 'money',
    short: 'Blind tillid — bogstaveligt talt.',
    description:
      'To fra stalden er jockeyer: bind for øjnene og op på kæphestene. Hestene rider i spand — ' +
      'bagenden af den forreste er bundet til forenden af den bagerste. Resten af stalden guider ' +
      'gennem forhindringsbanen — KUN ved hjælp af snorene. Øv jer først — banen skal sidde. ' +
      'Officielt forsøg: Kald på en løbsleder, når I er klar. Succes: Hele banen gennemføres på ' +
      'under 90 sekunder — uden at vælte forhindringer.',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 2000, decreasePercent: 10, min: 800 }, // v3.4: -10 % pr. succes
    cooldownSeconds: 300,
  },
  {
    id: 'jongler',
    name: 'Jonglér',
    nameEn: 'Juggle',
    shortEn: 'Keep the rhythm — or start over.',
    descriptionEn: 'Every participant holds a tray. One ball is passed between the trays — each pass must cover at least 2 metres, and the ball must never touch the ground. Official attempt: Call a Race Director when you are ready. Success: Complete 20 passes in total — and every participant must make at least 3.',
    category: 'money',
    short: 'Hold rytmen — eller start forfra.',
    description:
      'Hver deltager har en bakke. Én bold sendes mellem bakkerne — der skal være mindst 2 meters ' +
      'afstand ved hver aflevering, og bolden må ikke ramme jorden. Officielt forsøg: Kald på en ' +
      'løbsleder, når I er klar. Succes: Gennemfør 20 afleveringer i alt — og alle deltagere skal lave mindst 3.',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 2000, decreasePercent: 10, min: 800 }, // v3.4: -10 % pr. succes
    cooldownSeconds: 300,
  },
  {
    id: 'baleofhay',
    name: 'Stabl Høballer',
    nameEn: 'Stack the Hay Bales',
    shortEn: 'Shared control — or shared collapse.',
    descriptionEn: 'The whole stable takes part — each participant holds exactly one string. The hay bales sit in 8 buckets around you: collect one bale from each bucket and stack them into a tower on the board. Practise freely. Official attempt: Call a Race Director when you are ready — you have 90 seconds. If you drop any hay bales, you start over — the clock keeps running. Success: All 8 hay bales stacked in a tower before time runs out.',
    category: 'money',
    short: 'Fælles kontrol — eller fælles kollaps.',
    description:
      'Hele stalden deltager — hver deltager holder præcis én snor. Høballerne ligger i 8 spande ' +
      'rundt om jer: Hent én balle fra hver spand, og stabl dem i et tårn på pladen. Øv frit. ' +
      'Officielt forsøg: Kald på en løbsleder, når I er klar — I har 90 sekunder. Taber I høballer, ' +
      'starter I forfra — tiden fortsætter. Succes: Alle 8 høballer stablet i højden, inden tiden er 0.',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 2000, decreasePercent: 10, min: 800 }, // v3.4: -10 % pr. succes
    cooldownSeconds: 300,
  },
  {
    id: 'aeblefarm',
    name: 'Æblefarm',
    nameEn: 'Apple Farm',
    shortEn: 'The chain is only as strong as the weakest throw.',
    descriptionEn: "All apples and carrots must pass through the stable's feeding chain: throw them (no handing!) through all 5 steps in order, until they land in the feed basket. If one is dropped, it starts over. Official attempt: Call a Race Director when you are ready. Success: Complete in max. 20 seconds.",
    category: 'money',
    short: 'Kæden er kun så stærk som det svageste kast.',
    description:
      'Alle æbler og gulerødder skal gennem staldens foderkæde: Kast dem (ikke række!) gennem alle ' +
      '5 trin i rækkefølge, til de lander i foderkurven. Tabes noget, starter det forfra. ' +
      'Officielt forsøg: Kald på en løbsleder, når I er klar. Succes: Gennemfør på maks. 20 sekunder.',
    gives: 'Derby Dollars — belønningen falder for hver succes.',
    givesEn: 'Derby Dollars — the reward decreases with every success.',
    reward: { start: 2000, decreasePercent: 10, min: 800 }, // v3.4: -10 % pr. succes
    cooldownSeconds: 300,
  },
];

module.exports = auctionExercises;
