# ARN-badge – "Baserat på 5 000 ARN-ärenden"

Statisk badge, grön med vit text.

- `badge-5000.svg` – vektor, skarp i alla storlekar. Rekommenderas.
- `badge-5000.png` – 1600 × 1600 px med genomskinlig bakgrund, om något system inte tar SVG.

```html
<img src="badge-5000.svg" alt="Baserat på 5 000 ARN-ärenden" width="320" height="320">
```

## Ändra
- **Färg:** grönt är `#17673a` (fill på den stora cirkeln).
- **Siffra:** texten `5 000`.
- **Typsnitt:** SVG:n använder Red Hat Display om sidan har det, annars DM Sans, Inter
  eller systemets typsnitt. Byt namnet i `font:`-raderna om sajten har ett eget.
  PNG:n är renderad med Inter.
