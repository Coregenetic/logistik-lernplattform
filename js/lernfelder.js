// ── LERNFELDER ───────────────────────────────────────────────

function lfCard(lf, isMod) {
  const locked = !lf.freigeschaltet && !isMod;
  return `
    <div class="lf-card ${locked ? 'lf-locked' : ''}" ${!locked ? `onclick="showLernfeldDetail(${lf.id})"` : ''}>
      <div class="lf-card-icon">${lf.icon||'📦'}</div>
      <div class="lf-card-num">LF ${lf.nummer}</div>
      <div class="lf-card-name">${lf.name}</div>
      <div class="lf-card-desc">${lf.beschreibung||''}</div>
      ${!lf.freigeschaltet && isMod ? '<div style="margin-top:8px;font-size:0.75rem;color:var(--warning)">🔒 Gesperrt</div>' : ''}
    </div>`;
}

function mobLfCard(lf, isMod) {
  const locked = !lf.freigeschaltet && !isMod;
  return `
    <div class="mob-lf-card ${locked ? 'locked' : ''}" ${!locked ? `onclick="showLernfeldDetail(${lf.id})"` : ''}>
      <div class="mob-lf-icon-wrap">${lf.icon||'📦'}</div>
      <div class="mob-lf-info">
        <div class="mob-lf-num">LF ${lf.nummer}${!lf.freigeschaltet && isMod ? ' · 🔒' : ''}</div>
        <div class="mob-lf-name">${lf.name}</div>
        <div class="mob-lf-bar"><div class="mob-lf-bar-fill" style="width:0%"></div></div>
      </div>
      ${!locked ? '<div class="mob-lf-arrow">›</div>' : '<div class="mob-lf-arrow">🔒</div>'}
    </div>`;
}

async function showLernfelder() {
  setActive('lnk-lf', 'bn-lf');
  showSpinner();
  const isMod = ['admin','mod'].includes(PROFILE.role);
  const { data: bereiche } = await db.from('lernbereiche').select('*, lernfelder(*)').order('reihenfolge');

  setDesktop(`
    <h1 style="margin-bottom:6px">Lernfelder</h1>
    <p style="color:var(--muted2);margin-bottom:24px">LF 1 bis LF 12</p>
    ${(bereiche||[]).map(b => `
      <div style="margin-bottom:28px">
        <h2 style="margin-bottom:4px">${b.icon} ${b.name}</h2>
        <p style="color:var(--muted2);font-size:0.83rem;margin-bottom:14px">${b.beschreibung||''}</p>
        <div class="grid-3">${(b.lernfelder||[]).sort((a,z)=>a.nummer-z.nummer).map(lf=>lfCard(lf,isMod)).join('')}</div>
      </div>`).join('')}
  `);

  setMobile(`
    <div class="mob-greeting" style="font-size:1.1rem">📚 Lernfelder</div>
    <div class="mob-greeting-sub">LF 1 bis LF 12</div>
    ${(bereiche||[]).map(b => `
      <div class="mob-section" style="margin-top:16px">${b.icon} ${b.name}</div>
      ${(b.lernfelder||[]).sort((a,z)=>a.nummer-z.nummer).map(lf=>mobLfCard(lf,isMod)).join('')}
    `).join('')}
  `);
}

async function showLernfeldDetail(lfId) {
  showSpinner();
  const isMod = ['admin','mod'].includes(PROFILE.role);
  const { data: lf } = await db.from('lernfelder').select('*, lernbereiche(name)').eq('id', lfId).maybeSingle();
  if (!lf || (!lf.freigeschaltet && !isMod)) return showLernfelder();

  // OPTIMIERT: Hier werden jetzt nur noch die nötigsten Spalten geladen, OHNE das riesige Quiz-JSON!
  const { data: inhalte } = await db.from('inhalte').select('id, titel, typ, reihenfolge, lernfeld_id').eq('lernfeld_id', lfId).order('reihenfolge');
  const typeIcon = { text:'📄', quiz:'❓', lernkarten:'🃏', video:'🎥' };

  const inhaltCards = inhalte && inhalte.length
    ? inhalte.map(i => `
        <div class="card" style="margin-bottom:12px;cursor:pointer" onclick="showInhalt(${i.id},${lfId})">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:12px">
              <span style="font-size:1.5rem">${typeIcon[i.typ]||'📄'}</span>
              <div>
                <div style="font-weight:600">${i.titel}</div>
                <div style="font-size:0.78rem;color:var(--muted2);text-transform:capitalize">${i.typ}</div>
              </div>
            </div>
            <span style="color:var(--accent);font-size:1.2rem">→</span>
          </div>
        </div>`).join('')
    : '<div class="alert alert-info">Noch keine Inhalte für dieses Lernfeld.</div>';

  const mobInhalte = inhalte && inhalte.length
    ? inhalte.map(i => `
        <div class="mob-inhalt-card" onclick="showInhalt(${i.id},${lfId})">
          <div class="mob-inhalt-type">${typeIcon[i.typ]||'📄'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:0.92rem">${i.titel}</div>
            <div style="font-size:0.75rem;color:var(--muted2);text-transform:capitalize;margin-top:2px">${i.typ}</div>
          </div>
          <span style="color:var(--muted);font-size:1.1rem">›</span>
        </div>`).join('')
    : '<div class="alert alert-info">Noch keine Inhalte.</div>';

  setDesktop(`
    <button class="btn btn-secondary btn-sm" onclick="showLernfelder()" style="margin-bottom:20px">← Zurück</button>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
      <span style="font-size:2rem">${lf.icon||'📦'}</span>
      <div>
        <div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px">
          LF ${lf.nummer} · ${lf.lernbereiche?.name}${!lf.freigeschaltet?' 🔒':''}
        </div>
        <h1>${lf.name}</h1>
      </div>
    </div>
    <p style="color:var(--muted2);margin-bottom:24px">${lf.beschreibung||''}</p>
    ${inhaltCards}
  `);

  setMobile(`
    <button class="mob-back" onclick="showLernfelder()">← Zurück</button>
    <div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">LF ${lf.nummer}</div>
    <div style="font-size:1.1rem;font-weight:700;margin-bottom:4px">${lf.name}</div>
    <div style="font-size:0.83rem;color:var(--muted2);margin-bottom:20px">${lf.beschreibung||''}</div>
    <div class="mob-section">Inhalte</div>
    ${mobInhalte}
  `);
}

async function showInhalt(inhaltId, lfId) {
  // Hier bleibt das '*' stehen, weil das Quiz nun gestartet wird und wir die Fragen brauchen!
  const { data: i } = await db.from('inhalte').select('*, lernfelder(id,name,nummer)').eq('id', inhaltId).maybeSingle();
  const backBtn = `← LF ${i.lernfelder.nummer}`;
  if (i.typ === 'quiz') {
    renderQuiz(i, backBtn, () => showLernfeldDetail(i.lernfelder.id));
  } else {
    const html = (i.inhalt?.text||'').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
    setDesktop(`
      <button class="btn btn-secondary btn-sm" onclick="showLernfeldDetail(${i.lernfelder.id})" style="margin-bottom:20px">${backBtn}</button>
      <h1 style="margin-bottom:20px">${i.titel}</h1>
      <div class="card"><div class="content-text">${html}</div></div>
      <div style="margin-top:16px">
        <button class="btn btn-success" onclick="markDone(${inhaltId},${i.lernfelder.id})">✅ Als erledigt markieren</button>
      </div>
    `);
    setMobile(`
      <button class="mob-back" onclick="showLernfeldDetail(${i.lernfelder.id})">${backBtn}</button>
      <div style="font-size:1.1rem;font-weight:700;margin-bottom:16px">${i.titel}</div>
      <div class="card" style="margin-bottom:16px"><div class="content-text" style="font-size:0.92rem;line-height:1.7">${html}</div></div>
      <button class="btn btn-success btn-full" onclick="markDone(${inhaltId},${i.lernfelder.id})">✅ Als erledigt markieren</button>
    `);
  }
}

async function markDone(inhaltId, lfId) {
  await db.from('fortschritt').upsert({ user_id:USER.id, inhalt_id:inhaltId, abgeschlossen:true, completed_at:new Date().toISOString() });
  showLernfeldDetail(lfId);
}

// ── QUIZ ENGINE ───────────────────────────────────────────────
function normalize(t) {
  return t.toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9\s]/g,' ');
}

function bewerte(antwort, frage) {
  const n = normalize(antwort);
  const matched = [], missing = [];
  frage.keywords.forEach(g => {
    const hit = g.words.some(w => n.includes(normalize(w)));
    (hit ? matched : missing).push(g.label);
  });
  const score = matched.length;
  const req   = frage.required;
  const verdict = score >= req ? 'richtig' : score >= Math.ceil(req/2) ? 'teilweise' : 'falsch';
  return { verdict, matched, missing };
}

const quizStyles = `<style>
  .quiz-wrap{max-width:620px}
  .quiz-progress{height:5px;background:var(--border);border-radius:99px;overflow:hidden;margin-bottom:20px}
  .quiz-progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width 0.4s}
  .quiz-counter{font-size:0.78rem;color:var(--muted2);margin-bottom:16px}
  .quiz-scores{display:flex;gap:14px;margin-bottom:20px;font-size:0.82rem}
  .qs-r{color:var(--correct);font-weight:600}.qs-t{color:var(--warning);font-weight:600}.qs-f{color:var(--danger);font-weight:600}
  .quiz-frage{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:22px;margin-bottom:14px;font-size:1rem;font-weight:600;line-height:1.5}
  .quiz-textarea{width:100%;min-height:100px;background:var(--surface);border:2px solid var(--border);border-radius:14px;color:var(--text);font-family:inherit;font-size:0.95rem;padding:14px;resize:none;outline:none;transition:border-color 0.2s;margin-bottom:12px;line-height:1.5}
  .quiz-textarea:focus{border-color:var(--accent)}
  .quiz-submit{width:100%;padding:14px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:14px;color:#fff;font-family:inherit;font-size:1rem;font-weight:600;cursor:pointer;margin-bottom:12px}
  .quiz-submit:disabled{opacity:0.4;cursor:default}
  .quiz-feedback{border-radius:14px;padding:14px 16px;margin-bottom:12px;display:none;font-size:0.88rem;line-height:1.6}
  .quiz-feedback.richtig{background:#10b98115;border:1px solid #10b98144}
  .quiz-feedback.teilweise{background:#f59e0b15;border:1px solid #f59e0b44}
  .quiz-feedback.falsch{background:#ef444415;border:1px solid #ef444444}
  .quiz-verdict{font-weight:700;font-size:1rem;margin-bottom:6px}
  .richtig .quiz-verdict{color:var(--correct)}.teilweise .quiz-verdict{color:var(--warning)}.falsch .quiz-verdict{color:var(--danger)}
  .quiz-kw-found{color:#86efac;font-size:0.82rem;margin-bottom:4px}
  .quiz-kw-miss{color:#fca5a5;font-size:0.82rem;margin-bottom:8px}
  .quiz-muster{color:var(--muted2);font-size:0.82rem;border-top:1px solid var(--border);padding-top:8px;margin-top:8px}
  .quiz-muster strong{color:#7dd3fc}
  .quiz-next{width:100%;padding:14px;background:var(--surface2);border:1px solid var(--border2);border-radius:14px;color:var(--text);font-family:inherit;font-size:1rem;font-weight:600;cursor:pointer;display:none}
  .quiz-result{text-align:center;padding:20px 0}
  .quiz-result-score{font-size:3rem;font-weight:700;margin:12px 0}
  .quiz-restart{padding:14px 32px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:14px;color:#fff;font-family:inherit;font-size:1rem;font-weight:600;cursor:pointer;margin-top:8px}
</style>`;

function renderQuiz(inhalt, backLabel, backFn) {
  const fragen   = inhalt.inhalt?.fragen || [];
  const shuffled = [...fragen].sort(() => Math.random() - 0.5);
  let current = 0, richtig = 0, teilweise = 0, falsch = 0;

  window._quizState = { inhalt, backLabel, backFn };

  function quizHTML() {
    return quizStyles + `<div class="quiz-wrap">
      <div class="quiz-progress"><div class="quiz-progress-fill" style="width:${(current/shuffled.length)*100}%"></div></div>
      <div class="quiz-counter">Frage ${current+1} von ${shuffled.length}</div>
      <div class="quiz-scores"><span class="qs-r">✅ ${richtig}</span><span class="qs-t">⚡ ${teilweise}</span><span class="qs-f">❌ ${falsch}</span></div>
      <div class="quiz-frage">${shuffled[current].frage}</div>
      <textarea class="quiz-textarea" id="quiz-answer" placeholder="Schreibe hier deine Antwort..."></textarea>
      <button class="quiz-submit" id="quiz-submit" onclick="quizAbgeben()">✓ Antwort abgeben</button>
      <div class="quiz-feedback" id="quiz-feedback">
        <div class="quiz-verdict" id="quiz-verdict"></div>
        <div class="quiz-kw-found" id="quiz-kw-found"></div>
        <div class="quiz-kw-miss" id="quiz-kw-miss"></div>
        <div class="quiz-muster" id="quiz-muster"></div>
      </div>
      <button class="quiz-next" id="quiz-next" onclick="quizWeiter()">Weiter →</button>
    </div>`;
  }

  function resultHTML() {
    const pts = richtig + teilweise * 0.5;
    const pct = Math.round((pts / shuffled.length) * 100);
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📚';
    const msg   = pct >= 80 ? 'Sehr gut! Du kennst den Stoff!' : pct >= 50 ? 'Gut! Noch etwas üben.' : 'Weitermachen – du schaffst das!';
    return quizStyles + `<div class="quiz-wrap"><div class="quiz-result">
      <div style="font-size:3rem">${emoji}</div>
      <h2 style="margin:12px 0 4px">Quiz abgeschlossen!</h2>
      <div class="quiz-result-score gradient-text">${pct}%</div>
      <p style="color:var(--muted2);margin-bottom:20px">${msg}</p>
      <div class="quiz-scores" style="justify-content:center">
        <span class="qs-r">✅ ${richtig}</span><span class="qs-t">⚡ ${teilweise}</span><span class="qs-f">❌ ${falsch}</span>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
        <button class="quiz-restart" onclick="renderQuiz(window._quizState.inhalt,window._quizState.backLabel,window._quizState.backFn)">🔄 Nochmal</button>
        <button class="btn btn-secondary" onclick="window._quizState.backFn()">← Zurück</button>
      </div>
    </div></div>`;
  }

  function backBtn(desktop) {
    return desktop
      ? `<button class="btn btn-secondary btn-sm" onclick="window._quizState.backFn()" style="margin-bottom:20px">${backLabel}</button>`
      : `<button class="mob-back" onclick="window._quizState.backFn()">${backLabel}</button>`;
  }

  function attachEnter() {
    document.querySelectorAll('.quiz-textarea').forEach(ta =>
      ta.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.key==='Enter') quizAbgeben(); }));
  }

  window.quizAbgeben = function() {
    const answer = document.getElementById('quiz-answer')?.value.trim();
    if (!answer || answer.length < 3) return;
    document.getElementById('quiz-submit').disabled = true;
    document.getElementById('quiz-answer').disabled = true;
    const { verdict, matched, missing } = bewerte(answer, shuffled[current]);
    if (verdict==='richtig') richtig++; else if (verdict==='teilweise') teilweise++; else falsch++;
    const icons = { richtig:'✅ Richtig!', teilweise:'⚡ Teilweise richtig', falsch:'❌ Falsch' };
    const fb = document.getElementById('quiz-feedback');
    fb.className = `quiz-feedback ${verdict}`;
    document.getElementById('quiz-verdict').textContent = icons[verdict];
    document.getElementById('quiz-kw-found').textContent = matched.length ? '✓ Erkannt: '+matched.join(', ') : '';
    document.getElementById('quiz-kw-miss').textContent  = missing.length ? '✗ Fehlend: '+missing.join(', ')  : '';
    document.getElementById('quiz-muster').innerHTML = `<strong>Musterantwort:</strong> ${shuffled[current].muster}`;
    fb.style.display='block';
    document.getElementById('quiz-next').style.display='block';
    document.getElementById('quiz-submit').style.display='none';
  };

  window.quizWeiter = function() {
    current++;
    if (current >= shuffled.length) {
      setDesktop(backBtn(true) + resultHTML());
      setMobile(backBtn(false) + resultHTML());
      return;
    }
    setDesktop(backBtn(true) + `<h1 style="margin-bottom:20px">${inhalt.titel}</h1>` + quizHTML());
    setMobile(backBtn(false) + `<div style="font-size:1.1rem;font-weight:700;margin-bottom:16px">${inhalt.titel}</div>` + quizHTML());
    attachEnter();
  };

  setDesktop(backBtn(true) + `<h1 style="margin-bottom:20px">${inhalt.titel}</h1>` + quizHTML());
  setMobile(backBtn(false) + `<div style="font-size:1.1rem;font-weight:700;margin-bottom:16px">${inhalt.titel}</div>` + quizHTML());
  attachEnter();
}
