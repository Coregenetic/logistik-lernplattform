// ── IMPORTIEREN (MOD+) ───────────────────────────────────────
async function showQuizImport() {
  setActive('lnk-quiz-import', 'bn-mod');
  if (!window._lf) {
    const { data } = await db.from('lernfelder').select('id, nummer, name').order('nummer');
    window._lf = data || [];
  }
  const { data: kapitel } = await db.from('fach_kapitel').select('*, faecher(name)').order('fach_id').order('reihenfolge');
  const lfOptions  = (window._lf||[]).map(l => `<option value="lf-${l.id}">📚 LF ${l.nummer}: ${l.name}</option>`).join('');
  const fachOptions = (kapitel||[]).map(k => `<option value="fach-${k.id}">${k.faecher?.name} → ${k.name}</option>`).join('');
  const engKapitel  = (kapitel||[]).filter(k => k.faecher?.name === 'Englisch');

  const on  = 'background:var(--surface);color:var(--text);';
  const off = 'background:none;color:var(--muted2);';
  const tabBase = 'padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;transition:all 0.2s;';

  const html = `
    <h1 style="margin-bottom:6px">⚡ Importieren</h1>
    <p style="color:var(--muted2);font-size:0.88rem;margin-bottom:20px">Quiz oder Vokabeln direkt aus dem Chat importieren.</p>

    <div style="display:flex;gap:4px;background:var(--surface2);border-radius:10px;padding:3px;margin-bottom:22px;width:fit-content">
      <button id="tab-quiz-btn" style="${tabBase}${on}"  onclick="switchImportTab('quiz')">❓ Quiz</button>
      <button id="tab-vok-btn"  style="${tabBase}${off}" onclick="switchImportTab('vokabeln')">🗂 Vokabeln</button>
    </div>

    <!-- QUIZ -->
    <div id="tab-quiz">
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:14px">1. Quiz-Infos</h3>
        <div class="grid-2">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Titel</label>
            <input class="form-input" type="text" id="qi-titel" placeholder="z.B. Quiz: Materialfluss">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Ziel</label>
            <select class="form-input" id="qi-ziel">
              <optgroup label="📚 Lernfelder">${lfOptions}</optgroup>
              <optgroup label="📘 Fächer">${fachOptions}</optgroup>
            </select>
          </div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:6px">2. JSON einfügen</h3>
        <p style="color:var(--muted2);font-size:0.82rem;margin-bottom:12px">Das JSON das Claude generiert hat, einfach hier reinkopieren.</p>
        <textarea class="form-input" id="qi-json" rows="10"
          placeholder='{"fragen":[{"frage":"...","muster":"...","keywords":[...],"required":2}]}'
          style="font-family:monospace;font-size:0.82rem"></textarea>
        <div style="margin-top:10px;display:flex;align-items:center;gap:10px">
          <button class="btn btn-secondary btn-sm" onclick="qiValidate()">✓ Überprüfen</button>
          <span id="qi-validate-msg" style="font-size:0.83rem"></span>
        </div>
      </div>
      <div class="card" id="qi-preview" style="margin-bottom:16px;display:none">
        <h3 style="margin-bottom:12px">3. Vorschau</h3>
        <div id="qi-preview-content"></div>
      </div>
      <button class="btn btn-primary" id="qi-save-btn" onclick="qiSave()" style="display:none">💾 Quiz speichern</button>
      <div id="qi-result" style="margin-top:14px"></div>
    </div>

    <!-- VOKABELN -->
    <div id="tab-vokabeln" style="display:none">
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:14px">1. Kapitel wählen</h3>
        <select class="form-input" id="vok-kapitel">
          ${engKapitel.map(k=>`<option value="${k.id}">${k.name}</option>`).join('')}
        </select>
      </div>
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:6px">2. CSV einfügen</h3>
        <p style="color:var(--muted2);font-size:0.82rem;margin-bottom:10px">
          Format: <code style="background:var(--surface2);padding:2px 6px;border-radius:4px;font-size:0.8rem">en,de,beispiel</code> (Beispiel optional)
        </p>
        <pre style="background:var(--surface2);padding:10px 14px;border-radius:10px;font-size:0.78rem;margin-bottom:12px;overflow-x:auto">warehouse,Lager / Lagerhalle,The goods are in the warehouse.
shipment,Sendung / Lieferung,The shipment arrived on time.</pre>
        <textarea class="form-input" id="vok-csv" rows="8"
          placeholder="en,de,beispiel&#10;warehouse,Lager,..."
          style="font-family:monospace;font-size:0.82rem"></textarea>
        <div style="margin-top:10px;display:flex;align-items:center;gap:10px">
          <button class="btn btn-secondary btn-sm" onclick="vokValidate()">✓ Überprüfen</button>
          <span id="vok-validate-msg" style="font-size:0.83rem"></span>
        </div>
      </div>
      <div class="card" id="vok-preview" style="margin-bottom:16px;display:none">
        <h3 style="margin-bottom:12px">3. Vorschau</h3>
        <div id="vok-preview-content"></div>
      </div>
      <button class="btn btn-primary" id="vok-save-btn" onclick="vokSave()" style="display:none">💾 Vokabeln speichern</button>
      <div id="vok-result" style="margin-top:14px"></div>
    </div>
  `;

  setDesktop(html);
  setMobile(`<button class="mob-back" onclick="showModMenu()">← Zurück</button>${html}`);
}

function switchImportTab(tab) {
  document.getElementById('tab-quiz').style.display     = tab==='quiz'     ? 'block' : 'none';
  document.getElementById('tab-vokabeln').style.display = tab==='vokabeln' ? 'block' : 'none';
  const on  = 'background:var(--surface);color:var(--text);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;';
  const off = 'background:none;color:var(--muted2);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;';
  document.getElementById('tab-quiz-btn').style.cssText = tab==='quiz'     ? on : off;
  document.getElementById('tab-vok-btn').style.cssText  = tab==='vokabeln' ? on : off;
}

function qiValidate() {
  const raw    = document.getElementById('qi-json').value.trim();
  const msgEl  = document.getElementById('qi-validate-msg');
  const preview = document.getElementById('qi-preview');
  const saveBtn = document.getElementById('qi-save-btn');
  try {
    const data = JSON.parse(raw);
    if (!data.fragen || !Array.isArray(data.fragen) || !data.fragen.length)
      throw new Error('Kein "fragen"-Array gefunden.');
    data.fragen.forEach((f,i) => {
      if (!f.frage)    throw new Error(`Frage ${i+1}: "frage" fehlt.`);
      if (!f.muster)   throw new Error(`Frage ${i+1}: "muster" fehlt.`);
      if (!f.keywords?.length) throw new Error(`Frage ${i+1}: "keywords" fehlt.`);
    });
    msgEl.innerHTML = `<span style="color:var(--correct)">✅ ${data.fragen.length} Frage${data.fragen.length!==1?'n':''} erkannt</span>`;
    document.getElementById('qi-preview-content').innerHTML = data.fragen.map((f,i) => `
      <div style="padding:12px 0;${i>0?'border-top:1px solid var(--border)':''}">
        <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px">Frage ${i+1}: ${f.frage.substring(0,70)}${f.frage.length>70?'...':''}</div>
        <div style="font-size:0.8rem;color:var(--muted2);margin-bottom:4px">Muster: ${f.muster.substring(0,80)}${f.muster.length>80?'...':''}</div>
        <div style="font-size:0.78rem;color:var(--accent)">${f.keywords.length} Keyword-Gruppen · mind. ${f.required||1} erkannt → ✅</div>
      </div>`).join('');
    preview.style.display = 'block';
    saveBtn.style.display = 'inline-flex';
  } catch(e) {
    msgEl.innerHTML = `<span style="color:var(--danger)">❌ ${e.message}</span>`;
    preview.style.display = 'none';
    saveBtn.style.display = 'none';
  }
}

async function qiSave() {
  const titel = document.getElementById('qi-titel').value.trim();
  const ziel  = document.getElementById('qi-ziel').value;
  const raw   = document.getElementById('qi-json').value.trim();
  const resultEl = document.getElementById('qi-result');
  if (!titel) return resultEl.innerHTML = '<div class="alert alert-error">Bitte Titel eingeben.</div>';
  let inhalt;
  try { inhalt = JSON.parse(raw); } catch { return resultEl.innerHTML = '<div class="alert alert-error">Ungültiges JSON.</div>'; }
  const btn = document.getElementById('qi-save-btn');
  btn.disabled = true; btn.textContent = 'Speichern...';
  let error;
  if (ziel.startsWith('lf-')) {
    ({ error } = await db.from('inhalte').insert({ lernfeld_id: ziel.replace('lf-',''), typ:'quiz', titel, inhalt, erstellt_von:USER.id }));
  } else {
    ({ error } = await db.from('fach_inhalte').insert({ kapitel_id: ziel.replace('fach-',''), typ:'quiz', titel, inhalt, erstellt_von:USER.id }));
  }
  btn.disabled = false; btn.textContent = '💾 Quiz speichern';
  if (error) return resultEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  resultEl.innerHTML = '<div class="alert alert-success">✅ Quiz gespeichert!</div>';
  document.getElementById('qi-titel').value = '';
  document.getElementById('qi-json').value  = '';
  document.getElementById('qi-preview').style.display = 'none';
  btn.style.display = 'none';
  setTimeout(() => resultEl.innerHTML = '', 3000);
}

function vokValidate() {
  const raw    = document.getElementById('vok-csv').value.trim();
  const msgEl  = document.getElementById('vok-validate-msg');
  const preview = document.getElementById('vok-preview');
  const saveBtn = document.getElementById('vok-save-btn');
  try {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const start = lines[0].toLowerCase().startsWith('en') ? 1 : 0;
    const rows  = lines.slice(start).map((line, i) => {
      const parts = line.split(',');
      if (parts.length < 2) throw new Error(`Zeile ${i+start+1}: Weniger als 2 Spalten.`);
      return { en: parts[0].trim(), de: parts[1].trim(), beispiel: parts.slice(2).join(',').trim() || '' };
    });
    if (!rows.length) throw new Error('Keine Vokabeln gefunden.');
    msgEl.innerHTML = `<span style="color:var(--correct)">✅ ${rows.length} Vokabeln erkannt</span>`;
    document.getElementById('vok-preview-content').innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Englisch</th><th>Deutsch</th><th>Beispiel</th></tr></thead>
        <tbody>
          ${rows.slice(0,6).map(r=>`<tr><td><strong>${r.en}</strong></td><td>${r.de}</td><td style="color:var(--muted2);font-size:0.82rem">${r.beispiel||'–'}</td></tr>`).join('')}
          ${rows.length>6?`<tr><td colspan="3" style="color:var(--muted2);font-size:0.82rem;text-align:center">...und ${rows.length-6} weitere</td></tr>`:''}
        </tbody>
      </table></div>`;
    preview.style.display = 'block';
    saveBtn.style.display = 'inline-flex';
    window._vokRows = rows;
  } catch(e) {
    msgEl.innerHTML = `<span style="color:var(--danger)">❌ ${e.message}</span>`;
    preview.style.display = 'none';
    saveBtn.style.display = 'none';
  }
}

async function vokSave() {
  const kapId  = parseInt(document.getElementById('vok-kapitel').value);
  const rows   = window._vokRows;
  const resultEl = document.getElementById('vok-result');
  if (!rows?.length) return resultEl.innerHTML = '<div class="alert alert-error">Bitte zuerst überprüfen.</div>';
  const btn = document.getElementById('vok-save-btn');
  btn.disabled = true; btn.textContent = 'Speichern...';
  const inserts = rows.map((r,i) => ({ kapitel_id:kapId, en:r.en, de:r.de, beispiel:r.beispiel||null, reihenfolge:i+1 }));
  const { error } = await db.from('vokabeln').insert(inserts);
  btn.disabled = false; btn.textContent = '💾 Vokabeln speichern';
  if (error) return resultEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  resultEl.innerHTML = `<div class="alert alert-success">✅ ${rows.length} Vokabeln gespeichert!</div>`;
  document.getElementById('vok-csv').value = '';
  document.getElementById('vok-preview').style.display = 'none';
  btn.style.display = 'none';
  window._vokRows = null;
  setTimeout(() => resultEl.innerHTML = '', 3000);
}
