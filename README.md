# Produktion och press – Valmet

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
| Blå (A/B/C/X) | Beslut | Påverkar senare i kursen och sammanfattningen |
| Grå | Film | Cutscene. Svarta filmfält, ingen HUD, användaren tittar |
| Vit | Vid sidan av | Händer bara på spår **A** (om valet kl 07:30 blev fel) |
| Grön | Sammanfattning | Kunskaper, dynamiska dilemmainsikter och commitlista |

**Flödet**

1. Användaren klickar på en punkt. Kameran zoomar in och scenen växer ut ur punktens
   cirkel ("portalen") till fullskärm. Ut ur scenen går det på samma sätt, fast baklänges.
2. Filmscener startar automatiskt efter en kort paus på tidslinjen. Spelscener
   kräver ett klick.
3. **07:30 Dagligt möte (A)** är det kritiska valet och har en tidsgräns.
   - "Ta det lugnt men håll tempot uppe…" eller "Vi avvaktar…" (eller att tiden
     tar slut) ger **spår A**: ett sidospår växer fram med 11:15, 12:23 och 14:02.
     Kl 16:14 går larmet.
   - "Jag skriver en rapport direkt" eller "Sätt upp en tydlig varningsskylt"
     ger **spår A2**: ingen olycka. Kl 16:14 är det mötet i korridoren.
4. Efter olyckan förs användaren tillbaka till tidslinjen. Kameran följer den
   röda kedjan bakåt och 07:30 blinkar. Ett klick spolar tillbaka (klockan räknas
   ner från 16:14 till 07:30) och användaren får välja om. Fel val stryks över.
5. När valet blir rätt löses sidohändelserna upp och tidslinjen blir rak. En grön
   ljuspuls går längs linjen och 16:14 blir **A2**.
6. Sammanfattningen bygger insikterna utifrån användarens faktiska val (A, B, C
   och snooze).

B och C påverkar också resten av dagen. Om Ola stannar för Lisa kl 08:03 bokas
ett möte kl 15:30, som dyker upp både i kalendern kl 14:30 och som ett val kl 15:30.

## Filer

```
index.html        Skal + UI-lager (HUD, filmfält, repliker, val, paneler)
css/style.css     All stil, inklusive de ritade miljöerna
js/story.js       ALLT INNEHÅLL: noder, repliker, val, sammanfattningslogik
js/app.js         Motor: tidslinje, kamera, portal, scen-API, spola tillbaka
js/props.js       Föremålen på tidslinjens plattformar (low-poly-SVG)
js/audio.js       Syntetiserade ljud (WebAudio). Kan bytas mot riktiga ljudfiler
assets/video/     sovrum.mp4, kontor.mp4, fika.mp4 (omkodade, utan ljudspår)
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

De scener som saknar animation (bil, mötesrum, korridor, maskin, spegel) är
ritade i CSS som platshållare. När en riktig film finns:

1. Lägg filen i `assets/video/` och en stillbild i `assets/img/`.
2. Lägg till den i `VIDEO_ENVS` och `POSTERS` högst upp i `js/app.js`.
3. Sätt `env: '<namn>'` på noden i `story.js`.

### Utvecklarläge

- `?at=n1324` startar direkt vid en viss punkt. Tidigare punkter räknas som spelade.
- `?at=n1614&a=lugnt` startar vid olyckan (`a=skylt` ger den lyckliga versionen).
- På tangentbordet väljer siffrorna 1–4 alternativ, och mellanslag går vidare
  i repliker.
