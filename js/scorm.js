/* =====================================================================
   SCORM 1.2 – kopplingen till lärplattformen (t.ex. Workday Learning).

   - Hittar plattformens API (window.API) i föräldrafönster eller öppnaren.
   - Rapporterar start (incomplete), genomförd (completed) när en dag är
     spelad klart med reflektion, tid i kursen, och vilka dagar som är klara
     (suspend_data) så att de syns som spelade om deltagaren kommer tillbaka.
   - Utan lärplattform (t.ex. vid förhandsvisning) gör filen ingenting.
   ===================================================================== */
(function () {
  function findAPI(win) {
    for (let i = 0; win && i < 10; i++) {
      try { if (win.API) return win.API; } catch (e) { return null; }
      if (win.parent === win) break;
      win = win.parent;
    }
    return null;
  }
  let api = findAPI(window);
  if (!api && window.opener) { try { api = findAPI(window.opener); } catch (e) { api = null; } }

  const start = Date.now();
  let open = false, done = false, finished = false, days = [];
  const get = (k) => { try { return String(api.LMSGetValue(k) || ''); } catch (e) { return ''; } };
  const set = (k, v) => { try { return api.LMSSetValue(k, String(v)) === 'true'; } catch (e) { return false; } };
  const commit = () => { try { api.LMSCommit(''); } catch (e) { /* ignore */ } };

  if (api) {
    try { open = String(api.LMSInitialize('')) === 'true'; } catch (e) { open = false; }
  }
  if (open) {
    const status = get('cmi.core.lesson_status');
    done = status === 'completed' || status === 'passed';
    if (!status || status === 'not attempted') set('cmi.core.lesson_status', 'incomplete');
    try { days = JSON.parse(get('cmi.suspend_data') || '{}').days || []; } catch (e) { days = []; }
    commit();
  }

  // SCORM 1.2 vill ha tiden som HHHH:MM:SS
  const fmt = (ms) => {
    const s = Math.round(ms / 1000);
    const p = (n, w) => String(n).padStart(w, '0');
    return `${p(Math.floor(s / 3600), 4)}:${p(Math.floor((s % 3600) / 60), 2)}:${p(s % 60, 2)}`;
  };
  function finish() {
    if (!open || finished) return;
    finished = true;
    set('cmi.core.session_time', fmt(Date.now() - start));
    set('cmi.core.exit', done ? '' : 'suspend');
    commit();
    try { api.LMSFinish(''); } catch (e) { /* ignore */ }
  }
  addEventListener('pagehide', finish);
  addEventListener('beforeunload', finish);

  window.SCORM = {
    active: open,
    // dagar som redan är spelade (från ett tidigare besök)
    days: () => days.slice(),
    // anropas när en dag är spelad klart, inklusive reflektionen
    complete(playedDays) {
      if (!open) return;
      days = [...new Set([...days, ...(playedDays || [])])];
      set('cmi.suspend_data', JSON.stringify({ days }));
      set('cmi.core.lesson_status', 'completed');
      set('cmi.core.score.raw', '100'); set('cmi.core.score.min', '0'); set('cmi.core.score.max', '100');
      done = true;
      commit();
    },
    finish,
  };
})();
