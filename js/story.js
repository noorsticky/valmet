/* =====================================================================
   STORY – allt innehåll i kursen.
   Varje nod på tidslinjen är ett objekt. `play(api)` är scenens manus.

   kind:   'pink'   = vardagsval (påverkar inget, skapar engagemang)
           'blue'   = beslut (A/B/C – påverkar senare i kursen)
           'film'   = cutscene (filmisk, användaren tittar)
           'side'   = händer "vid sidan av" (bara på spår A)
           'green'  = sammanfattning
   lane:   'main' | 'side'
   track:  'A' = noden finns bara när det kritiska valet blev fel
   env:    miljö – videofil (sovrum, kontor, fika, lunch, mote, korridor, larm) eller ritad (bil, fabrik, spegel)
   ===================================================================== */

const BAD_A = ['lugnt', 'avvakta'];   // valen kl 07:30 som leder till olyckan
const GOOD_A = ['rapport', 'skylt'];

const MEETING_OPTIONS = [
  { id: 'lugnt',   label: '”Ta det lugnt men håll tempot uppe…”' },
  { id: 'avvakta', label: '”Vi avvaktar tills nån har tittat på det…”' },
  { id: 'rapport', label: '”Jag skriver en rapport direkt.”' },
  { id: 'skylt',   label: '”Sätt upp en tydlig varningsskylt.”' },
];

const STORY = {
  title: 'Produktion och press',

  personas: [
    { id: 'ulrika', name: 'Ulrika', age: 47, role: 'Utvecklingschef', pronoun: 'hon', img: 'assets/people/ulrika.webp',
      day: 'A', theme: 'Människor och möten',
      desc: 'Du leder ett team där det mesta händer i möten, i korridoren och i samtalen däremellan. Din dag formas av relationer, förväntningar och sådant som sällan syns i ett schema. Det som kräver mest av dig är sällan det som står på agendan.' },
    { id: 'ola', name: 'Ola', age: 42, role: 'Produktionschef', pronoun: 'han', img: 'assets/people/ola.webp',
      day: 'B', theme: 'Produktion och press',
      desc: 'Du ansvarar för en verksamhet som inte får stanna. Dagen styrs av produktion, problem och beslut som behöver fattas nu. Du vet vad som krävs för att hålla ihop ett team under press – och du vet hur snabbt det kan gå åt fel håll.' },
    { id: 'tomas', name: 'Tomas', age: 54, role: 'Sitemanager', pronoun: 'han', img: 'assets/people/tomas.webp',
      day: 'C', theme: 'Förändring och tempo',
      desc: 'Du jobbar i miljöer som förändras. Teamet, platsen, förutsättningarna – ingenting är helt förutsägbart. Du är van vid att lösa saker på plats och ta ansvar långt utanför det du direkt kontrollerar.' },
  ],

  nodes: [
    /* ------------------------------------------------------------ 06:00 */
    {
      id: 'n0600', prop: 'klocka', time: '06:00', title: 'Snooze or lose', kind: 'pink', lane: 'main', eyesClosed: true,
      env: 'sovrum', place: 'Sovrummet',
      async play(api) {
        api.clock('06:00');
        api.overlay('alarmclock', '06:00');
        // scenen börjar med slutna ögon (eyesClosed) – larmet väcker en
        api.loop('alarm');
        await api.wait(900);
        await api.eyes(false);
        await api.title('06:00', 'Sovrummet');
        let t = 0;
        while (true) {
          const opts = [{ id: 'up', label: 'Gå upp' }];
          if (t < 2) opts.unshift({ id: 'snooze', label: 'Snooza 10 min', sub: t === 1 ? 'Sista gången…' : '' });
          const pick = await api.choose({
            prompt: t < 2 ? 'Snooze or lose?' : 'Två snoozar. Nu GÅR man upp.',
            options: opts, kind: 'pink',
            hotspot: t < 2 ? { x: 24.5, y: 53, w: 15, h: 17, id: 'snooze', label: 'Snooza' } : null,
          });
          api.stopLoop('alarm');
          if (pick === 'up') break;
          t++;
          api.state.snooze = t;
          await api.eyes(true);
          await api.wait(1200);
          const time = t === 1 ? '06:10' : '06:20';
          api.overlay('alarmclock', time);
          api.clock(time);
          await api.eyes(false);
          api.loop('alarm');
        }
        api.state.snooze = t;
        await api.say(t === 0 ? 'Upp direkt. Ett försprång på dagen.' :
                      t === 1 ? 'Tio minuter till. Det var värt det. Kanske.' :
                                'Tjugo minuter senare än tänkt. Dagen har redan börjat ikapp.',
                      { who: 'Ola', inner: true });
      },
    },

    /* ------------------------------------------------------------ 06:20 */
    {
      id: 'n0620', prop: (s) => `assets/people/${s.persona || 'ola'}.webp`, time: '06:20', title: 'Väljer person', kind: 'blue', badge: 'X', lane: 'main',
      env: 'spegel', place: 'Badrummet',
      async play(api) {
        api.clock('06:20');
        await api.title('06:20', 'Framför spegeln');
        await api.say('Du tänker igenom hur dagen ser ut… och gör ett val utifrån det.', { narrator: true });
        const who = await api.personaPick(STORY.personas, 'Vem ser du i spegeln?', 'Välj den dag som är mest lik din egen arbetsdag.');
        api.state.persona = who;
        api.setPersona(STORY.personas.find((p) => p.id === who));
        await api.agenda([
          ['07:30', 'Dagligt möte – linje 3'],
          ['10:15', 'Produktionsmöte, chefer'],
          ['13:00', 'Mail & admin'],
          ['14:30', 'Budgetgenomgång'],
          ['14:30', 'Avstämning underhåll', true],
        ]);
        await api.say('Fullbokat. Som vanligt.', { who: 'Ola', inner: true });
      },
    },

    /* ------------------------------------------------------------ 06:50 */
    {
      id: 'n0650', prop: 'bil', time: '06:50', title: 'Bilfärd till jobbet', kind: 'film', lane: 'main',
      env: 'bil', place: 'På väg till jobbet', cinematic: true,
      async play(api) {
        api.clock('06:50');
        api.loop('car');
        await api.title('06:50', 'På väg till jobbet');
        await api.say('…och trafiken flyter på bra i morgonrusningen. Klockan är tio i sju.', { who: 'Radion', small: true });
        await api.say('Nästa stopp är om tre veckor. Allt ska vara klart till dess.', { who: 'Ola', inner: true });
        await api.say('Och så det där skyddet vid pressen på linje 3 som krånglar…', { who: 'Ola', inner: true });
        await api.say('Det får vi ta i dag. På något sätt.', { who: 'Ola', inner: true });
        api.stopLoop('car');
      },
    },

    /* ------------------------------------------------------------ 07:15 */
    {
      id: 'n0715', prop: 'kopp', time: '07:15', title: 'Svart kaffe eller havrebös', kind: 'pink', lane: 'main',
      env: 'fika', place: 'Personalrummet',
      async play(api) {
        api.clock('07:15');
        api.loop('room');
        await api.title('07:15', 'Personalrummet');
        const pick = await api.choose({
          prompt: 'Svart kaffe eller havrebös?',
          options: [{ id: 'svart', label: 'Svart kaffe' }, { id: 'havre', label: 'Havrebös' }],
          kind: 'pink',
          hotspot: { x: 27, y: 52, w: 12, h: 18, id: 'svart', label: 'Ta koppen' },
        });
        api.state.coffee = pick;
        await api.say(pick === 'svart' ? 'Svart och starkt. Som det alltid varit.' : 'Havrebös, extra skum. Man lever bara en gång.', { who: 'Ola', inner: true });
        api.stopLoop('room');
      },
    },

    /* ------------------------------------------------------------ 07:30 */
    {
      id: 'n0730', prop: 'tavla', time: '07:30', title: 'Dagligt möte', kind: 'blue', badge: 'A', lane: 'main', critical: true,
      env: 'mote', place: 'Mötesrummet, linje 3',
      async play(api) {
        const replay = !!api.state.rewound;
        api.clock('07:30');
        api.loop('room');
        api.cinematic(true);
        await api.title('07:30', replay ? 'Dagligt möte – igen' : 'Dagligt möte, linje 3');
        await api.say('Okej, nästa stopp är om tre veckor. Det är mycket som ska fixas till dess.', { who: 'Jonna, skiftledare' });
        await api.say('Skyddet vid pressen hakar upp sig igen. Folk fäller upp det för att hinna med.', { who: 'Jonna, skiftledare' });
        await api.say('Underhåll hinner inte titta på det förrän under stoppet.', { who: 'Erik, tekniker' });
        await api.say('Alla tittar på dig.', { narrator: true });
        api.cinematic(false);

        let pick;
        if (!replay) {
          pick = await api.choose({
            prompt: 'Vad säger Ola?',
            // första gången finns bara de "fel" svaren – de rätta dyker upp först efter tillbakaspolningen
            options: MEETING_OPTIONS.filter((o) => BAD_A.includes(o.id)), kind: 'key', badge: 'A',
            timer: 14, timeoutId: 'lugnt',
            timerLabel: 'Mötet drar ut på tiden…',
          });
          if (api.lastTimedOut) await api.say('Tiden rann iväg. Ola hör sig själv säga: ”Ta det lugnt men håll tempot uppe…”', { narrator: true });
        } else {
          // Andra försöket: tidigare val markerat, fel val ger en tankeställare.
          const tried = new Set(api.state.triedA || []);
          while (true) {
            pick = await api.choose({
              prompt: 'Hur hade detta kunnat förhindras? Vad säger Ola nu?',
              options: MEETING_OPTIONS.map((o) => ({
                ...o,
                tag: tried.has(o.id) ? 'Förra gången' : GOOD_A.includes(o.id) ? 'Nytt' : '',
                fresh: GOOD_A.includes(o.id),
                disabled: tried.has(o.id) && BAD_A.includes(o.id),
              })),
              kind: 'key', badge: 'A',
            });
            if (GOOD_A.includes(pick)) break;
            tried.add(pick);
            api.sfx('warn');
            await api.say('Hmm… tänk på vad som hände kl 16:14. Skulle det här ha stoppat det?', { who: 'Ola', inner: true });
          }
        }
        api.state.choices.A = pick;
        api.state.triedA = [...new Set([...(api.state.triedA || []), pick])];
        if (!api.state.firstA) api.state.firstA = pick;

        const replies = {
          lugnt: ['Jonna nickar långsamt.', 'Okej… vi kör på då.'],
          avvakta: ['Erik rycker på axlarna.', 'Okej. Vi får se när någon hinner.'],
          rapport: ['Jonna ser lättad ut.', 'Bra. Då hamnar det hos underhåll redan i dag.'],
          skylt: ['Det blir tyst en sekund. Sen nickar alla.', 'Jag fixar en skylt och spärrar av tills skyddet är lagat.'],
        }[pick];
        await api.say(replies[0], { narrator: true });
        await api.say(replies[1], { who: pick === 'skylt' ? 'Erik, tekniker' : 'Jonna, skiftledare' });
        await api.memory('Detta val påverkar resten av dagen.', 'A');
        api.stopLoop('room');
      },
    },

    /* ------------------------------------------------------------ 08:03 */
    {
      id: 'n0803', prop: 'prat', time: '08:03', title: 'Korridoren', kind: 'blue', badge: 'B', lane: 'main',
      env: 'korridor', place: 'Korridoren',
      async play(api) {
        api.clock('08:03');
        await api.title('08:03', 'Korridoren');
        await api.say('Du är redan sen till nästa möte.', { narrator: true });
        await api.say('Ola! Har du en minut? Jag ville fråga om ledighet i november…', { who: 'Lisa' });
        const pick = await api.choose({
          prompt: 'Vad känner sig Ola mest stressad över?',
          options: [
            { id: 'lisa', label: 'Lisa', sub: 'Hon behöver ett svar' },
            { id: 'motet', label: 'Mötet', sub: 'Jag är redan sen' },
          ],
          kind: 'key', badge: 'B',
        });
        api.state.choices.B = pick;
        if (pick === 'motet') {
          await api.say('Ola viftar bort Lisa.', { narrator: true });
          await api.say('Det tar vi senare…', { who: 'Ola' });
          await api.say('…okej.', { who: 'Lisa', small: true });
        } else {
          await api.say('Jag är sen, men det här är viktigt. Kan vi ses 15:30?', { who: 'Ola' });
          await api.say('Tack! Det passar perfekt.', { who: 'Lisa' });
        }
        await api.memory('Lisa kommer att minnas det här.', 'B');
      },
    },

    /* ------------------------------------------------------------ 10:15 */
    {
      id: 'n1015', prop: 'skarm', time: '10:15', title: 'Produktionsmöte chefer', kind: 'film', lane: 'main',
      env: 'mote', envVariant: 'dark', place: 'Ledningsrummet', cinematic: true,
      async play(api) {
        api.clock('10:15');
        await api.title('10:15', 'Produktionsmöte, chefer');
        await api.say('Vi behöver öka produktionen med åtta procent innan kvartalet är slut.', { who: 'Platschefen' });
        await api.say('Och bulktransporterna… de åker runt helt vilt på området. Det är en tidsfråga.', { who: 'Ulrika, utvecklingschef' });
        await api.say('Mer tempo. Igen.', { who: 'Ola', inner: true });
      },
    },

    /* ------------------------------------------------------------ 11:15 (A) */
    {
      id: 'n1115', prop: 'maskin', time: '11:15', title: 'Vid maskinen', kind: 'side', badge: 'A', lane: 'side', track: 'A',
      env: 'fabrik', place: 'Pressen, linje 3', cinematic: true,
      async play(api) {
        api.clock('11:15');
        api.loop('factory');
        await api.title('11:15', 'Vid maskinen');
        await api.say('Ursäkta… ska skyddet sitta uppfällt så här?', { who: 'Nyanställd' });
        await api.say('Så har det alltid varit. Jobba nu!', { who: 'Gammal räv' });
        api.stopLoop('factory');
      },
    },

    /* ------------------------------------------------------------ 12:00 */
    {
      id: 'n1200', prop: 'lada', time: '12:00', title: 'Vad är det för lunch i lådan?', kind: 'pink', lane: 'main',
      env: 'lunch', place: 'Lunchrummet',
      async play(api) {
        api.clock('12:00');
        api.loop('room');
        api.sfx('hum');
        await api.title('12:00', 'Lunchrummet');
        await api.say('Mikron surrar. Det doftar… något.', { narrator: true });
        // mikrovågsugnen i videon (procent av 1920×1080)
        const pick = await api.choose({
          prompt: 'Vad är det för lunch i lådan?',
          options: [
            { id: 'kott', label: 'Gårdagens köttbullar' },
            { id: 'lins', label: 'Linsgryta' },
            { id: 'fisk', label: 'Fiskgratäng', sub: 'Förlåt, kollegor' },
          ],
          kind: 'pink',
          hotspot: { x: 16.5, y: 42.5, w: 29, h: 27, id: 'kott', label: 'Kika i mikron' },
        });
        api.state.lunch = pick;
        api.sfx('ding');
        await api.wait(500);
        await api.say({
          kott: 'Köttbullar. Alltid godare dagen efter.',
          lins: 'Linsgryta. Nyttigt och mättande.',
          fisk: 'Fiskgratäng i mikron. Någon i rummet suckar högt.',
        }[pick], { who: 'Ola', inner: true });
        api.stopLoop('room');
      },
    },

    /* ------------------------------------------------------------ 12:23 (A) */
    {
      id: 'n1223', prop: 'gnall', time: '12:23', title: 'Gnäll om skyddet', kind: 'side', badge: 'A', lane: 'side', track: 'A',
      env: 'lunch', envVariant: 'dim', place: 'Lunchrummet', cinematic: true,
      async play(api) {
        api.clock('12:23');
        api.loop('room');
        await api.title('12:23', 'Vid lunchen');
        await api.say('Skyddet har hakat upp sig tre gånger i dag.', { who: 'Operatör' });
        await api.say('Vi fäller upp det bara. Annars hinner vi aldrig.', { who: 'Gammal räv' });
        await api.say(api.state.choices.A === 'avvakta'
          ? 'Ola sa ju att vi skulle avvakta tills nån tittat på det.'
          : 'Ola sa ju att vi skulle hålla tempot uppe.', { who: 'Operatör' });
        api.stopLoop('room');
      },
    },

    /* ------------------------------------------------------------ 13:24 */
    {
      id: 'n1324', prop: 'laptop', time: '13:24', title: 'Vid datorn', kind: 'blue', badge: 'C', lane: 'main',
      env: 'kontor', place: 'Olas kontor',
      async play(api) {
        api.clock('13:24');
        await api.title('13:24', 'Vid datorn');
        await api.say('Ola har fått en hög av mail. I vilken ordning prioriterar han dem?', { narrator: true });
        await api.hotspot({ x: 38.5, y: 68, w: 5, h: 6.5, label: 'Öppna inkorgen' });
        const order = await api.mailSort([
          { id: 'kim', from: 'Kim Andersson', subject: 'Sjukanmälan', preview: 'Hej, jag är tyvärr sjuk i dag igen…' },
          { id: 'rapport', from: 'Ekonomi', subject: 'Månadsrapport produktion', preview: 'Påminnelse: rapporten ska in senast i dag kl 15.' },
          { id: 'aw', from: 'Sara (HR)', subject: 'AW på fredag?', preview: 'Vem är på? 🍻 Svara gärna i dag så jag kan boka.' },
        ]);
        api.state.choices.C = order;
        await api.memory('Dina prioriteringar har noterats.', 'C');
      },
    },

    /* ------------------------------------------------------------ 14:02 (A) */
    {
      id: 'n1402', prop: 'handske', time: '14:02', title: 'Vid fikat', kind: 'side', badge: 'A', lane: 'side', track: 'A',
      env: 'fika', place: 'Fikarummet', cinematic: true,
      async play(api) {
        api.clock('14:02');
        api.loop('room');
        await api.title('14:02', 'Vid fikat');
        await api.say('Rävarna häcklar den nyanställde om säkerhet.', { narrator: true });
        await api.say('Ta på dig skyddshandskarna nu! Kaffet är ju jättevarmt!!!', { who: 'Gammal räv' });
        await api.say('Skratt runt bordet. Den nyanställde säger inget mer om skyddet.', { narrator: true });
        api.stopLoop('room');
      },
    },

    /* ------------------------------------------------------------ 14:30 */
    {
      id: 'n1430', prop: 'kalender', time: '14:30', title: 'Dubbelbokad', kind: 'film', lane: 'main',
      env: 'kontor', place: 'Olas kontor', cinematic: true,
      async play(api) {
        api.clock('14:30');
        await api.title('14:30', 'Olas kontor');
        await api.say('Ola inser att han är dubbelbokad.', { narrator: true });
        await api.calendarMove(api.state.choices.B === 'lisa');
        await api.say(api.state.choices.B === 'lisa'
          ? 'Budgetgenomgången flyttas till i morgon. Tiden med Lisa 15:30 står kvar.'
          : 'Avstämningen med underhåll får flyttas till nästa vecka.', { narrator: true });
      },
    },

    /* ------------------------------------------------------------ 15:30 */
    {
      id: 'n1530', prop: 'mobil', time: '15:30', title: 'Femton minuter över', kind: 'pink', lane: 'main',
      env: 'kontor', place: 'Olas kontor',
      async play(api) {
        api.clock('15:30');
        await api.title('15:30', 'Femton minuter över');
        const lisa = api.state.choices.B === 'lisa';
        const options = [
          { id: 'nyheter', label: 'Läser nyheter' },
          { id: 'tiktok', label: 'Kollar på TikTok' },
          { id: 'social', label: 'Socialiserar' },
        ];
        if (lisa) options.unshift({ id: 'lisa', label: 'Pratar med Lisa', sub: 'Som ni bestämde i morse' });
        const pick = await api.choose({ prompt: 'Ola får femton minuter över… vad gör han då?', options, kind: 'pink' });
        api.state.break = pick;
        const lines = {
          lisa: ['Hej Ola! Tack för att du tog dig tid.', 'Lisa'],
          nyheter: ['Tre rubriker senare är fem minuter borta.', null],
          tiktok: ['En katt som spelar piano. Och en till. Och en till…', null],
          social: ['En snabb pratstund vid kaffemaskinen. Det behövdes.', null],
        }[pick];
        await api.say(lines[0], lines[1] ? { who: lines[1] } : { who: 'Ola', inner: true });
      },
    },

    /* ------------------------------------------------------------ 16:14 */
    {
      id: 'n1614', prop: (s) => (s.track === 'A' ? 'larm' : 'ryggsack'), time: '16:14', kind: 'blue', badge: (s) => (s.track === 'A' ? 'A' : 'A2'), lane: 'main',
      title: (s) => (s.track === 'A' ? 'Larmet går' : 'Mötet i korridoren'),
      env: (s) => (s.track === 'A' ? 'larm' : 'korridor'),
      envVariant: (s) => (s.track === 'A' ? '' : 'warm'),
      place: (s) => (s.track === 'A' ? 'Linje 3' : 'Korridoren'),
      cinematic: (s) => s.track === 'A',
      async play(api) {
        api.clock('16:14');
        if (api.state.track === 'A') {
          api.loop('siren');
          api.tint('alarm');
          await api.title('16:14', 'Larmet går');
          await api.say('Det har hänt en olycka vid maskinen.', { narrator: true });
          await api.say('Den nyanställde har skadat handen. Ambulansen är på väg.', { who: 'Jonna, skiftledare' });
          await api.say('Skyddet saknades.', { narrator: true, big: true });
          api.sfx('heartbeat');
          await api.wait(700);
          api.stopLoop('siren');
          await api.bigQuestion('Hur hade detta kunnat förhindras?');
          api.tint(null);
          api.state.accident = true;
        } else {
          api.loop('room');
          await api.title('16:14', 'Korridoren');
          await api.say('Hej Ola! Tack för i dag.', { who: 'Nyanställd' });
          await api.say(api.state.choices.A === 'skylt'
            ? 'Bra med skylten vid pressen. Nu vet alla vad som gäller tills skyddet är lagat.'
            : 'Underhåll kom förbi efter din rapport och lagade skyddet direkt. Skönt!', { who: 'Nyanställd' });
          await api.say('Nu ska jag hinna hämta på förskolan!', { who: 'Nyanställd' });
          await api.say('Den nyanställde har haft en bra dag och är på väg mot förskolan.', { narrator: true });
          api.stopLoop('room');
        }
      },
    },

    /* ------------------------------------------------------------ Summering */
    {
      id: 'nend', prop: 'checklista', time: 'Dagens slut', title: 'På väg hem', kind: 'green', lane: 'main',
      env: 'bil', envVariant: 'dusk', place: 'På väg hem',
      async play(api) {
        const s = api.state;
        api.clock('17:05');
        api.loop('car');
        api.cinematic(true);
        await api.title('17:05', 'På väg hem');
        await api.say('Vilken dag.', { who: 'Ola', inner: true });
        if (s.accident) {
          await api.say('Allt hängde på en mening i morse. ”Håll tempot uppe.”', { who: 'Ola', inner: true });
          await api.say('Jag sa det för att vi hade bråttom. Inte för att någon skulle skadas.', { who: 'Ola', inner: true });
        } else {
          await api.say('En skylt. Det var allt som behövdes.', { who: 'Ola', inner: true });
        }
        await api.say('Ta en stund och tänk tillbaka på din dag.', { narrator: true });
        api.cinematic(false);
        s.reflection = await api.reflect(buildReflection(s));
        api.stopLoop('car');
      },
    },
  ],
};

/* =====================================================================
   REFLEKTION – kursens avslutning, ett steg i taget.
   Stegtyper: recap, choice, scale, text, takeaways, commit, closing.
   `respond` ger en återkoppling direkt efter svaret (ingen rätt eller fel).
   ===================================================================== */
const SAID = {
  lugnt: '”Ta det lugnt men håll tempot uppe…”',
  avvakta: '”Vi avvaktar tills nån har tittat på det…”',
  rapport: '”Jag skriver en rapport direkt.”',
  skylt: '”Sätt upp en tydlig varningsskylt.”',
};

function buildReflection(s) {
  const steps = [];
  const rewound = BAD_A.includes(s.firstA);
  const mailFirst = { kim: 'Kims sjukanmälan', rapport: 'månadsrapporten', aw: 'AW-mailet' }[(s.choices.C || [])[0]];
  const breakTxt = { lisa: 'pratade med Lisa', nyheter: 'läste nyheter', tiktok: 'scrollade TikTok', social: 'tog en pratstund vid kaffet' }[s.break];

  /* 1. Din dag */
  steps.push({
    type: 'recap', eyebrow: 'Din dag', title: 'Så här blev dagen',
    items: [
      { time: '06:00', text: s.snooze ? `Du snoozade ${s.snooze} ${s.snooze === 1 ? 'gång' : 'gånger'}.` : 'Du gick upp direkt.' },
      rewound
        ? { time: '07:30', was: SAID[s.firstA], text: `Du ändrade dig: ${SAID[s.choices.A]}`, key: true }
        : { time: '07:30', text: `Du sa: ${SAID[s.choices.A]}`, key: true },
      { time: '08:03', text: s.choices.B === 'lisa' ? 'Du stannade och bokade en tid med Lisa.' : '”Det tar vi senare…” Lisa fick vänta.' },
      mailFirst && { time: '13:24', text: `I inkorgen började du med ${mailFirst}.` },
      breakTxt && { time: '15:30', text: `Med femton minuter över ${breakTxt}.` },
      rewound
        ? { time: '16:14', was: 'Larmet gick vid pressen.', text: 'Den nyanställde gick hem till förskolan.', key: true }
        : { time: '16:14', text: 'Den nyanställde gick hem till förskolan.', key: true },
    ].filter(Boolean),
  });

  /* 2. Vad låg bakom? */
  if (rewound) {
    steps.push({
      type: 'choice', id: 'orsak', eyebrow: 'Kl 07:30',
      question: `Första gången sa du ${SAID[s.firstA]} Vad tror du låg bakom?`,
      hint: 'Det finns inget rätt svar. Välj det som ligger närmast.',
      options: [
        { id: 'tid', label: 'Tidspressen – nästa stopp närmade sig' },
        { id: 'allvar', label: 'Det kändes inte så allvarligt' },
        { id: 'vana', label: 'Så brukar vi göra' },
        { id: 'oro', label: 'Jag ville inte skapa oro' },
      ],
      respond: (id) => ({
        tid: 'Tidspress är en av de vanligaste orsakerna till att risker skjuts upp. Men pressen försvinner inte när vi väntar – den flyttas bara, ofta till den som står närmast maskinen.',
        allvar: 'Ett skydd som ”bara hakar upp sig” är lätt att vänja sig vid. Just därför är tillbud så värdefulla: de är varningen innan olyckan.',
        vana: 'Det en chef säger blir snabbt ”så gör vi här”. Samma tanke upprepades vid maskinen, vid lunchen och vid fikat – samma dag.',
        oro: 'Viljan att hålla lugnet är mänsklig. Men en tydlig skylt skapar oftast mer trygghet än oro – den visar att någon har koll.',
      }[id]),
    });
  }

  /* 3. Känner du igen det? */
  steps.push({
    type: 'scale', id: 'igenkanning', eyebrow: 'I din vardag',
    question: 'Hur ofta ställs du inför liknande val – där tempot står mot säkerheten?',
    labels: ['Nästan aldrig', 'Varje dag'],
    respond: (v) => (v <= 2
      ? 'Skönt. Fundera ändå på om det är för att det inte händer – eller för att det inte syns.'
      : v === 3
        ? 'Då vet du hur det känns. En enkel fråga att bära med sig: ”Vad skulle jag önska att jag sagt, om det här gick fel i eftermiddag?”'
        : 'Då är du inte ensam. När valet kommer ofta behövs en gemensam spelregel i teamet, så att ingen behöver avgöra det själv under press.'),
  });

  /* 4. Vem väntar på dig? */
  steps.push({
    type: 'text', id: 'vantar', eyebrow: 'Kl 08:03',
    question: s.choices.B === 'lisa'
      ? 'Du stannade för Lisa, fast du var sen. Vem på din arbetsplats skulle behöva samma minut från dig den här veckan?'
      : '”Det tar vi senare…” Lisa fick vänta. Finns det någon som väntar på ett svar från dig just nu?',
    placeholder: 'Ett namn, eller en tanke …',
    hint: 'Det du skriver stannar här, på din skärm.',
    respond: (t) => (t ? 'Bra. Boka in det innan du stänger kursen – senare blir lätt aldrig.' : 'Helt okej. Frågan får följa med dig ändå.'),
  });

  /* 5. Det här tar vi med oss */
  steps.push({
    type: 'takeaways', eyebrow: 'Att ta med sig', title: 'Tre saker från dagen',
    items: [
      { lead: 'Ord blir normer.', text: 'Ett ”håll tempot uppe” på morgonmötet blev ”så har det alltid varit” vid maskinen.' },
      { lead: 'Agera på det kända.', text: 'En känd säkerhetsbrist hanteras direkt: spärra av, skylta, rapportera.' },
      { lead: 'Lyssna i korridoren.', text: 'Den som vågar fråga i dag är den som säger till nästa gång.' },
    ],
  });

  /* 6. Mitt åtagande */
  steps.push({
    type: 'commit', id: 'atagande', eyebrow: 'Mitt åtagande',
    question: 'Vad tar du med dig till i morgon?',
    hint: 'Välj ett eller flera – eller skriv med egna ord.',
    options: [
      'Jag förstår att beslut jag tar påverkar andras arbetsdag och arbetsmiljö.',
      'Jag agerar direkt när jag ser en säkerhetsbrist – skylt, rapport, åtgärd.',
      'Jag tar mig tid att lyssna när en medarbetare vill prata.',
      'Jag ifrågasätter ”så har det alltid varit”.',
    ],
    ownPlaceholder: 'Mitt eget åtagande …',
  });

  /* 7. Avslut */
  steps.push({
    type: 'closing', eyebrow: '17:42',
    title: 'Den nyanställde hann till förskolan i dag.',
    text: rewound
      ? 'I spelet kunde du spola tillbaka till 07:30. I verkligheten finns bara nästa morgonmöte.'
      : 'Det berodde på ett beslut kl 07:30. I morgon är det du som sitter på morgonmötet.',
  });
  return steps;
}

window.STORY = STORY;
window.BAD_A = BAD_A;
