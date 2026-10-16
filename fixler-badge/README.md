# ARN-badge – "Baserat på 5 000 ARN-ärenden"

Två animerade versioner av samma badge.

## badge-5000-animated.svg
Enklast. Ingen JavaScript, spelas upp direkt när sidan laddas.

```html
<img src="badge-5000-animated.svg" alt="Baserat på 5 000 ARN-ärenden" width="320" height="320">
```

## badge-5000-countup.html
För att klistra in direkt i sidans HTML. Kopiera allt mellan kommentarerna
`Kopiera från här` och `till hit`. Den här versionen:
- startar först när badgen syns på skärmen
- räknar upp siffran från 0 till 5 000
- lutar sig mjukt mot muspekaren (bara med mus)

Ge badgen en storlek med CSS, till exempel `.arn-badge { width: 320px; height: auto; }`.

## Ändra
- **Färg:** `--green` (och `--soft` för den ljusa innercirkeln) i `<style>`.
- **Siffra:** texten `5 000`, och i HTML-versionen även `data-count="5000"`.
- **Typsnitt:** badgen använder Red Hat Display om sidan har det, annars DM Sans,
  Inter eller systemets typsnitt. Byt namnet i `font:`-raderna om sajten har ett eget.

Besökare som valt minskad rörelse i sina inställningar ser badgen direkt, utan animation.
