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

  const html = `
    <h1 style="margin-bottom:6px">⚡ Importieren</h1>
    <p style="color:var(--muted2);font-size:0.88rem;margin-bottom:20px">Quiz, Vokabeln oder aus Dokument generieren.</p>

    <div style="display:flex;gap:4px;background:var(--surface2);border-radius:10px;padding:3px;margin-bottom:22px;width:fit-content;flex-wrap:wrap">
      <button id="tab-quiz-btn"   style="${tabBase}${on}"  onclick="switchImportTab('quiz')">❓ Quiz</button>
      <button id="tab-vok-btn"    style="${tabBase}${off}" onclick="switchImportTab('vokabeln')">🗂 Vokabeln</button>
      <button id="tab-ai-btn"     style="${tabBase}${off}" onclick="switchImportTab('ai')">📋 Für Claude</button>
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

      <div class="card" style="margin-bottom:16px;border-left:4px solid var(--accent)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:1.4rem">💡</span>
          <h3 style="margin:0">Wie funktioniert das?</h3>
        </div>
        <ol style="color:var(--muted2);font-size:0.85rem;line-height:2;padding-left:18px;margin:0">
          <li>Lade deine Datei hoch oder füge den Text ein</li>
          <li>Anzahl Fragen wählen</li>
          <li>Auf <strong style="color:var(--text)">„Für Claude kopieren"</strong> klicken</li>
          <li>Hier im Chat einfügen (<strong style="color:var(--text)">Strg+V</strong>) und abschicken</li>
          <li>Das generierte JSON in den <strong style="color:var(--text)">❓ Quiz Tab</strong> kopieren und speichern</li>
        </ol>
      </div>

      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:6px">1. Anzahl Fragen</h3>
        <div style="display:flex;align-items:center;gap:12px">
          <input class="form-input" type="number" id="ai-anzahl" value="8" min="3" max="20"
                 style="width:100px">
          <span style="color:var(--muted2);font-size:0.85rem">Fragen (3–20)</span>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:6px">2. Unterrichtsmaterial</h3>
        <p style="color:var(--muted2);font-size:0.82rem;margin-bottom:14px">
          Lade eine Datei hoch oder füge den Text direkt ein.
        </p>

        <!-- Datei-Upload -->
        <div style="border:2px dashed var(--border);border-radius:14px;padding:20px;text-align:center;margin-bottom:14px;cursor:pointer;transition:border-color 0.2s"
             id="ai-drop-zone"
             onclick="document.getElementById('ai-file-input').click()"
             ondragover="aiDragOver(event)"
             ondragleave="aiDragLeave(event)"
             ondrop="aiDrop(event)">
          <div style="font-size:2rem;margin-bottom:8px">📄</div>
          <div style="font-weight:600;margin-bottom:4px">PDF oder Word-Datei hochladen</div>
          <div style="font-size:0.82rem;color:var(--muted2)">Klicken oder Datei hier reinziehen (.pdf, .docx)</div>
          <div id="ai-file-status" style="margin-top:10px;font-size:0.82rem;color:var(--accent)"></div>
        </div>
        <input type="file" id="ai-file-input" accept=".pdf,.docx"
               style="display:none" onchange="aiHandleFile(this.files[0])">

        <div style="font-size:0.82rem;color:var(--muted2);margin-bottom:6px;text-align:center">
          — oder Text direkt einfügen —
        </div>
        <textarea class="form-input" id="ai-text" rows="8"
          placeholder="Hier den Unterrichtstext einfügen..."
          style="font-size:0.88rem;line-height:1.6"></textarea>
        <div id="ai-char-count" style="font-size:0.75rem;color:var(--muted2);margin-top:4px;text-align:right">0 Zeichen</div>
      </div>

      <button class="btn btn-primary" style="width:100%;padding:14px;font-size:1rem;margin-bottom:8px"
              onclick="aiKopierenFuerClaude()">
        📋 Für Claude kopieren
      </button>
      <div id="ai-copy-status" style="margin-bottom:16px;text-align:center"></div>

    </div>
  `;

  setDesktop(html);
  setMobile(`<button class="mob-back" onclick="showModMenu()">← Zurück</button>${html}`);

  // Char-Count live aktualisieren
  setTimeout(() => {
    const ta = document.getElementById('ai-text');
    if (ta) ta.addEventListener('input', updateAiCharCount);
  }, 100);
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

// ── DOKUMENT → CLAUDE KOPIEREN ───────────────────────────────

// Drag & Drop
function aiDragOver(e) {
  e.preventDefault();
  document.getElementById('ai-drop-zone').style.borderColor = 'var(--accent)';
}
function aiDragLeave(e) {
  document.getElementById('ai-drop-zone').style.borderColor = 'var(--border)';
}
function aiDrop(e) {
  e.preventDefault();
  aiDragLeave(e);
  const file = e.dataTransfer.files[0];
  if (file) aiHandleFile(file);
}

async function aiHandleFile(file) {
  if (!file) return;
  const statusEl = document.getElementById('ai-file-status');
  const ext = file.name.split('.').pop().toLowerCase();

  if (!['pdf','docx'].includes(ext)) {
    statusEl.textContent = '❌ Nur PDF und .docx werden unterstützt.';
    statusEl.style.color = 'var(--danger)';
    return;
  }

  statusEl.textContent = '⏳ Datei wird verarbeitet...';
  statusEl.style.color = 'var(--accent)';

  try {
    if (ext === 'pdf') {
      // PDF: Text-Extraktion via PDF.js
      const arrayBuffer = await file.arrayBuffer();
      const pdfjs = await loadPdfJs();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const tc   = await page.getTextContent();
        fullText  += tc.items.map(i => i.str).join(' ') + '\n';
      }
      document.getElementById('ai-text').value = fullText.trim();
      updateAiCharCount();
      statusEl.textContent = `✅ ${file.name} – ${fullText.trim().length} Zeichen extrahiert`;
      statusEl.style.color = 'var(--correct)';
    } else {
      // DOCX: mammoth.js
      const mammoth = await loadMammoth();
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value.trim();
      if (!text) throw new Error('Kein Text im Dokument gefunden.');
      document.getElementById('ai-text').value = text;
      updateAiCharCount();
      statusEl.textContent = `✅ ${file.name} – ${text.length} Zeichen extrahiert`;
      statusEl.style.color = 'var(--correct)';
    }
  } catch(err) {
    statusEl.textContent = '❌ Fehler: ' + err.message;
    statusEl.style.color = 'var(--danger)';
  }
}

function loadMammoth() {
  return new Promise((resolve, reject) => {
    if (window.mammoth) return resolve(window.mammoth);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
    script.onload = () => resolve(window.mammoth);
    script.onerror = () => reject(new Error('mammoth.js konnte nicht geladen werden.'));
    document.head.appendChild(script);
  });
}

function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('PDF.js konnte nicht geladen werden.'));
    document.head.appendChild(script);
  });
}

function updateAiCharCount() {
  const ta = document.getElementById('ai-text');
  const el = document.getElementById('ai-char-count');
  if (ta && el) el.textContent = ta.value.length + ' Zeichen';
}

async function aiKopierenFuerClaude() {
  const text   = document.getElementById('ai-text')?.value.trim();
  const anzahl = parseInt(document.getElementById('ai-anzahl')?.value) || 8;
  const statusEl = document.getElementById('ai-copy-status');

  if (!text || text.length < 50) {
    statusEl.innerHTML = '<span style="color:var(--danger)">❌ Bitte zuerst eine Datei hochladen oder Text eingeben.</span>';
    return;
  }

  const prompt = `Erstelle aus folgendem Unterrichtsmaterial genau ${anzahl} Quizfragen für Logistik-Auszubildende.

Antworte NUR mit einem JSON-Objekt in diesem Format – kein Text davor oder danach, kein Markdown:
{"fragen":[{"frage":"...","muster":"Musterlösung in 1-3 Sätzen","keywords":[{"label":"Begriff","words":["wort1","wort2"]}],"required":2}]}

Regeln:
- Prüfungsrelevante, konkrete Fragen
- Vollständige Musterantworten
- 2-4 Keyword-Gruppen pro Frage, je 1-4 Synonyme
- required: 1-3 (wie viele Gruppen erkannt werden müssen)
- Alle Fragen auf Deutsch

Unterrichtsmaterial:
${text}`;

  try {
    await navigator.clipboard.writeText(prompt);
    statusEl.innerHTML = `
      <div style="background:#10b98115;border:1px solid #10b98144;border-radius:12px;padding:14px;text-align:left">
        <div style="font-weight:700;color:var(--correct);margin-bottom:8px">✅ In Zwischenablage kopiert!</div>
        <div style="font-size:0.85rem;color:var(--muted2);line-height:1.7">
          Jetzt einfach:<br>
          1. Geh zum <strong style="color:var(--text)">Claude Chat</strong> (dieser Tab)<br>
          2. Drücke <strong style="color:var(--text)">Strg+V</strong> und schicke die Nachricht ab<br>
          3. Kopiere das JSON aus der Antwort<br>
          4. Geh zu <strong style="color:var(--text)">❓ Quiz → JSON einfügen → Speichern</strong>
        </div>
      </div>`;
  } catch(err) {
    // Fallback: Textarea zum manuellen Kopieren
    statusEl.innerHTML = `
      <div style="background:var(--surface2);border-radius:12px;padding:14px;text-align:left">
        <div style="font-weight:600;margin-bottom:8px">📋 Manuell kopieren:</div>
        <textarea class="form-input" style="font-size:0.78rem;font-family:monospace;height:120px" readonly>${prompt}</textarea>
        <div style="font-size:0.82rem;color:var(--muted2);margin-top:6px">Alles markieren (Strg+A) und kopieren (Strg+C), dann im Chat einfügen.</div>
      </div>`;
  }
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

// Bild-URL für eine Frage setzen
function aiSetBild(index, url) {
  if (!window._aiGeneratedQuiz?.fragen) return;
  if (url.trim()) {
    window._aiGeneratedQuiz.fragen[index].bild = url.trim();
  } else {
    delete window._aiGeneratedQuiz.fragen[index].bild;
  }
}
