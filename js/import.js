// ── IMPORTIEREN (MOD+) ───────────────────────────────────────
async function showQuizImport() {
  setActive('lnk-quiz-import', 'bn-mod');
  if (!window._lf) {
    const { data } = await db.from('lernfelder').select('id, nummer, name').order('nummer');
    window._lf = data || [];
  }
  const { data: kapitel } = await db.from('fach_kapitel').select('*, faecher(name)').order('fach_id').order('reihenfolge');
  const lfOptions   = (window._lf||[]).map(l => `<option value="lf-${l.id}">📚 LF ${l.nummer}: ${l.name}</option>`).join('');
  const fachOptions = (kapitel||[]).map(k => `<option value="fach-${k.id}">${k.faecher?.name} → ${k.name}</option>`).join('');
  const engKapitel  = (kapitel||[]).filter(k => k.faecher?.name === 'Englisch');

  const on      = 'background:var(--surface);color:var(--text);';
  const off     = 'background:none;color:var(--muted2);';
  const tabBase = 'padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;transition:all 0.2s;';

  const hasKey  = !!sessionStorage.getItem('claude_api_key');
  const keyHint = !hasKey
    ? `<div class="alert alert-error" style="margin-bottom:16px">⚠️ Kein Claude API Key gesetzt. Geh zu <strong>Inhalte → 🔑 API Key</strong> und trage deinen Key ein.</div>`
    : '';

  const html = `
    <h1 style="margin-bottom:6px">⚡ Importieren</h1>
    <p style="color:var(--muted2);font-size:0.88rem;margin-bottom:20px">Quiz, Vokabeln oder aus Dokument generieren.</p>

    <div style="display:flex;gap:4px;background:var(--surface2);border-radius:10px;padding:3px;margin-bottom:22px;width:fit-content;flex-wrap:wrap">
      <button id="tab-quiz-btn"   style="${tabBase}${on}"  onclick="switchImportTab('quiz')">❓ Quiz</button>
      <button id="tab-vok-btn"    style="${tabBase}${off}" onclick="switchImportTab('vokabeln')">🗂 Vokabeln</button>
      <button id="tab-ai-btn"     style="${tabBase}${off}" onclick="switchImportTab('ai')">🤖 Aus Dokument</button>
    </div>

    <!-- ── QUIZ ── -->
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

    <!-- ── VOKABELN ── -->
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

    <!-- ── AUS DOKUMENT GENERIEREN ── -->
    <div id="tab-ai" style="display:none">
      ${keyHint}
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:14px">1. Ziel & Titel</h3>
        <div class="grid-2">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Quiz-Titel</label>
            <input class="form-input" type="text" id="ai-titel" placeholder="z.B. Quiz: KW 14 – Wareneingang">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Ziel</label>
            <select class="form-input" id="ai-ziel">
              <optgroup label="📚 Lernfelder">${lfOptions}</optgroup>
              <optgroup label="📘 Fächer">${fachOptions}</optgroup>
            </select>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:6px">2. Anzahl Fragen</h3>
        <div style="display:flex;align-items:center;gap:12px">
          <input class="form-input" type="number" id="ai-anzahl" value="8" min="3" max="20"
                 style="width:100px">
          <span style="color:var(--muted2);font-size:0.85rem">Fragen (3–20)</span>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:6px">3. Unterrichtsmaterial einfügen</h3>
        <p style="color:var(--muted2);font-size:0.82rem;margin-bottom:12px">
          Füge hier den Text aus deinem Arbeitsblatt, deiner Mitschrift oder dem Lehrbuch ein.
          Je mehr Inhalt, desto bessere Fragen.
        </p>
        <textarea class="form-input" id="ai-text" rows="12"
          placeholder="Hier den Unterrichtstext einfügen..."
          style="font-size:0.88rem;line-height:1.6"></textarea>
      </div>

      <button class="btn btn-primary" id="ai-generate-btn" onclick="aiGenerateQuiz()"
              style="margin-bottom:16px">
        🤖 Quiz generieren
      </button>
      <div id="ai-status" style="margin-bottom:16px"></div>

      <div class="card" id="ai-preview" style="margin-bottom:16px;display:none">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h3 style="margin:0">4. Vorschau & bearbeiten</h3>
          <span id="ai-fragen-count" style="font-size:0.82rem;color:var(--muted2)"></span>
        </div>
        <div id="ai-preview-content"></div>
      </div>

      <button class="btn btn-primary" id="ai-save-btn" onclick="aiSaveQuiz()" style="display:none">
        💾 Quiz speichern
      </button>
      <div id="ai-result" style="margin-top:14px"></div>
    </div>
  `;

  setDesktop(html);
  setMobile(`<button class="mob-back" onclick="showModMenu()">← Zurück</button>${html}`);
}

function switchImportTab(tab) {
  ['quiz','vokabeln','ai'].forEach(t => {
    const el  = document.getElementById('tab-' + t);
    const btn = document.getElementById('tab-' + t + '-btn');
    if (el)  el.style.display = (t === tab ? 'block' : 'none');
    if (btn) {
      const on  = 'background:var(--surface);color:var(--text);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;';
      const off = 'background:none;color:var(--muted2);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.87rem;font-weight:600;border:none;font-family:inherit;';
      btn.style.cssText = (t === tab ? on : off);
    }
  });
}

// ── FEATURE 2: KI-Quiz-Generator ─────────────────────────────
async function aiGenerateQuiz() {
  const apiKey  = sessionStorage.getItem('claude_api_key');
  const text    = document.getElementById('ai-text')?.value.trim();
  const anzahl  = parseInt(document.getElementById('ai-anzahl')?.value) || 8;
  const statusEl = document.getElementById('ai-status');
  const btn      = document.getElementById('ai-generate-btn');

  if (!apiKey) {
    statusEl.innerHTML = '<div class="alert alert-error">❌ Kein API Key gesetzt. Geh zu Inhalte → 🔑 API Key.</div>';
    return;
  }
  if (!text || text.length < 50) {
    statusEl.innerHTML = '<div class="alert alert-error">❌ Bitte mindestens 50 Zeichen Text eingeben.</div>';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Generiere Quiz...';
  statusEl.innerHTML = '<div class="alert alert-info">🤖 Claude analysiert dein Material – das dauert ca. 10–20 Sekunden...</div>';
  document.getElementById('ai-preview').style.display = 'none';
  document.getElementById('ai-save-btn').style.display = 'none';

  const prompt = `Du bist ein Lernassistent für Logistik-Auszubildende. Analysiere den folgenden Unterrichtstext und erstelle daraus genau ${anzahl} Quizfragen.

WICHTIG: Antworte NUR mit einem validen JSON-Objekt. Kein Text davor oder danach. Kein Markdown. Kein \`\`\`json.

Format:
{"fragen":[{"frage":"...","muster":"Musterlösung in 1-3 Sätzen","keywords":[{"label":"Begriff","words":["wort1","wort2"]},{"label":"Begriff2","words":["wort3"]}],"required":2}]}

Regeln:
- Fragen sollen prüfungsrelevant und konkret sein
- Musterantwort ist vollständig und klar
- Keywords: 2-4 Gruppen pro Frage, je 1-4 Synonyme pro Gruppe
- required: wie viele Keyword-Gruppen erkannt werden müssen (1-3)
- Fragen auf Deutsch

Unterrichtstext:
${text}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `API Fehler: ${response.status}`);
    }

    const rawText = data.content?.[0]?.text || '';
    const clean   = rawText.replace(/```json|```/g, '').trim();
    const parsed  = JSON.parse(clean);

    if (!parsed.fragen || !Array.isArray(parsed.fragen)) {
      throw new Error('Ungültige Antwort von Claude – kein fragen-Array.');
    }

    window._aiGeneratedQuiz = parsed;
    aiShowPreview(parsed);

    statusEl.innerHTML = `<div class="alert alert-success">✅ ${parsed.fragen.length} Fragen generiert!</div>`;
    setTimeout(() => statusEl.innerHTML = '', 3000);

  } catch (err) {
    statusEl.innerHTML = `<div class="alert alert-error">❌ Fehler: ${err.message}</div>`;
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = '🤖 Quiz generieren';
  }
}

function aiShowPreview(parsed) {
  const preview = document.getElementById('ai-preview');
  const content = document.getElementById('ai-preview-content');
  const count   = document.getElementById('ai-fragen-count');

  count.textContent = `${parsed.fragen.length} Fragen`;

  content.innerHTML = parsed.fragen.map((f, i) => `
    <div style="padding:14px 0;${i > 0 ? 'border-top:1px solid var(--border)' : ''}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px">
        <div style="font-weight:600;font-size:0.9rem;flex:1">
          <span style="color:var(--accent);margin-right:6px">${i+1}.</span>${f.frage}
        </div>
        <button class="btn btn-danger btn-sm" style="flex-shrink:0;padding:4px 8px;font-size:0.75rem"
                onclick="aiDeleteFrage(${i})">🗑</button>
      </div>
      <div style="font-size:0.8rem;color:var(--muted2);margin-bottom:4px;padding-left:18px">
        <strong style="color:var(--text)">Muster:</strong> ${f.muster.substring(0,100)}${f.muster.length>100?'...':''}
      </div>
      <div style="font-size:0.78rem;color:var(--accent);padding-left:18px">
        ${f.keywords.length} Keyword-Gruppen · mind. ${f.required||1} erkannt → ✅
      </div>
    </div>`).join('');

  preview.style.display = 'block';
  document.getElementById('ai-save-btn').style.display = 'inline-flex';
}

function aiDeleteFrage(index) {
  if (!window._aiGeneratedQuiz) return;
  window._aiGeneratedQuiz.fragen.splice(index, 1);
  if (window._aiGeneratedQuiz.fragen.length === 0) {
    document.getElementById('ai-preview').style.display = 'none';
    document.getElementById('ai-save-btn').style.display = 'none';
    window._aiGeneratedQuiz = null;
    return;
  }
  aiShowPreview(window._aiGeneratedQuiz);
}

async function aiSaveQuiz() {
  const titel    = document.getElementById('ai-titel')?.value.trim();
  const ziel     = document.getElementById('ai-ziel')?.value;
  const resultEl = document.getElementById('ai-result');
  const quiz     = window._aiGeneratedQuiz;

  if (!titel)  return resultEl.innerHTML = '<div class="alert alert-error">Bitte Titel eingeben.</div>';
  if (!quiz?.fragen?.length) return resultEl.innerHTML = '<div class="alert alert-error">Keine Fragen vorhanden.</div>';

  const btn = document.getElementById('ai-save-btn');
  btn.disabled = true; btn.textContent = 'Speichern...';

  let error;
  if (ziel.startsWith('lf-')) {
    ({ error } = await db.from('inhalte').insert({
      lernfeld_id: ziel.replace('lf-',''), typ:'quiz', titel, inhalt: quiz, erstellt_von: USER.id
    }));
  } else {
    ({ error } = await db.from('fach_inhalte').insert({
      kapitel_id: ziel.replace('fach-',''), typ:'quiz', titel, inhalt: quiz, erstellt_von: USER.id
    }));
  }

  btn.disabled = false; btn.textContent = '💾 Quiz speichern';

  if (error) return resultEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;

  resultEl.innerHTML = '<div class="alert alert-success">✅ Quiz gespeichert!</div>';
  document.getElementById('ai-titel').value = '';
  document.getElementById('ai-text').value  = '';
  document.getElementById('ai-preview').style.display = 'none';
  document.getElementById('ai-save-btn').style.display = 'none';
  window._aiGeneratedQuiz = null;
  setTimeout(() => resultEl.innerHTML = '', 3000);
}

// ── QUIZ JSON MANUELL ─────────────────────────────────────────
function qiValidate() {
  const raw     = document.getElementById('qi-json').value.trim();
  const msgEl   = document.getElementById('qi-validate-msg');
  const preview = document.getElementById('qi-preview');
  const saveBtn = document.getElementById('qi-save-btn');
  try {
    const data = JSON.parse(raw);
    if (!data.fragen || !Array.isArray(data.fragen) || !data.fragen.length)
      throw new Error('Kein "fragen"-Array gefunden.');
    data.fragen.forEach((f,i) => {
      if (!f.frage)          throw new Error(`Frage ${i+1}: "frage" fehlt.`);
      if (!f.muster)         throw new Error(`Frage ${i+1}: "muster" fehlt.`);
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
  const titel    = document.getElementById('qi-titel').value.trim();
  const ziel     = document.getElementById('qi-ziel').value;
  const raw      = document.getElementById('qi-json').value.trim();
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

// ── VOKABELN ──────────────────────────────────────────────────
function vokValidate() {
  const raw     = document.getElementById('vok-csv').value.trim();
  const msgEl   = document.getElementById('vok-validate-msg');
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
  const kapId    = parseInt(document.getElementById('vok-kapitel').value);
  const rows     = window._vokRows;
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
