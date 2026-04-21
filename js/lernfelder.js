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

  if (i.typ === 'lernkarten') {
    renderLernkarten(
      i,
      backLabel,
      () => stundeId ? showStundeDetail(stundeId, lfId) : showLernfeldDetail(lfId),
      () => markDone(i.id, lfId, false, stundeId)
    );
    return;
  }

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

  /* Quiz Card - reveal approach */
  .quiz-card{border-radius:16px;padding:22px;margin-bottom:14px;min-height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;font-size:1rem;font-weight:600;line-height:1.5;border:1px solid var(--border);background:var(--surface);transition:background 0.3s,border-color 0.3s}
  .quiz-card.richtig{background:#10b98112;border-color:#10b98130}
  .quiz-card.teilweise{background:#f59e0b12;border-color:#f59e0b30}
  .quiz-card.falsch{background:#ef444412;border-color:#ef444430}
  .quiz-card-reveal{animation:qReveal 0.3s cubic-bezier(0.34,1.56,0.64,1)}
  @keyframes qReveal{from{transform:scale(0.96);opacity:0.6}to{transform:scale(1);opacity:1}}
  .quiz-flip-verdict{font-size:0.88rem;font-weight:700;padding:3px 12px;border-radius:99px}
  .richtig .quiz-flip-verdict{background:#10b98125;color:var(--correct)}
  .teilweise .quiz-flip-verdict{background:#f59e0b25;color:var(--warning)}
  .falsch .quiz-flip-verdict{background:#ef444425;color:var(--danger)}
  .quiz-flip-muster{font-size:0.82rem;color:var(--muted2);line-height:1.5}
  .quiz-flip-muster strong{color:#7dd3fc}
  .quiz-flip-kw{font-size:0.75rem;display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:2px}
  .kw-found{background:#10b98120;color:#86efac;padding:2px 8px;border-radius:99px}
  .kw-miss{background:#ef444420;color:#fca5a5;padding:2px 8px;border-radius:99px}

  .quiz-textarea{width:100%;min-height:100px;background:var(--surface);border:2px solid var(--border);border-radius:14px;color:var(--text);font-family:inherit;font-size:1rem;padding:14px;resize:none;outline:none;transition:border-color 0.2s;margin-bottom:12px;line-height:1.5;box-sizing:border-box;}
  .quiz-textarea:focus{border-color:var(--accent)}
  .quiz-textarea.richtig{border-color:var(--correct);background:#10b98108}
  .quiz-textarea.teilweise{border-color:var(--warning);background:#f59e0b08}
  .quiz-textarea.falsch{border-color:var(--danger);background:#ef444408}
  .quiz-submit{width:100%;padding:14px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:14px;color:#fff;font-family:inherit;font-size:1rem;font-weight:600;cursor:pointer;margin-bottom:12px;box-shadow:0 2px 12px #3b7ff530}
  .quiz-submit:disabled{opacity:0.4;cursor:default}
  .quiz-next{width:100%;padding:14px;background:var(--surface2);border:1px solid var(--border2);border-radius:14px;color:var(--text);font-family:inherit;font-size:1rem;font-weight:600;cursor:pointer;display:none}
  .quiz-result{text-align:center;padding:20px 0}
  .quiz-result-score{font-size:3rem;font-weight:700;margin:12px 0}
  .quiz-restart{padding:14px 32px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:14px;color:#fff;font-family:inherit;font-size:1rem;font-weight:600;cursor:pointer;margin-top:8px}
</style>`;

async function renderQuiz(inhalt, backLabel, backFn, onCompleteFn) {
  const fragen = inhalt.inhalt?.fragen || [];
  if (!fragen.length) return alert("Keine Fragen gefunden.");

  // Quiz Session laden
  const inhaltTyp = inhalt.kapitel_id ? 'fach' : 'lf';
  const { data: existingSession } = await db.from('quiz_session')
    .select('*').eq('user_id', USER.id).eq('inhalt_id', inhalt.id).eq('inhalt_typ', inhaltTyp)
    .maybeSingle();

  // Weitermachen anbieten wenn Session existiert
  if (existingSession && existingSession.current_index > 0 && existingSession.current_index < fragen.length) {
    const isMob = window.innerWidth <= 700;
    const backBtn = isMob
      ? `<button class="mob-back" onclick="${backFn.toString().includes('showK') ? backFn : 'backFn()'}">${backLabel}</button>`
      : `<button class="btn btn-secondary btn-sm" onclick="window._quizState?.backFn()" style="margin-bottom:20px">${backLabel}</button>`;
    const resumeHTML = `
      <div style="max-width:480px">
        <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:20px;padding:28px;text-align:center">
          <div style="font-size:2.5rem;margin-bottom:12px">▶️</div>
          <h2 style="margin-bottom:8px">Quiz fortsetzen?</h2>
          <p style="color:var(--muted2);font-size:0.88rem;margin-bottom:20px">Du hast zuletzt bei <strong>Frage ${existingSession.current_index} von ${fragen.length}</strong> aufgehört.</p>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-primary" style="padding:13px" onclick="window._quizResume()">▶ Weitermachen</button>
            <button class="btn btn-secondary" style="padding:13px" onclick="window._quizFresh()">🔄 Neu starten</button>
          </div>
        </div>
      </div>`;
    window._quizState = { inhalt, backLabel, backFn, onCompleteFn };
    window._quizResume = () => _startQuiz(inhalt, backLabel, backFn, onCompleteFn, existingSession, inhaltTyp, false);
    window._quizFresh  = () => _startQuiz(inhalt, backLabel, backFn, onCompleteFn, null, inhaltTyp, true);
    if (isMob) { setMobile(resumeHTML); setDesktop(''); }
    else       { setDesktop(resumeHTML); setMobile(''); }
    return;
  }

  _startQuiz(inhalt, backLabel, backFn, onCompleteFn, existingSession, inhaltTyp, true);
}

async function _startQuiz(inhalt, backLabel, backFn, onCompleteFn, session, inhaltTyp, fresh) {
  const fragen = inhalt.inhalt?.fragen || [];
  let shuffled, current, richtig, teilweise, falsch;

  if (!fresh && session && session.reihenfolge) {
    shuffled  = session.reihenfolge.map(id => fragen[id]).filter(Boolean);
    current   = session.current_index;
    richtig   = session.richtig || 0;
    teilweise = session.teilweise || 0;
    falsch    = session.falsch || 0;
  } else {
    shuffled  = [...fragen].sort(() => Math.random() - 0.5);
    current   = 0; richtig = 0; teilweise = 0; falsch = 0;
    // Neue Session anlegen
    await db.from('quiz_session').upsert({
      user_id: USER.id, inhalt_id: inhalt.id, inhalt_typ: inhaltTyp,
      current_index: 0, richtig: 0, teilweise: 0, falsch: 0,
      reihenfolge: shuffled.map((_, i) => fragen.indexOf(_)),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,inhalt_id,inhalt_typ' });
  }

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

      <!-- Quiz Card -->
      <div class="quiz-card" id="quiz-flip-card">${shuffled[current].frage}</div>

      <textarea class="quiz-textarea" id="quiz-answer" placeholder="Antwort hier schreiben... (Strg+Enter zum Abgeben)"></textarea>
      <button class="quiz-submit" id="quiz-submit" onclick="quizAbgeben()">✓ Antwort abgeben</button>
      <button class="quiz-next" id="quiz-next" onclick="quizWeiter()">Weiter →</button>
    </div>`;
    if (isMob) { setMobile(backBtnHTML + titleHTML + html); setDesktop(""); }
    else        { setDesktop(backBtnHTML + titleHTML + html); setMobile(""); }
    setTimeout(() => {
      const ta = document.getElementById('quiz-answer');
      if (ta) ta.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.key==='Enter') quizAbgeben(); });
    }, 50);
  }

  // Falsch beantwortete Fragen für Wiederholung speichern
  const falscheFragen = [];

  window.quizAbgeben = function() {
    const answerEl = document.getElementById('quiz-answer');
    const answer = answerEl?.value.trim();
    if (!answer || answer.length < 2) return;

    const submitBtn = document.getElementById('quiz-submit');
    const nextBtn   = document.getElementById('quiz-next');
    const flipCard  = document.getElementById('quiz-flip-card');

    if (submitBtn) submitBtn.disabled = true;
    if (answerEl)  answerEl.disabled  = true;

    const { verdict, matched, missing } = bewerte(answer, shuffled[current]);
    if (verdict==='richtig') richtig++; else if (verdict==='teilweise') teilweise++; else falsch++;

    const icons   = { richtig:'✅ Richtig!', teilweise:'⚡ Teilweise richtig', falsch:'❌ Falsch' };
    const kwFound = matched.map(k => `<span class="kw-found">✓ ${k}</span>`).join('');
    const kwMiss  = missing.map(k => `<span class="kw-miss">✗ ${k}</span>`).join('');

    // Textarea einfärben
    if (answerEl) answerEl.className = 'quiz-textarea ' + verdict;

    // Card Reveal
    if (flipCard) {
      flipCard.className = 'quiz-card ' + verdict + ' quiz-card-reveal';
      flipCard.innerHTML =
        '<div class="quiz-flip-verdict">' + icons[verdict] + '</div>' +
        '<div class="quiz-flip-muster"><strong>Musterlösung:</strong> ' + shuffled[current].muster + '</div>' +
        (kwFound || kwMiss ? '<div class="quiz-flip-kw">' + kwFound + kwMiss + '</div>' : '');
    }

    if (submitBtn) submitBtn.style.display = 'none';
    if (nextBtn)   nextBtn.style.display   = 'block';
  };

  window.quizWeiter = function() {
    // Falsche Fragen tracken
    const lastVerdict = document.getElementById('quiz-feedback')?.className?.replace('quiz-feedback ', '');
    if (lastVerdict === 'falsch' || lastVerdict === 'teilweise') {
      falscheFragen.push(shuffled[current]);
    }
    current++;

    // Session speichern
    db.from('quiz_session').upsert({
      user_id: USER.id, inhalt_id: inhalt.id, inhalt_typ: inhaltTyp,
      current_index: current, richtig, teilweise, falsch,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,inhalt_id,inhalt_typ' });

    if (current >= shuffled.length) {
      // Session löschen wenn fertig
      db.from('quiz_session').delete().eq('user_id', USER.id).eq('inhalt_id', inhalt.id).eq('inhalt_typ', inhaltTyp);
      const isMob = window.innerWidth <= 700;
      const pts = richtig + teilweise * 0.5;
      const pct = Math.round((pts / shuffled.length) * 100);
      const bestanden = pct >= 80;

      // Nur als erledigt markieren wenn >= 80%
      if (bestanden && window._quizState.onCompleteFn) {
        window._quizState.onCompleteFn();
      }

      const scoreColor = bestanden ? 'var(--correct)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
      const scoreBg    = bestanden ? '#10b98115' : pct >= 50 ? '#f59e0b15' : '#ef444415';
      const scoreBorder= bestanden ? '#10b98130' : pct >= 50 ? '#f59e0b30' : '#ef444430';
      const statusMsg  = bestanden
        ? '<div style="color:var(--correct);font-weight:700;margin-bottom:8px">✅ Als erledigt markiert!</div>'
        : pct >= 50
          ? '<div style="color:var(--warning);font-weight:600;font-size:0.88rem;margin-bottom:8px">⚡ Noch nicht erledigt — mind. 80% erforderlich</div>'
          : '<div style="color:var(--danger);font-weight:600;font-size:0.88rem;margin-bottom:8px">❌ Noch nicht erledigt — mind. 80% erforderlich</div>';

      const wiederholBtn = falscheFragen.length > 0
        ? `<button class="quiz-restart" style="background:linear-gradient(135deg,var(--warning),var(--danger))"
            onclick="renderQuizWiederholung()">
            🔄 ${falscheFragen.length} falsche Fragen wiederholen
           </button>`
        : '';

      const resHTML = quizStyles + `<div class="quiz-wrap"><div class="quiz-result">
        <div style="font-size:2.5rem;margin-bottom:12px">${bestanden ? '🎉' : pct >= 50 ? '📚' : '💪'}</div>
        <h2 style="margin:0 0 12px">Quiz abgeschlossen!</h2>
        <div style="background:${scoreBg};border:1px solid ${scoreBorder};border-radius:16px;padding:20px;margin-bottom:16px">
          <div style="font-family:'Syne',sans-serif;font-size:3rem;font-weight:800;color:${scoreColor};line-height:1">${pct}%</div>
          <div style="font-size:0.82rem;color:var(--muted2);margin-top:4px">${shuffled.length} Fragen · ${richtig} richtig · ${teilweise} teilweise · ${falsch} falsch</div>
        </div>
        ${statusMsg}
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
          ${wiederholBtn}
          <button class="quiz-restart" onclick="renderQuiz(window._quizState.inhalt,window._quizState.backLabel,window._quizState.backFn,window._quizState.onCompleteFn)">🔄 Nochmal von vorne</button>
          <button class="btn btn-secondary" onclick="window._quizState.backFn()">← Zurück</button>
        </div>
      </div></div>`;
      if (isMob) setMobile(resHTML); else setDesktop(resHTML);

      // Wiederholungs-Funktion
      window.renderQuizWiederholung = function() {
        const wiederholInhalt = {
          ...window._quizState.inhalt,
          titel: window._quizState.inhalt.titel + ' — Wiederholung',
          inhalt: { fragen: falscheFragen }
        };
        renderQuiz(wiederholInhalt, window._quizState.backLabel, window._quizState.backFn, window._quizState.onCompleteFn);
      };

      return;
    }
    renderView();
  };

  renderView();
}
// ── LERNKARTEN RENDERER ───────────────────────────────────────
function renderLernkarten(inhalt, backLabel, backFn, onCompleteFn) {
  const karten = inhalt.inhalt?.karten || [];
  if (!karten.length) return alert("Keine Lernkarten gefunden.");

  const shuffled = [...karten].sort(() => Math.random() - 0.5);
  let current = 0, gewusst = 0, nichtGewusst = 0;

  const styles = `<style>
    .lk-wrap{max-width:580px}
    .lk-progress-wrap{margin-bottom:20px}
    .lk-progress-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .lk-progress-label{font-size:0.78rem;color:var(--muted2);font-weight:600}
    .lk-progress{height:6px;background:var(--border);border-radius:99px;overflow:hidden}
    .lk-progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width 0.5s ease}
    .lk-scores{display:flex;gap:10px;margin-bottom:20px}
    .lk-score-pill{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:99px;font-size:0.82rem;font-weight:700}
    .lk-score-g{background:#10b98115;border:1px solid #10b98130;color:var(--correct)}
    .lk-score-n{background:#ef444415;border:1px solid #ef444430;color:var(--danger)}
    .lk-scene{width:100%;perspective:1200px;margin-bottom:20px;height:220px;cursor:pointer}
    .lk-card{width:100%;height:220px;position:relative;transform-style:preserve-3d;transition:transform 0.55s cubic-bezier(0.4,0,0.2,1)}
    .lk-card.flipped{transform:rotateY(180deg)}
    .lk-front,.lk-back{position:absolute;top:0;left:0;right:0;bottom:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;text-align:center;gap:10px}
    .lk-front{background:var(--surface);border:1px solid var(--border)}
    .lk-back{background:var(--surface2);border:1px solid var(--border2);transform:rotateY(180deg)}
    .lk-back.gewusst{background:#10b98112;border-color:#10b98130}
    .lk-back.nicht{background:#ef444412;border-color:#ef444430}
    .lk-hint{font-size:0.72rem;color:var(--muted);margin-top:8px}
    .lk-tag{font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--accent)}
    .lk-word{font-size:1.8rem;font-weight:800;font-family:"Syne",sans-serif;line-height:1.2}
    .lk-sub{font-size:0.85rem;color:var(--muted2);font-style:italic}
    .lk-btn-row{display:flex;gap:10px;margin-top:4px}
    .lk-btn{flex:1;padding:14px;border:none;border-radius:14px;font-family:inherit;font-size:0.95rem;font-weight:700;cursor:pointer;transition:all 0.18s;display:none}
    .lk-btn:active{transform:scale(0.97)}
    .lk-btn-flip{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;width:100%;flex:none}
    .lk-btn-g{background:#10b98120;border:1px solid #10b98140;color:var(--correct)}
    .lk-btn-n{background:#ef444420;border:1px solid #ef444440;color:var(--danger)}
    .lk-result{text-align:center;padding:12px 0}
    .lk-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
    .lk-result-stat{border-radius:14px;padding:16px;text-align:center}
    .lk-result-val{font-size:2rem;font-weight:800;font-family:"Syne",sans-serif;line-height:1}
    .lk-result-lbl{font-size:0.75rem;color:var(--muted2);margin-top:4px;font-weight:600}
  </style>`;

  function getEl(id) {
    const isMob = window.innerWidth <= 700;
    const container = isMob ? document.getElementById('mob-main') : document.getElementById('main');
    return container ? container.querySelector('#' + id) : document.getElementById(id);
  }

  function cardHTML() {
    const k = shuffled[current];
    const pct = Math.round((current / shuffled.length) * 100);
    return styles +
      '<div class="lk-wrap">' +
        '<div class="lk-progress-wrap">' +
          '<div class="lk-progress-top">' +
            '<span class="lk-progress-label">Karte ' + (current+1) + ' von ' + shuffled.length + '</span>' +
            '<span class="lk-progress-label">' + pct + '%</span>' +
          '</div>' +
          '<div class="lk-progress"><div class="lk-progress-fill" style="width:' + pct + '%"></div></div>' +
        '</div>' +
        '<div class="lk-scores">' +
          '<div class="lk-score-pill lk-score-g">✅ ' + gewusst + ' gewusst</div>' +
          '<div class="lk-score-pill lk-score-n">❌ ' + nichtGewusst + ' nicht gewusst</div>' +
        '</div>' +
        '<div class="lk-scene" onclick="lkFlip()">' +
          '<div class="lk-card" id="lk-card">' +
            '<div class="lk-front">' +
              '<div class="lk-tag">❓ Frage</div>' +
              '<div class="lk-word">' + k.frage + '</div>' +
              '<div class="lk-hint">Tippe zum Umdrehen</div>' +
            '</div>' +
            '<div class="lk-back" id="lk-back">' +
              '<div class="lk-tag" style="color:var(--correct)">💡 Antwort</div>' +
              '<div class="lk-word">' + k.antwort + '</div>' +
              (k.erklaerung ? '<div class="lk-sub">' + k.erklaerung + '</div>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="lk-btn-row">' +
          '<button class="lk-btn lk-btn-flip" id="lk-flip-btn" onclick="lkFlip()">👁 Antwort zeigen</button>' +
          '<button class="lk-btn lk-btn-n" id="lk-btn-n" onclick="lkWeiter(false)">❌ Nicht gewusst</button>' +
          '<button class="lk-btn lk-btn-g" id="lk-btn-g" onclick="lkWeiter(true)">✅ Gewusst</button>' +
        '</div>' +
      '</div>';
  }

  function resultHTML() {
    const pct = Math.round((gewusst / shuffled.length) * 100);
    const bestanden = pct >= 80;
    const scoreColor  = bestanden ? 'var(--correct)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
    const scoreBg     = bestanden ? '#10b98115' : pct >= 50 ? '#f59e0b15' : '#ef444415';
    const scoreBorder = bestanden ? '#10b98130' : pct >= 50 ? '#f59e0b30' : '#ef444430';

    return styles +
      '<div class="lk-wrap"><div class="lk-result">' +
        '<div style="font-size:3rem;margin-bottom:12px">' + (bestanden ? '🎉' : pct >= 50 ? '📚' : '💪') + '</div>' +
        '<h2 style="margin-bottom:6px">Lernkarten abgeschlossen!</h2>' +
        '<div style="background:' + scoreBg + ';border:1px solid ' + scoreBorder + ';border-radius:20px;padding:20px;margin-bottom:16px">' +
          '<div style="font-family:Syne,sans-serif;font-size:3rem;font-weight:800;color:' + scoreColor + ';line-height:1">' + pct + '%</div>' +
          '<div style="font-size:0.82rem;color:var(--muted2);margin-top:4px">' + shuffled.length + ' Karten</div>' +
        '</div>' +
        (bestanden
          ? '<div style="color:var(--correct);font-weight:700;margin-bottom:12px">✅ Als erledigt markiert!</div>'
          : '<div style="color:var(--warning);font-size:0.88rem;font-weight:600;margin-bottom:12px">⚡ Noch nicht erledigt — mind. 80% erforderlich</div>') +
        '<div class="lk-result-grid">' +
          '<div class="lk-result-stat" style="background:#10b98112;border:1px solid #10b98128"><div class="lk-result-val" style="color:var(--correct)">' + gewusst + '</div><div class="lk-result-lbl">✅ Gewusst</div></div>' +
          '<div class="lk-result-stat" style="background:#ef444412;border:1px solid #ef444428"><div class="lk-result-val" style="color:var(--danger)">' + nichtGewusst + '</div><div class="lk-result-lbl">❌ Nicht gewusst</div></div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">' +
          '<button class="btn btn-primary" style="padding:13px" onclick="renderLernkarten(window._lkState.inhalt,window._lkState.backLabel,window._lkState.backFn,window._lkState.onCompleteFn)">🔄 Nochmal</button>' +
          '<button class="btn btn-secondary" style="padding:13px" onclick="window._lkState.backFn()">← Zurück</button>' +
        '</div>' +
      '</div></div>';
  }

  function render() {
    const isMob  = window.innerWidth <= 700;
    const backD  = '<button class="btn btn-secondary btn-sm" onclick="window._lkState.backFn()" style="margin-bottom:20px">' + backLabel + '</button>';
    const backM  = '<button class="mob-back" onclick="window._lkState.backFn()">' + backLabel + '</button>';
    const titleD = '<h1 style="margin-bottom:20px">' + inhalt.titel + '</h1>';
    const titleM = '<div style="font-size:1.1rem;font-weight:700;margin-bottom:16px">' + inhalt.titel + '</div>';
    if (isMob) { setMobile(backM + titleM + cardHTML()); setDesktop(''); }
    else       { setDesktop(backD + titleD + cardHTML()); setMobile(''); }
  }

  window._lkState = { inhalt, backLabel, backFn, onCompleteFn };

  window.lkFlip = function() {
    const card    = getEl('lk-card');
    const flipBtn = getEl('lk-flip-btn');
    const btnG    = getEl('lk-btn-g');
    const btnN    = getEl('lk-btn-n');
    if (!card) return;
    card.classList.add('flipped');
    if (flipBtn) flipBtn.style.display = 'none';
    if (btnG) btnG.style.display = 'block';
    if (btnN) btnN.style.display = 'block';
  };

  window.lkWeiter = function(hatGewusst) {
    if (hatGewusst) gewusst++; else nichtGewusst++;
    current++;

    // Session speichern
    db.from('quiz_session').upsert({
      user_id: USER.id, inhalt_id: inhalt.id, inhalt_typ: inhaltTyp,
      current_index: current, richtig, teilweise, falsch,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,inhalt_id,inhalt_typ' });

    if (current >= shuffled.length) {
      // Session löschen wenn fertig
      db.from('quiz_session').delete().eq('user_id', USER.id).eq('inhalt_id', inhalt.id).eq('inhalt_typ', inhaltTyp);
      const pct = Math.round((gewusst / shuffled.length) * 100);
      const bestanden = pct >= 80;
      if (bestanden && onCompleteFn) onCompleteFn();
      const isMob = window.innerWidth <= 700;
      const backD = '<button class="btn btn-secondary btn-sm" onclick="window._lkState.backFn()" style="margin-bottom:20px">' + backLabel + '</button>';
      const backM = '<button class="mob-back" onclick="window._lkState.backFn()">' + backLabel + '</button>';
      if (isMob) { setMobile(backM + resultHTML()); setDesktop(''); }
      else       { setDesktop(backD + resultHTML()); setMobile(''); }
      return;
    }
    render();
  };

  render();
}