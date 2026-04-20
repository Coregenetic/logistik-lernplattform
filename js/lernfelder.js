// ── LERNFELDER CACHE ──────────────────────────────────────────
const _lfCache = {};
async function lfCached(key, fn) {
  if (_lfCache[key] !== undefined) return _lfCache[key];
  _lfCache[key] = await fn();
  return _lfCache[key];
}
function lfInvalidate(key) { if (key) delete _lfCache[key]; else Object.keys(_lfCache).forEach(k => delete _lfCache[k]); }

// Fortschritt global cachen (wird oft gebraucht)
async function getFortschritt() {
  return lfCached('fortschritt_' + USER.id, async () => {
    const { data } = await db.from('fortschritt').select('inhalt_id').eq('user_id', USER.id).eq('abgeschlossen', true);
    return (data||[]).map(f => f.inhalt_id);
  });
}
function invalidateFortschritt() { lfInvalidate('fortschritt_' + USER.id); }


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

// ── LERNFELD DETAIL (mit KW-Ebene) ───────────────────────────
async function showLernfeldDetail(lfId) {
  showSpinner();
  const isMod = ['admin','mod'].includes(PROFILE.role);
  const { data: lf } = await db.from('lernfelder').select('*, lernbereiche(name)').eq('id', lfId).maybeSingle();
  if (!lf || (!lf.freigeschaltet && !isMod)) return showLernfelder();

  const [[{ data: stunden }, { data: inhalteOhneStunde }], doneIds] = await Promise.all([
    Promise.all([
      db.from('unterrichtsstunden').select('*').eq('lernfeld_id', lfId).order('datum'),
      db.from('inhalte').select('id, titel, typ, reihenfolge, stunde_id').eq('lernfeld_id', lfId).is('stunde_id', null).order('reihenfolge')
    ]),
    getFortschritt()
  ]);

  const typeIcon = { text:'📄', quiz:'❓', lernkarten:'🃏', video:'🎥' };

  // Datum formatieren
  function formatDatum(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  // ── Unterrichtsstunden-Karten ────────────────────────────
  const stundenHTML = (stunden||[]).map(s => `
    <div class="card" style="margin-bottom:12px;cursor:pointer;border-left:4px solid var(--accent)"
         onclick="showStundeDetail(${s.id},${lfId})">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">
            KW ${s.kw} · ${formatDatum(s.datum)}
          </div>
          <div style="font-weight:600;font-size:1rem">${s.thema}</div>
          ${s.beschreibung ? `<div style="font-size:0.82rem;color:var(--muted2);margin-top:2px">${s.beschreibung}</div>` : ''}
        </div>
        <span style="color:var(--accent);font-size:1.3rem">→</span>
      </div>
    </div>`).join('');

  const mobStunden = (stunden||[]).map(s => `
    <div class="mob-inhalt-card" onclick="showStundeDetail(${s.id},${lfId})"
         style="border-left:3px solid var(--accent)">
      <div class="mob-inhalt-type">📅</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.7rem;color:var(--accent);font-weight:700">KW ${s.kw} · ${formatDatum(s.datum)}</div>
        <div style="font-weight:600;font-size:0.9rem">${s.thema}</div>
      </div>
      <span style="color:var(--muted)">›</span>
    </div>`).join('');

  // ── Inhalte ohne Stundenzuordnung ────────────────────────
  const sonstigeHTML = (inhalteOhneStunde||[]).map(i => {
    const isDone = doneIds.includes(i.id);
    return `
    <div class="card" style="margin-bottom:10px;cursor:pointer;${isDone?'border-left:4px solid var(--correct)':''}"
         onclick="showInhalt(${i.id},${lfId})">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:1.4rem">${isDone?'✅':(typeIcon[i.typ]||'📄')}</span>
          <div>
            <div style="font-weight:600;${isDone?'color:var(--correct)':''}">${i.titel}</div>
            <div style="font-size:0.78rem;color:var(--muted2);text-transform:capitalize">${i.typ}</div>
          </div>
        </div>
        <span style="color:var(--accent)">→</span>
      </div>
    </div>`;
  }).join('');

  // ── Stunde anlegen Button (nur Mods) ─────────────────────
  const addStundeBtn = isMod ? `
    <button class="btn btn-secondary" style="margin-bottom:20px"
            onclick="showAddStundeForm(${lfId})">
      + Unterrichtsstunde anlegen
    </button>` : '';

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
    ${addStundeBtn}
    <div id="stunde-form-area"></div>
    ${stunden?.length ? `<h2 style="margin-bottom:14px">📅 Unterrichtsstunden</h2>${stundenHTML}` : '<div class="alert alert-info">Noch keine Unterrichtsstunden angelegt.</div>'}
    ${sonstigeHTML ? `<h2 style="margin:24px 0 14px">📄 Weitere Inhalte</h2>${sonstigeHTML}` : ''}
  `);

  setMobile(`
    <button class="mob-back" onclick="showLernfelder()">← Zurück</button>
    <div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">LF ${lf.nummer}</div>
    <div style="font-size:1.1rem;font-weight:700;margin-bottom:4px">${lf.name}</div>
    <div style="font-size:0.83rem;color:var(--muted2);margin-bottom:16px">${lf.beschreibung||''}</div>
    ${isMod ? `<button class="btn btn-secondary btn-sm btn-full" style="margin-bottom:16px" onclick="showAddStundeForm(${lfId})">+ Unterrichtsstunde anlegen</button>` : ''}
    <div id="mob-stunde-form"></div>
    <div class="mob-section">📅 Unterrichtsstunden</div>
    ${mobStunden || '<div class="alert alert-info">Noch keine Stunden angelegt.</div>'}
    ${(inhalteOhneStunde||[]).length ? `<div class="mob-section" style="margin-top:20px">📄 Weitere Inhalte</div>` : ''}
    ${(inhalteOhneStunde||[]).map(i => {
      const isDone = doneIds.includes(i.id);
      return `<div class="mob-inhalt-card" onclick="showInhalt(${i.id},${lfId})" style="${isDone?'border-left:3px solid var(--correct)':''}">
        <div class="mob-inhalt-type">${isDone?'✅':(typeIcon[i.typ]||'📄')}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.92rem;${isDone?'color:var(--correct)':''}">${i.titel}</div>
          <div style="font-size:0.75rem;color:var(--muted2);text-transform:capitalize">${i.typ}</div>
        </div>
        <span style="color:var(--muted)">›</span>
      </div>`;
    }).join('')}
  `);
}

// ── STUNDE DETAIL ─────────────────────────────────────────────
async function showStundeDetail(stundeId, lfId) {
  showSpinner();
  const isMod = ['admin','mod'].includes(PROFILE.role);

  const [[{ data: stunde }, { data: inhalte }], doneIds] = await Promise.all([
    Promise.all([
      db.from('unterrichtsstunden').select('*').eq('id', stundeId).maybeSingle(),
      db.from('inhalte').select('id, titel, typ, reihenfolge').eq('stunde_id', stundeId).order('reihenfolge')
    ]),
    getFortschritt()
  ]);
  const typeIcon = { text:'📄', quiz:'❓', lernkarten:'🃏', video:'🎥' };

  function formatDatum(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  const inhaltCards = (inhalte||[]).map(i => {
    const isDone = doneIds.includes(i.id);
    return `
    <div class="card" style="margin-bottom:10px;cursor:pointer;${isDone?'border-left:4px solid var(--correct)':''}"
         onclick="showInhalt(${i.id},${lfId},${stundeId})">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:1.4rem">${isDone?'✅':(typeIcon[i.typ]||'📄')}</span>
          <div>
            <div style="font-weight:600;${isDone?'color:var(--correct)':''}">${i.titel}</div>
            <div style="font-size:0.78rem;color:var(--muted2);text-transform:capitalize">${i.typ}</div>
          </div>
        </div>
        <span style="color:var(--accent)">→</span>
      </div>
    </div>`;
  }).join('') || '<div class="alert alert-info">Noch keine Inhalte für diese Stunde.</div>';

  const mobInhalte = (inhalte||[]).map(i => {
    const isDone = doneIds.includes(i.id);
    return `
    <div class="mob-inhalt-card" onclick="showInhalt(${i.id},${lfId},${stundeId})"
         style="${isDone?'border-left:3px solid var(--correct)':''}">
      <div class="mob-inhalt-type">${isDone?'✅':(typeIcon[i.typ]||'📄')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:0.92rem;${isDone?'color:var(--correct)':''}">${i.titel}</div>
        <div style="font-size:0.75rem;color:var(--muted2);text-transform:capitalize">${i.typ}</div>
      </div>
      <span style="color:var(--muted)">›</span>
    </div>`;
  }).join('') || '<div class="alert alert-info">Noch keine Inhalte.</div>';

  const deleteBtn = isMod ? `
    <button class="btn btn-danger btn-sm" style="margin-left:8px"
            onclick="deleteStunde(${stundeId},${lfId})">🗑 Stunde löschen</button>` : '';

  setDesktop(`
    <button class="btn btn-secondary btn-sm" onclick="showLernfeldDetail(${lfId})" style="margin-bottom:20px">← Zurück</button>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <span style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px">
        KW ${stunde.kw} · ${formatDatum(stunde.datum)}
      </span>
      ${deleteBtn}
    </div>
    <h1 style="margin-bottom:8px">${stunde.thema}</h1>
    ${stunde.beschreibung ? `<p style="color:var(--muted2);margin-bottom:24px">${stunde.beschreibung}</p>` : '<div style="margin-bottom:24px"></div>'}
    <h2 style="margin-bottom:14px">Inhalte dieser Stunde</h2>
    ${inhaltCards}
  `);

  setMobile(`
    <button class="mob-back" onclick="showLernfeldDetail(${lfId})">← Zurück</button>
    <div style="font-size:0.7rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">
      KW ${stunde.kw} · ${formatDatum(stunde.datum)}
    </div>
    <div style="font-size:1.1rem;font-weight:700;margin-bottom:4px">${stunde.thema}</div>
    ${stunde.beschreibung ? `<div style="font-size:0.83rem;color:var(--muted2);margin-bottom:16px">${stunde.beschreibung}</div>` : '<div style="margin-bottom:16px"></div>'}
    ${isMod ? `<button class="btn btn-danger btn-sm btn-full" style="margin-bottom:16px" onclick="deleteStunde(${stundeId},${lfId})">🗑 Stunde löschen</button>` : ''}
    <div class="mob-section">Inhalte</div>
    ${mobInhalte}
  `);
}

// ── STUNDE ANLEGEN FORMULAR ───────────────────────────────────
function showAddStundeForm(lfId) {
  // Aktuelle KW berechnen
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const currentKW = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  const todayStr = now.toISOString().split('T')[0];

  const html = `
    <div class="card" style="margin-bottom:20px;border:2px solid var(--accent)">
      <h3>📅 Neue Unterrichtsstunde</h3>
      <div class="grid-2" style="gap:12px">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Kalenderwoche</label>
          <input class="form-input" type="number" id="stunde-kw" value="${currentKW}" min="1" max="53">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Datum</label>
          <input class="form-input" type="date" id="stunde-datum" value="${todayStr}">
        </div>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label class="form-label">Thema der Stunde</label>
        <input class="form-input" type="text" id="stunde-thema" placeholder="z.B. Wareneingang und Begleitpapiere">
      </div>
      <div class="form-group">
        <label class="form-label">Beschreibung (optional)</label>
        <input class="form-input" type="text" id="stunde-beschreibung" placeholder="z.B. Schwerpunkt: Mängelrüge">
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary" onclick="saveStunde(${lfId})">💾 Stunde anlegen</button>
        <button class="btn btn-secondary" onclick="closeStundeForm()">Abbrechen</button>
      </div>
    </div>`;

  const isMob = window.innerWidth <= 700;
  if (isMob) {
    document.getElementById('mob-stunde-form').innerHTML = html;
  } else {
    document.getElementById('stunde-form-area').innerHTML = html;
  }
}

async function saveStunde(lfId) {
  const kw           = parseInt(document.getElementById('stunde-kw').value);
  const datum        = document.getElementById('stunde-datum').value;
  const thema        = document.getElementById('stunde-thema').value.trim();
  const beschreibung = document.getElementById('stunde-beschreibung').value.trim();
  if (!thema || !datum || !kw) return alert('Bitte KW, Datum und Thema ausfüllen.');

  const { error } = await db.from('unterrichtsstunden').insert({
    lernfeld_id: lfId, kw, datum, thema,
    beschreibung: beschreibung || null,
    erstellt_von: USER.id
  });
  if (error) return alert('Fehler: ' + error.message);
  showLernfeldDetail(lfId);
}

function closeStundeForm() {
  const f1 = document.getElementById('stunde-form-area');
  const f2 = document.getElementById('mob-stunde-form');
  if (f1) f1.innerHTML = '';
  if (f2) f2.innerHTML = '';
}

async function deleteStunde(stundeId, lfId) {
  if (!confirm('Diese Unterrichtsstunde und alle zugehörigen Inhalte wirklich löschen?')) return;
  showSpinner();
  try {
    // Inhalte der Stunde abrufen und Fortschritt löschen
    const { data: inhalte } = await db.from('inhalte').select('id').eq('stunde_id', stundeId);
    if (inhalte?.length) {
      const ids = inhalte.map(i => i.id);
      await db.from('fortschritt').delete().in('inhalt_id', ids);
      await db.from('inhalte').delete().in('id', ids);
    }
    await db.from('unterrichtsstunden').delete().eq('id', stundeId);
    showLernfeldDetail(lfId);
  } catch (err) {
    alert('Fehler: ' + err.message);
    showLernfeldDetail(lfId);
  }
}

// ── INHALT ANZEIGEN ───────────────────────────────────────────
async function showInhalt(inhaltId, lfId, stundeId = null) {
  const [{ data: i }, { data: fpRows }] = await Promise.all([
    db.from('inhalte').select('*, lernfelder(id,name,nummer)').eq('id', inhaltId).maybeSingle(),
    db.from('fortschritt').select('id').eq('user_id', USER.id).eq('inhalt_id', inhaltId)
  ]);

  if (!i) return;
  const isDone  = fpRows && fpRows.length > 0;
  const backFn  = stundeId
    ? () => showStundeDetail(stundeId, lfId)
    : () => showLernfeldDetail(i.lernfelder.id);
  const backBtn = stundeId ? '← Zurück zur Stunde' : `← LF ${i.lernfelder.nummer}`;

  if (i.typ === 'quiz') {
    renderQuiz(i, backBtn, backFn, async () => {
      await markDone(inhaltId, lfId, false);
    });
  } else {
    const html = (i.inhalt?.text||'').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
    const doneButtonHTML = isDone
      ? `<button class="btn btn-secondary" disabled>✅ Bereits erledigt</button>`
      : `<button class="btn btn-success" onclick="markDone(${inhaltId},${lfId},true,${stundeId||'null'})">✅ Als erledigt markieren</button>`;

    setDesktop(`
      <button class="btn btn-secondary btn-sm" onclick="${stundeId ? `showStundeDetail(${stundeId},${lfId})` : `showLernfeldDetail(${i.lernfelder.id})`}" style="margin-bottom:20px">${backBtn}</button>
      <h1 style="margin-bottom:20px">${i.titel}</h1>
      <div class="card"><div class="content-text">${html}</div></div>
      <div style="margin-top:16px">${doneButtonHTML}</div>
    `);
    setMobile(`
      <button class="mob-back" onclick="${stundeId ? `showStundeDetail(${stundeId},${lfId})` : `showLernfeldDetail(${i.lernfelder.id})`}">${backBtn}</button>
      <div style="font-size:1.1rem;font-weight:700;margin-bottom:16px">${i.titel}</div>
      <div class="card" style="margin-bottom:16px"><div class="content-text" style="font-size:0.92rem;line-height:1.7">${html}</div></div>
      ${doneButtonHTML.replace('class="btn ', 'class="btn btn-full ')}
    `);
  }
}

async function markDone(inhaltId, lfId, navigate = true, stundeId = null) {
  invalidateFortschritt();
  await db.from('fortschritt').upsert(
    { user_id: USER.id, inhalt_id: inhaltId, abgeschlossen: true, completed_at: new Date().toISOString() },
    { onConflict: 'user_id,inhalt_id' }
  );
  if (navigate) {
    stundeId ? showStundeDetail(stundeId, lfId) : showLernfeldDetail(lfId);
  }
}

// ── QUIZ ENGINE ───────────────────────────────────────────────
function normalize(t) {
  if (!t) return "";
  return String(t).toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9\s]/g,' ')
    .trim();
}

function bewerte(antwort, frage) {
  const n = normalize(antwort);
  const matched = [], missing = [];
  if (frage && frage.keywords && Array.isArray(frage.keywords)) {
    frage.keywords.forEach(g => {
      let words = [], label = "Keyword";
      if (typeof g === 'object' && g !== null && g.words && Array.isArray(g.words)) {
        words = g.words; label = g.label || words[0] || "Keyword";
      } else if (Array.isArray(g)) {
        words = g; label = g[0] || "Keyword";
      } else if (typeof g === 'string') {
        words = [g]; label = g;
      }
      if (words.length > 0) {
        const hit = words.some(w => n.includes(normalize(w)));
        (hit ? matched : missing).push(label);
      }
    });
  }
  const score = matched.length;
  const req   = frage.required || 1;
  const verdict = score >= req ? 'richtig' : score >= Math.ceil(req/2) ? 'teilweise' : 'falsch';
  return { verdict, matched, missing };
}

const quizStyles = `<style>
  .quiz-wrap{max-width:620px;width:100%;box-sizing:border-box;}
  .quiz-progress{height:5px;background:var(--border);border-radius:99px;overflow:hidden;margin-bottom:20px}
  .quiz-progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width 0.4s}
  .quiz-counter{font-size:0.78rem;color:var(--muted2);margin-bottom:16px}
  .quiz-scores{display:flex;gap:14px;margin-bottom:20px;font-size:0.82rem}
  .qs-r{color:var(--correct);font-weight:600}.qs-t{color:var(--warning);font-weight:600}.qs-f{color:var(--danger);font-weight:600}
  .quiz-frage{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:22px;margin-bottom:14px;font-size:1rem;font-weight:600;line-height:1.5}
  .quiz-textarea{width:100%;min-height:120px;background:var(--surface);border:2px solid var(--border);border-radius:14px;color:var(--text);font-family:inherit;font-size:1rem;padding:14px;resize:none;outline:none;transition:border-color 0.2s;margin-bottom:12px;line-height:1.5;box-sizing:border-box;}
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

function renderQuiz(inhalt, backLabel, backFn, onCompleteFn) {
  const fragen = inhalt.inhalt?.fragen || [];
  if (!fragen.length) return alert("Keine Fragen gefunden.");
  const shuffled = [...fragen].sort(() => Math.random() - 0.5);
  let current = 0, richtig = 0, teilweise = 0, falsch = 0;
  window._quizState = { inhalt, backLabel, backFn, onCompleteFn };

  function renderView() {
    const isMob = window.innerWidth <= 700;
    const backBtnHTML = isMob
      ? `<button class="mob-back" onclick="window._quizState.backFn()">${backLabel}</button>`
      : `<button class="btn btn-secondary btn-sm" onclick="window._quizState.backFn()" style="margin-bottom:20px">${backLabel}</button>`;
    const titleHTML = isMob
      ? `<div style="font-size:1.1rem;font-weight:700;margin-bottom:16px">${inhalt.titel}</div>`
      : `<h1 style="margin-bottom:20px">${inhalt.titel}</h1>`;
    const html = quizStyles + `<div class="quiz-wrap">
      <div class="quiz-progress"><div class="quiz-progress-fill" style="width:${(current/shuffled.length)*100}%"></div></div>
      <div class="quiz-counter">Frage ${current+1} von ${shuffled.length}</div>
      <div class="quiz-scores"><span class="qs-r">✅ ${richtig}</span><span class="qs-t">⚡ ${teilweise}</span><span class="qs-f">❌ ${falsch}</span></div>
      <div class="quiz-frage">${shuffled[current].frage}</div>
      <textarea class="quiz-textarea" id="quiz-answer" placeholder="Antwort hier schreiben..."></textarea>
      <button class="quiz-submit" id="quiz-submit" onclick="quizAbgeben()">✓ Antwort abgeben</button>
      <div class="quiz-feedback" id="quiz-feedback">
        <div class="quiz-verdict" id="quiz-verdict"></div>
        <div class="quiz-kw-found" id="quiz-kw-found"></div>
        <div class="quiz-kw-miss" id="quiz-kw-miss"></div>
        <div class="quiz-muster" id="quiz-muster"></div>
      </div>
      <button class="quiz-next" id="quiz-next" onclick="quizWeiter()">Weiter →</button>
    </div>`;
    if (isMob) { setMobile(backBtnHTML + titleHTML + html); setDesktop(""); }
    else        { setDesktop(backBtnHTML + titleHTML + html); setMobile(""); }
    setTimeout(() => {
      const ta = document.getElementById('quiz-answer');
      if (ta) ta.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.key==='Enter') quizAbgeben(); });
    }, 50);
  }

  window.quizAbgeben = function() {
    const answer = document.getElementById('quiz-answer')?.value.trim();
    if (!answer || answer.length < 2) return;
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
      const isMob = window.innerWidth <= 700;
      const pts = richtig + teilweise * 0.5;
      const pct = Math.round((pts / shuffled.length) * 100);
      if (window._quizState.onCompleteFn) window._quizState.onCompleteFn();
      const resHTML = quizStyles + `<div class="quiz-wrap"><div class="quiz-result">
        <div style="font-size:3rem">🎉</div>
        <h2 style="margin:12px 0 4px">Abgeschlossen!</h2>
        <div class="quiz-result-score gradient-text">${pct}%</div>
        <div class="quiz-scores" style="justify-content:center">
          <span class="qs-r">✅ ${richtig}</span><span class="qs-t">⚡ ${teilweise}</span><span class="qs-f">❌ ${falsch}</span>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
          <button class="quiz-restart" onclick="renderQuiz(window._quizState.inhalt,window._quizState.backLabel,window._quizState.backFn,window._quizState.onCompleteFn)">🔄 Nochmal</button>
          <button class="btn btn-secondary" onclick="window._quizState.backFn()">← Zurück</button>
        </div>
      </div></div>`;
      if (isMob) setMobile(resHTML); else setDesktop(resHTML);
      return;
    }
    renderView();
  };

  renderView();
}