// ── INHALTE & KAPITEL VERWALTEN (MOD+) ───────────────────────

async function showInhalte() {
  setActive('lnk-inhalte', 'bn-mod');
  showSpinner();

  // Daten abrufen
  const [
    { data: lernfelder },
    { data: inhalte },
    { data: faecher },
    { data: kapitel },
    { data: fachInhalte },
  ] = await Promise.all([
    db.from('lernfelder').select('id, nummer, name').order('nummer'),
    db.from('inhalte').select('id, lernfeld_id, typ, titel, reihenfolge, lernfelder(nummer, name)').order('lernfeld_id').order('reihenfolge'),
    db.from('faecher').select('*').order('reihenfolge'),
    db.from('fach_kapitel').select('*, faecher(name, icon)').order('fach_id').order('reihenfolge'),
    db.from('fach_inhalte').select('id, kapitel_id, typ, titel, reihenfolge, fach_kapitel(name, faecher(name))').order('kapitel_id').order('reihenfolge'),
  ]);

  window._lf      = lernfelder;
  window._kapitel = kapitel;
  window._faecher = faecher;

  const typeIcon = { text:'📄', quiz:'❓', lernkarten:'🃏', grammatik:'📝' };

  // ── HTML GENERIERUNG (Desktop) ─────────────────────────────
  
  // 1. Lernfeld-Inhalte
  const lfGroupsHTML = (lernfelder||[]).map(lf => {
    const items = (inhalte||[]).filter(i => i.lernfeld_id === lf.id);
    if (!items.length) return '';
    return `
      <div class="card" style="margin-bottom:15px">
        <div style="font-weight:700; margin-bottom:10px; color:var(--accent)">LF ${lf.nummer}: ${lf.name}</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Typ</th><th>Titel</th><th style="text-align:right">Aktion</th></tr></thead>
          <tbody>${items.map(i=>`<tr><td style="width:40px">${typeIcon[i.typ]}</td><td>${i.titel}</td><td style="text-align:right"><button class="btn btn-danger btn-sm" onclick="deleteInhalt(${i.id})">🗑 Löschen</button></td></tr>`).join('')}</tbody>
        </table></div>
      </div>`;
  }).join('') || '<div class="alert alert-info">Keine Lernfeld-Inhalte.</div>';

  // 2. Fach-Inhalte (WIPO, Englisch etc.)
  const fachInhalteHTML = (faecher||[]).map(f => {
    const fKap = (kapitel||[]).filter(k => k.fach_id === f.id);
    const sections = fKap.map(k => {
      const items = (fachInhalte||[]).filter(fi => fi.kapitel_id === k.id);
      if (!items.length) return '';
      return `
        <div style="margin-bottom:15px; padding-left:12px; border-left:2px solid var(--accent)">
          <div style="font-weight:700; font-size:0.9rem; margin-bottom:8px">${k.name}</div>
          <div class="table-wrap"><table>
            <tbody>${items.map(i=>`<tr><td style="width:40px">${typeIcon[i.typ]}</td><td>${i.titel}</td><td style="text-align:right"><button class="btn btn-danger btn-sm" onclick="deleteFachInhalt(${i.id})">🗑 Löschen</button></td></tr>`).join('')}</tbody>
          </table></div>
        </div>`;
    }).join('');
    return sections ? `<div class="card" style="margin-bottom:15px"><h3>${f.icon} ${f.name}</h3>${sections}</div>` : '';
  }).join('') || '<div class="alert alert-info">Noch keine Fach-Inhalte.</div>';

  // 3. Kapitel-Verwaltung
  const kapitelListeHTML = (faecher||[]).map(f => {
    const fKap = (kapitel||[]).filter(k => k.fach_id === f.id);
    return `
      <div class="card" style="margin-bottom:15px">
        <h3>${f.icon} ${f.name}</h3>
        <div class="table-wrap"><table>
          ${fKap.map(k=>`<tr><td>${k.name}</td><td style="text-align:right"><button class="btn btn-danger btn-sm" onclick="deleteKapitel(${k.id})">🗑</button></td></tr>`).join('')}
          ${!fKap.length ? '<tr><td style="color:var(--muted2)">Keine Kapitel angelegt.</td></tr>' : ''}
        </table></div>
      </div>`;
  }).join('');

  setDesktop(`
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px">
      <h1>Inhalte verwalten</h1>
      <div style="display:flex; gap:8px">
        <button class="btn btn-secondary" onclick="showAddKapitelForm()">+ Kapitel</button>
        <button class="btn btn-primary" onclick="showAddForm()">+ Inhalt</button>
      </div>
    </div>
    <div id="admin-form-area"></div>
    <div style="display:flex; gap:8px; background:var(--surface2); border-radius:10px; padding:4px; margin-bottom:20px; width:fit-content">
      <button id="itab-lf-btn" class="btn" onclick="switchInhalteTab('lf')">📚 Lernfelder</button>
      <button id="itab-fach-btn" class="btn" onclick="switchInhalteTab('fach')">📘 Fächer</button>
      <button id="itab-kap-btn" class="btn" onclick="switchInhalteTab('kap')">📂 Kapitel</button>
    </div>
    <div id="itab-lf">${lfGroupsHTML}</div>
    <div id="itab-fach" style="display:none">${fachInhalteHTML}</div>
    <div id="itab-kap"  style="display:none">${kapitelListeHTML}</div>
  `);

  setMobile(`
    <div class="mob-greeting">✏️ Verwaltung</div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px">
      <button class="btn btn-secondary btn-sm" onclick="showAddKapitelForm()">+ Kapitel</button>
      <button class="btn btn-primary btn-sm" onclick="showAddForm()">+ Inhalt</button>
    </div>
    <div id="mob-admin-form"></div>
    <div class="mob-section">📚 Inhalte</div>
    ${(inhalte||[]).map(i=>`<div class="mob-inhalt-card"><div class="mob-inhalt-type">${typeIcon[i.typ]}</div><div style="flex:1">LF ${i.lernfelder?.nummer}: ${i.titel}</div><button class="btn btn-danger btn-sm" onclick="deleteInhalt(${i.id})">🗑</button></div>`).join('')}
    <div class="mob-section" style="margin-top:20px">📘 Fächer</div>
    ${(fachInhalte||[]).map(i=>`<div class="mob-inhalt-card"><div class="mob-inhalt-type">${typeIcon[i.typ]}</div><div style="flex:1"><b>${i.fach_kapitel?.faecher?.name}</b><br>${i.titel}</div><button class="btn btn-danger btn-sm" onclick="deleteFachInhalt(${i.id})">🗑</button></div>`).join('')}
  `);
  
  switchInhalteTab('lf');
}

function switchInhalteTab(tab) {
  ['lf', 'fach', 'kap'].forEach(t => {
    const el = document.getElementById('itab-' + t);
    const btn = document.getElementById('itab-' + t + '-btn');
    if (el) el.style.display = (t === tab ? 'block' : 'none');
    if (btn) btn.style.background = (t === tab ? 'var(--surface)' : 'none');
    if (btn) btn.style.color = (t === tab ? 'var(--text)' : 'var(--muted2)');
  });
}

// ── LÖSCH-LOGIK (VERBESSERT) ──────────────────────────────────

async function deleteInhalt(id) {
  if (!confirm('Diesen Inhalt und den dazugehörigen Fortschritt aller Nutzer wirklich löschen?')) return;
  // 1. Fortschritt löschen (wegen Foreign Key Constraint)
  await db.from('fortschritt').delete().eq('inhalt_id', id);
  // 2. Inhalt löschen
  const { error } = await db.from('inhalte').delete().eq('id', id);
  if (error) alert("Fehler: " + error.message);
  showInhalte();
}

async function deleteFachInhalt(id) {
  if (!confirm('Diesen Fach-Inhalt und den dazugehörigen Fortschritt wirklich löschen?')) return;
  // 1. Fortschritt löschen
  await db.from('fach_fortschritt').delete().eq('inhalt_id', id);
  // 2. Inhalt löschen
  const { error } = await db.from('fach_inhalte').delete().eq('id', id);
  if (error) alert("Fehler: " + error.message);
  showInhalte();
}

async function deleteKapitel(id) {
  if (!confirm('Kapitel löschen? Alle Inhalte darin müssen vorher gelöscht werden!')) return;
  const { error } = await db.from('fach_kapitel').delete().eq('id', id);
  if (error) alert("Löschen fehlgeschlagen. Sind noch Inhalte im Kapitel? " + error.message);
  showInhalte();
}

// ── FORMULAR-LOGIK ───────────────────────────────────────────

function showAddKapitelForm() {
  const f = window._faecher || [];
  const html = `
    <div class="card" style="margin-bottom:20px; border: 2px solid var(--accent)">
      <h3>📁 Neues Kapitel anlegen</h3>
      <div class="form-group">
        <label class="form-label">Fach</label>
        <select class="form-input" id="kap-fach">${f.map(fach=>`<option value="${fach.id}">${fach.icon} ${fach.name}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="form-input" type="text" id="kap-name" placeholder="z.B. WiPo: Kaufvertragsstörungen">
      </div>
      <div style="display:flex; gap:10px">
        <button class="btn btn-primary" onclick="saveKapitel()">💾 Erstellen</button>
        <button class="btn btn-secondary" onclick="closeAdminForm()">Abbrechen</button>
      </div>
    </div>`;
  const target = window.innerWidth <= 700 ? 'mob-admin-form' : 'admin-form-area';
  document.getElementById(target).innerHTML = html;
}

async function saveKapitel() {
  const fach_id = document.getElementById('kap-fach').value;
  const name = document.getElementById('kap-name').value.trim();
  if (!name) return;
  await db.from('fach_kapitel').insert({ fach_id, name, reihenfolge: 99 });
  showInhalte();
}

function showAddForm() {
  const lf = window._lf || [];
  const kap = window._kapitel || [];
  const html = `
    <div class="card" style="margin-bottom:20px; border: 2px solid var(--accent)">
      <h3>📄 Neuen Inhalt hinzufügen</h3>
      <div class="form-group">
        <label class="form-label">Ziel</label>
        <select class="form-input" id="new-ziel">
          <optgroup label="📚 Lernfelder">${lf.map(l=>`<option value="lf-${l.id}">LF ${l.nummer}: ${l.name}</option>`).join('')}</optgroup>
          <optgroup label="📘 Fächer">${kap.map(k=>`<option value="fach-${k.id}">${k.faecher?.name} → ${k.name}</option>`).join('')}</optgroup>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Typ</label>
        <select class="form-input" id="new-typ">
          <option value="text">📄 Text</option>
          <option value="quiz">❓ Quiz</option>
          <option value="lernkarten">🃏 Lernkarten</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Titel</label><input class="form-input" type="text" id="new-titel"></div>
      <div class="form-group"><label class="form-label">Inhalt</label><textarea class="form-input" id="new-text" rows="5"></textarea></div>
      <div style="display:flex; gap:10px">
        <button class="btn btn-primary" onclick="saveInhalt()">💾 Speichern</button>
        <button class="btn btn-secondary" onclick="closeAdminForm()">Abbrechen</button>
      </div>
    </div>`;
  const target = window.innerWidth <= 700 ? 'mob-admin-form' : 'admin-form-area';
  document.getElementById(target).innerHTML = html;
}

async function saveInhalt() {
  const ziel = document.getElementById('new-ziel').value;
  const typ = document.getElementById('new-typ').value;
  const titel = document.getElementById('new-titel').value.trim();
  const text = document.getElementById('new-text').value.trim();
  if (!titel || !text) return;
  
  if (ziel.startsWith('lf-')) {
    await db.from('inhalte').insert({ lernfeld_id: ziel.replace('lf-',''), typ, titel, inhalt:{text}, erstellt_von:USER.id });
  } else {
    await db.from('fach_inhalte').insert({ kapitel_id: ziel.replace('fach-',''), typ, titel, inhalt:{text}, erstellt_von:USER.id });
  }
  showInhalte();
}

function closeAdminForm() {
  if(document.getElementById('admin-form-area')) document.getElementById('admin-form-area').innerHTML = '';
  if(document.getElementById('mob-admin-form')) document.getElementById('mob-admin-form').innerHTML = '';
}
