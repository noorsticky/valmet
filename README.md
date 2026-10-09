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
   Det svar man valde förra gången är överstruket.
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
js/story.js       ALLT INNEHÅLL: noder, repliker, val, reflektionens steg
js/app.js         Motor: tidslinje, kamera, portal, scen-API, spola tillbaka
js/props.js       Föremålen på tidslinjens plattformar (low-poly-SVG)
js/audio.js       Syntetiserade ljud (WebAudio). Kan bytas mot riktiga ljudfiler
assets/video/     sovrum, kontor, fika, lunch, mote, korridor, larm (.mp4) (omkodade, utan ljudspår)
assets/people/    Tomas, Ola och Ulrika (transparenta bilder för spegeln, tidslinjen och HUD)
assets/img/       Stillbilder ur videorna + logo.png (tillfällig logga, utklippt ur kontorsfilmen)
```

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
- **Logga:** `assets/img/logo.png` är en tillfällig vit logga som är utklippt ur kontorsfilmen.
  Byt den mot den officiella filen, gärna den vita med grön pil.

### Byta en ritad miljö mot en riktig animation

De scener som saknar animation (bilen, maskinen kl 11:15 och spegeln) är
ritade i CSS som platshållare. När en riktig film finns:

1. Lägg filen i `assets/video/` och en stillbild i `assets/img/`.
2. Lägg till den i `VIDEO_ENVS` och `POSTERS` högst upp i `js/app.js`.
3. Sätt `env: '<namn>'` på noden i `story.js`.

### Utvecklarläge

- `?at=n1324` startar direkt vid en viss punkt. Tidigare punkter räknas som spelade.
- `?at=n1614&a=lugnt` startar vid olyckan (`a=skylt` ger den lyckliga versionen).
- På tangentbordet väljer siffrorna 1–4 alternativ, och mellanslag går vidare
  i repliker.
