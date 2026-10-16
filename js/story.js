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

/* Följden av mailordningen kl 13:24: det som hamnade sist i inkorgen hinner ikapp kl 15:30 */
const MAIL_FALLOUT = {
  kim: { recap: 'Kims sjukanmälan hamnade sist – och morgondagens bemanning blev en överraskning.' },
  rapport: { recap: 'Månadsrapporten hamnade sist – den fick bli kvällsjobb.' },
  aw: { recap: 'AW-mailet hamnade sist – fredagsbordet fylldes utan dig.' },
};

const MEETING_OPTIONS = [
  { id: 'lugnt',   label: '”Ta det lugnt men håll tempot uppe…”' },
  { id: 'avvakta', label: '”Vi avvaktar tills nån har tittat på det…”' },
  { id: 'rapport', label: '”Jag skriver en rapport direkt.”' },
  { id: 'skylt',   label: '”Sätt upp en tydlig varningsskylt.”' },
];

const STORY = {
  title: 'Vår dag',

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
      id: 'n0600', prop: 'assets/props/klocka.webp', time: '06:00', title: 'Snooze or lose', kind: 'pink', lane: 'main', eyesClosed: true,
      env: 'sovrum', place: 'Sovrummet',
      async play(api) {
        api.clock('06:00');
        // väckarklockan finns i filmen; vid snooze byts filmen till en som visar 06:10 / 06:20
        api.prefetch(['assets/video/sovrum-0610.mp4', 'assets/video/sovrum-0620.mp4']);
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
            prompt: t < 2 ? 'Snooze or lose?' : 'Två snoozar avklarade. Kaffet väntar!',
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
          api.envVideo(t === 1 ? 'assets/video/sovrum-0610.mp4' : 'assets/video/sovrum-0620.mp4');
          api.clock(time);
          await api.eyes(false);
          api.loop('alarm');
        }
        api.state.snooze = t;
        await api.say(t === 0 ? 'Upp direkt. Ett försprång på dagen.' :
                      t === 1 ? 'Tio minuter till. Det var värt det. Kanske.' :
                                'Tjugo minuter senare än tänkt. Dagen har redan börjat ikapp.',
                      // ingen person är vald än (det sker i spegeln 06:20) – därför en namnlös tanke
                      { inner: true });
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
        const p = STORY.personas.find((x) => x.id === who);
        api.setPersona(p);
        // varje dag har sin egen kalender; personer utan egen dag får Olas
        const day = STORY.dayFor(who);
        await api.agenda(day.agenda);
        await api.say(day.agendaLine, { who: day.own ? p.name : 'Ola', inner: true });
      },
    },

    /* ------------------------------------------------------------ 06:50 */
    {
      id: 'n0650', prop: 'assets/props/bil.webp', time: '06:50', title: 'Bilfärd till jobbet', kind: 'film', lane: 'main',
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
      id: 'n0715', prop: 'assets/props/kopp.webp', time: '07:15', title: 'Svart kaffe eller havrebös', kind: 'pink', lane: 'main',
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
      id: 'n0730', prop: 'assets/props/whiteboard.webp', time: '07:30', title: 'Dagligt möte', kind: 'blue', badge: 'A', lane: 'main', critical: true,
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
          if (api.lastTimedOut) await api.say('Mötet drar ut på tiden, och Ola säger det som så ofta sägs: ”Ta det lugnt men håll tempot uppe…”', { narrator: true });
        } else {
          // Andra försöket: första svaret är markerat (inte överstruket), nya svar dyker upp.
          const tried = new Set(api.state.triedA || []);
          while (true) {
            pick = await api.choose({
              prompt: 'Nu vet du hur dagen kan sluta. Vad säger Ola den här gången?',
              options: MEETING_OPTIONS.map((o) => ({
                ...o,
                tag: tried.has(o.id) ? 'Ditt första svar' : GOOD_A.includes(o.id) ? 'Nytt' : '',
                fresh: GOOD_A.includes(o.id),
              })),
              kind: 'key', badge: 'A',
            });
            if (GOOD_A.includes(pick)) break;
            tried.add(pick);
            api.sfx('memory');
            await api.say('Hmm, det låter som i morse – och vi vet hur eftermiddagen blev då. Finns det något som skyddar pressen redan nu?', { who: 'Ola', inner: true });
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
        await api.memory('Det här valet följer med resten av dagen.', 'A');
        api.stopLoop('room');
      },
    },

    /* ------------------------------------------------------------ 08:03 */
    {
      id: 'n0803', prop: 'assets/props/prat.webp', time: '08:03', title: 'Korridoren', kind: 'blue', badge: 'B', lane: 'main',
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
          await api.say('Ola hinner inte stanna.', { narrator: true });
          await api.say('Det tar vi senare…', { who: 'Ola' });
          await api.say('…okej.', { who: 'Lisa', small: true });
        } else {
          await api.say('Jag är sen, men det här är viktigt. Kan vi ses 15:30?', { who: 'Ola' });
          await api.say('Tack! Det passar perfekt.', { who: 'Lisa' });
        }
        await api.memory('Lisa kommer ihåg det här – på ett eller annat sätt.', 'B');
      },
    },

    /* ------------------------------------------------------------ 10:15 */
    {
      id: 'n1015', prop: 'assets/props/laptop.webp', time: '10:15', title: 'Produktionsmöte chefer', kind: 'film', lane: 'main',
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
      id: 'n1115', prop: 'assets/props/hjalm.webp', time: '11:15', title: 'Vid maskinen', kind: 'side', badge: 'A', lane: 'side', track: 'A',
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
      id: 'n1200', prop: 'assets/props/mikro.webp', time: '12:00', title: 'Vad är det för lunch i lådan?', kind: 'pink', lane: 'main',
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
      id: 'n1324', prop: 'assets/props/skrivbord.webp', time: '13:24', title: 'Vid datorn', kind: 'blue', badge: 'C', lane: 'main',
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
        await api.memory('Inkorgen är sorterad. Vi får se vad som hinner ikapp.', 'C');
      },
    },

    /* ------------------------------------------------------------ 14:02 (A) */
    {
      id: 'n1402', prop: 'assets/props/fika.webp', time: '14:02', title: 'Vid fikat', kind: 'side', badge: 'A', lane: 'side', track: 'A',
      env: 'fika', place: 'Fikarummet', cinematic: true,
      async play(api) {
        api.clock('14:02');
        api.loop('room');
        await api.title('14:02', 'Vid fikat');
        await api.say('Rävarna skämtar med den nyanställde om säkerhet.', { narrator: true });
        await api.say('Ta på dig skyddshandskarna nu! Kaffet är ju jättevarmt!!!', { who: 'Gammal räv' });
        await api.say('Skratt runt bordet. Den nyanställde säger inget mer om skyddet.', { narrator: true });
        api.stopLoop('room');
      },
    },

    /* ------------------------------------------------------------ 14:30 */
    {
      id: 'n1430', prop: 'assets/props/kalender.webp', time: '14:30', title: 'Dubbelbokad', kind: 'film', lane: 'main',
      env: 'kontor', place: 'Olas kontor', cinematic: true,
      async play(api) {
        api.clock('14:30');
        await api.title('14:30', 'Olas kontor');
        await api.say('Ola inser att han är dubbelbokad.', { narrator: true });
        await api.calendarMove(api.state.choices.B === 'lisa');
        await api.say(api.state.choices.B === 'lisa'
          ? 'Budgetmötet flyttas till i morgon. Tiden med Lisa 15:30 står kvar.'
          : 'Avstämningen med underhåll får flyttas till nästa vecka.', { narrator: true });
      },
    },

    /* ------------------------------------------------------------ 15:30 */
    {
      id: 'n1530', prop: 'assets/props/mobil.webp', time: '15:30', title: 'Femton minuter över', kind: 'pink', lane: 'main',
      env: 'kontor', place: 'Olas kontor',
      async play(api) {
        api.clock('15:30');
        await api.title('15:30', 'Femton minuter över');
        // följden av hur inkorgen prioriterades kl 13:24
        const order = api.state.choices.C || [];
        const last = order[order.length - 1];
        if (last === 'kim') {
          await api.say('Ola, Kim är sjuk i morgon också. Ingen har ringt in någon ersättare – vi blir en kort på morgonskiftet.', { who: 'Jonna, skiftledare' });
          await api.say('Sjukanmälan hamnade längst ner i högen. Det händer de flesta en stressig dag.', { narrator: true });
          await api.memory('Botten av inkorgen hann ikapp.', 'C');
        } else if (last === 'rapport') {
          await api.say('Påminnelse: månadsrapporten skulle in kl 15.00. Vi har inte fått den.', { who: 'Ekonomi', small: true });
          await api.say('Den hann jag aldrig med. Nu blir det kvällsjobb.', { who: 'Ola', inner: true });
          await api.memory('Allt hinns inte med – och det är också värt att veta.', 'C');
        } else if (last === 'aw') {
          await api.say('AW:n på fredag är fullbokad nu – du hann inte svara. Nästa gång!', { who: 'Sara (HR)', small: true });
          await api.say('Det var nog inte hela världen. Eller?', { who: 'Ola', inner: true });
        }
        if (order[0] === 'kim') await api.say('Tack för att du löste ersättare för Kim direkt. Morgonskiftet är fullt i morgon.', { who: 'Jonna, skiftledare' });
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
      id: 'n1614', prop: (s) => (s.track === 'A' ? 'assets/props/larm.webp' : 'assets/props/vinka.webp'), time: '16:14', kind: 'blue', badge: (s) => (s.track === 'A' ? 'A' : 'A2'), lane: 'main',
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
          await api.bigQuestion('Vad hade kunnat göra skillnad?');
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
      id: 'nend', prop: 'assets/props/hus.webp', time: 'Dagens slut', title: 'På väg hem', kind: 'green', lane: 'main',
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
        ? { time: '07:30', was: `Först: ${SAID[s.firstA]}`, text: `Andra gången: ${SAID[s.choices.A]}`, key: true }
        : { time: '07:30', text: `Du sa: ${SAID[s.choices.A]}`, key: true },
      { time: '08:03', text: s.choices.B === 'lisa' ? 'Du stannade och bokade en tid med Lisa.' : '”Det tar vi senare…” – mötet kändes mer akut.' },
      mailFirst && { time: '13:24', text: `I inkorgen började du med ${mailFirst}.` },
      MAIL_FALLOUT[(s.choices.C || [])[2]] && { time: '15:30', text: MAIL_FALLOUT[(s.choices.C || [])[2]].recap },
      breakTxt && { time: '15:30', text: `Med femton minuter över ${breakTxt}.` },
      rewound
        ? { time: '16:14', was: 'Först: larmet gick vid pressen.', text: 'Andra gången: den nyanställde gick hem till förskolan.', key: true }
        : { time: '16:14', text: 'Den nyanställde gick hem till förskolan.', key: true },
    ].filter(Boolean),
  });

  /* 2. Vad låg bakom? */
  if (rewound) {
    steps.push({
      type: 'choice', id: 'orsak', eyebrow: 'Kl 07:30',
      question: `Första gången blev det ${SAID[s.firstA]} Det säger nästan alla i stunden. Vad tror du gör att det känns rätt att säga?`,
      hint: 'Det finns inga rätt eller fel svar här. Välj det som känns närmast.',
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
      ? 'Skönt! Ett tips att ta med: håll utkik ändå – ibland händer det mest där det syns minst.'
      : v === 3
        ? 'Då vet du hur det känns. En enkel fråga att bära med sig: ”Vad skulle jag önska att jag sagt, om det här gick fel i eftermiddag?”'
        : 'Då är du inte ensam. När valet kommer ofta behövs en gemensam spelregel i teamet, så att ingen behöver avgöra det själv under press.'),
  });

  /* 4. Vem väntar på dig? */
  steps.push({
    type: 'text', id: 'vantar', eyebrow: 'Kl 08:03',
    question: s.choices.B === 'lisa'
      ? 'Du stannade för Lisa, fast du var sen. Vem på din arbetsplats skulle behöva samma minut från dig den här veckan?'
      : '”Det tar vi senare…” är en mening vi alla har sagt. Finns det någon som väntar på ett svar från dig just nu?',
    placeholder: 'Ett namn, eller en tanke …',
    hint: 'Det du skriver stannar här, på din skärm.',
    respond: (t) => (t ? 'Fint. Kanske värt en rad i kalendern redan i dag? ”Senare” har en tendens att bli väldigt senare.' : 'Helt okej. Frågan får följa med dig ändå.'),
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
      ? 'Här kunde du spola tillbaka till 07:30. I verkligheten får du en ny chans varje morgonmöte – och nu vet du vad en enda mening kan göra.'
      : 'Det berodde på ett beslut kl 07:30. I morgon är det du som sitter på morgonmötet.',
  });
  return steps;
}

/* =====================================================================
   ULRIKAS DAG – spår 2 ”Vi löser det”
   Samma motor som Olas dag: ett kritiskt val (08:30), sidohändelser på spår A,
   en konsekvens (16:10), tillbakaspolning och en alternativ följd.
   Nytt här: signaler som deltagaren kan upptäcka (state.signals).
   ===================================================================== */
const U_BAD = ['vilosa', 'nasta'];
const U_GOOD = ['flytta', 'vidare'];
const U_OPTIONS = [
  { id: 'vilosa', label: '”Vi löser det. Alla får hjälpas åt lite extra.”' },
  { id: 'nasta',  label: '”Vi tar prioriteringarna på nästa veckas planeringsmöte.”' },
  { id: 'flytta', label: '”Om det här ska in behöver något annat flyttas. Vi tittar på vad som faktiskt ryms.”' },
  { id: 'vidare', label: '”Jag tar frågan om tidsplanen vidare i dag. Tills dess lägger vi inte på fler uppgifter.”' },
];
const U_SAID = Object.fromEntries(U_OPTIONS.map((o) => [o.id, o.label]));
const U_SIGNALS = {
  s1: { time: '07:05', text: 'mejlet som skickades 23:48' },
  s2: { time: '11:10', text: 'lappen på Emmas skärm' },
  s3: { time: '15:00', text: 'Emmas tomma stol' },
  s4: { time: '15:40', text: 'att Emma satt kvar sent igen' },
};
// sidohändelsernas repliker beror på vad Ulrika svarade först kl 08:30
// Emma
const EMMA = 'assets/people/emma.webp';
const uSide = (s, vilosa, nasta) => (s.choices.A === 'nasta' ? nasta : vilosa);

const ULRIKA_NODES = [
  /* ------------------------------------------------------------ 07:05 */
  {
    id: 'u0705', prop: 'assets/props/mobil.webp', time: '07:05', title: 'Ett sent mejl', kind: 'film', lane: 'main',
    env: 'kok', place: 'Köket',
    async play(api) {
      api.clock('07:05');
      api.loop('room');
      await api.title('07:05', 'Köket');
      // köket i bakgrunden tonas ner, och mejlet från Emma glider fram som hela scenen
      api.phone();
      await api.wait(700);
      api.phoneNotify({
        app: 'Mejl', from: 'Emma Lind', subject: 'Re: Leveransen', stamp: 'Skickat 23:48',
        text: 'Jag tror vi får ihop leveransen ändå. Jag tittar på resten i morgon bitti!',
        signal: { id: 's1', line: 'Skickat 23:48. Emma jobbade sent igår.' },
      });
      await api.wait(1600);
      await api.say('Emma. Alltid på hugget.', { who: 'Ulrika', inner: true });
      await api.say('Den nya leveransen får vi ta på teammötet halv nio. Det löser sig.', { who: 'Ulrika', inner: true });
      await api.wait(1800);
      api.unphone();
      await api.wait(500);
      api.stopLoop('room');
    },
  },


  /* ------------------------------------------------------------ 07:45 */
  {
    id: 'u0745', prop: 'assets/props/kopp.webp', time: '07:45', title: 'Kaffe, te eller vatten', kind: 'pink', lane: 'main',
    env: 'fika', place: 'Fikarummet',
    async play(api) {
      api.clock('07:45');
      api.loop('room');
      await api.title('07:45', 'På jobbet');
      const pick = await api.choose({
        prompt: 'Vad blir det i koppen i dag?',
        options: [{ id: 'kaffe', label: 'Kaffe' }, { id: 'te', label: 'Te' }, { id: 'vatten', label: 'Ett glas vatten' }],
        kind: 'pink',
        hotspot: { x: 27, y: 52, w: 12, h: 18, id: 'kaffe', label: 'Ta koppen' },
      });
      api.state.drink = pick;
      await api.say({
        kaffe: 'Kaffe. Dagens första möte kräver det.',
        te: 'Te med honung. En liten paus innan allt drar i gång.',
        vatten: 'Vatten. Kaffet får vänta till efter mötet.',
      }[pick], { who: 'Ulrika', inner: true });
      api.stopLoop('room');
    },
  },

  /* ------------------------------------------------------------ 08:30 */
  {
    id: 'u0830', prop: 'assets/props/whiteboard.webp', time: '08:30', title: 'Teammötet', kind: 'blue', badge: 'A', lane: 'main', critical: true,
    env: 'mote', place: 'Mötesrummet',
    async play(api) {
      const replay = !!api.state.rewound;
      api.clock('08:30');
      api.loop('room');
      api.cinematic(true);
      await api.title('08:30', replay ? 'Teammötet – igen' : 'Teammötet');
      await api.say('Kunden vill ha den nya leveransen före månadsskiftet. Den går före det mesta nu.', { who: 'Ulrika' });
      await api.say('Före allt? Vi har ju redan testerna och kvartalsrapporten.', { who: 'Samir' });
      await api.say('Ska vi fortfarande hinna med allt vi redan har planerat?', { who: 'Emma' });
      await api.say('Nästa möte börjar om en minut. Alla tittar på dig.', { narrator: true });
      api.cinematic(false);

      let pick;
      if (!replay) {
        pick = await api.choose({
          prompt: 'Vad säger Ulrika?',
          // första gången finns bara de två frestande svaren – de bättre dyker upp efter tillbakaspolningen
          options: U_OPTIONS.filter((o) => U_BAD.includes(o.id)), kind: 'key', badge: 'A',
          timer: 14, timeoutId: 'vilosa', timerLabel: 'Nästa möte börjar…',
        });
        if (api.lastTimedOut) await api.say('Tiden rinner iväg, och Ulrika säger det som känns lugnast i stunden: ”Vi löser det.”', { narrator: true });
      } else {
        const tried = new Set(api.state.triedA || []);
        while (true) {
          pick = await api.choose({
            prompt: 'Nu vet du hur Emmas dag slutade. Vad säger Ulrika den här gången?',
            options: U_OPTIONS.map((o) => ({
              ...o,
              tag: tried.has(o.id) ? 'Ditt första svar' : U_GOOD.includes(o.id) ? 'Nytt' : '',
              fresh: U_GOOD.includes(o.id),
            })),
            kind: 'key', badge: 'A',
          });
          if (U_GOOD.includes(pick)) break;
          tried.add(pick);
          api.sfx('memory');
          await api.say('Hmm, det låter som i morse – och vi vet hur eftermiddagen blev då. Vad behöver Emma höra för att veta vad som är viktigast?', { who: 'Ulrika', inner: true });
        }
      }
      api.state.choices.A = pick;
      api.state.triedA = [...new Set([...(api.state.triedA || []), pick])];
      if (!api.state.firstA) api.state.firstA = pick;

      const replies = {
        vilosa: ['Några nickar. Emma ler lite och skriver något i sitt block.', 'Okej, vi kör!', 'Samir'],
        nasta: ['Emma nickar långsamt.', 'Okej. Så tills dess kör vi på allt?', 'Emma'],
        flytta: ['Det blir tyst en sekund. Sen pekar Samir på tavlan.', 'Kvartalsrapporten kan vänta en vecka. Då ryms leveransen.', 'Samir'],
        vidare: ['Emma andas ut.', 'Bra. Då lägger vi inte på något nytt förrän du hört av dig.', 'Emma'],
      }[pick];
      await api.say(replies[0], { narrator: true });
      await api.say(replies[1], { who: replies[2] });
      await api.memory('Det här valet följer med resten av dagen.', 'A');
      api.stopLoop('room');
    },
  },

  /* ------------------------------------------------------------ 09:05 */
  {
    id: 'u0905', prop: 'assets/props/prat.webp', time: '09:05', title: 'Har du två minuter?', kind: 'blue', badge: 'B', lane: 'main',
    env: 'korridor', place: 'Korridoren',
    async play(api) {
      api.clock('09:05');
      await api.title('09:05', 'Korridoren');
      api.overlay('person', { src: EMMA, x: 62, bottom: 4, h: 74 });
      await api.say('Du är redan sen till ledningsgruppen.', { narrator: true });
      await api.say('Ulrika! Har du två minuter? Det gäller leveransen…', { who: 'Emma' });
      const pick = await api.choose({
        prompt: 'Vad gör Ulrika?',
        options: [
          { id: 'stanna', label: 'Stannar', sub: 'Två minuter går väl' },
          { id: 'sen', label: '”Vi tar det sen!”', sub: 'Skyndar vidare' },
        ],
        kind: 'key', badge: 'B',
      });
      api.state.choices.B = pick;
      if (pick === 'stanna') {
        await api.say('Klart, två minuter.', { who: 'Ulrika' });
        await api.say('Det är bara… det är mycket nu.', { who: 'Emma' });
        await api.say('Mer hinner hon inte säga innan Ulrikas telefon plingar. Mötet har börjat.', { narrator: true });
      } else {
        await api.say('Vi tar det sen!', { who: 'Ulrika' });
        await api.say('…okej.', { who: 'Emma', small: true });
      }
      await api.memory('Emma kommer ihåg det här – på ett eller annat sätt.', 'B');
    },
  },

  /* ------------------------------------------------------------ 10:20 */
  {
    id: 'u1020', prop: 'assets/props/projektmote.webp', time: '10:20', title: 'Projektmötet', kind: 'film', lane: 'main',
    env: 'mote', envVariant: 'dark', place: 'Projektrummet', cinematic: true,
    async play(api) {
      api.clock('10:20');
      await api.title('10:20', 'Projektmötet');
      await api.say('Stort tack till ditt team, Ulrika. Att ni kan ta leveransen nu betyder mycket för kunden.', { who: 'Patrik, projektledare' });
      await api.say(api.state.choices.A === 'nasta'
        ? 'Och prioriteringarna tar ni nästa vecka? Perfekt, då rullar allt på tills dess.'
        : 'Jag hörde att alla ställer upp lite extra. Det är precis den andan vi behöver.', { who: 'Patrik, projektledare' });
      await api.say('Jag sa väl inte riktigt att vi skulle ta allt. Eller gjorde jag det?', { who: 'Ulrika', inner: true });
    },
  },

  /* ------------------------------------------------------------ 11:10 (A) */
  {
    id: 'u1110', prop: 'assets/props/skrivbord.webp', time: '11:10', title: 'Emmas skrivbord', kind: 'side', badge: 'A', lane: 'side', track: 'A',
    env: 'kontor', place: 'Kontorslandskapet', cinematic: true,
    async play(api) {
      api.clock('11:10');
      api.overlay('note', '<s>Testplan</s><br><s>Kundmöte</s><br><s>Rapport</s><br>+ Leverans<br>+ Demo<br>Klart till fredag?!');
      api.signal({ id: 's2', x: 73.5, y: 36, w: 9, h: 16, line: '”Klart till fredag?!” Tre uppgifter är överstrukna, två nya har skrivits till.' });
      await api.title('11:10', 'Emmas skrivbord');
      await api.say('Emmas plats är tom. Hon är på väg till ännu ett möte.', { narrator: true });
      await api.say(uSide(api.state,
        'Emma tog den också. Hon brukar ju alltid få ihop det.',
        'Emma tog den också. Prioriteringarna kommer ju först nästa vecka.'), { who: 'Linn' });
      await api.wait(2200);
    },
  },

  /* ------------------------------------------------------------ 12:00 */
  {
    id: 'u1200', prop: 'assets/props/mikro.webp', time: '12:00', title: 'Lunch', kind: 'pink', lane: 'main',
    env: 'lunch', place: 'Lunchrummet',
    async play(api) {
      api.clock('12:00');
      api.loop('room');
      await api.title('12:00', 'Lunch');
      const pick = await api.choose({
        prompt: 'Var äter Ulrika i dag?',
        options: [
          { id: 'kollegor', label: 'Med kollegorna' },
          { id: 'skrivbord', label: 'Vid skrivbordet' },
          { id: 'ute', label: 'Ute en sväng' },
        ],
        kind: 'pink',
      });
      api.state.lunch = pick;
      await api.say({
        kollegor: 'Samtalet handlar mest om leveransen. Alla verkar ha fullt upp.',
        skrivbord: 'En macka vid tangentbordet. Tre mejl hinner besvaras.',
        ute: 'Ett varv runt kvarteret. Huvudet blir lite klarare.',
      }[pick], { who: 'Ulrika', inner: true });
      api.stopLoop('room');
    },
  },

  /* ------------------------------------------------------------ 12:25 (A) */
  {
    id: 'u1225', prop: 'assets/props/fika.webp', time: '12:25', title: 'I fikarummet', kind: 'side', badge: 'A', lane: 'side', track: 'A',
    env: 'fika', place: 'Fikarummet', cinematic: true,
    async play(api) {
      api.clock('12:25');
      api.loop('room');
      await api.title('12:25', 'I fikarummet');
      await api.say('Har ni sett hur mycket som ligger på oss nu?', { who: 'Samir' });
      await api.say(uSide(api.state,
        'Ulrika sa att alla skulle hjälpas åt lite extra. Så det är väl bara att köra.',
        'Vi får vänta till planeringsmötet. Tills dess kör vi på som vanligt.'), { who: 'Linn' });
      await api.say('Ingen frågar vad som kan vänta.', { narrator: true });
      api.stopLoop('room');
    },
  },

  /* ------------------------------------------------------------ 13:30 */
  {
    id: 'u1330', prop: 'assets/props/inkorg.webp', time: '13:30', title: 'Inkorgen', kind: 'blue', badge: 'C', lane: 'main',
    env: 'kontor', place: 'Ulrikas kontor',
    async play(api) {
      api.clock('13:30');
      await api.title('13:30', 'Inkorgen');
      await api.say('Tre saker samtidigt. I vilken ordning tar Ulrika hand om dem?', { narrator: true });
      await api.hotspot({ x: 38.5, y: 68, w: 5, h: 6.5, label: 'Öppna inkorgen' });
      const order = await api.mailSort([
        { id: 'patrik', from: 'Patrik (projektledare)', subject: 'Statusrapport leveransen', preview: 'Kan du skicka en kort status före 15? Kunden frågar.' },
        { id: 'emma', from: 'Emma Lind', subject: 'Var börjar jag?', preview: 'Jag vet inte riktigt vad jag ska börja med längre.' },
        { id: 'linn', from: 'Linn', subject: 'Ny arbetsfördelning – godkänn?', preview: 'Jag har gjort ett förslag på vem som tar vad. Kan du godkänna?' },
      ]);
      api.state.choices.C = order;
      if (order[0] === 'emma') {
        await api.say('Ulrika svarar Emma med tre rader: vad som är viktigast, vad som kan vänta och att de ses i morgon.', { narrator: true });
        api.notify({ app: 'Chatt', from: 'Emma', stamp: '13:42', text: 'Tack, nu vet jag var jag ska börja.' });
        await api.wait(2600);
        api.unnotify();
      }
      if (order[0] === 'linn') {
        api.state.quickApprove = true;
        await api.say('Ulrika godkänner den nya arbetsfördelningen. Den ser rimlig ut, vid en första anblick.', { narrator: true });
      }
      await api.memory('Inkorgen är sorterad. Vi får se vad som hinner ikapp.', 'C');
    },
  },

  /* ------------------------------------------------------------ 14:20 (A) */
  {
    id: 'u1420', prop: 'assets/props/motesbord.webp', time: '14:20', title: 'Risken som inte lyfts', kind: 'side', badge: 'A', lane: 'side', track: 'A',
    env: 'mote', envVariant: 'dim', place: 'Mötesrummet', cinematic: true,
    async play(api) {
      api.clock('14:20');
      api.loop('room');
      await api.title('14:20', 'Mötesrummet');
      await api.say('Något mer innan vi rundar av?', { who: 'Patrik, projektledare' });
      await api.say(uSide(api.state,
        'Jag tänkte säga något om tidsplanen, men vi har ju redan bestämt att vi ska lösa det.',
        'Jag tänkte säga något om tidsplanen, men det ska ju upp nästa vecka ändå.'), { who: 'Samir', inner: true });
      await api.say('Risken nämns inte. Mötet slutar fem minuter tidigt.', { narrator: true });
      api.stopLoop('room');
    },
  },

  /* ------------------------------------------------------------ 15:00 */
  {
    id: 'u1500', prop: 'assets/props/tom-stol.webp', time: '15:00', title: 'Avstämningen', kind: 'film', lane: 'main',
    env: 'mote', place: 'Mötesrummet', cinematic: true,
    async play(api) {
      api.clock('15:00');
      api.loop('room');
      await api.title('15:00', 'Avstämningen');
      const b = api.state.choices.B;
      api.signal({ id: 's3', x: 73, y: 51, w: 14, h: 12, line: 'Emma brukar aldrig missa en avstämning.' });
      await api.say('Avstämningen börjar. Emmas stol står tom.', { narrator: true });
      if (b === 'stanna') {
        api.notify({ app: 'Chatt', from: 'Emma', stamp: '15:02', text: 'Förlåt, jag missade avstämningen. Sitter fast med leveransen.' });
        await api.wait(1500);
      }
      await api.say('Då kör vi utan Emma i dag.', { who: 'Ulrika' });
      await api.wait(2200);
      api.unnotify();
      api.stopLoop('room');
    },
  },

  /* ------------------------------------------------------------ 15:40 */
  {
    id: 'u1540', prop: 'assets/props/kopp.webp', time: '15:40', title: 'En kvart över', kind: 'pink', lane: 'main',
    env: 'kontor', place: 'Ulrikas kontor',
    async play(api) {
      api.clock('15:40');
      await api.title('15:40', 'En kvart över');
      const order = api.state.choices.C || [];
      if (order[order.length - 1] === 'emma') {
        // Emmas meddelande hamnade sist i inkorgen kl 13:30
        api.notify({ app: 'Chatt', from: 'Emma', stamp: '15:38', text: 'Glöm det, jag löser det.' });
        await api.wait(1400);
        await api.say('Hon låter kortare än vanligt.', { who: 'Ulrika', inner: true });
        api.unnotify();
      }
      const pick = await api.choose({
        prompt: 'Ulrika får en kvart över. Vad gör hon?',
        options: [
          { id: 'kaffe', label: 'Hämtar kaffe' },
          { id: 'promenad', label: 'Tar en promenad' },
          { id: 'smaprat', label: 'Småpratar med Linn' },
        ],
        kind: 'pink',
      });
      api.state.break = pick;
      if (pick === 'smaprat') {
        await api.say('Hur går det för er?', { who: 'Ulrika' });
        await api.say('Det rullar. Fast Emma satt kvar när jag gick igår. Igen.', { who: 'Linn' });
        api._foundSignal('s4', '”Emma satt kvar när jag gick igår. Igen.”');
        await api.wait(1600);
      } else {
        await api.say(pick === 'kaffe' ? 'En kopp kaffe i lugn och ro. Fem minuter utan skärm.' : 'Ett varv runt huset. Luften gör gott.', { who: 'Ulrika', inner: true });
      }
    },
  },

  /* ------------------------------------------------------------ 16:10 */
  {
    id: 'u1610', prop: (s) => (s.track === 'A' ? 'assets/props/stangd-laptop.webp' : 'assets/props/vinka.webp'), time: '16:10', kind: 'blue', lane: 'main',
    badge: (s) => (s.track === 'A' ? 'A' : 'A2'),
    title: (s) => (s.track === 'A' ? 'Emma har åkt hem' : 'Emma på väg hem'),
    env: (s) => (s.track === 'A' ? 'motesrum-kvall' : 'korridor'),
    envVariant: (s) => (s.track === 'A' ? '' : 'warm'),
    place: (s) => (s.track === 'A' ? 'Mötesrummet' : 'Korridoren'),
    async play(api) {
      const s = api.state;
      api.clock('16:10');
      api.loop('room');
      if (s.track === 'A') {
        await api.title('16:10', 'Mötesrummet');
        await api.say('Ulrika letar efter Emma inför i morgon. Mötesrummet är tomt. Emmas dator står kvar, stängd.', { narrator: true });
        await api.say('Emma har åkt hem. Hon fick hjärtklappning och kunde inte andas ordentligt.', { who: 'Linn' });
        await api.say('Hon sa att hon inte vet hur hon ska få ihop det här längre.', { who: 'Linn' });
        api.sfx('heartbeat');
        await api.say('Ulrika ringer Emma.', { narrator: true });
        await api.say('Förlåt. Jag har försökt få ihop allt, men jag vet inte längre vad som är viktigast.', { who: 'Emma, i telefon' });
        if ((s.choices.C || [])[0] === 'emma') await api.say('Ditt svar i inkorgen hjälpte. Men det var för mycket ändå.', { who: 'Emma, i telefon' });
        await api.say('Varför sa du inget?', { who: 'Ulrika' });
        await api.say(s.choices.A === 'nasta'
          ? 'Jag försökte ju. Men jag tänkte att det fick vänta till nästa vecka.'
          : 'Jag försökte ju. Men jag tänkte att du hade sagt att vi skulle lösa det.', { who: 'Emma, i telefon' });
        const meet = await api.choose({
          prompt: 'Vad säger Ulrika till Emma?',
          options: [
            { id: 'lyssna', label: 'Frågar hur hon mår', sub: 'Och lyssnar' },
            { id: 'forslag', label: 'Lovar att lösa leveransen', sub: '”Tänk inte på det nu”' },
            { id: 'vila', label: 'Säger att hon ska vila', sub: 'Och höra av sig i morgon' },
          ],
          kind: 'key',
        });
        s.meet = meet;
        if (meet === 'lyssna') {
          await api.say('Hur mår du nu, Emma?', { who: 'Ulrika' });
          await api.say('Lite bättre. Det är skönt att du ringer.', { who: 'Emma, i telefon' });
        } else if (meet === 'forslag') {
          await api.say('Tänk inte på leveransen nu. Vi löser det.', { who: 'Ulrika' });
          await api.say('Ulrika hör själv hur det låter. Samma tre ord som i morse.', { narrator: true });
        } else {
          await api.say('Vila nu. Hör av dig i morgon, när du orkar.', { who: 'Ulrika' });
          await api.say('Okej. Förlåt.', { who: 'Emma, i telefon' });
          await api.say('Du har inget att be om förlåtelse för.', { who: 'Ulrika' });
        }
        api.notify({ app: 'Chatt', from: 'Patrik (projektledare)', stamp: '16:24', text: 'Hörde att Emma gått hem. Hinner ni leveransen till fredag?' });
        await api.wait(1800);
        api.unnotify();
        api.stopLoop('room');
        await api.say('Emma blir sjukskriven resten av veckan. Leveransen hinns inte.', { narrator: true, big: true });
        await api.wait(500);
        await api.say(s.choices.A === 'nasta' ? '”Vi tar prioriteringarna nästa vecka.”' : '”Vi löser det. Alla får hjälpas åt lite extra.”', { who: 'Ulrika, i morse', small: true });
        await api.say('Ingen enskild mening gjorde det här. Men ingen sa heller vad som fick vänta.', { narrator: true });
        await api.bigQuestion('Vad hade hänt om frågan på morgonen fått ett annat svar?');
        s.accident = true;
      } else {
        api.overlay('person', { src: EMMA, x: 60, bottom: 4, h: 74 });
        await api.title('16:10', 'Korridoren');
        if (s.choices.A === 'vidare') {
          await api.say('Tack för att du tog frågan vidare. Skönt att det inte bara hänger på oss.', { who: 'Emma' });
          await api.say('Jag hör av mig när jag har svar, senast i morgon.', { who: 'Ulrika' });
          await api.say('Bra. Då vet jag vad jag inte behöver göra i kväll.', { who: 'Emma' });
        } else {
          await api.say('Tack för att du tog den där diskussionen. Skönt att rapporten fick flytta.', { who: 'Emma' });
          await api.say('Vi får följa upp hur det fungerar i morgon.', { who: 'Ulrika' });
          await api.say('Ja. Men nu vet jag åtminstone vad jag inte behöver göra i kväll.', { who: 'Emma' });
        }
        await api.say('Problemet är inte helt löst. Men förutsättningarna har förändrats.', { narrator: true });
        api.stopLoop('room');
      }
    },
  },

  /* ------------------------------------------------------------ Hemfärden */
  {
    id: 'uend', prop: 'assets/props/hus.webp', time: 'Dagens slut', title: 'På väg hem', kind: 'green', lane: 'main',
    env: 'bil', envVariant: 'dusk', place: 'På väg hem',
    async play(api) {
      const s = api.state;
      api.clock('17:05');
      api.loop('car');
      api.cinematic(true);
      await api.title('17:05', 'På väg hem');
      await api.say('Jag försökte skapa lugn. Men vad hörde de andra egentligen?', { who: 'Ulrika', inner: true });
      await api.say(s.accident
        ? 'Ett ”vi löser det” blev till att Emma försökte lösa allt. Ensam. Nu är hon hemma.'
        : 'Ett tydligt besked om vad som får vänta. Det var det som behövdes.', { who: 'Ulrika', inner: true });
      await api.say('Ta en stund och tänk tillbaka på din dag.', { narrator: true });
      api.cinematic(false);
      s.reflection = await api.reflect(buildUlrikaReflection(s));
      api.stopLoop('car');
    },
  },
];

function buildUlrikaReflection(s) {
  const steps = [];
  const rewound = U_BAD.includes(s.firstA);
  const order = s.choices.C || [];
  const mailName = { patrik: 'Patriks statusrapport', emma: 'Emmas fråga', linn: 'Linns arbetsfördelning' };
  const possible = Object.keys(U_SIGNALS);
  const seen = possible.filter((k) => (s.signals || []).includes(k));
  const missed = possible.filter((k) => !seen.includes(k));
  const seenTxt = `Du såg ${seen.length} av ${possible.length} signaler under dagen.`;
  const list = (ks) => ks.map((k) => `${U_SIGNALS[k].text} (${U_SIGNALS[k].time})`).join(', ');

  /* 1. Din dag */
  steps.push({
    type: 'recap', eyebrow: 'Din dag', title: 'Så här blev dagen',
    items: [
      { time: '06:00', text: s.snooze ? `Du snoozade ${s.snooze} ${s.snooze === 1 ? 'gång' : 'gånger'}.` : 'Du gick upp direkt.' },
      rewound
        ? { time: '08:30', was: `Först: ${U_SAID[s.firstA]}`, text: `Andra gången: ${U_SAID[s.choices.A]}`, key: true }
        : { time: '08:30', text: `Du sa: ${U_SAID[s.choices.A]}`, key: true },
      { time: '09:05', text: { stanna: 'Du stannade två minuter för Emma – men det blev aldrig mer än så.', sen: '”Vi tar det sen!” – mötet kändes mer akut.' }[s.choices.B] },
      order.length && { time: '13:30', text: `I inkorgen började du med ${mailName[order[0]]}.${order[order.length - 1] === 'emma' ? ' Emmas fråga fick vänta längst.' : ''}` },
      s.quickApprove && { time: '13:30', text: 'Du godkände den nya arbetsfördelningen direkt. Vem fick mer att göra i den?' },
      { time: '15:00', text: 'Emma var inte med på avstämningen.' },
      rewound
        ? { time: '16:10', was: 'Först: Emma åkte hem och blev sjukskriven. Leveransen hanns inte.', text: 'Andra gången: Emma gick hem med en plan.', key: true }
        : { time: '16:10', text: 'Emma gick hem med en plan.', key: true },
      { time: '★', text: seenTxt, key: true },
    ].filter(Boolean),
  });

  /* 2. Varför kändes det rätt? */
  if (rewound) {
    steps.push({
      type: 'choice', id: 'orsak', eyebrow: 'Kl 08:30',
      question: `Första gången sa du ${U_SAID[s.firstA]} Det säger många chefer i stunden. Vad tror du gör att det känns rätt?`,
      hint: 'Det finns inga rätt eller fel svar här. Välj det som känns närmast.',
      options: [
        { id: 'lugn', label: 'Jag ville skapa lugn' },
        { id: 'tid', label: 'Det fanns ingen tid att reda ut det' },
        { id: 'team', label: 'Teamet brukar lösa det' },
        { id: 'mandat', label: 'Det kändes inte som mitt beslut att ändra planen' },
      ],
      respond: (id) => ({
        lugn: 'Viljan att skapa lugn är fin. Men lugn kommer oftare av tydlighet än av peppning: att veta vad som får vänta.',
        tid: 'En minut räcker långt. ”Vad kan vi flytta?” är en kort fråga – och den sparar timmar senare under dagen.',
        team: 'Ett team som brukar lösa allt är ofta det team som tar på sig mest. Det är just där det är lätt att missa när det blir för mycket.',
        mandat: 'Då är det viktigt att ta frågan vidare. Det är också ett besked: ”Vi lägger inte på mer förrän jag har svar.”',
      }[id]),
    });
  }

  /* 3. Signalerna */
  steps.push({
    type: 'text', id: 'signal', eyebrow: 'Signalerna',
    question: !missed.length
      ? 'Du såg alla fyra signalerna. Vilken av dem hade du kunnat agera på tidigare – och hur?'
      : `Du såg ${seen.length} av ${possible.length} signaler. Det som gick förbi: ${list(missed)}. Vilken signal hade du kunnat uppmärksamma tidigare?`,
    placeholder: 'En signal, eller en tanke …',
    hint: 'Det du skriver stannar här, på din skärm.',
    respond: (t) => (t ? 'Bra. Signaler syns sällan i ett schema – de syns i korridoren, i tidsstämplar och i tomma stolar.' : 'Helt okej. Frågan får följa med dig ändå.'),
  });

  /* 4. Uppmuntran eller förutsättningar */
  steps.push({
    type: 'choice', id: 'uppmuntran', eyebrow: 'Uppmuntran',
    question: 'Vad är skillnaden mellan uppmuntran och rimliga förutsättningar?',
    hint: 'Välj det som ligger närmast hur du tänker.',
    options: [
      { id: 'hur', label: 'Uppmuntran säger att vi klarar det – förutsättningar säger hur' },
      { id: 'bada', label: 'Man behöver båda, men i rätt ordning' },
      { id: 'osaker', label: 'Jag är inte säker – de flyter ihop' },
    ],
    respond: (id) => ({
      hur: 'Precis. ”Vi löser det” är uppmuntran. ”Rapporten får vänta en vecka” är en förutsättning.',
      bada: 'Ja. Först beskedet om vad som får vänta – sedan peppningen. Då landar den på rätt sätt.',
      osaker: 'Det gör de för många. Ett enkelt test: kan någon i teamet efteråt säga vad hen inte behöver göra?',
    }[id]),
  });

  /* 5. Själv eller vidare */
  steps.push({
    type: 'choice', id: 'mandat', eyebrow: 'Ditt mandat',
    question: 'När behöver du prioritera själv, och när behöver frågan tas vidare?',
    hint: 'Det finns inga rätt eller fel svar här.',
    options: [
      { id: 'sjalv', label: 'Jag prioriterar oftast själv' },
      { id: 'vidare', label: 'Jag tar ofta frågan vidare' },
      { id: 'vet', label: 'Det beror på – och jag vet oftast var gränsen går' },
      { id: 'svart', label: 'Det är svårt att veta var gränsen går' },
    ],
    respond: (id) => ({
      sjalv: 'Bra – du använder ditt mandat. Kom ihåg att säga högt vad som får vänta, så att teamet vet.',
      vidare: 'Bra – du ser när något är större än teamet. Ge gärna ett besked under tiden: vad gäller tills svaret kommer?',
      vet: 'Skönt. Dela gärna den gränsen med teamet, så att de också vet när de kan säga till.',
      svart: 'Det är vanligt. En tumregel: om något måste flyttas och det påverkar andra än ditt team – ta det vidare samma dag.',
    }[id]),
  });

  /* 6. Krav och resurser */
  steps.push({
    type: 'takeaways', eyebrow: 'Att ta med sig', title: 'Krav och resurser',
    items: [
      { lead: 'När kraven ökar', text: 'behöver resurserna följa med: tid, tydliga prioriteringar och stöd.' },
      { lead: 'Du kan flytta, stryka eller lyfta.', text: 'Som chef är det ofta du som har mandatet – eller vet vem som har det.' },
      { lead: 'Uppmuntran räcker inte ensam.', text: 'Den ersätter inte ett besked om vad som får vänta.' },
    ],
  });

  /* 7. Mitt åtagande */
  steps.push({
    type: 'commit', id: 'atagande', eyebrow: 'Mitt åtagande',
    question: 'Vad vill du göra annorlunda nästa gång?',
    hint: 'Välj ett eller flera – eller skriv med egna ord.',
    options: [
      'När något nytt tillkommer frågar jag vad som kan flyttas.',
      'Jag följer upp en signal med en bokad tid.',
      'Jag säger högt vad som inte behöver göras.',
      'Jag tar frågor om tidsplanen vidare samma dag.',
    ],
    ownPlaceholder: 'Mitt eget åtagande …',
  });

  /* 8. Avslut */
  steps.push({
    type: 'closing', eyebrow: '17:42',
    title: 'Emma vet vad hon inte behöver göra i kväll.',
    text: rewound
      ? 'Här kunde du spola tillbaka till 08:30. I verkligheten får du en ny chans på varje teammöte – och nu vet du hur ett ”vi löser det” kan låta för den som redan har fullt.'
      : 'Det berodde på ett besked kl 08:30. I morgon är det du som leder teammötet.',
  });
  return steps;
}

/* =====================================================================
   DAGARNA – inställningar som motorn läser (vilket val som är kritiskt,
   var konsekvensen ligger, vad som spolas tillbaka osv.)
   ===================================================================== */
STORY.days = {
  ola: {
    id: 'ola', own: false, nodes: STORY.nodes,
    critical: 'n0730', consequence: 'n1614', end: 'nend', overview: 'n1324', sideFocus: 'n1223',
    bad: BAD_A, chain: ['n1614', 'n1402', 'n1223', 'n1115', 'n0730'],
    healedText: 'Olyckan inträffade aldrig.', endBanner: 'Din dag – rak och olycksfri.', reportHead: 'Skiftrapport · Linje 3',
    agenda: [
      { t: '07:30', d: 30, title: 'Dagligt möte – linje 3', color: 'blue' },
      { t: '10:15', d: 60, title: 'Produktionsmöte, chefer', color: 'purple' },
      { t: '12:00', d: 30, title: 'Lunch', color: 'grey' },
      { t: '13:00', d: 60, title: 'Mail & admin', color: 'grey' },
      { t: '14:30', d: 60, title: 'Budgetmöte', color: 'blue' },
      { t: '14:30', d: 45, title: 'Avstämning underhåll', color: 'green', clash: true },
    ],
    agendaLine: 'Fullbokat. Som vanligt.',
    // korta rader till slutvyn
    summary: (s) => [
      BAD_A.includes(s.firstA) ? `Kl 07:30 blev det först ${SAID[s.firstA]} Andra gången: ${SAID[s.choices.A]}` : `Kl 07:30 sa du ${SAID[s.choices.A]}`,
      'Den nyanställde hann till förskolan.',
    ],
    dev(state, qs, past) {
      if (past('n0803')) state.choices.B = qs.get('b') || 'motet';
      if (past('n1324')) state.choices.C = ['rapport', 'kim', 'aw'];
    },
  },
  ulrika: {
    id: 'ulrika', own: true, nodes: [STORY.nodes[0], STORY.nodes[1], ...ULRIKA_NODES],
    critical: 'u0830', consequence: 'u1610', end: 'uend', overview: 'u1330', sideFocus: 'u1225',
    bad: U_BAD, chain: ['u1610', 'u1420', 'u1225', 'u1110', 'u0830'],
    healedText: 'Emma går hem med en plan.', endBanner: 'Din dag – rak och hanterbar.', reportHead: 'Skiftrapport · Utveckling',
    agenda: [
      { t: '08:30', d: 30, title: 'Teammöte – leveransen', color: 'blue' },
      { t: '09:05', d: 60, title: 'Ledningsgrupp', color: 'purple' },
      { t: '10:20', d: 40, title: 'Projektmöte med Patrik', color: 'purple' },
      { t: '12:00', d: 30, title: 'Lunch', color: 'grey' },
      { t: '13:30', d: 30, title: 'Mejl', color: 'grey' },
      { t: '14:20', d: 40, title: 'Riskgenomgång', color: 'green' },
      { t: '15:00', d: 30, title: 'Avstämning team', color: 'blue' },
      { t: '15:00', d: 30, title: 'Leverantörssamtal', color: 'green', clash: true },
    ],
    agendaLine: 'Teammöte, ledningsgrupp, projektmöte… och en dubbelbokning klockan tre.',
    summary: (s) => [
      U_BAD.includes(s.firstA) ? `Kl 08:30 blev det först ${U_SAID[s.firstA]} Andra gången: ${U_SAID[s.choices.A]}` : `Kl 08:30 sa du ${U_SAID[s.choices.A]}`,
      `Du såg ${(s.signals || []).length} av 4 signaler under dagen.`,
      'Emma gick hem med en plan.',
    ],
    dev(state, qs, past) {
      if (past('u0905')) state.choices.B = qs.get('b') === 'stanna' ? 'stanna' : 'sen';
      if (past('u1330')) state.choices.C = ['patrik', 'linn', 'emma'];
    },
  },
};
// personer utan egen dag (Tomas än så länge) spelar Olas dag med sitt eget namn
STORY.dayFor = (personaId) => STORY.days[personaId] || STORY.days.ola;

window.STORY = STORY;
window.BAD_A = BAD_A;
