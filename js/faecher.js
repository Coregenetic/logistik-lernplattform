// ── FÄCHER ───────────────────────────────────────────────────
const FACH_LINKS = { 1:'lnk-fach-1', 2:'lnk-fach-2', 3:'lnk-fach-3' };

async function showFach(fachId) {
  setActive(FACH_LINKS[fachId], 'bn-faecher');
  showSpinner();

  const { data: fach }    = await db.from('faecher').select('*').eq('id', fachId).maybeSingle();
  const { data: kapitel } = await db.from('fach_kapitel').select('*').eq('fach_id', fachId).order('reihenfolge');
  if (!fach) return;

  const kapitelCards = (kapitel||[]).map(k => `
    <div class="card" style="margin-bottom:12px;cursor:pointer" onclick="showKapitel(${k.id},${fachId})">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">${fach.name}</div>
          <div style="font-weight:600;font-size:1rem">${k.name}</div>
          <div style="font-size:0.82rem;color:var(--muted2);margin-top:2px">${k.beschreibung||''}</div>
        </div>
        <span style="color:var(--accent);font-size:1.3rem">→</span>
      </div>
    </div>`).join('') || '<div class="alert alert-info">Noch keine Kapitel vorhanden.</div>';

  const mobKapitel = (kapitel||[]).map(k => `
    <div class="mob-lf-card" onclick="showKapitel(${k.id},${fachId})">
      <div class="mob-lf-icon-wrap" style="font-size:1.3rem">${fach.icon}</div>
      <div class="mob-lf-info">
        <div class="mob-lf-num">${fach.name}</div>
        <div class="mob-lf-name">${k.name}</div>
      </div>
      <div class="mob-lf-arrow">›</div>
    </div>`).join('') || '<div class="alert alert-info">Noch keine Kapitel.</div>';

  setDesktop(`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
      <span style="font-size:2.2rem">${fach.icon}</span>
      <div>
        <h1>${fach.name}</h1>
        <p style="color:var(--muted2);font-size:0.88rem">${fach.beschreibung||''}</p>
      </div>
    </div>
    <h2 style="margin-bottom:14px">Kapitel</h2>
    ${kapitelCards}
  `);

  setMobile(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="font-size:1.6rem">${fach.icon}</span>
      <div class="mob-greeting">${fach.name}</div>
    </div>
    <div class="mob-greeting-sub" style="margin-bottom:20px">${fach.beschreibung||''}</div>
    <div class="mob-section">Kapitel</div>
    ${mobKapitel}
  `);
}

// Mobile: Fächer-Auswahl
async function showFaecherMob() {
  setActive(null, 'bn-faecher');
  const { data: faecher } = await db.from('faecher').select('*').order('reihenfolge');
  setMobile(`
    <div class="mob-greeting">Fächer</div>
    <div class="mob-greeting-sub" style="margin-bottom:20px">Wähle ein Fach</div>
    ${(faecher||[]).map(f => `
      <div class="mob-lf-card" onclick="showFach(${f.id})">
        <div class="mob-lf-icon-wrap" style="font-size:1.4rem">${f.icon}</div>
        <div class="mob-lf-info">
          <div class="mob-lf-name">${f.name}</div>
          <div style="font-size:0.78rem;color:var(--muted2)">${f.beschreibung||''}</div>
        </div>
        <div class="mob-lf-arrow">›</div>
      </div>`).join('')}
  `);
}

// ── KAPITEL DETAIL ────────────────────────────────────────────
async function showKapitel(kapitelId, fachId) {
  showSpinner();
  const { data: kap } = await db.from('fach_kapitel').select('*, faecher(id,name,icon)').eq('id', kapitelId).maybeSingle();
  
  const [{ data: inhalte }, { data: fp }] = await Promise.all([
    db.from('fach_inhalte').select('id, titel, typ, reihenfolge, kapitel_id').eq('kapitel_id', kapitelId).order('reihenfolge'),
    db.from('fach_fortschritt').select('inhalt_id').eq('user_id', USER.id).eq('abgeschlossen', true)
  ]);
  const doneIds = (fp || []).map(f => f.inhalt_id);
  
  const { data: vokabeln } = await db.from('vokabeln').select('id').eq('kapitel_id', kapitelId);
  const isEnglisch = fachId === 1;
  const typeIcon   = { text:'📄', quiz:'❓', grammatik:'📝' };
  const typeLabel  = { text:'Text', quiz:'Quiz', grammatik:'Grammatik' };
  const hasVok     = isEnglisch && vokabeln && vokabeln.length > 0;

  const inhaltCards = (inhalte||[]).map(i => {
    const isDone = doneIds.includes(i.id);
    return `
    <div class="card" style="margin-bottom:10px;cursor:pointer;${isDone ? 'border-left:4px solid var(--correct)' : ''}" onclick="showFachInhalt(${i.id},${kapitelId},${fachId})">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:1.4rem">${isDone ? '✅' : (typeIcon[i.typ]||'📄')}</span>
          <div>
            <div style="font-weight:600;${isDone ? 'color:var(--correct)' : ''}">${i.titel}</div>
            <div style="font-size:0.78rem;color:var(--muted2)">${typeLabel[i.typ]||i.typ}</div>
          </div>
        </div>
        <span style="color:var(--accent)">→</span>
      </div>
    </div>`;
  }).join('') || '';

  const vokabelSection = hasVok ? `
    <h2 style="margin-bottom:14px">🗂 Vokabeln <span style="font-size:0.8rem;color:var(--muted2);font-weight:400">${vokabeln.length} Wörter</span></h2>
    <div class="card" style="margin-bottom:10px;cursor:pointer" onclick="startVokabelTrainer(${kapitelId},${fachId},'en-de')">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:1.4rem">🇬🇧</span>
          <div><div style="font-weight:600">Englisch → Deutsch</div><div style="font-size:0.78rem;color:var(--muted2)">Siehst englisches Wort, tippst Übersetzung</div></div>
        </div><span style="color:var(--accent)">→</span>
      </div>
    </div>
    <div class="card" style="margin-bottom:24px;cursor:pointer" onclick="startVokabelTrainer(${kapitelId},${fachId},'de-en')">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:1.4rem">🇩🇪</span>
          <div><div style="font-weight:600">Deutsch → Englisch</div><div style="font-size:0.78rem;color:var(--muted2)">Siehst deutsches Wort, tippst Übersetzung</div></div>
        </div><span style="color:var(--accent)">→</span>
      </div>
    </div>` : '';

  const mobVokabel = hasVok ? `
    <div class="mob-section">🗂 Vokabeln (${vokabeln.length})</div>
    <div class="mob-inhalt-card" onclick="startVokabelTrainer(${kapitelId},${fachId},'en-de')">
      <div class="mob-inhalt-type">🇬🇧</div>
      <div style="flex:1"><div style="font-weight:600;font-size:0.9rem">Englisch → Deutsch</div></div>
      <span style="color:var(--muted)">›</span>
    </div>
    <div class="mob-inhalt-card" onclick="startVokabelTrainer(${kapitelId},${fachId},'de-en')">
      <div class="mob-inhalt-type">🇩🇪</div>
      <div style="flex:1"><div style="font-weight:600;font-size:0.9rem">Deutsch → Englisch</div></div>
      <span style="color:var(--muted)">›</span>
    </div>` : '';

  const mobInhalte = (inhalte||[]).map(i => {
    const isDone = doneIds.includes(i.id);
    return `
    <div class="mob-inhalt-card" onclick="showFachInhalt(${i.id},${kapitelId},${fachId})" style="${isDone ? 'border-left:3px solid var(--correct)' : ''}">
      <div class="mob-inhalt-type">${isDone ? '✅' : (typeIcon[i.typ]||'📄')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:0.9rem;${isDone ? 'color:var(--correct)' : ''}">${i.titel}</div>
        <div style="font-size:0.75rem;color:var(--muted2)">${typeLabel[i.typ]||i.typ}</div>
      </div>
      <span style="color:var(--muted)">›</span>
    </div>`;
  }).join('');

  setDesktop(`
    <button class="btn btn-secondary btn-sm" onclick="showFach(${fachId})" style="margin-bottom:20px">← ${kap.faecher.name}</button>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
      <span style="font-size:1.8rem">${kap.faecher.icon}</span>
      <div>
        <div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px">${kap.faecher.name}</div>
        <h1>${kap.name}</h1>
      </div>
    </div>
    <p style="color:var(--muted2);margin-bottom:28px">${kap.beschreibung||''}</p>
    ${vokabelSection}
    ${inhalte && inhalte.length ? `<h2 style="margin-bottom:14px">Inhalte</h2>${inhaltCards}` : ''}
  `);

  setMobile(`
    <button class="mob-back" onclick="showFach(${fachId})">← ${kap.faecher.name}</button>
    <div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${kap.faecher.name}</div>
    <div style="font-size:1.1rem;font-weight:700;margin-bottom:4px">${kap.name}</div>
    <div style="font-size:0.83rem;color:var(--muted2);margin-bottom:20px">${kap.beschreibung||''}</div>
    ${mobVokabel}
    ${inhalte && inhalte.length ? `<div class="mob-section" style="margin-top:${hasVok?'20px':'0'}">Inhalte</div>${mobInhalte}` : ''}
  `);
}

async function showFachInhalt(inhaltId, kapitelId, fachId) {
  const [{ data: i }, { data: fpRows }] = await Promise.all([
    db.from('fach_inhalte').select('*, fach_kapitel(id,name,faecher(name))').eq('id', inhaltId).maybeSingle(),
    // FIX: select statt maybeSingle – gibt immer ein Array zurück, nie null
    db.from('fach_fortschritt').select('id').eq('user_id', USER.id).eq('inhalt_id', inhaltId)
  ]);
  
  if (!i) return;
  const isDone = fpRows && fpRows.length > 0;

  if (i.typ === 'quiz') {
    // FIX: Quiz-Abschluss wird jetzt auch als erledigt gespeichert
    renderQuiz(i, `← ${i.fach_kapitel.name}`, () => showKapitel(kapitelId, fachId), async () => {
      await markFachDone(inhaltId, kapitelId, fachId, false);
    });
  } else {
    const html = (i.inhalt?.text||'').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
    
    const doneButtonHTML = isDone 
      ? `<button class="btn btn-secondary" disabled>✅ Bereits erledigt</button>`
      : `<button class="btn btn-success" onclick="markFachDone(${inhaltId},${kapitelId},${fachId},true)">✅ Als erledigt markieren</button>`;

    setDesktop(`
      <button class="btn btn-secondary btn-sm" onclick="showKapitel(${kapitelId},${fachId})" style="margin-bottom:20px">← ${i.fach_kapitel.name}</button>
      <h1 style="margin-bottom:20px">${i.titel}</h1>
      <div class="card"><div class="content-text">${html}</div></div>
      <div style="margin-top:16px">${doneButtonHTML}</div>
    `);
    setMobile(`
      <button class="mob-back" onclick="showKapitel(${kapitelId},${fachId})">← ${i.fach_kapitel.name}</button>
      <div style="font-size:1.1rem;font-weight:700;margin-bottom:16px">${i.titel}</div>
      <div class="card" style="margin-bottom:16px"><div class="content-text" style="font-size:0.92rem;line-height:1.7">${html}</div></div>
      ${doneButtonHTML.replace('class="btn ', 'class="btn btn-full ')}
    `);
  }
}

// FIX: navigate=true springt zurück zum Kapitel, false (nach Quiz) bleibt auf Ergebnisseite
async function markFachDone(inhaltId, kapitelId, fachId, navigate = true) {
  await db.from('fach_fortschritt').upsert(
    { user_id: USER.id, inhalt_id: inhaltId, abgeschlossen: true, completed_at: new Date().toISOString() },
    { onConflict: 'user_id,inhalt_id' }
  );
  if (navigate) showKapitel(kapitelId, fachId);
}
