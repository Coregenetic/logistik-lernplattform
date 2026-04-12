// ── INHALTE & KAPITEL VERWALTEN (MOD+) ───────────────────────

async function showInhalte() {
  setActive('lnk-inhalte', 'bn-mod');
  showSpinner();

  // Lädt alle notwendigen Daten
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

  // ── Desktop: Tab-Logik ─────────────────────────────────────
  const tabStyle = (active) =>
    `padding:8px 18px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;transition:all 0.2s;${active ? 'background:var(--surface);color:var(--text)' : 'background:none;color:var(--muted2)'}`;

  // Lernfeld-HTML
  const lfGroupsHTML = (lernfelder||[]).map(lf => {
    const items = (inhalte||[]).filter(i => i.lernfeld_id === lf.id);
    if (!items.length) return '';
    return `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:0.72rem;color:var(--accent);font-weight:700">LF ${lf.nummer}</span>
          <h3 style="font-size:0.95rem;margin:0">${lf.name}</h3>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Typ</th><th>Titel</th><th>Aktionen</th></tr></thead>
          <tbody>${items.map(i=>`<tr><td>${typeIcon[i.typ]||'📄'}</td><td>${i.titel}</td><td><button class="btn btn-danger btn-sm" onclick="deleteInhalt(${i.id})">🗑</button></td></tr>`).join('')}</tbody>
        </table></div>
      </div>`;
  }).join('') || '<div class="alert alert-info">Keine Inhalte gefunden.</div>';

  // Fach-Inhalte HTML
  const fachInhalteHTML = (faecher||[]).map(f => {
    const fKap = (kapitel||[]).filter(k => k.fach_id === f.id);
    const sections = fKap.map(k => {
      const items = (fachInhalte||[]).filter(fi => fi.kapitel_id === k.id);
      if (!items.length) return '';
      return `
        <div style="margin-left:15px; margin-bottom:15px; border-left: 2px solid var(--border); padding-left:15px">
          <div style="font-weight:600; font-size:0.85rem; margin-bottom:5px">${k.name}</div>
          <div class="table-wrap"><table>
            <tbody>${items.map(i=>`<tr><td style="width:40px">${typeIcon[i.typ]}</td><td>${i.titel}</td><td style="text-align:right"><button class="btn btn-danger btn-sm" onclick="deleteFachInhalt(${i.id})">🗑</button></td></tr>`).join('')}</tbody>
          </table></div>
        </div>`;
    }).join('');
    return sections ? `<h3 style="margin-top:20px">${f.icon} ${f.name}</h3>${sections}` : '';
  }).join('') || '<div class="alert alert-info">Noch keine Fach-Inhalte vorhanden.</div>';

  // Kapitel-Verwaltung HTML
  const kapitelListeHTML = (faecher||[]).map(f => {
    const fKap = (kapitel||[]).filter(k => k.fach_id === f.id);
    return `
      <div style="margin-bottom:20px">
        <h3 style="font-size:1rem;margin-bottom:10px">${f.icon} ${f.name}</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Kapitel Name</th><th>Aktion</th></tr></thead>
          <tbody>
            ${fKap.map(k=>`<tr><td>${k.name}</td><td><button class="btn btn-danger btn-sm" onclick="deleteKapitel(${k.id})">🗑 Löschen</button></td></tr>`).join('')}
            ${!fKap.length ? '<tr><td colspan="2" style="color:var(--muted2); font-style:italic">Noch keine Kapitel.</td></tr>' : ''}
          </tbody>
        </table></div>
      </div>`;
  }).join('');

  setDesktop(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h1>Inhalte verwalten</h1>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="showAddKapitelForm()">+ Kapitel</button>
        <button class="btn btn-primary" onclick="showAddForm()">+ Inhalt</button>
      </div>
    </div>
    
    <div id="admin-form-area" style="margin-bottom:25px"></div>

    <div style="display:flex;gap:4px;background:var(--surface2);border-radius:10px;padding:3px;margin-bottom:20px;width:fit-content">
      <button id="itab-lf-btn"   style="${tabStyle(true)}"  onclick="switchInhalteTab('lf')">📚 Lernfelder</button>
      <button id="itab-fach-btn" style="${tabStyle(false)}" onclick="switchInhalteTab('fach')">📘 Fächer-Inhalte</button>
      <button id="itab-kap-btn"  style="${tabStyle(false)}" onclick="switchInhalteTab('kap')">📂 Kapitel-Struktur</button>
    </div>

    <div id="itab-lf">${lfGroupsHTML}</div>
    <div id="itab-fach" style="display:none">${fachInhalteHTML}</div>
    <div id="itab-kap"  style="display:none">${kapitelListeHTML}</div>
  `);

  // ── Mobile Ansicht ──────────────────────────────────────────
  setMobile(`
    <div class="mob-greeting" style="font-size:1.1rem">✏️ Verwaltung</div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px">
      <button class="btn btn-secondary btn-sm" onclick="showAddKapitelForm()">+ Kapitel</button>
      <button class="btn btn-primary btn-sm" onclick="showAddForm()">+ Inhalt</button>
    </div>
    <div id="mob-admin-form"></div>
    
    <div class="mob-section">📚 Lernfelder</div>
    ${(inhalte||[]).map(i=>`<div class="mob-inhalt-card"><div class="mob-inhalt-type">${typeIcon[i.typ]}</div><div style="flex:1"><b>LF ${i.lernfelder?.nummer}</b><br>${i.titel}</div><button class="btn btn-danger btn-sm" onclick="deleteInhalt(${i.id})">🗑</button></div>`).join('')}
    
    <div class="mob-section" style="margin-top:20px">📘 Fächer</div>
    ${(fachInhalte||[]).map(i=>`<div class="mob-inhalt-card"><div class="mob-inhalt-type">${typeIcon[i.typ]}</div><div style="flex:1"><b>${i.fach_kapitel?.faecher?.name}</b><br>${i.titel}</div><button class="btn btn-danger btn-sm" onclick="deleteFachInhalt(${i.id})">🗑</button></div>`).join('')}
  `);
}

function switchInhalteTab(tab) {
  const tabs = ['lf', 'fach', 'kap'];
  tabs.forEach(t => document.getElementById('itab-' + t).style.display = (t === tab ? 'block' : 'none'));
  
  const on = 'background:var(--surface);color:var(--text);padding:8px 18px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;';
  const off = 'background:none;color:var(--muted2);padding:8px 18px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;';
  
  tabs.forEach(t => document.getElementById('itab-' + t + '-btn').style.cssText = (t === tab ? on : off));
}

// ── KAPITEL ERSTELLEN ────────────────────────────────────────
function showAddKapitelForm() {
  const f = window._faecher || [];
  const html = `
    <div class="card" style="margin-bottom:20px; border: 1px solid var(--accent)">
      <h3 style="margin-bottom:15px">📁 Neues Kapitel anlegen</h3>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Für welches Fach?</label>
          <select class="form-input" id="kap-fach">
            ${f.map(fach => `<option value="${fach.id}">${fach.icon} ${fach.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Name des Kapitels</label>
          <input class="form-input" type="text" id="kap-name" placeholder="z.B. Unit 1: Introduction">
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary" onclick="saveKapitel()">💾 Kapitel erstellen</button>
        <button class="btn btn-secondary" onclick="closeAdminForm()">Abbrechen</button>
      </div>
      <div id="kap-msg" style="margin-top:10px"></div>
    </div>`;
  document.getElementById('admin-form-area').innerHTML = html;
  document.getElementById('mob-admin-form').innerHTML = html;
}

async function saveKapitel() {
  const fach_id = document.getElementById('kap-fach').value;
  const name = document.getElementById('kap-name').value.trim();
  if (!name) return;

  const { error } = await db.from('fach_kapitel').insert({ fach_id, name, reihenfolge: 99 });
  if (error) {
    document.getElementById('kap-msg').innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  } else {
    showInhalte();
  }
}

async function deleteKapitel(id) {
  if (!confirm('Kapitel wirklich löschen? Alle Inhalte darin werden ebenfalls gelöscht!')) return;
  await db.from('fach_kapitel').delete().eq('id', id);
  showInhalte();
}

// ── INHALT ERSTELLEN ─────────────────────────────────────────
function showAddForm() {
  const lf  = window._lf      || [];
  const kap = window._kapitel || [];
  
  if (kap.length === 0 && lf.length === 0) {
    const err = '<div class="alert alert-warning">Erstelle erst ein Kapitel, bevor du Inhalte hinzufügen kannst.</div>';
    document.getElementById('admin-form-area').innerHTML = err;
    document.getElementById('mob-admin-form').innerHTML = err;
    return;
  }

  const html = `
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:16px">📄 Neuen Lerninhalt hinzufügen</h3>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Ziel (Lernfeld oder Kapitel)</label>
          <select class="form-input" id="new-ziel">
            <optgroup label="📚 Lernfelder">${lf.map(l=>`<option value="lf-${l.id}">LF ${l.nummer}: ${l.name}</option>`).join('')}</optgroup>
            <optgroup label="📘 Fächer">${kap.map(k=>`<option value="fach-${k.id}">${k.faecher?.name} → ${k.name}</option>`).join('')}</optgroup>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Typ</label>
          <select class="form-input" id="new-typ">
            <option value="text">📄 Text-Lerneinheit</option>
            <option value="quiz">❓ Quiz (Einfach)</option>
            <option value="lernkarten">🃏 Lernkarten</option>
            <option value="grammatik">📝 Grammatik</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Titel</label>
        <input class="form-input" type="text" id="new-titel" placeholder="z.B. Die Warenannahme">
      </div>
      <div class="form-group">
        <label class="form-label">Inhalt</label>
        <textarea class="form-input" id="new-text" rows="6" placeholder="Dein Lerninhalt..."></textarea>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary" onclick="saveInhalt()">💾 Speichern</button>
        <button class="btn btn-secondary" onclick="closeAdminForm()">Abbrechen</button>
      </div>
      <div id="save-msg" style="margin-top:12px"></div>
    </div>`;
  document.getElementById('admin-form-area').innerHTML = html;
  document.getElementById('mob-admin-form').innerHTML = html;
}

function closeAdminForm() {
  document.getElementById('admin-form-area').innerHTML = '';
  document.getElementById('mob-admin-form').innerHTML = '';
}

async function saveInhalt() {
  const ziel  = document.getElementById('new-ziel').value;
  const typ   = document.getElementById('new-typ').value;
  const titel = document.getElementById('new-titel').value.trim();
  const text  = document.getElementById('new-text').value.trim();
  
  if (!titel || !text) return;

  let error;
  if (ziel.startsWith('lf-')) {
    ({ error } = await db.from('inhalte').insert({ lernfeld_id: ziel.replace('lf-',''), typ, titel, inhalt:{text}, erstellt_von:USER.id }));
  } else {
    ({ error } = await db.from('fach_inhalte').insert({ kapitel_id: ziel.replace('fach-',''), typ, titel, inhalt:{text}, erstellt_von:USER.id }));
  }
  
  if (error) {
    document.getElementById('save-msg').innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  } else {
    showInhalte();
  }
}

async function deleteInhalt(id) {
  if (!confirm('Wirklich löschen?')) return;
  await db.from('inhalte').delete().eq('id', id);
  showInhalte();
}

async function deleteFachInhalt(id) {
  if (!confirm('Wirklich löschen?')) return;
  await db.from('fach_inhalte').delete().eq('id', id);
  showInhalte();
}
