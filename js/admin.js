// ── ADMIN PANEL ───────────────────────────────────────────────
async function showAdmin() {
  setActive('lnk-admin', 'bn-admin');
  showSpinner();

  const [
    { data: users },
    { data: lernfelder },
    { data: faecher },
    { data: inhalte },
    { data: fachInhalte },
    { data: allFortschritt },
    { data: allFachFortschritt },
    { data: arbeiten },
    { data: arbeiten_ergebnisse },
  ] = await Promise.all([
    db.from('profiles').select('*').order('created_at', { ascending: false }),
    db.from('lernfelder').select('id, nummer, name, freigeschaltet').order('nummer'),
    db.from('faecher').select('id, name, icon, freigeschaltet').order('reihenfolge'),
    db.from('inhalte').select('id, titel, typ, lernfeld_id').eq('aktiv', true),
    db.from('fach_inhalte').select('id, titel, typ, kapitel_id'),
    db.from('fortschritt').select('user_id, inhalt_id, completed_at').eq('abgeschlossen', true),
    db.from('fach_fortschritt').select('user_id, inhalt_id, completed_at').eq('abgeschlossen', true),
    db.from('arbeiten').select('id, titel, typ').eq('aktiv', true),
    db.from('arbeiten_ergebnisse').select('user_id, arbeit_id, score_prozent, beendet_am').not('beendet_am', 'is', null),
  ]);

  const totalInhalte = (inhalte?.length || 0) + (fachInhalte?.length || 0);
  const azubis = (users || []).filter(u => u.role === 'azubi');

  // Fortschritt pro User berechnen
  function getUserProgress(userId) {
    const fp  = (allFortschritt || []).filter(f => f.user_id === userId).length;
    const ffp = (allFachFortschritt || []).filter(f => f.user_id === userId).length;
    return fp + ffp;
  }

  // Letzter Login / Aktivität
  function getLastActivity(userId) {
    const fp  = (allFortschritt || []).filter(f => f.user_id === userId).map(f => new Date(f.completed_at));
    const ffp = (allFachFortschritt || []).filter(f => f.user_id === userId).map(f => new Date(f.completed_at));
    const all = [...fp, ...ffp].sort((a, b) => b - a);
    return all.length ? all[0] : null;
  }

  // Durchschnittlicher Score pro User
  function getUserAvgScore(userId) {
    const ergs = (arbeiten_ergebnisse || []).filter(e => e.user_id === userId && e.score_prozent !== null);
    if (!ergs.length) return null;
    return Math.round(ergs.reduce((s, e) => s + e.score_prozent, 0) / ergs.length);
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function progressBar(done, total, color) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const c = color || (pct >= 80 ? 'var(--correct)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)');
    return `
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:6px;background:var(--border);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${c};border-radius:99px;transition:width 0.4s"></div>
        </div>
        <span style="font-size:0.75rem;font-weight:700;color:${c};min-width:36px;text-align:right">${pct}%</span>
      </div>`;
  }

  function scoreColor(s) {
    if (s === null) return 'var(--muted2)';
    return s >= 75 ? 'var(--correct)' : s >= 50 ? 'var(--warning)' : 'var(--danger)';
  }

  function toggleRow(id, checked, table) {
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:600;font-size:0.88rem">${id.name}</div>
          <div style="font-size:0.72rem;color:${checked ? 'var(--correct)' : 'var(--warning)'};margin-top:1px">
            ${checked ? '✅ Freigeschaltet' : '🔒 Gesperrt'}
          </div>
        </div>
        <label class="toggle">
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="${table}(${id.id}, this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>`;
  }

  const lfToggles   = (lernfelder || []).map(lf => toggleRow({ id: lf.id, name: `LF ${lf.nummer}: ${lf.name}` }, lf.freigeschaltet, 'toggleLF')).join('');
  const fachToggles = (faecher || []).map(f => toggleRow({ id: f.id, name: `${f.icon} ${f.name}` }, f.freigeschaltet, 'toggleFach')).join('');

  // ── KLASSENÜBERSICHT ──────────────────────────────────────
  const klasseRows = azubis.map(u => {
    const done    = getUserProgress(u.id);
    const lastAct = getLastActivity(u.id);
    const avgScore = getUserAvgScore(u.id);
    const pruefungen = (arbeiten_ergebnisse || []).filter(e => e.user_id === u.id).length;
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:700;color:#fff;flex-shrink:0">
              ${u.username.substring(0, 2).toUpperCase()}
            </div>
            <strong>${u.username}</strong>
          </div>
        </td>
        <td style="min-width:160px">${progressBar(done, totalInhalte)}</td>
        <td style="text-align:center;font-weight:700;color:${scoreColor(avgScore)}">
          ${avgScore !== null ? avgScore + '%' : '—'}
        </td>
        <td style="text-align:center;color:var(--muted2)">${pruefungen}</td>
        <td style="color:var(--muted2);font-size:0.82rem">${lastAct ? formatDate(lastAct) : '—'}</td>
      </tr>`;
  }).join('') || '<tr><td colspan="5" style="color:var(--muted2);text-align:center;padding:20px">Noch keine Azubis registriert.</td></tr>';

  // ── PRÜFUNGS-ERGEBNISSE ───────────────────────────────────
  const pruefungRows = (arbeiten || []).map(a => {
    const ergs = (arbeiten_ergebnisse || []).filter(e => e.arbeit_id === a.id);
    const avg  = ergs.length ? Math.round(ergs.reduce((s, e) => s + (e.score_prozent || 0), 0) / ergs.length) : null;
    const best = ergs.length ? Math.max(...ergs.map(e => e.score_prozent || 0)) : null;
    const worst = ergs.length ? Math.min(...ergs.map(e => e.score_prozent || 0)) : null;
    return `
      <tr>
        <td><strong>${a.titel}</strong></td>
        <td style="text-align:center">${ergs.length}</td>
        <td style="text-align:center;font-weight:700;color:${scoreColor(avg)}">${avg !== null ? avg + '%' : '—'}</td>
        <td style="text-align:center;color:var(--correct)">${best !== null ? best + '%' : '—'}</td>
        <td style="text-align:center;color:var(--danger)">${worst !== null ? worst + '%' : '—'}</td>
      </tr>`;
  }).join('') || '<tr><td colspan="5" style="color:var(--muted2);text-align:center;padding:20px">Keine Arbeiten vorhanden.</td></tr>';

  // ── BENUTZERVERWALTUNG ────────────────────────────────────
  const userRows = (users || []).map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td><span class="badge badge-${u.role}">${u.role}</span></td>
      <td style="color:var(--muted2);font-size:0.82rem">${formatDate(u.created_at)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <select class="form-input" style="padding:4px 8px;font-size:0.8rem;width:auto"
            onchange="changeRole('${u.id}', this.value)"
            ${u.id === USER.id ? 'disabled title="Eigene Rolle nicht änderbar"' : ''}>
            <option value="azubi" ${u.role === 'azubi' ? 'selected' : ''}>Azubi</option>
            <option value="mod"   ${u.role === 'mod'   ? 'selected' : ''}>Mod</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
          ${u.id !== USER.id ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}', '${u.username}')">🗑</button>` : ''}
        </div>
      </td>
    </tr>`).join('');

  // ── AKTIVITÄTS-FEED ───────────────────────────────────────
  const allActivity = [
    ...(allFortschritt || []).map(f => ({
      user_id: f.user_id,
      date: new Date(f.completed_at),
    })),
    ...(allFachFortschritt || []).map(f => ({
      user_id: f.user_id,
      date: new Date(f.completed_at),
    })),
  ].sort((a, b) => b.date - a.date).slice(0, 8);

  const activityFeed = allActivity.map(a => {
    const user = (users || []).find(u => u.id === a.user_id);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;color:#fff;flex-shrink:0">
          ${user ? user.username.substring(0, 2).toUpperCase() : '??'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;font-weight:600">${user?.username || 'Unbekannt'}</div>
          <div style="font-size:0.72rem;color:var(--muted2)">hat einen Inhalt abgeschlossen</div>
        </div>
        <div style="font-size:0.72rem;color:var(--muted2);flex-shrink:0">${formatDate(a.date)}</div>
      </div>`;
  }).join('') || '<div style="color:var(--muted2);font-size:0.85rem;padding:12px 0">Noch keine Aktivität.</div>';

  // Durchschnitt Klasse
  const klasseAvg = azubis.length
    ? Math.round(azubis.reduce((s, u) => s + getUserProgress(u.id), 0) / azubis.length / totalInhalte * 100)
    : 0;

  setDesktop(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <h1>⚙️ Admin Panel</h1>
      <div style="font-size:0.82rem;color:var(--muted2)">LOG25a · ${azubis.length} Azubis</div>
    </div>

    <!-- STATS -->
    <div class="grid-4" style="margin-bottom:28px">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value gradient-text">${users?.length || 0}</div>
        <div class="stat-label">Benutzer gesamt</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📚</div>
        <div class="stat-value gradient-text">${totalInhalte}</div>
        <div class="stat-label">Inhalte gesamt</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-value gradient-text">${klasseAvg}%</div>
        <div class="stat-label">Ø Klassenfortschritt</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-value gradient-text">${arbeiten_ergebnisse?.length || 0}</div>
        <div class="stat-label">Prüfungen abgelegt</div>
      </div>
    </div>

    <!-- KLASSENÜBERSICHT + AKTIVITÄT -->
    <div style="display:grid;grid-template-columns:1fr 280px;gap:20px;margin-bottom:28px">
      <div>
        <h2 style="margin-bottom:12px">📊 Klassenübersicht</h2>
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Azubi</th>
            <th>Fortschritt</th>
            <th style="text-align:center">Ø Score</th>
            <th style="text-align:center">Prüfungen</th>
            <th>Zuletzt aktiv</th>
          </tr></thead>
          <tbody>${klasseRows}</tbody>
        </table></div>
      </div>
      <div>
        <h2 style="margin-bottom:12px">🕐 Zuletzt aktiv</h2>
        <div class="card" style="padding:12px 16px">${activityFeed}</div>
      </div>
    </div>

    <!-- PRÜFUNGSERGEBNISSE + FREISCHALTUNGEN -->
    <div class="grid-2" style="margin-bottom:28px">
      <div>
        <h2 style="margin-bottom:12px">📝 Prüfungsergebnisse</h2>
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Arbeit</th>
            <th style="text-align:center">Abgelegt</th>
            <th style="text-align:center">Ø Score</th>
            <th style="text-align:center">Beste</th>
            <th style="text-align:center">Schlechteste</th>
          </tr></thead>
          <tbody>${pruefungRows}</tbody>
        </table></div>
      </div>
      <div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <h2 style="margin-bottom:12px">🔓 Lernfelder</h2>
            <div class="card" style="padding:12px 16px;max-height:220px;overflow-y:auto">${lfToggles}</div>
          </div>
          <div>
            <h2 style="margin-bottom:12px">🔓 Fächer</h2>
            <div class="card" style="padding:12px 16px;max-height:220px;overflow-y:auto">${fachToggles}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- BENUTZERVERWALTUNG -->
    <h2 style="margin-bottom:12px">👥 Benutzerverwaltung</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Vorname</th><th>Rolle</th><th>Registriert</th><th>Aktionen</th></tr></thead>
        <tbody>${userRows}</tbody>
      </table>
    </div>
    <div id="role-msg" style="margin-top:12px"></div>
  `);

  // ── MOBILE ────────────────────────────────────────────────
  const mobKlasseCards = azubis.map(u => {
    const done = getUserProgress(u.id);
    const avg  = getUserAvgScore(u.id);
    const pct  = totalInhalte > 0 ? Math.round((done / totalInhalte) * 100) : 0;
    return `
      <div class="mob-lf-card" style="cursor:default;flex-direction:column;align-items:stretch;gap:8px;padding:14px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:700;color:#fff;flex-shrink:0">
            ${u.username.substring(0, 2).toUpperCase()}
          </div>
          <div style="flex:1">
            <div style="font-weight:600">${u.username}</div>
            <div style="font-size:0.72rem;color:var(--muted2)">${done} von ${totalInhalte} Inhalte</div>
          </div>
          ${avg !== null ? `<div style="font-weight:700;color:${scoreColor(avg)};font-size:0.9rem">${avg}%</div>` : ''}
        </div>
        ${progressBar(done, totalInhalte)}
      </div>`;
  }).join('') || '<div class="alert alert-info">Noch keine Azubis.</div>';

  const mobUserCards = (users || []).map(u => `
    <div class="mob-lf-card" style="cursor:default;margin-bottom:8px">
      <div class="mob-lf-icon-wrap" style="font-size:0.9rem;font-weight:700;color:var(--accent)">${u.username.substring(0, 2).toUpperCase()}</div>
      <div class="mob-lf-info">
        <div style="font-weight:600">${u.username}</div>
        <span class="badge badge-${u.role}">${u.role}</span>
      </div>
      <select class="form-input" style="padding:4px 6px;font-size:0.78rem;width:72px"
        onchange="changeRole('${u.id}', this.value)" ${u.id === USER.id ? 'disabled' : ''}>
        <option value="azubi" ${u.role === 'azubi' ? 'selected' : ''}>Azubi</option>
        <option value="mod"   ${u.role === 'mod'   ? 'selected' : ''}>Mod</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
      </select>
    </div>`).join('');

  setMobile(`
    <div class="mob-greeting" style="font-size:1.1rem">⚙️ Admin Panel</div>
    <div class="mob-stats" style="margin-bottom:20px">
      <div class="mob-stat"><div class="mob-stat-val gradient-text">${users?.length || 0}</div><div class="mob-stat-lbl">👥 Benutzer</div></div>
      <div class="mob-stat"><div class="mob-stat-val gradient-text">${klasseAvg}%</div><div class="mob-stat-lbl">📊 Ø Fortschritt</div></div>
    </div>

    <div class="mob-section">📊 Klassenübersicht</div>
    ${mobKlasseCards}

    <div class="mob-section" style="margin-top:20px">🔓 Lernfelder</div>
    <div class="card" style="margin-bottom:16px;padding:12px 16px">${lfToggles}</div>

    <div class="mob-section">🔓 Fächer</div>
    <div class="card" style="margin-bottom:16px;padding:12px 16px">${fachToggles}</div>

    <div class="mob-section">👥 Benutzer</div>
    ${mobUserCards}
    <div id="role-msg" style="margin-top:12px"></div>
  `);
}

// ── TOGGLE FUNKTIONEN ─────────────────────────────────────────
async function toggleLF(lfId, value) {
  const { error } = await db.from('lernfelder').update({ freigeschaltet: value }).eq('id', lfId);
  if (error) alert('Fehler: ' + error.message);
}

async function toggleFach(fachId, value) {
  const { error } = await db.from('faecher').update({ freigeschaltet: value }).eq('id', fachId);
  if (error) alert('Fehler: ' + error.message);
}

// ── ROLLE ÄNDERN ──────────────────────────────────────────────
async function changeRole(userId, newRole) {
  const { error } = await db.from('profiles').update({ role: newRole }).eq('id', userId);
  const msg = error
    ? `<div class="alert alert-error">Fehler: ${error.message}</div>`
    : `<div class="alert alert-success">✅ Rolle geändert</div>`;
  document.querySelectorAll('#role-msg').forEach(el => {
    el.innerHTML = msg;
    setTimeout(() => el.innerHTML = '', 3000);
  });
}

// ── BENUTZER LÖSCHEN ──────────────────────────────────────────
async function deleteUser(userId, username) {
  if (!confirm(`Benutzer "${username}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;

  // Fortschritt löschen
  await Promise.all([
    db.from('fortschritt').delete().eq('user_id', userId),
    db.from('fach_fortschritt').delete().eq('user_id', userId),
    db.from('vokabel_fortschritt').delete().eq('user_id', userId),
    db.from('vokabel_session').delete().eq('user_id', userId),
    db.from('arbeiten_ergebnisse').delete().eq('user_id', userId),
  ]);

  // Profil löschen
  const { error } = await db.from('profiles').delete().eq('id', userId);
  if (error) return alert('Fehler: ' + error.message);

  // Liste neu laden
  showAdmin();
}