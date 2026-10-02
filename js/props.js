/* =====================================================================
   PROPS – föremålen som står på tidslinjens plattformar.
   Ritade som low-poly-SVG (viewBox 0 0 200 200, föremålet står på y≈175).
   Vill ni använda riktiga 3D-renderingar: lägg en PNG med transparent
   bakgrund i assets/props/<namn>.png och sätt `prop: 'assets/props/<namn>.png'`
   på noden i story.js – en sökväg används som bild, ett namn som SVG nedan.
   ===================================================================== */
(function () {
  const W = '#f5f6f3', L = '#e2e6df', M = '#c9cfc5', S = '#aab3a6', D = '#7d877a', K = '#3d443b';

  const P = {
    /* väckarklocka */
    klocka: `
      <polygon points="58,40 78,26 92,44 72,60" fill="${M}"/><polygon points="58,40 72,60 62,64 50,52" fill="${S}"/>
      <polygon points="142,40 122,26 108,44 128,60" fill="${L}"/><polygon points="142,40 128,60 138,64 150,52" fill="${M}"/>
      <rect x="94" y="30" width="12" height="16" rx="3" fill="${S}"/>
      <polygon points="100,46 140,58 158,94 150,136 122,160 78,160 50,136 42,94 60,58" fill="${M}"/>
      <polygon points="100,46 140,58 158,94 100,100" fill="${L}"/><polygon points="42,94 60,58 100,46 100,100" fill="${S}"/>
      <polygon points="150,136 122,160 100,100 158,94" fill="${S}"/>
      <circle cx="100" cy="102" r="44" fill="${W}"/><circle cx="100" cy="102" r="44" fill="none" stroke="${L}" stroke-width="6"/>
      <g stroke="${D}" stroke-width="3" stroke-linecap="round">
        <line x1="100" y1="66" x2="100" y2="72"/><line x1="100" y1="132" x2="100" y2="138"/><line x1="64" y1="102" x2="70" y2="102"/><line x1="130" y1="102" x2="136" y2="102"/>
        <line x1="100" y1="102" x2="88" y2="84" stroke-width="4"/><line x1="100" y1="102" x2="124" y2="92"/>
      </g>
      <circle cx="100" cy="102" r="4" fill="${K}"/>
      <polygon points="66,150 76,156 60,176 52,172" fill="${S}"/><polygon points="134,150 124,156 140,176 148,172" fill="${M}"/>`,

    /* person (Ola) */
    person: `
      <polygon points="84,176 92,176 94,120 82,120" fill="#2f3b4c"/><polygon points="108,176 116,176 118,120 106,120" fill="#3a4a5e"/>
      <polygon points="80,178 96,178 96,184 76,184" fill="#4a3426"/><polygon points="104,178 120,178 124,184 104,184" fill="#5a4030"/>
      <polygon points="80,122 120,122 118,112 82,112" fill="#2f3b4c"/>
      <polygon points="78,62 122,62 126,114 74,114" fill="${L}"/><polygon points="100,62 122,62 126,114 100,114" fill="${M}"/>
      <polygon points="90,60 110,60 100,72" fill="#5c7fb3"/>
      <polygon points="78,62 68,66 62,104 70,106 78,78" fill="${M}"/><polygon points="122,62 132,66 138,104 130,106 122,78" fill="${S}"/>
      <polygon points="62,104 70,106 68,116 60,114" fill="#d9b08c"/><polygon points="138,104 130,106 132,116 140,114" fill="#c79c78"/>
      <rect x="94" y="50" width="12" height="12" fill="#c79c78"/>
      <polygon points="100,22 114,28 116,44 108,56 92,56 84,44 86,28" fill="#e2b994"/><polygon points="100,22 114,28 116,44 108,56 100,56" fill="#d1a681"/>
      <polygon points="86,28 100,20 114,28 112,34 88,34" fill="#4a3a2c"/>`,

    /* bil */
    bil: `
      <polygon points="30,128 44,104 70,98 92,74 140,74 158,98 176,106 178,132 30,136" fill="${L}"/>
      <polygon points="92,74 140,74 158,98 70,98" fill="${M}"/>
      <polygon points="98,80 120,80 120,96 82,96" fill="#7fa3c2"/><polygon points="124,80 138,80 150,96 124,96" fill="#6b90b0"/>
      <polygon points="30,128 178,132 176,144 32,142" fill="${S}"/>
      <polygon points="170,108 178,110 178,118 168,116" fill="#fff6c8"/><polygon points="30,118 38,116 38,124 30,126" fill="#e05a4a"/>
      <circle cx="62" cy="144" r="18" fill="${K}"/><circle cx="62" cy="144" r="8" fill="${M}"/>
      <circle cx="148" cy="144" r="18" fill="${K}"/><circle cx="148" cy="144" r="8" fill="${M}"/>`,

    /* kaffekopp på fat */
    kopp: `
      <ellipse cx="100" cy="148" rx="74" ry="24" fill="${M}"/><ellipse cx="100" cy="144" rx="70" ry="21" fill="${W}"/>
      <ellipse cx="100" cy="144" rx="40" ry="12" fill="${L}"/>
      <path d="M140 88 q28 0 24 26 q-4 22 -30 22" fill="none" stroke="${L}" stroke-width="9"/>
      <polygon points="56,70 144,70 136,130 122,146 78,146 64,130" fill="${W}"/>
      <polygon points="100,70 144,70 136,130 122,146 100,146" fill="${L}"/><polygon points="122,146 136,130 144,70 128,120" fill="${M}"/>
      <ellipse cx="100" cy="70" rx="44" ry="15" fill="${L}"/><ellipse cx="100" cy="72" rx="38" ry="11" fill="#5a3a28"/>
      <polygon points="74,70 100,64 122,72 100,80" fill="#6d4836"/>`,

    /* whiteboard */
    tavla: `
      <polygon points="60,150 66,150 56,184 50,184" fill="${D}"/><polygon points="134,150 140,150 150,184 144,184" fill="${D}"/>
      <polygon points="30,40 170,36 172,150 28,152" fill="${S}"/><polygon points="36,46 164,42 166,144 34,146" fill="${W}"/>
      <polygon points="100,44 164,42 166,144 100,145" fill="#eef1ec"/>
      <g stroke="#2d5bb0" stroke-width="4" stroke-linecap="round" fill="none">
        <path d="M48 64 h46"/><path d="M48 86 q10 -6 20 0 t20 0 h20"/><path d="M48 108 h34"/><path d="M48 128 h56"/>
      </g>
      <g stroke="#d33" stroke-width="5" stroke-linecap="round"><line x1="128" y1="80" x2="128" y2="104"/><line x1="142" y1="80" x2="142" y2="104"/></g>
      <circle cx="128" cy="114" r="3.5" fill="#d33"/><circle cx="142" cy="114" r="3.5" fill="#d33"/>
      <polygon points="40,152 160,150 160,158 40,160" fill="${M}"/>`,

    /* pratbubblor (korridoren) */
    prat: `
      <polygon points="28,48 112,40 120,104 70,110 52,130 54,110 34,112" fill="${W}"/>
      <polygon points="112,40 120,104 70,110 90,74" fill="${L}"/>
      <text x="74" y="92" font-family="Maven Pro,Arial" font-weight="800" font-size="40" fill="${D}" text-anchor="middle">?</text>
      <polygon points="96,98 172,92 176,150 158,152 160,172 140,154 100,156" fill="${M}"/>
      <polygon points="172,92 176,150 140,154 150,120" fill="${S}"/>
      <circle cx="118" cy="126" r="5" fill="${W}"/><circle cx="136" cy="125" r="5" fill="${W}"/><circle cx="154" cy="124" r="5" fill="${W}"/>`,

    /* presentationsskärm med staplar */
    skarm: `
      <polygon points="96,150 104,150 108,182 92,182" fill="${D}"/><polygon points="76,182 124,182 124,188 76,188" fill="${S}"/>
      <polygon points="24,44 176,40 178,152 22,154" fill="${K}"/><polygon points="32,52 168,48 170,144 30,146" fill="#1d3550"/>
      <polygon points="50,136 66,136 66,104 50,104" fill="#4c8fd9"/><polygon points="76,136 92,136 92,92 76,92" fill="#4c8fd9"/>
      <polygon points="102,136 118,136 118,98 102,98" fill="#4c8fd9"/><polygon points="128,136 144,136 144,70 128,70" fill="#ffb020"/>
      <polyline points="54,98 84,84 110,90 140,58" fill="none" stroke="#fff" stroke-width="3"/><polygon points="140,52 150,56 142,64" fill="#fff"/>`,

    /* maskin / press med uppfällt skydd */
    maskin: `
      <polygon points="40,70 160,64 166,166 34,170" fill="#4f8a5a"/><polygon points="100,67 160,64 166,166 100,168" fill="#437a4e"/>
      <polygon points="52,96 148,92 150,112 50,116" fill="${M}"/><polygon points="52,120 148,116 150,136 50,140" fill="${S}"/>
      <g fill="${K}" opacity=".35"><rect x="64" y="94" width="8" height="20"/><rect x="88" y="93" width="8" height="20"/><rect x="112" y="92" width="8" height="20"/><rect x="136" y="92" width="8" height="20"/></g>
      <polygon points="34,150 166,146 166,170 34,172" fill="#f2c200"/>
      <g fill="${K}"><polygon points="44,150 56,150 46,172 34,172"/><polygon points="74,149 86,149 76,171 64,171"/><polygon points="104,148 116,148 106,170 94,170"/><polygon points="134,147 146,147 136,169 124,169"/><polygon points="160,146 166,146 166,158"/></g>
      <polygon points="48,62 152,56 166,24 62,30" fill="none" stroke="${L}" stroke-width="4"/>
      <g stroke="${L}" stroke-width="2" opacity=".8"><line x1="74" y1="61" x2="86" y2="29"/><line x1="100" y1="59" x2="112" y2="28"/><line x1="126" y1="58" x2="138" y2="26"/><line x1="55" y1="46" x2="159" y2="40"/></g>
      <circle cx="176" cy="96" r="6" fill="#3bd15a"/><circle cx="176" cy="112" r="6" fill="#f2c200"/><circle cx="176" cy="128" r="6" fill="#d33"/>`,

    /* matlåda */
    lada: `
      <polygon points="40,110 160,104 166,160 36,164" fill="${W}"/><polygon points="100,107 160,104 166,160 100,162" fill="${L}"/>
      <polygon points="46,112 156,106 154,120 48,126" fill="#c4683a"/><circle cx="74" cy="114" r="8" fill="#8b4a2b"/><circle cx="96" cy="112" r="8" fill="#9c5532"/><circle cx="118" cy="111" r="8" fill="#8b4a2b"/>
      <polygon points="126,108 150,107 148,116 128,118" fill="#7fae4c"/>
      <polygon points="34,100 156,64 170,78 46,112" fill="#7fb6d9" opacity=".9"/><polygon points="156,64 170,78 168,84 154,70" fill="#5f97bb"/>
      <polygon points="36,164 166,160 166,168 36,172" fill="${S}"/>`,

    /* gnäll: argsint pratbubbla */
    gnall: `
      <polygon points="30,50 150,40 162,120 96,128 70,156 72,130 38,132" fill="${W}"/>
      <polygon points="150,40 162,120 96,128 120,84" fill="${L}"/>
      <text x="94" y="104" font-family="Maven Pro,Arial" font-weight="800" font-size="44" fill="#d24a3a" text-anchor="middle">#!?</text>
      <polygon points="132,120 176,116 178,150 166,152 168,166 154,152 136,154" fill="${M}"/>
      <text x="156" y="144" font-family="Maven Pro,Arial" font-weight="800" font-size="22" fill="${D}" text-anchor="middle">…</text>`,

    /* laptop med kuvert */
    laptop: `
      <polygon points="40,52 156,46 160,136 42,140" fill="${K}"/><polygon points="48,60 150,54 152,128 50,132" fill="${W}"/>
      <polygon points="100,57 150,54 152,128 100,130" fill="#eef1ec"/>
      <polygon points="84,80 124,78 126,108 86,110" fill="${M}"/><polyline points="84,80 105,96 124,78" fill="none" stroke="${D}" stroke-width="3"/>
      <circle cx="128" cy="78" r="9" fill="#d33"/><text x="128" y="82" font-family="Maven Pro,Arial" font-weight="800" font-size="11" fill="#fff" text-anchor="middle">3</text>
      <polygon points="42,140 160,136 184,162 20,168" fill="${M}"/><polygon points="100,138 160,136 184,162 100,165" fill="${S}"/>
      <polygon points="80,150 120,148 124,156 78,158" fill="${L}"/>`,

    /* arbetshandske + kaffe */
    handske: `
      <polygon points="40,170 52,110 60,74 72,72 74,108 80,62 92,62 92,106 98,60 110,62 106,108 114,72 126,76 118,116 134,100 146,108 120,150 116,172" fill="#e9c75a"/>
      <polygon points="92,106 98,60 110,62 106,108 114,72 126,76 118,116 134,100 146,108 120,150 116,172 90,172" fill="#d9b443"/>
      <polygon points="40,160 118,162 116,184 38,184" fill="#5b6b8a"/><polygon points="78,161 118,162 116,184 78,184" fill="#4a5a78"/>
      <polygon points="138,140 176,140 172,180 142,180" fill="${W}"/><polygon points="158,140 176,140 172,180 158,180" fill="${L}"/>
      <path d="M150 128 q-6 -8 0 -16 q6 -8 0 -16" fill="none" stroke="${L}" stroke-width="3" stroke-linecap="round"/>`,

    /* kalender */
    kalender: `
      <polygon points="36,56 164,52 168,170 34,174" fill="${W}"/><polygon points="100,54 164,52 168,170 100,172" fill="${L}"/>
      <polygon points="36,56 164,52 165,80 36,84" fill="#d33"/>
      <rect x="62" y="40" width="8" height="26" rx="4" fill="${D}"/><rect x="130" y="38" width="8" height="26" rx="4" fill="${D}"/>
      <g fill="${M}"><rect x="50" y="96" width="18" height="14"/><rect x="76" y="95" width="18" height="14"/><rect x="128" y="94" width="18" height="14"/>
      <rect x="50" y="120" width="18" height="14"/><rect x="128" y="118" width="18" height="14"/><rect x="50" y="144" width="18" height="14"/><rect x="76" y="143" width="18" height="14"/><rect x="102" y="142" width="18" height="14"/></g>
      <rect x="100" y="92" width="22" height="42" rx="3" fill="#5aa9f5"/><rect x="108" y="100" width="22" height="42" rx="3" fill="#8e6bd8" opacity=".9"/>`,

    /* mobil */
    mobil: `
      <polygon points="62,30 134,26 140,176 66,180" fill="${K}"/><polygon points="68,40 130,36 134,166 72,170" fill="#24364a"/>
      <polygon points="76,52 124,50 126,92 78,94" fill="#ff5a7a"/><polygon points="76,100 124,98 126,124 78,126" fill="#4c8fd9"/>
      <polygon points="78,132 126,130 126,156 80,158" fill="#7fae4c"/>
      <polygon points="100,62 112,72 100,82" fill="#fff"/>`,

    /* varningsljus */
    larm: `
      <polygon points="56,150 144,150 152,176 48,176" fill="${S}"/><polygon points="100,150 144,150 152,176 100,176" fill="${D}"/>
      <polygon points="66,150 70,80 100,62 130,80 134,150" fill="#ff3b30" opacity=".95"/>
      <polygon points="100,62 130,80 134,150 100,150" fill="#c9221a"/>
      <polygon points="80,96 92,90 92,140 80,142" fill="#ffd1cc" opacity=".8"/>
      <circle cx="100" cy="60" r="6" fill="${K}"/>`,

    /* ryggsäck (på väg till förskolan) */
    ryggsack: `
      <path d="M78 62 q22 -30 44 0" fill="none" stroke="#6b4b2a" stroke-width="7"/>
      <polygon points="58,72 142,68 150,170 52,174" fill="#4f8a5a"/><polygon points="100,70 142,68 150,170 100,172" fill="#437a4e"/>
      <polygon points="68,118 132,116 136,160 66,162" fill="#5f9c6a"/><polygon points="68,118 132,116 132,126 68,128" fill="#3b6b45"/>
      <rect x="94" y="122" width="12" height="6" rx="2" fill="#f2c200"/>
      <polygon points="52,174 150,170 148,180 54,184" fill="#2f5537"/>
      <circle cx="152" cy="80" r="14" fill="#ffcf4a"/><g stroke="#ffcf4a" stroke-width="3"><line x1="152" y1="56" x2="152" y2="62"/><line x1="176" y1="80" x2="170" y2="80"/><line x1="169" y1="63" x2="165" y2="67"/></g>`,

    /* checklista */
    checklista: `
      <polygon points="44,40 156,36 160,180 40,184" fill="#8a6a46"/><polygon points="52,48 148,44 152,172 48,176" fill="${W}"/>
      <polygon points="100,46 148,44 152,172 100,174" fill="#eef1ec"/>
      <polygon points="80,30 120,28 122,48 78,50" fill="${S}"/>
      <g fill="none" stroke="#2e9c3a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="60,78 68,86 82,70"/><polyline points="60,112 68,120 82,104"/><polyline points="60,146 68,154 82,138"/></g>
      <g stroke="${M}" stroke-width="6" stroke-linecap="round"><line x1="94" y1="80" x2="138" y2="78"/><line x1="94" y1="114" x2="132" y2="112"/><line x1="94" y1="148" x2="140" y2="146"/></g>`,
  };

  window.PROPS = {
    html(name) {
      if (!name) return '';
      if (/\.(png|webp|jpg|svg)$/i.test(name)) return `<img src="${name}" alt="" draggable="false">`;
      const body = P[name];
      return body ? `<svg viewBox="0 0 200 200" aria-hidden="true">${body}</svg>` : '';
    },
  };
})();
