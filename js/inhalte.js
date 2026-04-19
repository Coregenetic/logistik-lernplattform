// ── INHALTE & KAPITEL VERWALTEN (MOD+) ───────────────────────

// ── FEATURE 4: Claude API Key im SessionStorage ───────────────
function getClaudeKey() {
  return sessionStorage.getItem('claude_api_key') || '';
}

function saveClaudeKey() {
  const key = document.getElementById('claude-key-input')?.value.trim();
  if (!key) return showClaudeKeyMsg('Bitte einen Key eingeben.', 'error');
  if (!key.startsWith('sk-ant-')) return showClaudeKeyMsg('Ungültiger Key – muss mit sk-ant- beginnen.', 'error');
  sessionStorage.setItem('claude_api_key', key);
  showClaudeKeyMsg('✅ Key gespeichert! Gilt bis der Tab geschlossen wird.', 'success');
  document.getElementById('claude-key-input').value = '';
  updateClaudeKeyStatus();
}

function removeClaudeKey() {
  sessionStorage.removeItem('claude_api_key');
  showClaudeKeyMsg('🗑 Key entfernt.', 'info');
  updateClaudeKeyStatus();
}

function showClaudeKeyMsg(msg, type) {
  const el = document.getElementById('claude-key-msg');
  if (!el) return;
  const colors = { success: 'var(--correct)', error: 'var(--danger)', info: 'var(--muted2)' };
  el.innerHTML = `<div style="color:${colors[type]};font-size:0.85rem;margin-top:8px">${msg}</div>`;
  setTimeout(() => { if (el) el.innerHTML = ''; }, 4000);
}

function updateClaudeKeyStatus() {
  const el = document.getElementById('claude-key-status');
  if (!el) return;
  const key = getClaudeKey();
  if (key) {
    el.innerHTML = `<span style="color:var(--correct);font-weight:600">✅ Key aktiv</span> <span style="color:var(--muted2);font-size:0.78rem">(sk-ant-...${key.slice(-4)})</span>`;
  } else {
    el.innerHTML = `<span style="color:var(--warning)">⚠️ Kein Key gesetzt</span>`;
  }
}

function showApiKeyTab() {
  const key = getClaudeKey();
  const html = `
    <div class="card" style="margin-bottom:20px;border:2px solid var(--accent)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:1.4rem">🔑</span>
        <h3 style="margin:0">Claude API Key</h3>
      </div>
      <p style="color:var(--muted2);font-size:0.85rem;margin-bottom:16px">
        Der Key wird nur im SessionStorage gespeichert – nie in der Datenbank oder im Code. Er verschwindet automatisch wenn du den Tab schließt.
      </p>
      <div style="margin-bottom:12px">
        <div style="font-size:0.82rem;color:var(--muted2);margin-bottom:6px">Status:</div>
        <div id="claude-key-status"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Neuen Key eingeben</label>
        <input class="form-input" type="password" id="claude-key-input" placeholder="sk-ant-api03-...">
      </div>
      <div id="claude-key-msg"></div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn btn-primary" onclick="saveClaudeKey()">💾 Key speichern</button>
        <button class="btn btn-danger" onclick="removeClaudeKey()">🗑 Key entfernen</button>
      </div>
    </div>
    <div class="card" style="background:var(--surface2)">
      <h3 style="margin-bottom:8px">ℹ️ Wie bekomme ich einen Key?</h3>
      <ol style="color:var(--muted2);font-size:0.85rem;line-height:1.8;padding-left:18px;margin:0">
        <li>Geh auf <strong style="color:var(--text)">console.anthropic.com</strong></li>
        <li>Logge dich ein oder erstelle ein Konto</li>
        <li>Geh zu <strong style="color:var(--text)">API Keys → Create Key</strong></li>
        <li>Kopiere den Key und füge ihn hier ein</li>
      </ol>
    </div>`;

  const target = window.innerWidth <= 700 ? 'mob-admin-form' : 'admin-form-area';
  document.getElementById(target).innerHTML = html;
  updateClaudeKeyStatus();
}

// ── HAUPT-FUNKTION ────────────────────────────────────────────

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
    db.from('inhalte').select('id, lernfeld_id, typ, titel, reihenfolge, lernfelder(nummer, name)').order('lernfeld_id').order('reihenfolge'),
    db.from('faecher').select('*').order('reihenfolge'),
    db.from('fach_kapitel').select('*, faecher(name, icon)').order('fach_id').order('reihenfolge'),
    db.from('fach_inhalte').select('id, kapitel_id, typ, titel, reihenfolge, fach_kapitel(name, faecher(name))').order('kapitel_id').order('reihenfolge'),
  ]);

  window._lf      = lernfelder;
  window._kapitel = kapitel;
  window._faecher = faecher;

  const typeIcon = { text:'📄', quiz:'❓', lernkarten:'🃏', grammatik:'📝' };
  const hasKey   = !!getClaudeKey();

  // ── HTML GENERIERUNG ──────────────────────────────────────

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

  // 2. Fach-Inhalte
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

  // API Key Status Badge für den Tab
  const keyBadge = hasKey
    ? `<span style="background:var(--correct);color:#fff;border-radius:99px;font-size:0.7rem;padding:1px 7px;margin-left:6px">aktiv</span>`
    : `<span style="background:var(--warning);color:#fff;border-radius:99px;font-size:0.7rem;padding:1px 7px;margin-left:6px">fehlt</span>`;

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
      <button id="itab-lf-btn"  class="btn" onclick="switchInhalteTab('lf')">📚 Lernfelder</button>
      <button id="itab-fach-btn" class="btn" onclick="switchInhalteTab('fach')">📘 Fächer</button>
      <button id="itab-kap-btn"  class="btn" onclick="switchInhalteTab('kap')">📂 Kapitel</button>
      <button id="itab-key-btn"  class="btn" onclick="switchInhalteTab('key')">🔑 API Key${keyBadge}</button>
    </div>
    <div id="itab-lf">${lfGroupsHTML}</div>
    <div id="itab-fach" style="display:none">${fachInhalteHTML}</div>
    <div id="itab-kap"  style="display:none">${kapitelListeHTML}</div>
    <div id="itab-key"  style="display:none"></div>
  `);

  setMobile(`
    <div class="mob-greeting">✏️ Verwaltung</div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px">
      <button class="btn btn-secondary btn-sm" onclick="showAddKapitelForm()">+ Kapitel</button>
      <button class="btn btn-primary btn-sm" onclick="showAddForm()">+ Inhalt</button>
    </div>
    <div style="display:flex; gap:6px; background:var(--surface2); border-radius:10px; padding:3px; margin-bottom:16px; width:fit-content">
      <button id="itab-lf-btn"   class="btn" style="font-size:0.75rem;padding:6px 10px" onclick="switchInhalteTab('lf')">📚 LF</button>
      <button id="itab-fach-btn" class="btn" style="font-size:0.75rem;padding:6px 10px" onclick="switchInhalteTab('fach')">📘 Fächer</button>
      <button id="itab-kap-btn"  class="btn" style="font-size:0.75rem;padding:6px 10px" onclick="switchInhalteTab('kap')">📂 Kapitel</button>
      <button id="itab-key-btn"  class="btn" style="font-size:0.75rem;padding:6px 10px" onclick="switchInhalteTab('key')">🔑 Key${keyBadge}</button>
    </div>
    <div id="mob-admin-form"></div>
    <div id="itab-lf">
      <div class="mob-section">📚 Inhalte</div>
      ${(inhalte||[]).map(i=>`<div class="mob-inhalt-card"><div class="mob-inhalt-type">${typeIcon[i.typ]}</div><div style="flex:1">LF ${i.lernfelder?.nummer}: ${i.titel}</div><button class="btn btn-danger btn-sm" onclick="deleteInhalt(${i.id})">🗑</button></div>`).join('')}
      <div class="mob-section" style="margin-top:20px">📘 Fächer</div>
      ${(fachInhalte||[]).map(i=>`<div class="mob-inhalt-card"><div class="mob-inhalt-type">${typeIcon[i.typ]}</div><div style="flex:1"><b>${i.fach_kapitel?.faecher?.name}</b><br>${i.titel}</div><button class="btn btn-danger btn-sm" onclick="deleteFachInhalt(${i.id})">🗑</button></div>`).join('')}
    </div>
    <div id="itab-fach" style="display:none">${fachInhalteHTML}</div>
    <div id="itab-kap"  style="display:none">${kapitelListeHTML}</div>
    <div id="itab-key"  style="display:none"></div>
  `);

  switchInhalteTab('lf');
}

function switchInhalteTab(tab) {
  ['lf', 'fach', 'kap', 'key'].forEach(t => {
    const el  = document.getElementById('itab-' + t);
    const btn = document.getElementById('itab-' + t + '-btn');
    if (el)  el.style.display  = (t === tab ? 'block' : 'none');
    if (btn) btn.style.background = (t === tab ? 'var(--surface)' : 'none');
    if (btn) btn.style.color      = (t === tab ? 'var(--text)'    : 'var(--muted2)');
  });

  // API Key Tab: Inhalt lazy laden
  if (tab === 'key') {
    const isMob = window.innerWidth <= 700;
    if (isMob) {
      const target = document.getElementById('mob-admin-form');
      if (target && !target.querySelector('#claude-key-input')) showApiKeyTab();
    } else {
      const target = document.getElementById('admin-form-area');
      if (target && !target.querySelector('#claude-key-input')) showApiKeyTab();
    }
    // Immer itab-key leeren damit kein doppelter Content entsteht
    const keyEl = document.getElementById('itab-key');
    if (keyEl) keyEl.style.display = 'none';
  }
}

// ── LÖSCH-LOGIK ───────────────────────────────────────────────

async function deleteInhalt(id) {
  if (!confirm('Diesen Inhalt wirklich löschen?')) return;
  showSpinner();
  try {
    const { error: e1 } = await db.from('fortschritt').delete().eq('inhalt_id', id);
    if (e1) throw e1;
    const { error: e2 } = await db.from('inhalte').delete().eq('id', id);
    if (e2) throw e2;
    showInhalte();
  } catch (err) {
    alert('Fehler beim Löschen: ' + err.message);
    console.error(err);
    showInhalte();
  }
}

async function deleteFachInhalt(id) {
  if (!confirm('Diesen Fach-Inhalt wirklich löschen?')) return;
  showSpinner();
  try {
    const { error: e1 } = await db.from('fach_fortschritt').delete().eq('inhalt_id', id);
    if (e1) throw e1;
    const { error: e2 } = await db.from('fach_inhalte').delete().eq('id', id);
    if (e2) throw e2;
    showInhalte();
  } catch (err) {
    alert('Fehler beim Löschen: ' + err.message);
    console.error(err);
    showInhalte();
  }
}

async function deleteKapitel(id) {
  if (!confirm('ACHTUNG: Möchtest du dieses Kapitel inklusive ALLER Inhalte, Vokabeln und Fortschritte wirklich unwiderruflich löschen?')) return;
  showSpinner();
  try {
    const { data: voks, error: e1 } = await db.from('vokabeln').select('id').eq('kapitel_id', id);
    if (e1) throw e1;
    if (voks?.length) {
      const vokIds = voks.map(v => v.id);
      const { error: e2 } = await db.from('vokabel_fortschritt').delete().in('vokabel_id', vokIds);
      if (e2) throw e2;
      const { error: e3 } = await db.from('vokabeln').delete().in('id', vokIds);
      if (e3) throw e3;
    }
    const { data: inhalt, error: e4 } = await db.from('fach_inhalte').select('id').eq('kapitel_id', id);
    if (e4) throw e4;
    if (inhalt?.length) {
      const inhaltIds = inhalt.map(i => i.id);
      const { error: e5 } = await db.from('fach_fortschritt').delete().in('inhalt_id', inhaltIds);
      if (e5) throw e5;
      const { error: e6 } = await db.from('fach_inhalte').delete().in('id', inhaltIds);
      if (e6) throw e6;
    }
    const { error: e7 } = await db.from('fach_kapitel').delete().eq('id', id);
    if (e7) throw e7;
    showInhalte();
  } catch (err) {
    alert('Fehler beim Löschen: ' + err.message);
    console.error(err);
    showInhalte();
  }
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
  const lf  = window._lf      || [];
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
  const ziel  = document.getElementById('new-ziel').value;
  const typ   = document.getElementById('new-typ').value;
  const titel = document.getElementById('new-titel').value.trim();
  const text  = document.getElementById('new-text').value.trim();
  if (!titel || !text) return;
  if (ziel.startsWith('lf-')) {
    await db.from('inhalte').insert({ lernfeld_id: ziel.replace('lf-',''), typ, titel, inhalt:{text}, erstellt_von:USER.id });
  } else {
    await db.from('fach_inhalte').insert({ kapitel_id: ziel.replace('fach-',''), typ, titel, inhalt:{text}, erstellt_von:USER.id });
  }
  showInhalte();
}

function closeAdminForm() {
  if (document.getElementById('admin-form-area')) document.getElementById('admin-form-area').innerHTML = '';
  if (document.getElementById('mob-admin-form'))  document.getElementById('mob-admin-form').innerHTML  = '';
}
