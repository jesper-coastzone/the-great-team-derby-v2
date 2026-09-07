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
      { q: 'Hvor mange ben har en hest?', qEn: 'How many legs does a horse have?', options: ['2', '4', '6'], correct: 1 },
      { q: 'Hvad hedder en ung hest?', qEn: 'What is a young horse called?', options: ['Føl', 'Kalv', 'Lam'], optionsEn: ['Foal', 'Calf', 'Lamb'], correct: 0 },
      { q: 'Blå + gul giver hvilken farve?', qEn: 'Blue + yellow makes which colour?', options: ['Grøn', 'Lilla', 'Orange'], optionsEn: ['Green', 'Purple', 'Orange'], correct: 0 },
      { q: 'Hvor mange minutter er der i en time?', qEn: 'How many minutes are there in an hour?', options: ['30', '60', '90'], correct: 1 },
      { q: 'Hvad er Danmarks hovedstad?', qEn: 'What is the capital of Denmark?', options: ['Aarhus', 'Odense', 'København'], optionsEn: ['Aarhus', 'Odense', 'Copenhagen'], correct: 2 },
      { q: 'Hvor mange dage er der i en uge?', qEn: 'How many days are there in a week?', options: ['5', '7', '10'], correct: 1 },
      { q: 'Hvilket dyr vrinsker?', qEn: 'Which animal neighs?', options: ['Ko', 'Hest', 'Får'], optionsEn: ['Cow', 'Horse', 'Sheep'], correct: 1 },
      { q: 'Verdens største hav?', qEn: "The world's largest ocean?", options: ['Atlanterhavet', 'Stillehavet', 'Middelhavet'], optionsEn: ['The Atlantic', 'The Pacific', 'The Mediterranean'], correct: 1 },
      { q: 'Hvor mange sider har en trekant?', qEn: 'How many sides does a triangle have?', options: ['3', '4', '5'], correct: 0 },
      { q: 'En kastreret hanhest kaldes?', qEn: 'A castrated male horse is called?', options: ['Hingst', 'Vallak', 'Hoppe'], optionsEn: ['Stallion', 'Gelding', 'Mare'], correct: 1 },
      { q: 'Hvilken planet er tættest på solen?', qEn: 'Which planet is closest to the sun?', options: ['Jorden', 'Mars', 'Merkur'], optionsEn: ['Earth', 'Mars', 'Mercury'], correct: 2 },
      { q: 'Antal bogstaver i det danske alfabet?', qEn: 'Number of letters in the Danish alphabet?', options: ['26', '28', '29'], correct: 2 },
      { q: 'Rytteren i et væddeløb kaldes?', qEn: 'The rider in a horse race is called?', options: ['Jockey', 'Kusk', 'Dommer'], optionsEn: ['Jockey', 'Coachman', 'Judge'], correct: 0 },
    ],
  },
  {
    id: 'B',
    questions: [
      { q: 'Hvor mange timer er der i et døgn?', qEn: 'How many hours are there in a day?', options: ['12', '24', '36'], correct: 1 },
      { q: 'Hvad hedder en hunhest?', qEn: 'What is a female horse called?', options: ['Hoppe', 'Hingst', 'Føl'], optionsEn: ['Mare', 'Stallion', 'Foal'], correct: 0 },
      { q: 'Hvilket land er kendt for Eiffeltårnet?', qEn: 'Which country is known for the Eiffel Tower?', options: ['Italien', 'Frankrig', 'Spanien'], optionsEn: ['Italy', 'France', 'Spain'], correct: 1 },
      { q: 'Antal spillere på et fodboldhold på banen?', qEn: 'Number of players on a football team on the pitch?', options: ['9', '10', '11'], correct: 2 },
      { q: 'Hvad bruger man en saddel til?', qEn: 'What is a saddle used for?', options: ['At ride', 'At spise', 'At sove'], optionsEn: ['Riding', 'Eating', 'Sleeping'], correct: 0 },
      { q: 'Hvilken farve er en moden banan?', qEn: 'What colour is a ripe banana?', options: ['Grøn', 'Gul', 'Rød'], optionsEn: ['Green', 'Yellow', 'Red'], correct: 1 },
      { q: 'Hvor mange måneder har et år?', qEn: 'How many months are there in a year?', options: ['10', '12', '14'], correct: 1 },
      { q: 'Hestens hurtigste gangart?', qEn: "The horse's fastest gait?", options: ['Skridt', 'Trav', 'Galop'], optionsEn: ['Walk', 'Trot', 'Gallop'], correct: 2 },
      { q: 'Hvilket tal kommer efter 99?', qEn: 'Which number comes after 99?', options: ['100', '101', '110'], correct: 0 },
      { q: 'Hvad er is lavet af?', qEn: 'What is ice made of?', options: ['Vand', 'Sand', 'Luft'], optionsEn: ['Water', 'Sand', 'Air'], correct: 0 },
      { q: 'Hvor mange øjne har et menneske normalt?', qEn: 'How many eyes does a person normally have?', options: ['1', '2', '3'], correct: 1 },
      { q: 'Hvor står Den Lille Havfrue?', qEn: 'Where is The Little Mermaid statue?', options: ['København', 'Aarhus', 'Aalborg'], optionsEn: ['Copenhagen', 'Aarhus', 'Aalborg'], correct: 0 },
      { q: 'En gruppe heste kaldes en?', qEn: 'A group of horses is called a?', options: ['Flok', 'Sværm', 'Stime'], optionsEn: ['Herd', 'Swarm', 'School'], correct: 0 },
    ],
  },
  {
    id: 'C',
    questions: [
      { q: 'Hvor mange strenge har en violin?', qEn: 'How many strings does a violin have?', options: ['4', '6', '8'], correct: 0 },
      { q: 'Hvad hedder hestens hår på halsen?', qEn: "What is the hair on a horse's neck called?", options: ['Manken', 'Pelsen', 'Parykken'], optionsEn: ['The mane', 'The fur', 'The wig'], correct: 0 },
      { q: 'Hvor mange hjerter har en blæksprutte?', qEn: 'How many hearts does an octopus have?', options: ['1', '2', '3'], correct: 2 },
      { q: 'Hvor mange farver er der i en regnbue?', qEn: 'How many colours are there in a rainbow?', options: ['5', '7', '9'], correct: 1 },
      { q: 'Hvad måler man med et termometer?', qEn: 'What do you measure with a thermometer?', options: ['Temperatur', 'Vægt', 'Fart'], optionsEn: ['Temperature', 'Weight', 'Speed'], correct: 0 },
      { q: 'Hvad er en hestesko typisk lavet af?', qEn: 'What is a horseshoe typically made of?', options: ['Metal', 'Træ', 'Gummi'], optionsEn: ['Metal', 'Wood', 'Rubber'], correct: 0 },
      { q: 'Hvilken dansk by kaldes "Smilets by"?', qEn: 'Which Danish city is called "the City of Smiles"?', options: ['Aarhus', 'Odense', 'Esbjerg'], correct: 0 },
      { q: 'Hvor mange spillere er der på et håndboldhold på banen?', qEn: 'Number of players on a handball team on the court?', options: ['5', '7', '9'], correct: 1 },
      { q: 'Hvad drikker et føl den første tid?', qEn: 'What does a foal drink in its first weeks?', options: ['Mælk', 'Vand', 'Saft'], optionsEn: ['Milk', 'Water', 'Juice'], correct: 0 },
      { q: 'Hvilket kontinent ligger Egypten på?', qEn: 'Which continent is Egypt on?', options: ['Afrika', 'Asien', 'Europa'], optionsEn: ['Africa', 'Asia', 'Europe'], correct: 0 },
      { q: 'Hvor mange nuller er der i en million?', qEn: 'How many zeros are there in a million?', options: ['5', '6', '7'], correct: 1 },
      { q: 'Hvad kaldes hestens gangart mellem skridt og galop?', qEn: "What is the horse's gait between walk and gallop called?", options: ['Trav', 'Lunt', 'Sprint'], optionsEn: ['Trot', 'Amble', 'Sprint'], correct: 0 },
      { q: 'Hvad hedder verdens højeste bjerg?', qEn: "What is the world's highest mountain?", options: ['Mount Everest', 'K2', 'Mont Blanc'], correct: 0 },
    ],
  },
  {
    id: 'D',
    questions: [
      { q: 'Hvor mange ben har en edderkop?', qEn: 'How many legs does a spider have?', options: ['6', '8', '10'], correct: 1 },
      { q: 'Hvad kaldes væddeløbsbanens sidste lige stykke?', qEn: 'What is the final straight of a racecourse called?', options: ['Opløbet', 'Slutspurten', 'Målstregen'], optionsEn: ['The home straight', 'The final sprint', 'The finish line'], correct: 0 },
      { q: 'Hvor mange minutter varer en fodboldkamp (ordinær tid)?', qEn: 'How many minutes does a football match last (regular time)?', options: ['80', '90', '100'], correct: 1 },
      { q: 'Hvad er hovedstaden i Norge?', qEn: 'What is the capital of Norway?', options: ['Oslo', 'Bergen', 'Stockholm'], correct: 0 },
      { q: 'Hvor mange dage har februar i et skudår?', qEn: 'How many days does February have in a leap year?', options: ['28', '29', '30'], correct: 1 },
      { q: 'Hvilken planet kaldes "den røde planet"?', qEn: 'Which planet is called "the red planet"?', options: ['Mars', 'Venus', 'Jupiter'], correct: 0 },
      { q: 'Hvad får man, når man blander rød og hvid?', qEn: 'What do you get when you mix red and white?', options: ['Lyserød', 'Orange', 'Lilla'], optionsEn: ['Pink', 'Orange', 'Purple'], correct: 0 },
      { q: 'Hvor mange kontinenter er der?', qEn: 'How many continents are there?', options: ['5', '7', '9'], correct: 1 },
      { q: 'Hvilket dyr er verdens hurtigste på land?', qEn: 'Which animal is the fastest on land?', options: ['Gepard', 'Hest', 'Struds'], optionsEn: ['Cheetah', 'Horse', 'Ostrich'], correct: 0 },
      { q: 'Hvor mange timer sover en hest typisk i døgnet?', qEn: 'Roughly how many hours a day does a horse sleep?', options: ['3', '8', '12'], correct: 0 },
      { q: 'Hvad hedder det danske flag?', qEn: 'What is the Danish flag called?', options: ['Dannebrog', 'Union Jack', 'Trikoloren'], optionsEn: ['Dannebrog', 'The Union Jack', 'The Tricolore'], correct: 0 },
      { q: 'Hvor mange point giver en sejr i fodbold?', qEn: 'How many points does a win give in football?', options: ['1', '2', '3'], correct: 2 },
      { q: 'Hvilken hånd rækker man frem, når man hilser i Danmark?', qEn: 'Which hand do you offer when shaking hands in Denmark?', options: ['Højre', 'Venstre', 'Begge'], optionsEn: ['Right', 'Left', 'Both'], correct: 0 },
    ],
  },
  // v3.2: sæt E-L — 12 sæt i alt, så alle 4 forsøg pr. sæson over 3 sæsoner er unikke
  {
    id: 'E',
    questions: [
      { q: 'Hvor mange ben har en fugl?', qEn: 'How many legs does a bird have?', options: ['2', '4', '6'], correct: 0 },
      { q: 'Hvad hedder hestens fod?', qEn: "What is a horse's foot called?", options: ['Hov', 'Klov', 'Pote'], optionsEn: ['Hoof', 'Cloven hoof', 'Paw'], correct: 0 },
      { q: 'I hvilket land ligger Rom?', qEn: 'In which country is Rome?', options: ['Spanien', 'Italien', 'Grækenland'], optionsEn: ['Spain', 'Italy', 'Greece'], correct: 1 },
      { q: 'Hvor mange spillere har et volleyballhold på banen?', qEn: 'How many players does a volleyball team have on court?', options: ['4', '6', '8'], correct: 1 },
      { q: 'Hvilken farve har en flamingo?', qEn: 'What colour is a flamingo?', options: ['Lyserød', 'Blå', 'Grøn'], optionsEn: ['Pink', 'Blue', 'Green'], correct: 0 },
      { q: 'Hvor mange uger er der i et år?', qEn: 'How many weeks are there in a year?', options: ['48', '52', '56'], correct: 1 },
      { q: 'Hvilken ret kåres ofte som Danmarks nationalret?', qEn: "Which dish is often named Denmark's national dish?", options: ['Stegt flæsk', 'Pizza', 'Sushi'], optionsEn: ['Crispy pork (stegt flæsk)', 'Pizza', 'Sushi'], correct: 0 },
      { q: 'Hvilket instrument har 88 tangenter?', qEn: 'Which instrument has 88 keys?', options: ['Guitar', 'Klaver', 'Trompet'], optionsEn: ['Guitar', 'Piano', 'Trumpet'], correct: 1 },
      { q: 'Hvad spiser heste mest af?', qEn: 'What do horses mostly eat?', options: ['Græs og hø', 'Kød', 'Fisk'], optionsEn: ['Grass and hay', 'Meat', 'Fish'], correct: 0 },
      { q: 'Hvor mange planeter er der i solsystemet?', qEn: 'How many planets are there in the solar system?', options: ['8', '9', '10'], correct: 0 },
      { q: 'Hvad hedder Sveriges hovedstad?', qEn: 'What is the capital of Sweden?', options: ['Oslo', 'Stockholm', 'Helsinki'], correct: 1 },
      { q: 'Hvor mange ører er der i én krone?', qEn: 'How many øre are there in one krone?', options: ['10', '50', '100'], correct: 2 },
      { q: 'Hvad kaldes boksene, hestene starter fra i et væddeløb?', qEn: 'What are the boxes horses start from in a race called?', options: ['Startbokse', 'Startskamler', 'Startbure'], optionsEn: ['Starting gates', 'Starting stools', 'Starting cages'], correct: 0 },
    ],
  },
  {
    id: 'F',
    questions: [
      { q: 'Hvilket dyr siger "muh"?', qEn: 'Which animal says "moo"?', options: ['Ko', 'Gris', 'Hund'], optionsEn: ['Cow', 'Pig', 'Dog'], correct: 0 },
      { q: 'Hvor mange bogstaver har ordet "hest"?', qEn: 'How many letters are in the word "hest" (horse in Danish)?', options: ['3', '4', '5'], correct: 1 },
      { q: 'Hvad hedder Tysklands hovedstad?', qEn: 'What is the capital of Germany?', options: ['München', 'Hamborg', 'Berlin'], optionsEn: ['Munich', 'Hamburg', 'Berlin'], correct: 2 },
      { q: 'Hvor mange minutter er en halv time?', qEn: 'How many minutes is half an hour?', options: ['15', '30', '45'], correct: 1 },
      { q: 'Hvilken årstid kommer efter sommer?', qEn: 'Which season comes after summer?', options: ['Forår', 'Efterår', 'Vinter'], optionsEn: ['Spring', 'Autumn', 'Winter'], correct: 1 },
      { q: 'Hvilken flod regnes ofte for verdens længste?', qEn: 'Which river is often considered the longest in the world?', options: ['Nilen', 'Donau', 'Rhinen'], optionsEn: ['The Nile', 'The Danube', 'The Rhine'], correct: 0 },
      { q: 'Hvor mange sider har en terning?', qEn: 'How many sides does a die have?', options: ['4', '6', '8'], correct: 1 },
      { q: 'Hvor ligger Danmarks galopbane?', qEn: "Where is Denmark's gallop racecourse?", options: ['Klampenborg', 'Skagen', 'Ribe'], correct: 0 },
      { q: 'Hvad er H2O?', qEn: 'What is H2O?', options: ['Vand', 'Ilt', 'Salt'], optionsEn: ['Water', 'Oxygen', 'Salt'], correct: 0 },
      { q: 'Hvilket land vandt VM i fodbold 2022?', qEn: 'Which country won the 2022 FIFA World Cup?', options: ['Frankrig', 'Argentina', 'Brasilien'], optionsEn: ['France', 'Argentina', 'Brazil'], correct: 1 },
      { q: 'Hvor mange tæer har et menneske normalt?', qEn: 'How many toes does a person normally have?', options: ['8', '10', '12'], correct: 1 },
      { q: 'Hvad børster man hesten med?', qEn: 'What do you groom a horse with?', options: ['En strigle', 'En rive', 'En kost'], optionsEn: ['A curry comb', 'A rake', 'A broom'], correct: 0 },
      { q: 'Hvilken farve giver rød + gul?', qEn: 'What colour do red + yellow make?', options: ['Orange', 'Lilla', 'Brun'], optionsEn: ['Orange', 'Purple', 'Brown'], correct: 0 },
    ],
  },
  {
    id: 'G',
    questions: [
      { q: 'Hvor mange dage er der i et almindeligt år?', qEn: 'How many days are there in a normal year?', options: ['360', '365', '370'], correct: 1 },
      { q: 'Hvad hedder Finlands hovedstad?', qEn: 'What is the capital of Finland?', options: ['Helsinki', 'Stockholm', 'Tallinn'], correct: 0 },
      { q: 'Hvilket dyr er kendt for at samle nødder?', qEn: 'Which animal is known for collecting nuts?', options: ['Egern', 'Ræv', 'Grævling'], optionsEn: ['Squirrel', 'Fox', 'Badger'], correct: 0 },
      { q: 'Hvor mange strenge har en almindelig guitar?', qEn: 'How many strings does a standard guitar have?', options: ['4', '6', '8'], correct: 1 },
      { q: 'Hvad kaldes den smed, der skor heste?', qEn: 'What is a smith who shoes horses called?', options: ['Beslagsmed', 'Guldsmed', 'Klejnsmed'], optionsEn: ['Farrier', 'Goldsmith', 'Locksmith'], correct: 0 },
      { q: 'Hvad hedder farvandet mellem Helsingør og Helsingborg?', qEn: 'What is the strait between Elsinore and Helsingborg called?', options: ['Øresund', 'Kattegat', 'Lillebælt'], optionsEn: ['The Øresund', 'The Kattegat', 'The Little Belt'], correct: 0 },
      { q: 'Hvor mange point giver en touchdown i amerikansk fodbold?', qEn: 'How many points is a touchdown worth in American football?', options: ['3', '6', '7'], correct: 1 },
      { q: 'Hvilket land er verdens største i areal?', qEn: 'Which country is the largest in the world by area?', options: ['Kina', 'Canada', 'Rusland'], optionsEn: ['China', 'Canada', 'Russia'], correct: 2 },
      { q: 'Hvor mange centimeter er en halv meter?', qEn: 'How many centimetres is half a metre?', options: ['25', '50', '75'], correct: 1 },
      { q: 'Hvilken frugt forbindes med Isaac Newton?', qEn: 'Which fruit is associated with Isaac Newton?', options: ['Æble', 'Pære', 'Appelsin'], optionsEn: ['Apple', 'Pear', 'Orange'], correct: 0 },
      { q: 'Hvilket dyr er i familie med hesten?', qEn: 'Which animal is related to the horse?', options: ['Æsel', 'Ged', 'Lama'], optionsEn: ['Donkey', 'Goat', 'Llama'], correct: 0 },
      { q: 'Hvert hvor mange år afholdes sommer-OL?', qEn: 'How often are the Summer Olympics held?', options: ['Hvert 2. år', 'Hvert 4. år', 'Hvert 5. år'], optionsEn: ['Every 2 years', 'Every 4 years', 'Every 5 years'], correct: 1 },
      { q: 'Hvem skrev "Den Lille Havfrue"?', qEn: 'Who wrote "The Little Mermaid"?', options: ['H.C. Andersen', 'Brdr. Grimm', 'Astrid Lindgren'], optionsEn: ['Hans Christian Andersen', 'The Brothers Grimm', 'Astrid Lindgren'], correct: 0 },
    ],
  },
  {
    id: 'H',
    questions: [
      { q: 'Hvilken planet bor vi på?', qEn: 'Which planet do we live on?', options: ['Mars', 'Jorden', 'Venus'], optionsEn: ['Mars', 'Earth', 'Venus'], correct: 1 },
      { q: 'Hvor meget er to halvtredsere tilsammen?', qEn: 'How much are two 50-kroner notes together?', options: ['50 kr.', '100 kr.', '150 kr.'], correct: 1 },
      { q: 'Hvad hedder Danmarks største ø?', qEn: "What is Denmark's largest island?", options: ['Fyn', 'Sjælland', 'Bornholm'], optionsEn: ['Funen', 'Zealand', 'Bornholm'], correct: 1 },
      { q: 'Hvilket dyr giver os uld?', qEn: 'Which animal gives us wool?', options: ['Får', 'Ko', 'Gris'], optionsEn: ['Sheep', 'Cow', 'Pig'], correct: 0 },
      { q: 'Hvad sidder i hestens mund under ridning?', qEn: "What sits in a horse's mouth when riding?", options: ['Et bid', 'En grime', 'En sut'], optionsEn: ['A bit', 'A halter', 'A pacifier'], correct: 0 },
      { q: 'Hvad er 7 × 7?', qEn: 'What is 7 × 7?', options: ['42', '49', '56'], correct: 1 },
      { q: 'I hvilken by ligger Legoland?', qEn: 'In which town is Legoland?', options: ['Billund', 'Vejle', 'Kolding'], correct: 0 },
      { q: 'Hvilken drik laves af druer?', qEn: 'Which drink is made from grapes?', options: ['Vin', 'Øl', 'Cider'], optionsEn: ['Wine', 'Beer', 'Cider'], correct: 0 },
      { q: 'Hvor mange ben har to heste tilsammen?', qEn: 'How many legs do two horses have in total?', options: ['6', '8', '10'], correct: 1 },
      { q: 'Hvad hedder USA\'s hovedstad?', qEn: 'What is the capital of the USA?', options: ['New York', 'Washington D.C.', 'Los Angeles'], correct: 1 },
      { q: 'Hvilken sport spilles med ketsjer og fjerbold?', qEn: 'Which sport is played with a racket and a shuttlecock?', options: ['Tennis', 'Badminton', 'Squash'], correct: 1 },
      { q: 'Hvor mange årstider er der?', qEn: 'How many seasons are there?', options: ['2', '4', '6'], correct: 1 },
      { q: 'Hvad kaldes det, når hesten rejser sig på bagbenene?', qEn: 'What is it called when a horse rises on its hind legs?', options: ['At stejle', 'At bukke', 'At trave'], optionsEn: ['Rearing', 'Bucking', 'Trotting'], correct: 0 },
    ],
  },
  {
    id: 'I',
    questions: [
      { q: 'Hvad hedder morgenmad på engelsk?', qEn: 'What is "morgenmad" in English?', options: ['Breakfast', 'Lunch', 'Dinner'], correct: 0 },
      { q: 'Hvor mange ben har en myre?', qEn: 'How many legs does an ant have?', options: ['4', '6', '8'], correct: 1 },
      { q: 'Hvad hedder Englands hovedstad?', qEn: 'What is the capital of England?', options: ['Manchester', 'London', 'Liverpool'], correct: 1 },
      { q: 'Hvad vejer mest: 1 kg fjer eller 1 kg jern?', qEn: 'Which weighs more: 1 kg of feathers or 1 kg of iron?', options: ['Fjerene', 'Jernet', 'De vejer det samme'], optionsEn: ['The feathers', 'The iron', 'They weigh the same'], correct: 2 },
      { q: 'Hvilken gas er der mest af i luften?', qEn: 'Which gas is most abundant in the air?', options: ['Ilt', 'Kvælstof', 'CO2'], optionsEn: ['Oxygen', 'Nitrogen', 'CO2'], correct: 1 },
      { q: 'Hvor mange spillere har et basketballhold på banen?', qEn: 'How many players does a basketball team have on court?', options: ['5', '6', '7'], correct: 0 },
      { q: 'Hvad hedder Pippi Langstrømpes hest?', qEn: "What is Pippi Longstocking's horse called?", options: ['Lille Gubben', 'Jolly Jumper', 'Bukefalos'], optionsEn: ['Little Old Man', 'Jolly Jumper', 'Bucephalus'], correct: 0 },
      { q: 'Hvor mange minutter er der i halvanden time?', qEn: 'How many minutes are there in an hour and a half?', options: ['80', '90', '100'], correct: 1 },
      { q: 'Hvilket land kommer sushi fra?', qEn: 'Which country does sushi come from?', options: ['Kina', 'Thailand', 'Japan'], optionsEn: ['China', 'Thailand', 'Japan'], correct: 2 },
      { q: 'Hvad hedder Lucky Lukes hest?', qEn: "What is Lucky Luke's horse called?", options: ['Jolly Jumper', 'Silver', 'Sleipner'], optionsEn: ['Jolly Jumper', 'Silver', 'Sleipnir'], correct: 0 },
      { q: 'Hvor mange dage er der i december?', qEn: 'How many days are there in December?', options: ['30', '31', '32'], correct: 1 },
      { q: 'Hvad er Danmarks nationalfugl?', qEn: "What is Denmark's national bird?", options: ['Knopsvanen', 'Ørnen', 'Solsorten'], optionsEn: ['The mute swan', 'The eagle', 'The blackbird'], correct: 0 },
      { q: 'Hvad bliver vand til, når det fryser?', qEn: 'What does water become when it freezes?', options: ['Damp', 'Is', 'Sne'], optionsEn: ['Steam', 'Ice', 'Snow'], correct: 1 },
    ],
  },
  {
    id: 'J',
    questions: [
      { q: 'Hvor mange hjul har en cykel?', qEn: 'How many wheels does a bicycle have?', options: ['1', '2', '3'], correct: 1 },
      { q: 'Hvad hedder Islands hovedstad?', qEn: 'What is the capital of Iceland?', options: ['Reykjavik', 'Nuuk', 'Torshavn'], correct: 0 },
      { q: 'Hvilket dyr har snabel?', qEn: 'Which animal has a trunk?', options: ['Næsehorn', 'Elefant', 'Flodhest'], optionsEn: ['Rhino', 'Elephant', 'Hippo'], correct: 1 },
      { q: 'Hvor mange styk er et dusin?', qEn: 'How many items are in a dozen?', options: ['10', '12', '14'], correct: 1 },
      { q: 'Hvad kaldes en hest, der er under ca. 148 cm?', qEn: 'What is a horse under roughly 148 cm called?', options: ['En pony', 'Et føl', 'En vallak'], optionsEn: ['A pony', 'A foal', 'A gelding'], correct: 0 },
      { q: 'Hvilken sport spilles i Wimbledon?', qEn: 'Which sport is played at Wimbledon?', options: ['Golf', 'Cricket', 'Tennis'], correct: 2 },
      { q: 'Hvor mange bogstaver er der i ordet "Derby"?', qEn: 'How many letters are in the word "Derby"?', options: ['4', '5', '6'], correct: 1 },
      { q: 'Hvad hedder havet vest for Jylland?', qEn: 'What is the sea west of Jutland called?', options: ['Vesterhavet', 'Østersøen', 'Kattegat'], optionsEn: ['The North Sea', 'The Baltic Sea', 'The Kattegat'], correct: 0 },
      { q: 'Hvilket krydderi er kendt for at være stærkt?', qEn: 'Which spice is known for being hot?', options: ['Chili', 'Kanel', 'Vanilje'], optionsEn: ['Chilli', 'Cinnamon', 'Vanilla'], correct: 0 },
      { q: 'Ved hvor mange grader fryser vand?', qEn: 'At how many degrees Celsius does water freeze?', options: ['0', '10', '-10'], correct: 0 },
      { q: 'Hvilket dyr kaldes junglens konge?', qEn: 'Which animal is called the king of the jungle?', options: ['Tiger', 'Løve', 'Gorilla'], optionsEn: ['Tiger', 'Lion', 'Gorilla'], correct: 1 },
      { q: 'Hvilken farve har førertrøjen i Tour de France?', qEn: 'What colour is the leader\'s jersey in the Tour de France?', options: ['Gul', 'Grøn', 'Hvid'], optionsEn: ['Yellow', 'Green', 'White'], correct: 0 },
      { q: 'Hvad kaldes den person, der træner væddeløbsheste?', qEn: 'What is the person who trains racehorses called?', options: ['Træner', 'Jockey', 'Kusk'], optionsEn: ['Trainer', 'Jockey', 'Coachman'], correct: 0 },
    ],
  },
  {
    id: 'K',
    questions: [
      { q: 'Hvad er 100 delt med 4?', qEn: 'What is 100 divided by 4?', options: ['20', '25', '30'], correct: 1 },
      { q: 'Hvad hedder Spaniens hovedstad?', qEn: 'What is the capital of Spain?', options: ['Barcelona', 'Madrid', 'Sevilla'], correct: 1 },
      { q: 'Hvilket insekt laver honning?', qEn: 'Which insect makes honey?', options: ['Bien', 'Hvepsen', 'Myggen'], optionsEn: ['The bee', 'The wasp', 'The mosquito'], correct: 0 },
      { q: 'Hvad kaldes klokken 12 om dagen?', qEn: 'What is 12 o\'clock in the daytime called?', options: ['Midnat', 'Middag', 'Morgen'], optionsEn: ['Midnight', 'Noon', 'Morning'], correct: 1 },
      { q: 'Hvilket land er kendt for kænguruer?', qEn: 'Which country is known for kangaroos?', options: ['New Zealand', 'Sydafrika', 'Australien'], optionsEn: ['New Zealand', 'South Africa', 'Australia'], correct: 2 },
      { q: 'Hvor mange hove har en hest?', qEn: 'How many hooves does a horse have?', options: ['2', '4', '6'], correct: 1 },
      { q: 'Hvad hedder Danmarks længste å?', qEn: "What is Denmark's longest stream?", options: ['Gudenåen', 'Skjern Å', 'Odense Å'], correct: 0 },
      { q: 'Hvilken måned kommer efter marts?', qEn: 'Which month comes after March?', options: ['Februar', 'April', 'Maj'], optionsEn: ['February', 'April', 'May'], correct: 1 },
      { q: 'Hvad kaldes hestens lyd?', qEn: "What is a horse's sound called?", options: ['Et vrinsk', 'Et brøl', 'En kvidren'], optionsEn: ['A neigh', 'A roar', 'A chirp'], correct: 0 },
      { q: 'Hvor mange sekunder er der i to minutter?', qEn: 'How many seconds are there in two minutes?', options: ['100', '120', '140'], correct: 1 },
      { q: 'Hvilket land har flest indbyggere i verden?', qEn: 'Which country has the largest population in the world?', options: ['Kina', 'Indien', 'USA'], optionsEn: ['China', 'India', 'USA'], correct: 1 },
      { q: 'Hvilken sport forbindes Magnus Carlsen med?', qEn: 'Which game is Magnus Carlsen associated with?', options: ['Skak', 'Poker', 'Backgammon'], optionsEn: ['Chess', 'Poker', 'Backgammon'], correct: 0 },
      { q: 'Hvilke farver har Dannebrog?', qEn: 'What colours does the Danish flag have?', options: ['Rød og hvid', 'Blå og gul', 'Rød og blå'], optionsEn: ['Red and white', 'Blue and yellow', 'Red and blue'], correct: 0 },
    ],
  },
  {
    id: 'L',
    questions: [
      { q: 'Hvor mange måneder har 31 dage?', qEn: 'How many months have 31 days?', options: ['5', '6', '7'], correct: 2 },
      { q: 'Hvad hedder Belgiens hovedstad?', qEn: 'What is the capital of Belgium?', options: ['Bruxelles', 'Antwerpen', 'Gent'], optionsEn: ['Brussels', 'Antwerp', 'Ghent'], correct: 0 },
      { q: 'Hvilket dyr kan skifte farve efter omgivelserne?', qEn: 'Which animal can change colour to match its surroundings?', options: ['Kamæleon', 'Skildpadde', 'Frø'], optionsEn: ['Chameleon', 'Turtle', 'Frog'], correct: 0 },
      { q: 'Hvad er halvdelen af 90?', qEn: 'What is half of 90?', options: ['40', '45', '50'], correct: 1 },
      { q: 'Hvad hedder den flyvende hest i græsk mytologi?', qEn: 'What is the flying horse in Greek mythology called?', options: ['Pegasus', 'Kentaur', 'Sleipner'], optionsEn: ['Pegasus', 'Centaur', 'Sleipnir'], correct: 0 },
      { q: 'Hvor mange verdenshjørner er der?', qEn: 'How many cardinal directions are there?', options: ['2', '4', '8'], correct: 1 },
      { q: 'Hvilket land forbindes med tulipaner?', qEn: 'Which country is associated with tulips?', options: ['Holland', 'Portugal', 'Østrig'], optionsEn: ['The Netherlands', 'Portugal', 'Austria'], correct: 0 },
      { q: 'Hvor mange kilometer er 5.000 meter?', qEn: 'How many kilometres is 5,000 metres?', options: ['0,5', '5', '50'], optionsEn: ['0.5', '5', '50'], correct: 1 },
      { q: 'Hvad har hesten på hovedet, når man rider?', qEn: 'What does a horse wear on its head when ridden?', options: ['Hovedtøj', 'Halsbånd', 'Hat'], optionsEn: ['A bridle', 'A collar', 'A hat'], correct: 0 },
      { q: 'Hvilken sport spilles med kølle og lille hvid bold på græs?', qEn: 'Which sport is played with a club and a small white ball on grass?', options: ['Hockey', 'Golf', 'Kricket'], optionsEn: ['Hockey', 'Golf', 'Cricket'], correct: 1 },
      { q: 'Hvor mange bogstaver er der i "CoastZone"?', qEn: 'How many letters are in "CoastZone"?', options: ['8', '9', '10'], correct: 1 },
      { q: 'I hvilken landsdel ligger Esbjerg?', qEn: 'In which part of Denmark is Esbjerg?', options: ['Jylland', 'Fyn', 'Sjælland'], optionsEn: ['Jutland', 'Funen', 'Zealand'], correct: 0 },
      { q: 'Hvad kaldes et klassisk væddeløb for 3-årige heste, fx i Epsom?', qEn: 'What is a classic race for 3-year-old horses, e.g. at Epsom, called?', options: ['Et derby', 'Et grandprix', 'En cup'], optionsEn: ['A derby', 'A grand prix', 'A cup'], correct: 0 },
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

// ---------- Tidslinjen v2: ÉN pulje med 40 nummererede begivenheder ----------
// Numrene (n) er bevidst blandede, så nummer-rækkefølgen ALDRIG er kronologisk.
// Alle årstal er unikke — der er aldrig tvivl om den rigtige rækkefølge.
// Begivenhedsteksterne står KUN på de fysiske print-ark (4 pr. ark, 10 ark) —
// tabletten viser kun numrene. Årstal (facit) forlader aldrig serveren.
const timelineEvents = [
  // Labels matcher Katjas trykte kort ("Tidslinje skilt_DK-ENG - Tryk - LaserTryk") ordret,
  // så tablettens facitliste siger det samme som de fysiske kort.
  { n: 1,  label: 'Den første iPhone lanceres', labelEn: 'Launch of the first iPhone', year: 2007 },
  { n: 2,  label: 'Grundloven underskrives', labelEn: 'Signing of the Danish Constitution', year: 1849 },
  { n: 3,  label: 'Berlinmurens fald', labelEn: 'Fall of the Berlin Wall', year: 1989 },
  { n: 4,  label: 'Bogtrykkerkunsten opfindes', labelEn: 'Invention of the printing press', year: 1440 },
  { n: 5,  label: 'Danmark befries 5. maj', labelEn: 'Liberation of Denmark, 5 May', year: 1945 },
  { n: 6,  label: 'ChatGPT lanceres', labelEn: 'Launch of ChatGPT', year: 2022 },
  { n: 7,  label: 'Glødepæren opfindes', labelEn: 'Invention of the light bulb', year: 1879 },
  { n: 8,  label: 'Jellingstenen rejses', labelEn: 'Raising of the Jelling Stone', year: 965 },
  { n: 9,  label: 'Danmark vinder EM i fodbold', labelEn: 'Denmark\'s European Football Championship triumph', year: 1992 },
  { n: 10, label: 'Wright-brødrenes første flyvetur', labelEn: 'The Wright brothers\' first flight', year: 1903 },
  { n: 11, label: 'Øresundsbroen åbner', labelEn: 'Opening of the Øresund Bridge', year: 2000 },
  { n: 12, label: 'Dampmaskinen opfindes', labelEn: 'Invention of the steam engine', year: 1712 },
  { n: 13, label: 'Kvinder får valgret i Danmark', labelEn: 'Women\'s suffrage in Denmark', year: 1915 },
  { n: 14, label: 'Mount Everest bestiges første gang', labelEn: 'First ascent of Mount Everest', year: 1953 },
  { n: 15, label: 'Columbus kommer til Amerika', labelEn: 'Columbus\' arrival in the Americas', year: 1492 },
  { n: 16, label: 'Det første menneske på Månen', labelEn: 'First man on the Moon', year: 1969 },
  { n: 17, label: 'LEGO® grundlægges', labelEn: 'Founding of LEGO®', year: 1932 },
  { n: 18, label: 'Titanic synker', labelEn: 'Sinking of the Titanic', year: 1912 },
  { n: 19, label: 'USA\'s uafhængighedserklæring', labelEn: 'Signing of the US Declaration of Independence', year: 1776 },
  { n: 20, label: 'COVID-19 lukker Danmark ned', labelEn: 'COVID-19 lockdown of Denmark', year: 2020 },
  { n: 21, label: 'Margrethe 2. bliver dronning', labelEn: 'Accession of Queen Margrethe II', year: 1972 },
  { n: 22, label: 'Reformationen i Danmark', labelEn: 'The Reformation in Denmark', year: 1536 },
  { n: 23, label: 'Telefonen opfindes', labelEn: 'Invention of the telephone', year: 1876 },
  { n: 24, label: 'Tjernobyl-ulykken', labelEn: 'The Chernobyl disaster', year: 1986 },
  { n: 25, label: 'H.C. Andersen fødes', labelEn: 'Birth of Hans Christian Andersen', year: 1805 },
  { n: 26, label: 'Storebæltsbroen indvies', labelEn: 'Opening of the Great Belt Bridge', year: 1998 },
  { n: 27, label: 'Kalmarunionen dannes', labelEn: 'Formation of the Kalmar Union', year: 1397 },
  { n: 28, label: 'Det første fjernsyn demonstreres', labelEn: 'First demonstration of television', year: 1927 },
  { n: 29, label: 'Bitcoin lanceres', labelEn: 'Launch of Bitcoin', year: 2009 },
  { n: 30, label: 'Den Franske Revolution begynder', labelEn: 'Outbreak of the French Revolution', year: 1789 },
  { n: 31, label: 'Danmark besættes 9. april', labelEn: 'Occupation of Denmark, 9 April', year: 1940 },
  { n: 32, label: 'Eiffeltårnet står færdigt', labelEn: 'Completion of the Eiffel Tower', year: 1889 },
  { n: 33, label: 'MobilePay lanceres', labelEn: 'Launch of MobilePay', year: 2013 },
  { n: 34, label: 'Enevælden indføres i Danmark', labelEn: 'Introduction of absolute monarchy in Denmark', year: 1660 },
  { n: 35, label: 'Det første menneske i rummet', labelEn: 'First man in space', year: 1961 },
  { n: 36, label: 'Terrorangrebet 11. september', labelEn: 'The September 11 attacks', year: 2001 },
  { n: 37, label: 'LEGO®-klodsen patenteres', labelEn: 'Patenting of the LEGO® brick', year: 1958 },
  { n: 38, label: 'Skolepligt indføres i Danmark', labelEn: 'Introduction of compulsory schooling in Denmark', year: 1814 },
  { n: 39, label: 'YouTube grundlægges', labelEn: 'Founding of YouTube', year: 2005 },
  { n: 40, label: 'Den første pc fra IBM lanceres', labelEn: 'Launch of the first IBM PC', year: 1981 },
];

// ---------- Dyst (estimering, nærmeste vinder) ----------
const dystQuestions = [
  { q: 'Hvor mange knogler har et voksent menneske?', qEn: 'How many bones does an adult human have?', answer: 206, unit: 'stk', unitEn: 'bones' },
  { q: 'Afstand Jorden–Månen i gennemsnit?', qEn: 'Average distance from Earth to the Moon?', answer: 384400, unit: 'km' },
  { q: 'Hvor højt er Eiffeltårnet?', qEn: 'How tall is the Eiffel Tower?', answer: 330, unit: 'm' },
  { q: 'Antal medlemslande i FN?', qEn: 'Number of member states in the UN?', answer: 193, unit: 'lande', unitEn: 'countries' },
  { q: 'Hvor mange tænder har en voksen hest ca.?', qEn: 'Roughly how many teeth does an adult horse have?', answer: 40, unit: 'tænder', unitEn: 'teeth' },
  { q: 'Vægt af en typisk fuldblodshest?', qEn: 'Weight of a typical thoroughbred horse?', answer: 500, unit: 'kg' },
  { q: 'Hvor mange sekunder er der i et døgn?', qEn: 'How many seconds are there in a day?', answer: 86400, unit: 'sek', unitEn: 'sec' },
  { q: 'Hvor mange centimeter er en meter?', qEn: 'How many centimetres are in a metre?', answer: 100, unit: 'cm' },
  { q: 'Hvor hurtigt kan en galophest løbe ca.?', qEn: 'Roughly how fast can a racehorse run?', answer: 65, unit: 'km/t', unitEn: 'km/h' },
  { q: 'Hvor mange ringe er der i det olympiske symbol?', qEn: 'How many rings are in the Olympic symbol?', answer: 5, unit: 'ringe', unitEn: 'rings' },
  { q: 'Hvor mange indbyggere har Danmark ca.?', qEn: 'Roughly how many people live in Denmark?', answer: 5900000, unit: 'personer', unitEn: 'people' },
  { q: 'Hvor mange grader er der i en cirkel?', qEn: 'How many degrees are in a circle?', answer: 360, unit: 'grader', unitEn: 'degrees' },
];

module.exports = {
  alwaysAvailableTasks,
  tip13Sets,
  tidslinjeSets,
  timelineEvents,
  dystQuestions,
};
