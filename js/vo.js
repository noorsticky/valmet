/* =====================================================================
   VOICE OVER – inspelade repliker, tankar och berättarröst.

   Varje rad i manuset (varje api.say i story.js) får ett id av scenens id
   och en kort kontrollsumma av talare + text, t.ex. "u0830_3f9a1c".
   Ljudfilen heter likadant: assets/vo/u0830_3f9a1c.mp3

   - Kör  node tools/vo-manus.js  för att få inspelningslistan
     (voiceover/manus.csv) och uppdatera listan över filer som finns.
   - Ändras en text får raden ett nytt id – den gamla inspelningen
     passar ju inte längre. Manuset visar vilka rader som saknar ljud.
   - Saknas filen visas texten som vanligt, med samma tider som i dag.
   ===================================================================== */
(function () {
  // FNV-1a, 24 bitar → 6 hexsiffror. Samma funktion används av tools/vo-manus.js.
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ((h >>> 0) & 0xffffff).toString(16).padStart(6, '0');
  }
  const kind = (o) => (o.narrator ? 'berattare' : o.inner ? 'tanke' : 'replik');
  const id = (nodeId, text, o = {}) => `${nodeId}_${hash(`${kind(o)}|${o.who || ''}|${text}`)}`;

  const VO = {
    dir: 'assets/vo/',
    ext: '.mp3',
    volume: 1,
    hash, kind, id,
    // fylls av js/vo-files.js (genereras av tools/vo-manus.js)
    available: new Set(window.VO_FILES || []),
    src(nodeId, text, o) {
      const k = id(nodeId, text, o);
      return VO.available.has(k) ? VO.dir + k + VO.ext : null;
    },
  };
  window.VO = VO;
})();
