// ── HOME ─────────────────────────────────────────────────────
async function showHome() {
  setActive('lnk-home', 'bn-home');
  const isMod = ['admin','mod'].includes(PROFILE.role);

  const [
    { count: lfCount },
    { count: inhCount },
    { count: fpCount },
    { count: fachFpCount },
  ] = await Promise.all([
    db.from('lernfelder').select('*', { count:'exact', head:true }),
    db.from('inhalte').select('*',    { count:'exact', head:true }),
    db.from('fortschritt').select('*',    { count:'exact', head:true }).eq('user_id', USER.id).eq('abgeschlossen', true),
    db.from('fach_fortschritt').select('*', { count:'exact', head:true }).eq('user_id', USER.id).eq('abgeschlossen', true),
  ]);

  const { data: lernfelder } = await db.from('lernfelder').select('*').order('nummer').limit(6);

  const erledigtGesamt = (fpCount || 0) + (fachFpCount || 0);

  // Desktop
  setDesktop(`
    <h1 style="margin-bottom:4px">Moin, <span class="gradient-text">${PROFILE.username}</span> 👋</h1>
    <p style="color:var(--muted2);margin-bottom:28px">Krieg dein Arsch hoch und lerne!</p>
    <div class="grid-3" style="margin-bottom:28px">
      <div class="stat-card"><div class="stat-value gradient-text">${lfCount||0}</div><div class="stat-label">📚 Lernfelder</div></div>
      <div class="stat-card"><div class="stat-value gradient-text">${inhCount||0}</div><div class="stat-label">📄 Inhalte</div></div>
      <div class="stat-card"><div class="stat-value gradient-text">${erledigtGesamt}</div><div class="stat-label">✅ Erledigt</div></div>
    </div>
    <h2 style="margin-bottom:14px">Schnellzugriff</h2>
    <div class="grid-2">
      ${(lernfelder||[]).map(lf => lfCard(lf, isMod)).join('') || '<p style="color:var(--muted2)">Keine Lernfelder verfügbar.</p>'}
    </div>
  `);

  // Mobile
  setMobile(`
    <div class="mob-greeting">Moin, <span class="gradient-text">${PROFILE.username}</span> 👋</div>
    <div class="mob-greeting-sub">Was lernst du heute?</div>
    <div class="mob-stats">
      <div class="mob-stat"><div class="mob-stat-val gradient-text">${lfCount||0}</div><div class="mob-stat-lbl">📚 Lernfelder</div></div>
      <div class="mob-stat"><div class="mob-stat-val gradient-text">${erledigtGesamt}</div><div class="mob-stat-lbl">✅ Erledigt</div></div>
    </div>
    <div class="mob-section">Lernfelder</div>
    ${(lernfelder||[]).map(lf => mobLfCard(lf, isMod)).join('') || '<p style="color:var(--muted2)">Keine Lernfelder verfügbar.</p>'}

    <div class="mob-section" style="margin-top:24px">Fächer</div>
    <div class="mob-fach-row">
      <div class="mob-fach-pill" onclick="showFach(1)">🇬🇧 Englisch</div>
      <div class="mob-fach-pill" onclick="showFach(2)">💬 Kommunikation</div>
      <div class="mob-fach-pill" onclick="showFach(3)">📊 WiPo</div>
    </div>
  `);
}
