// ── HOME ─────────────────────────────────────────────────────

// Wird von auth.js beim ersten Load mit bereits geladenen Daten aufgerufen
function showHomeWithData({ lernfelder, fortschritt, fachFortschritt, arbeiten }) {
  setActive('lnk-home', 'bn-home');
  _renderHome({ lernfelder, fortschritt, fachFortschritt, arbeiten });
}

// Wird beim Navigieren zurück zur Home aufgerufen — lädt nur was nötig ist
async function showHome() {
  setActive('lnk-home', 'bn-home');
  showSpinner();

  const [
    { data: lernfelder },
    { data: fortschritt },
    { data: fachFortschritt },
    { data: arbeiten },
  ] = await Promise.all([
    db.from('lernfelder').select('id, nummer, name, beschreibung, icon, freigeschaltet').order('nummer'),
    db.from('fortschritt').select('inhalt_id').eq('user_id', USER.id).eq('abgeschlossen', true),
    db.from('fach_fortschritt').select('inhalt_id').eq('user_id', USER.id).eq('abgeschlossen', true),
    db.from('arbeiten').select('id, titel, typ, beschreibung, zeitlimit_minuten, max_fragen').eq('aktiv', true).order('erstellt_am', { ascending: false }).limit(3),
  ]);

  // Cache aktualisieren
  if (typeof _lfCache !== 'undefined') {
    _lfCache['fortschritt_' + USER.id] = (fortschritt||[]).map(f => f.inhalt_id);
  }

  _renderHome({ lernfelder, fortschritt, fachFortschritt, arbeiten });
}

function _renderHome({ lernfelder, fortschritt, fachFortschritt, arbeiten }) {
  const isMod = ['admin','mod'].includes(PROFILE.role);
  const lfCount        = (lernfelder||[]).length;
  const erledigtGesamt = (fortschritt||[]).length + (fachFortschritt||[]).length;
  const schnellzugriff = (lernfelder||[]).slice(0, 6);

  const typIcon  = { pruefung: '📝', arbeit: '📋' };
  const typLabel = { pruefung: 'Prüfungsmodus', arbeit: 'Klassenarbeit' };

  const arbeitenBanner = (arbeiten||[]).map(a => `
    <div onclick="showArbeitDetail(${a.id})" style="
      cursor:pointer;
      background:linear-gradient(135deg,var(--accent)18,var(--accent2)18);
      border:1px solid var(--accent);border-radius:16px;padding:18px 20px;margin-bottom:14px;
      display:flex;align-items:center;justify-content:space-between;gap:16px;transition:opacity 0.15s"
      onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
      <div style="flex:1;min-width:0">
        <div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">
          ${typIcon[a.typ]} ${typLabel[a.typ]} · Neu verfügbar!
        </div>
        <div style="font-weight:700;font-size:1rem;margin-bottom:4px">${a.titel}</div>
        <div style="font-size:0.82rem;color:var(--muted2)">
          ${a.zeitlimit_minuten ? `⏱ ${a.zeitlimit_minuten} Min · ` : ''}Max. ${a.max_fragen} Fragen
          ${a.beschreibung ? ` · ${a.beschreibung}` : ''}
        </div>
      </div>
      <div style="flex-shrink:0">
        <div class="btn btn-primary" style="pointer-events:none;white-space:nowrap">Jetzt starten →</div>
      </div>
    </div>`).join('');

  const mobArbeitenBanner = (arbeiten||[]).map(a => `
    <div onclick="showArbeitDetail(${a.id})" style="
      cursor:pointer;border:1px solid var(--accent);
      border-radius:14px;padding:14px 16px;margin-bottom:12px;background:var(--surface)">
      <div style="font-size:0.7rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">
        ${typIcon[a.typ]} Neu verfügbar!
      </div>
      <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px">${a.titel}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:0.78rem;color:var(--muted2)">
          ${a.zeitlimit_minuten ? `⏱ ${a.zeitlimit_minuten} Min · ` : ''}${a.max_fragen} Fragen
        </div>
        <span style="color:var(--accent);font-weight:700">Starten →</span>
      </div>
    </div>`).join('');

  setDesktop(`
    <h1 style="margin-bottom:4px">Hallo, <span class="gradient-text">${PROFILE.username}</span> 👋</h1>
    <p style="color:var(--muted2);margin-bottom:${arbeiten?.length ? '20px' : '28px'}">Was lernst du heute?</p>

    ${arbeitenBanner ? `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <h2 style="margin:0">📣 Aktuell</h2>
          ${isMod ? `<a onclick="showPruefungen()" style="font-size:0.8rem;color:var(--accent);cursor:pointer;margin-left:auto">Alle anzeigen →</a>` : ''}
        </div>
        ${arbeitenBanner}
      </div>` : ''}

    <div class="grid-3" style="margin-bottom:28px">
      <div class="stat-card"><div class="stat-value gradient-text">${lfCount}</div><div class="stat-label">📚 Lernfelder</div></div>
      <div class="stat-card"><div class="stat-value gradient-text">${(lernfelder||[]).reduce((s,lf) => s, 0)}</div><div class="stat-label">📄 Inhalte</div></div>
      <div class="stat-card"><div class="stat-value gradient-text">${erledigtGesamt}</div><div class="stat-label">✅ Erledigt</div></div>
    </div>

    <h2 style="margin-bottom:14px">Schnellzugriff</h2>
    <div class="grid-2">
      ${schnellzugriff.map(lf => lfCard(lf, isMod)).join('') || '<p style="color:var(--muted2)">Keine Lernfelder verfügbar.</p>'}
    </div>
  `);

  setMobile(`
    <div class="mob-greeting">Hallo, <span class="gradient-text">${PROFILE.username}</span> 👋</div>
    <div class="mob-greeting-sub" style="margin-bottom:${arbeiten?.length ? '16px' : '0'}">Was lernst du heute?</div>

    ${mobArbeitenBanner ? `
      <div class="mob-section">📣 Aktuell</div>
      ${mobArbeitenBanner}` : ''}

    <div class="mob-stats">
      <div class="mob-stat"><div class="mob-stat-val gradient-text">${lfCount}</div><div class="mob-stat-lbl">📚 Lernfelder</div></div>
      <div class="mob-stat"><div class="mob-stat-val gradient-text">${erledigtGesamt}</div><div class="mob-stat-lbl">✅ Erledigt</div></div>
    </div>

    <div class="mob-section">Lernfelder</div>
    ${schnellzugriff.map(lf => mobLfCard(lf, isMod)).join('') || '<p style="color:var(--muted2)">Keine Lernfelder verfügbar.</p>'}

    <div class="mob-section" style="margin-top:24px">Fächer</div>
    <div class="mob-fach-row">
      <div class="mob-fach-pill" onclick="showFach(1)">🇬🇧 Englisch</div>
      <div class="mob-fach-pill" onclick="showFach(2)">💬 Kommunikation</div>
      <div class="mob-fach-pill" onclick="showFach(3)">📊 WiPo</div>
    </div>
  `);
}