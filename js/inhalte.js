// ── INHALTE VERWALTEN (MOD+) ─────────────────────────────────
// Verwaltet Inhalte für Lernfelder UND Fach-Kapitel

async function showInhalte() {
  setActive('lnk-inhalte', 'bn-mod');
  showSpinner();

  const [
    { data: lernfelder },
    { data: inhalte },
    { data: faecher },
    { data: kapitel },
    { data: fachInhalte },
  ] = await Promise.all([
    db.from('lernfelder').select('id, nummer, name').order('nummer'),
    db.from('inhalte').select('*, lernfelder(nummer, name)').order('lernfeld_id').order('reihenfolge'),
    db.from('faecher').select('*').order('reihenfolge'),
    db.from('fach_kapitel').select('*, faecher(name, icon)').order('fach_id').order('reihenfolge'),
    db.from('fach_inhalte').select('*, fach_kapitel(name, faecher(name))').order('kapitel_id').order('reihenfolge'),
  ]);

  window._lf      = lernfelder;
  window._kapitel = kapitel;

  const typeIcon = { text:'📄', quiz:'❓', lernkarten:'🃏', grammatik:'📝' };

  // ── Desktop: Tab-Switcher LF | Fächer ──────────────────────
  const tabStyle = (active) =>
    `padding:8px 18px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;transition:all 0.2s;${active ? 'background:var(--surface);color:var(--text)' : 'background:none;color:var(--muted2)'}`;

  // Lernfeld-Gruppen
  const lfGrouped = {};
  (lernfelder||[]).forEach(lf => { lfGrouped[lf.id] = { lf, items:[] }; });
  (inhalte||[]).forEach(i => { if (lfGrouped[i.lernfeld_id]) lfGrouped[i.lernfeld_id].items.push(i); });

  const lfGroupsHTML = Object.values(lfGrouped).map(({ lf, items }) => {
    if (!items.length) return '';
    const rows = items.map(i => `<tr>
      <td>${typeIcon[i.typ]||'📄'} <span style="color:var(--muted2);font-size:0.8rem;text-transform:capitalize">${i.typ}</span></td>
      <td style="font-weight:500">${i.titel}</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-secondary btn-sm" onclick="showInhalt(${i.id},${i.lernfeld_id})">👁</button>
        <button class="btn btn-danger btn-sm"    onclick="deleteInhalt(${i.id})">🗑</button>
      </td>
    </tr>`).join('');
    return `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;cursor:pointer;padding:4px 0"
             onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px">LF ${lf.nummer}</span>
            <h3 style="font-size:0.95rem;margin:0">${lf.name}</h3>
            <span style="font-size:0.75rem;color:var(--muted2);background:var(--surface2);padding:2px 8px;border-radius:99px">${items.length}</span>
          </div>
          <span style="color:var(--muted2)">▾</span>
        </div>
        <div>
          <div class="table-wrap"><table>
            <thead><tr><th>Typ</th><th>Titel</th><th>Aktionen</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
        </div>
      </div>`;
  }).join('') || '<div class="alert alert-info">Noch keine Lernfeld-Inhalte.</div>';

  // Fach-Gruppen
  const fachGrouped = {};
  (kapitel||[]).forEach(k => { fachGrouped[k.id] = { k, items:[] }; });
  (fachInhalte||[]).forEach(i => { if (fachGrouped[i.kapitel_id]) fachGrouped[i.kapitel_id].items.push(i); });

  const fachGroupsHTML = (faecher||[]).map(fach => {
    const fachKap = (kapitel||[]).filter(k => k.faecher?.name === fach.name);
    const kapSections = fachKap.map(k => {
      const { items } = fachGrouped[k.id] || { items:[] };
      if (!items.length) return '';
      const rows = items.map(i => `<tr>
        <td>${typeIcon[i.typ]||'📄'} <span style="color:var(--muted2);font-size:0.8rem;text-transform:capitalize">${i.typ}</span></td>
        <td style="font-weight:500">${i.titel}</td>
        <td style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="showFachInhaltEdit(${i.id},${k.id},${fach.id})">✏️</button>
          <button class="btn btn-danger btn-sm"    onclick="deleteFachInhalt(${i.id})">🗑</button>
        </td>
      </tr>`).join('');
      return `
        <div style="margin-bottom:14px;margin-left:12px;border-left:2px solid var(--border2);padding-left:14px">
          <div style="font-size:0.82rem;font-weight:600;color:var(--muted2);margin-bottom:8px">${k.name} <span style="background:var(--surface2);padding:1px 7px;border-radius:99px;font-size:0.72rem">${items.length}</span></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Typ</th><th>Titel</th><th>Aktionen</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
        </div>`;
    }).join('');
    if (!kapSections) return '';
    return `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;cursor:pointer"
             onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <span>${fach.icon}</span>
          <h3 style="font-size:0.95rem;margin:0">${fach.name}</h3>
          <span style="color:var(--muted2)">▾</span>
        </div>
        <div>${kapSections}</div>
      </div>`;
  }).join('') || '<div class="alert alert-info">Noch keine Fach-Inhalte.</div>';

  // ── Mobile: einfache Liste ──────────────────────────────────
  const mobLfCards = (inhalte||[]).map(i => `
    <div class="mob-inhalt-card">
      <div class="mob-inhalt-type">${typeIcon[i.typ]||'📄'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.72rem;color:var(--accent);font-weight:700">LF ${i.lernfelder?.nummer}</div>
        <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.titel}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteInhalt(${i.id})" style="flex-shrink:0">🗑</button>
    </div>`).join('') || '<div class="alert alert-info">Keine Lernfeld-Inhalte</div>';

  const mobFachCards = (fachInhalte||[]).map(i => `
    <div class="mob-inhalt-card" onclick="showFachInhaltEdit(${i.id},${i.kapitel_id},null)">
      <div class="mob-inhalt-type">${typeIcon[i.typ]||'📄'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.72rem;color:var(--accent);font-weight:700">${i.fach_kapitel?.faecher?.name} · ${i.fach_kapitel?.name}</div>
        <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.titel}</div>
      </div>
      <span style="color:var(--muted);font-size:1rem;flex-shrink:0">✏️</span>
    </div>`).join('') || '<div class="alert alert-info">Keine Fach-Inhalte</div>';

  setDesktop(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h1>Inhalte verwalten</h1>
      <button class="btn btn-primary" onclick="showAddForm()">+ Inhalt hinzufügen</button>
    </div>
    <div id="add-form" style="margin-bottom:8px"></div>

    <div style="display:flex;gap:4px;background:var(--surface2);border-radius:10px;padding:3px;margin-bottom:20px;width:fit-content">
      <button id="itab-lf-btn"     style="${tabStyle(true)}"  onclick="switchInhalteTab('lf')">📚 Lernfelder</button>
      <button id="itab-fach-btn"   style="${tabStyle(false)}" onclick="switchInhalteTab('fach')">📘 Fächer</button>
      <button id="itab-kapitel-btn" style="${tabStyle(false)}" onclick="switchInhalteTab('kapitel')">📂 Kapitel</button>
    </div>

    <div id="itab-lf">${lfGroupsHTML}</div>
    <div id="itab-fach" style="display:none">${fachGroupsHTML}</div>
    <div id="itab-kapitel" style="display:none"></div>
  `);

  setMobile(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div class="mob-greeting" style="font-size:1.1rem">✏️ Inhalte</div>
      <button class="btn btn-primary btn-sm" onclick="showAddFormMob()">+ Neu</button>
    </div>
    <div id="mob-add-form"></div>
    <div class="mob-section">Lernfelder</div>
    ${mobLfCards}
    <div class="mob-section" style="margin-top:20px">Fächer</div>
    ${mobFachCards}
    <div class="mob-section" style="margin-top:20px">📂 Kapitel verwalten</div>
    <div class="mob-menu-card" onclick="showKapitelVerwaltung()">
      <div class="mob-menu-icon">📂</div>
      <div class="mob-menu-info">
        <div class="mob-menu-title">Kapitel anlegen & löschen</div>
        <div class="mob-menu-sub">Kapitel für Englisch, Kommunikation & WiPo</div>
      </div>
      <div class="mob-lf-arrow">›</div>
    </div>
  `);
}

function switchInhalteTab(tab) {
  document.getElementById('itab-lf').style.display      = tab==='lf'      ? 'block' : 'none';
  document.getElementById('itab-fach').style.display    = tab==='fach'    ? 'block' : 'none';
  document.getElementById('itab-kapitel').style.display = tab==='kapitel' ? 'block' : 'none';
  const on  = 'background:var(--surface);color:var(--text);padding:8px 18px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;';
  const off = 'background:none;color:var(--muted2);padding:8px 18px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;';
  document.getElementById('itab-lf-btn').style.cssText      = tab==='lf'      ? on : off;
  document.getElementById('itab-fach-btn').style.cssText    = tab==='fach'    ? on : off;
  document.getElementById('itab-kapitel-btn').style.cssText = tab==='kapitel' ? on : off;
  if (tab === 'kapitel') renderKapitelVerwaltung();
}

// ── ADD FORM (Desktop) ────────────────────────────────────────
function showAddForm() {
  const lf  = window._lf      || [];
  const kap = window._kapitel || [];
  document.getElementById('add-form').innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:16px">Neuen Inhalt hinzufügen</h3>
      <div class="grid-2" style="margin-bottom:14px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Ziel</label>
          <select class="form-input" id="new-ziel" onchange="toggleZielTyp()">
            <optgroup label="📚 Lernfelder">${lf.map(l=>`<option value="lf-${l.id}">LF ${l.nummer}: ${l.name}</option>`).join('')}</optgroup>
            <optgroup label="📘 Fächer">${kap.map(k=>`<option value="fach-${k.id}">${k.faecher?.name} → ${k.name}</option>`).join('')}</optgroup>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Typ</label>
          <select class="form-input" id="new-typ">
            <option value="text">📄 Text</option>
            <option value="quiz">❓ Quiz</option>
            <option value="lernkarten">🃏 Lernkarten</option>
            <option value="grammatik">📝 Grammatik</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Titel</label>
        <input class="form-input" type="text" id="new-titel" placeholder="z.B. Materialfluss – Grundlagen">
      </div>
      <div class="form-group">
        <label class="form-label">Inhalt (<code style="font-size:0.8rem">**fett**</code> = wichtige Begriffe)</label>
        <textarea class="form-input" id="new-text" rows="6" placeholder="Schreibe hier den Lerninhalt..."></textarea>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary" onclick="saveInhalt()">💾 Speichern</button>
        <button class="btn btn-secondary" onclick="document.getElementById('add-form').innerHTML=''">Abbrechen</button>
      </div>
      <div id="save-msg" style="margin-top:12px"></div>
    </div>`;
}

// ── ADD FORM (Mobile) ─────────────────────────────────────────
function showAddFormMob() {
  const lf  = window._lf      || [];
  const kap = window._kapitel || [];
  document.getElementById('mob-add-form').innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:14px;font-size:1rem">Neuer Inhalt</h3>
      <div class="form-group">
        <label class="form-label">Ziel</label>
        <select class="form-input" id="mob-new-ziel">
          <optgroup label="📚 Lernfelder">${lf.map(l=>`<option value="lf-${l.id}">LF ${l.nummer}: ${l.name}</option>`).join('')}</optgroup>
          <optgroup label="📘 Fächer">${kap.map(k=>`<option value="fach-${k.id}">${k.faecher?.name} → ${k.name}</option>`).join('')}</optgroup>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Titel</label>
        <input class="form-input" type="text" id="mob-new-titel" placeholder="Titel des Inhalts">
      </div>
      <div class="form-group">
        <label class="form-label">Inhalt</label>
        <textarea class="form-input" id="mob-new-text" rows="5" placeholder="Lerninhalt hier..."></textarea>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" onclick="saveInhaltMob()">💾 Speichern</button>
        <button class="btn btn-secondary" onclick="document.getElementById('mob-add-form').innerHTML=''">✕</button>
      </div>
      <div id="mob-save-msg" style="margin-top:10px"></div>
    </div>`;
}

// ── SAVE ─────────────────────────────────────────────────────
async function saveInhalt() {
  const ziel  = document.getElementById('new-ziel').value;
  const typ   = document.getElementById('new-typ').value;
  const titel = document.getElementById('new-titel').value.trim();
  const text  = document.getElementById('new-text').value.trim();
  const msgEl = document.getElementById('save-msg');
  if (!titel || !text) return msgEl.innerHTML = '<div class="alert alert-error">Bitte Titel und Inhalt ausfüllen.</div>';

  let error;
  if (ziel.startsWith('lf-')) {
    ({ error } = await db.from('inhalte').insert({ lernfeld_id: ziel.replace('lf-',''), typ, titel, inhalt:{text}, erstellt_von:USER.id }));
  } else {
    ({ error } = await db.from('fach_inhalte').insert({ kapitel_id: ziel.replace('fach-',''), typ, titel, inhalt:{text}, erstellt_von:USER.id }));
  }
  if (error) return msgEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  showInhalte();
}

async function saveInhaltMob() {
  const ziel  = document.getElementById('mob-new-ziel').value;
  const titel = document.getElementById('mob-new-titel').value.trim();
  const text  = document.getElementById('mob-new-text').value.trim();
  const msgEl = document.getElementById('mob-save-msg');
  if (!titel || !text) return msgEl.innerHTML = '<div class="alert alert-error">Felder ausfüllen.</div>';

  let error;
  if (ziel.startsWith('lf-')) {
    ({ error } = await db.from('inhalte').insert({ lernfeld_id: ziel.replace('lf-',''), typ:'text', titel, inhalt:{text}, erstellt_von:USER.id }));
  } else {
    ({ error } = await db.from('fach_inhalte').insert({ kapitel_id: ziel.replace('fach-',''), typ:'text', titel, inhalt:{text}, erstellt_von:USER.id }));
  }
  if (error) return msgEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  showInhalte();
}

// ── DELETE ────────────────────────────────────────────────────
async function deleteInhalt(id) {
  if (!confirm('Inhalt wirklich löschen?')) return;
  await db.from('inhalte').delete().eq('id', id);
  showInhalte();
}

async function deleteFachInhalt(id) {
  if (!confirm('Inhalt wirklich löschen?')) return;
  await db.from('fach_inhalte').delete().eq('id', id);
  showInhalte();
}

// ── FACH-INHALT BEARBEITEN ────────────────────────────────────
async function showFachInhaltEdit(inhaltId, kapitelId, fachId) {
  const { data: i } = await db.from('fach_inhalte')
    .select('*, fach_kapitel(id, name, fach_id, faecher(id, name))')
    .eq('id', inhaltId).maybeSingle();
  if (!i) return;

  // fachId aus DB holen falls nicht übergeben (mobile-Pfad)
  const resolvedFachId = fachId || i.fach_kapitel?.fach_id;

  const isQuiz = i.typ === 'quiz';
  const currentText = i.inhalt?.text || '';

  const quizHinweis = isQuiz ? `
    <div class="alert alert-info" style="margin-bottom:16px">
      ℹ️ Quiz-Inhalte kannst du hier nicht direkt bearbeiten. 
      Nutze <strong>⚡ Importieren</strong>, um ein neues Quiz hochzuladen und das alte zu löschen.
    </div>` : '';

  const formHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <button class="btn btn-secondary btn-sm" onclick="showInhalte()">← Zurück</button>
      <h1 style="font-size:1.2rem;margin:0">Inhalt bearbeiten</h1>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <span style="font-size:0.75rem;background:var(--surface2);padding:4px 10px;border-radius:99px;color:var(--muted2)">
          ${i.fach_kapitel?.faecher?.name} → ${i.fach_kapitel?.name}
        </span>
        <span style="font-size:0.75rem;background:var(--surface2);padding:4px 10px;border-radius:99px;color:var(--muted2);text-transform:capitalize">
          ${i.typ}
        </span>
      </div>

      ${quizHinweis}

      <div class="form-group">
        <label class="form-label">Titel</label>
        <input class="form-input" type="text" id="edit-fi-titel" value="${i.titel.replace(/"/g,'&quot;')}">
      </div>

      ${!isQuiz ? `
      <div class="form-group">
        <label class="form-label">Inhalt (<code style="font-size:0.8rem">**fett**</code> = wichtige Begriffe)</label>
        <textarea class="form-input" id="edit-fi-text" rows="10">${currentText}</textarea>
      </div>` : ''}

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="saveFachInhaltEdit(${i.id},${resolvedFachId},${kapitelId},${isQuiz})">
          💾 Speichern
        </button>
        <button class="btn btn-danger" onclick="deleteFachInhaltFromEdit(${i.id})">
          🗑 Löschen
        </button>
      </div>
      <div id="edit-fi-msg" style="margin-top:12px"></div>
    </div>

    ${isQuiz ? `
    <div class="card">
      <h3 style="margin-bottom:12px">Quiz-Fragen (Vorschau)</h3>
      ${(i.inhalt?.fragen||[]).map((f,idx) => `
        <div style="padding:12px 0;${idx>0?'border-top:1px solid var(--border)':''}">
          <div style="font-weight:600;font-size:0.88rem;margin-bottom:3px">Frage ${idx+1}: ${f.frage}</div>
          <div style="font-size:0.78rem;color:var(--muted2)">Muster: ${f.muster?.substring(0,80)}${f.muster?.length>80?'...':''}</div>
          <div style="font-size:0.75rem;color:var(--accent);margin-top:3px">${f.keywords?.length||0} Keyword-Gruppen · mind. ${f.required||1} erkannt</div>
        </div>`).join('')}
    </div>` : ''}
  `;

  setDesktop(formHTML);
  setMobile(formHTML);
}

async function saveFachInhaltEdit(id, fachId, kapitelId, isQuiz) {
  const titel  = document.getElementById('edit-fi-titel')?.value.trim();
  const msgEl  = document.getElementById('edit-fi-msg');
  if (!titel) return msgEl.innerHTML = '<div class="alert alert-error">Titel darf nicht leer sein.</div>';

  const updates = { titel };
  if (!isQuiz) {
    const text = document.getElementById('edit-fi-text')?.value.trim();
    if (!text) return msgEl.innerHTML = '<div class="alert alert-error">Inhalt darf nicht leer sein.</div>';
    updates.inhalt = { text };
  }

  const { error } = await db.from('fach_inhalte').update(updates).eq('id', id);
  if (error) return msgEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  msgEl.innerHTML = '<div class="alert alert-success">✅ Gespeichert!</div>';
  setTimeout(() => showInhalte(), 1200);
}

async function deleteFachInhaltFromEdit(id) {
  if (!confirm('Inhalt wirklich löschen?')) return;
  await db.from('fach_inhalte').delete().eq('id', id);
  showInhalte();
}

// ── KAPITEL VERWALTUNG ────────────────────────────────────────
async function renderKapitelVerwaltung() {
  const container = document.getElementById('itab-kapitel');
  if (!container) return;
  container.innerHTML = '<div style="display:flex;justify-content:center;padding:20px"><div class="spinner"></div></div>';

  const { data: faecher } = await db.from('faecher').select('*').order('reihenfolge');
  const { data: kapitel } = await db.from('fach_kapitel').select('*, faecher(name,icon)').order('fach_id').order('reihenfolge');

  const fachOptions = (faecher||[]).map(f => `<option value="${f.id}">${f.icon} ${f.name}</option>`).join('');

  const gruppen = (faecher||[]).map(fach => {
    const fachKap = (kapitel||[]).filter(k => k.fach_id === fach.id);
    const rows = fachKap.length
      ? fachKap.map((k,i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;${i>0?'border-top:1px solid var(--border)':''}">
            <div>
              <div style="font-weight:600;font-size:0.9rem">${k.name}</div>
              ${k.beschreibung ? `<div style="font-size:0.78rem;color:var(--muted2);margin-top:2px">${k.beschreibung}</div>` : ''}
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteKapitel(${k.id})">🗑</button>
          </div>`).join('')
      : '<div style="font-size:0.85rem;color:var(--muted2);padding:10px 0">Noch keine Kapitel</div>';

    return `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-size:1.2rem">${fach.icon}</span>
          <h3 style="margin:0;font-size:1rem">${fach.name}</h3>
          <span style="font-size:0.75rem;color:var(--muted2);background:var(--surface2);padding:2px 8px;border-radius:99px">${fachKap.length}</span>
        </div>
        <div class="card">${rows}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="card" style="margin-bottom:24px">
      <h3 style="margin-bottom:14px">Neues Kapitel anlegen</h3>
      <div class="grid-2" style="margin-bottom:14px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Fach</label>
          <select class="form-input" id="kap-fach">${fachOptions}</select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Reihenfolge</label>
          <input class="form-input" type="number" id="kap-reihenfolge" value="${(kapitel||[]).length + 1}" min="1">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="form-input" type="text" id="kap-name" placeholder="z.B. Unit 1: Workplace Communication">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Beschreibung (optional)</label>
        <input class="form-input" type="text" id="kap-beschreibung" placeholder="Kurze Beschreibung des Kapitels">
      </div>
      <div style="margin-top:14px;display:flex;align-items:center;gap:10px">
        <button class="btn btn-primary" onclick="saveKapitel()">+ Kapitel anlegen</button>
        <span id="kap-msg" style="font-size:0.85rem"></span>
      </div>
    </div>
    <h2 style="margin-bottom:16px">Vorhandene Kapitel</h2>
    ${gruppen}
  `;
}

// Mobile: eigene Seite
async function showKapitelVerwaltung() {
  setMobile('<div style="display:flex;justify-content:center;padding:40px"><div class="spinner"></div></div>');

  const { data: faecher } = await db.from('faecher').select('*').order('reihenfolge');
  const { data: kapitel } = await db.from('fach_kapitel').select('*, faecher(name,icon)').order('fach_id').order('reihenfolge');
  const fachOptions = (faecher||[]).map(f => `<option value="${f.id}">${f.icon} ${f.name}</option>`).join('');

  const kapitelCards = (kapitel||[]).map(k => `
    <div class="mob-lf-card" style="cursor:default">
      <div class="mob-lf-icon-wrap" style="font-size:1rem">${k.faecher?.icon||'📘'}</div>
      <div class="mob-lf-info">
        <div class="mob-lf-num">${k.faecher?.name}</div>
        <div class="mob-lf-name">${k.name}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteKapitelMob(${k.id})">🗑</button>
    </div>`).join('') || '<div class="alert alert-info">Noch keine Kapitel vorhanden.</div>';

  setMobile(`
    <button class="mob-back" onclick="showInhalte()">← Zurück</button>
    <div class="mob-greeting" style="font-size:1.1rem">📂 Kapitel verwalten</div>
    <div class="mob-greeting-sub" style="margin-bottom:20px">Kapitel für Fächer anlegen & löschen</div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:14px;font-size:1rem">Neues Kapitel</h3>
      <div class="form-group">
        <label class="form-label">Fach</label>
        <select class="form-input" id="mob-kap-fach">${fachOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="form-input" type="text" id="mob-kap-name" placeholder="z.B. Unit 1: Workplace">
      </div>
      <div class="form-group">
        <label class="form-label">Beschreibung (optional)</label>
        <input class="form-input" type="text" id="mob-kap-beschreibung" placeholder="Kurze Beschreibung">
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-primary" style="flex:1" onclick="saveKapitelMob()">+ Anlegen</button>
      </div>
      <div id="mob-kap-msg" style="margin-top:10px"></div>
    </div>

    <div class="mob-section">Vorhandene Kapitel</div>
    <div id="mob-kapitel-list">${kapitelCards}</div>
  `);
}

async function saveKapitel() {
  const fachId      = document.getElementById('kap-fach').value;
  const name        = document.getElementById('kap-name').value.trim();
  const beschreibung = document.getElementById('kap-beschreibung').value.trim();
  const reihenfolge = parseInt(document.getElementById('kap-reihenfolge').value) || 1;
  const msgEl       = document.getElementById('kap-msg');
  if (!name) return msgEl.innerHTML = '<span style="color:var(--danger)">❌ Name fehlt.</span>';

  const { error } = await db.from('fach_kapitel').insert({ fach_id:fachId, name, beschreibung:beschreibung||null, reihenfolge });
  if (error) return msgEl.innerHTML = `<span style="color:var(--danger)">❌ ${error.message}</span>`;

  document.getElementById('kap-name').value = '';
  document.getElementById('kap-beschreibung').value = '';
  msgEl.innerHTML = '<span style="color:var(--correct)">✅ Kapitel angelegt!</span>';
  setTimeout(() => { msgEl.innerHTML=''; renderKapitelVerwaltung(); }, 1000);

  // Cache aktualisieren
  const { data } = await db.from('fach_kapitel').select('*, faecher(name, icon)').order('fach_id').order('reihenfolge');
  window._kapitel = data || [];
}

async function saveKapitelMob() {
  const fachId       = document.getElementById('mob-kap-fach').value;
  const name         = document.getElementById('mob-kap-name').value.trim();
  const beschreibung = document.getElementById('mob-kap-beschreibung').value.trim();
  const msgEl        = document.getElementById('mob-kap-msg');
  if (!name) return msgEl.innerHTML = '<div class="alert alert-error">Name fehlt.</div>';

  const { data: existing } = await db.from('fach_kapitel').select('reihenfolge').eq('fach_id', fachId).order('reihenfolge', { ascending:false }).limit(1);
  const reihenfolge = (existing?.[0]?.reihenfolge || 0) + 1;

  const { error } = await db.from('fach_kapitel').insert({ fach_id:fachId, name, beschreibung:beschreibung||null, reihenfolge });
  if (error) return msgEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  msgEl.innerHTML = '<div class="alert alert-success">✅ Kapitel angelegt!</div>';
  setTimeout(() => showKapitelVerwaltung(), 1000);
}

async function deleteKapitel(id) {
  if (!confirm('Kapitel und alle enthaltenen Inhalte löschen?')) return;
  await db.from('fach_kapitel').delete().eq('id', id);
  renderKapitelVerwaltung();
}

async function deleteKapitelMob(id) {
  if (!confirm('Kapitel und alle enthaltenen Inhalte löschen?')) return;
  await db.from('fach_kapitel').delete().eq('id', id);
  showKapitelVerwaltung();
}
