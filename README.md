# Vår dag – Valmet

Spelifierad kurs i form av en tidslinje genom Olas arbetsdag. Varje punkt på
tidslinjen är en scen som användaren "hoppar in i". Kursen är en prototyp i ren
HTML/CSS/JS, så den behöver inget byggsteg.

## Kör lokalt

```bash
python3 -m http.server 8000
# öppna http://localhost:8000
```

Det går oftast också att öppna `index.html` direkt, men en lokal server ger
pålitligast videouppspelning. Typsnitten hämtas från Google Fonts. Utan nät
används systemtypsnitt.

## Upplevelsen

| Färg | Typ | Betydelse |
|---|---|---|
| Rosa | Vardagsval | Påverkar inget. Finns för engagemang (snooze, kaffe, lunch, 15 min över) |
| Blå | Beslut | Påverkar senare i kursen och sammanfattningen |
| Grå | Film | Cutscene. Svarta filmfält, ingen HUD, användaren tittar |
| Vit | Vid sidan av | Händer bara på spår **A** (om valet kl 07:30 blev fel) |
| Grön | Reflektion | Hemfärden i skymningen: reflektion steg för steg och eget åtagande |

**Flödet**

1. Användaren klickar på en punkt. Kameran zoomar in och scenen växer ut ur punktens
   cirkel ("portalen") till fullskärm. Ut ur scenen går det på samma sätt, fast baklänges.
2. Filmscener startar automatiskt efter en kort paus på tidslinjen. Spelscener
   kräver ett klick.
3. **07:30 Dagligt möte (A)** är det kritiska valet och har en tidsgräns. Första gången
   finns bara de felaktiga svaren: "Ta det lugnt men håll tempot uppe…" och "Vi avvaktar…".
   Om tiden tar slut väljs det första. Alla vägar leder därför till **spår A**: ett sidospår
   växer fram med 11:15, 12:23 och 14:02, och kl 16:14 går larmet.
4. Efter olyckan förs användaren tillbaka till tidslinjen. Kameran följer den
   röda kedjan bakåt och 07:30 blinkar. Ett klick spolar tillbaka (klockan räknas
   ner från 16:14 till 07:30) och användaren får välja om. Nu dyker de rätta svaren upp,
   markerade "Nytt": "Jag skriver en rapport direkt" och "Sätt upp en tydlig varningsskylt".
   Det svar man valde första gången är markerat "Ditt första svar".
5. När valet blir rätt löses sidohändelserna upp och tidslinjen blir rak. En grön
   ljuspuls går längs linjen och 16:14 blir **A2**.
6. **Reflektionen (hemfärden kl 17:05)** speglar morgonens bilfärd. Efter några tankar från Ola
   går användaren igenom ett kort i taget:
   1. **Din dag:** dagens val i ordning. Kl 07:30 visas både det första och det ändrade svaret.
   2. **Vad låg bakom?** Varför sa man först "håll tempot uppe"? Inget svar är rätt, och
      användaren får en reflekterande återkoppling på det hen väljer.
   3. **Känner du igen det?** En skala från 1 till 5 över hur ofta liknande val dyker upp i vardagen.
   4. **Vem väntar på dig?** En fråga som utgår från vad som hände med Lisa, med valfri fritext.
   5. **Tre saker från dagen.**
   6. **Mitt åtagande:** välj bland färdiga åtaganden och/eller skriv ett eget.
   7. **Avslut:** användarens åtaganden visas som citat.

   Innehållet finns i `buildReflection()` i `story.js`. Svaren sparas bara i webbläsarens minne
   under sessionen (`state.reflection`) och skickas ingenstans.

B och C påverkar också resten av dagen. Om Ola stannar för Lisa kl 08:03 bokas
ett möte kl 15:30, som dyker upp både i kalendern kl 14:30 och som ett val kl 15:30.

## Filer

```
index.html        Skal + UI-lager (HUD, filmfält, repliker, val, paneler)
css/style.css     All stil, inklusive de ritade miljöerna
css/theme-warm.css Varmt tema för startskärm och tidslinje (Google Sans, solljus som accent, dämpad salvia)
js/story.js       ALLT INNEHÅLL: noder, repliker, val, reflektionens steg – Olas dag och Ulrikas dag
js/app.js         Motor: tidslinje, kamera, portal, scen-API, spola tillbaka
js/props.js       Föremålen på tidslinjens plattformar (low-poly-SVG)
js/audio.js       Syntetiserade ljud (WebAudio). Kan bytas mot riktiga ljudfiler
assets/video/     sovrum, kontor, fika, lunch, mote, korridor, larm, bil (.mp4) (omkodade, utan ljudspår)
assets/props/     Renderade ikoner för tidslinjen (klocka, bil, kopp, whiteboard, laptop, hjälm, skrivbord, fika, kalender, mobil, larm, vinka, hus, prat, mikro)
assets/people/    Tomas, Ola och Ulrika (transparenta bilder för spegeln, tidslinjen och HUD)
assets/img/       Stillbilder ur videorna + Valmet-loggan (valmet-logo.svg och valmet-logo-white.svg med vit text för mörk bakgrund)
```

### Flera dagar

Varje person kan ha en egen dag. `STORY.days` i `js/story.js` talar om för motorn vilka
noder dagen har och vilket val som är det kritiska (`critical`), var konsekvensen ligger
(`consequence`) och vilka sidohändelser kedjan följer bakåt (`chain`). Punkterna 06:00 och
06:20 är gemensamma. Dagen byts när man väljer person i spegeln.

- **Olas dag** (dag B): kritiskt val 07:30, konsekvens 16:14.
- **Ulrikas dag** (dag A, spår 2 ”Vi löser det”): kritiskt val 08:30, konsekvens 16:10.
  Den har också fyra signaler som deltagaren kan upptäcka (`api.signal`, `api.notify`).
  Skiftrapporten visar hur många man såg.
- **Tomas** har ingen egen dag än. Han spelar Olas dag med sitt namn.

### Platshållare i Ulrikas dag

De här filerna är platshållare. Byt ut filen med samma namn och storlek så syns den riktiga bilden direkt:

- Ikoner (420×420 px, transparent webp): `assets/props/projektmote.webp` (10:20), `inkorg.webp` (13:30),
  `motesbord.webp` (14:20), `tom-stol.webp` (15:00), `stangd-laptop.webp` (16:10)
- Bakgrunder (1920×1080 jpg): `assets/img/kok.jpg` (07:05), `assets/img/motesrum-kvall.jpg` (16:10).
  När det finns en film: lägg den i `assets/video/` och namnet i `VIDEO_ENVS` i `js/app.js`.
- Emma (utklippt helfigur, transparent webp, ca 600×1400 px): `assets/people/emma.webp`.
  Hon står i scenerna 09:05 och 16:10 (efter rätt val).

### Vinkande personer i spegeln

Varje person i `STORY.personas` kan få en vinkfilm: lägg till `wave: 'assets/people/<namn>-vinkar.webm'`.
Den spelas upp när personen kliver fram i spegeln. Utan film gör personen en liten hälsningsrörelse.
Filmen bör vara en kort loop (2–3 sekunder), en bröstbild i samma vinkel som bilden och ha transparent
bakgrund (WebM med alfakanal).

### Redigera innehåll

Allt manus finns i `js/story.js`. En scen är en `async play(api)`-funktion:

```js
await api.title('07:30', 'Mötesrummet');          // titelkort
await api.say('Repliken', { who: 'Jonna' });      // replik (klick/mellanslag = nästa)
await api.say('Tanke', { who: 'Ola', inner: true });
const val = await api.choose({ prompt: '…', options: [{ id: 'a', label: '…' }], kind: 'pink' });
api.cinematic(true);                               // glid in i filmläge (filmfält, ingen HUD)
await api.memory('Lisa kommer att minnas det här.', 'B');
await api.hotspot({ x: 38, y: 68, w: 5, h: 6, label: 'Öppna inkorgen' }); // klickyta i videon (%)
```

Hotspots och klockdisplayen på väckarklockan ligger i videons koordinatsystem
(procent av 1920×1080). De följer alltså bilden oavsett skärmstorlek.

### Spegeln (06:20)

Användaren sveper mellan Tomas, Ola och Ulrika. Personen i mitten står spegelvänd i
glaset och de två andra syns vid sidorna. Det går också att använda pilknapparna,
namnflikarna eller vänster- och högerpil på tangentbordet. Manuset är skrivet för Ola.
När en annan person väljs byts namnet ut i alla texter, och för Ulrika byts även
han/honom/hans till hon/henne/hennes (`personalize()` i `app.js`).

### Tidslinjen

Tidslinjen är lodrät på mörkgrön botten. Varje punkt har en tidsetikett ("kl 06:00") och ett
föremål på en plattform, och de växlar mellan vänster och höger sida. Den aktiva punkten
lyser grönt. Spelade punkter tonas ner, och kommande punkter syns bara som skuggor.
När scenen öppnas växer den ut ur plattformen.

- **Föremål:** varje nod har `prop: '<namn>'` i `story.js`. Namnen finns i `js/props.js`.
  Vill ni använda egna 3D-renderingar, sätt `prop: 'assets/props/kopp.png'`
  (en PNG med transparent bakgrund, ungefär kvadratisk, där föremålet står längst ner).
- **Logga:** `assets/img/valmet-logo.svg` är originalet. `valmet-logo-white.svg` är samma logga med vit text, och den används på de mörka bakgrunderna.

### Byta en ritad miljö mot en riktig animation

De scener som saknar animation (maskinen kl 11:15 och spegeln) är
ritade i CSS som platshållare. När en riktig film finns:

1. Lägg filen i `assets/video/` och en stillbild i `assets/img/`.
2. Lägg till den i `VIDEO_ENVS` och `POSTERS` högst upp i `js/app.js`.
3. Sätt `env: '<namn>'` på noden i `story.js`.

### Utvecklarläge

- `?at=n1324` startar direkt vid en viss punkt. Tidigare punkter räknas som spelade.
- `?at=n1614&a=lugnt` startar vid olyckan (`a=skylt` ger den lyckliga versionen).
- `?p=ulrika&at=u1330&a=vilosa&b=sen` startar i Ulrikas dag. `a` är svaret 08:30
  (`vilosa`, `nasta`, `flytta`, `vidare`) och `b` är valet 09:05 (`stanna`, `sen`).
- På tangentbordet väljer siffrorna 1–4 alternativ, och mellanslag går vidare
  i repliker.
