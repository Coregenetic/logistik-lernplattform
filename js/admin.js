// ── ADMIN PANEL ───────────────────────────────────────────────
async function showAdmin() {
  setActive('lnk-admin', 'bn-admin');
  showSpinner();

  const [{ data: users }, { data: lernfelder }, { data: faecher }, { count: uCount }, { count: iCount }] = await Promise.all([
    db.from('profiles').select('*').order('created_at', { ascending:false }),
    db.from('lernfelder').select('id, nummer, name, freigeschaltet').order('nummer'),
    db.from('faecher').select('id, name, icon, freigeschaltet').order('reihenfolge'),
    db.from('profiles').select('*', { count:'exact', head:true }),
    db.from('inhalte').select('*',  { count:'exact', head:true }),
  ]);

  function toggleRow(id, checked, table) {
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:600;font-size:0.9rem">${id.name||id}</div>
          <div style="font-size:0.75rem;color:${checked?'var(--correct)':'var(--warning)'};margin-top:2px">
            ${checked ? '✅ Freigeschaltet' : '🔒 Gesperrt'}
          </div>
        </div>
        <label class="toggle">
          <input type="checkbox" ${checked?'checked':''} onchange="${table}(${id.id}, this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>`;
  }

  const lfToggles   = (lernfelder||[]).map(lf => toggleRow({ id:lf.id, name:`LF ${lf.nummer}: ${lf.name}` }, lf.freigeschaltet, 'toggleLF')).join('');
  const fachToggles = (faecher||[]).map(f  => toggleRow({ id:f.id,  name:`${f.icon} ${f.name}` },             f.freigeschaltet, 'toggleFach')).join('');

  const userRows = (users||[]).map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td><span class="badge badge-${u.role}">${u.role}</span></td>
      <td>${new Date(u.created_at).toLocaleDateString('de-DE')}</td>
      <td>
        <select class="form-input" style="padding:4px 8px;font-size:0.8rem;width:auto"
          onchange="changeRole('${u.id}', this.value)"
          ${u.id===USER.id?'disabled title="Eigene Rolle nicht änderbar"':''}>
          <option value="user"  ${u.role==='user' ?'selected':''}>User</option>
          <option value="mod"   ${u.role==='mod'  ?'selected':''}>Mod</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
        </select>
      </td>
    </tr>`).join('');

  const mobUserCards = (users||[]).map(u=>`
    <div class="mob-lf-card" style="cursor:default;margin-bottom:8px">
      <div class="mob-lf-icon-wrap" style="font-size:0.9rem;font-weight:700;color:var(--accent)">${u.username.substring(0,2).toUpperCase()}</div>
      <div class="mob-lf-info">
        <div style="font-weight:600">${u.username}</div>
        <span class="badge badge-${u.role}">${u.role}</span>
      </div>
      <select class="form-input" style="padding:4px 6px;font-size:0.78rem;width:72px"
        onchange="changeRole('${u.id}', this.value)" ${u.id===USER.id?'disabled':''}>
        <option value="user"  ${u.role==='user' ?'selected':''}>User</option>
        <option value="mod"   ${u.role==='mod'  ?'selected':''}>Mod</option>
        <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
      </select>
    </div>`).join('');

  setDesktop(`
    <h1 style="margin-bottom:24px">⚙️ Admin Panel</h1>
    <div class="grid-3" style="margin-bottom:32px">
      <div class="stat-card"><div class="stat-value gradient-text">${uCount||0}</div><div class="stat-label">👥 Benutzer</div></div>
      <div class="stat-card"><div class="stat-value gradient-text">${lernfelder?.length||0}</div><div class="stat-label">📚 Lernfelder</div></div>
      <div class="stat-card"><div class="stat-value gradient-text">${iCount||0}</div><div class="stat-label">📄 Inhalte</div></div>
    </div>

    <div class="grid-2" style="margin-bottom:32px">
      <div>
        <h2 style="margin-bottom:6px">🔓 Lernfelder</h2>
        <p style="color:var(--muted2);font-size:0.83rem;margin-bottom:12px">Gesperrte Lernfelder nur für Admins/Mods sichtbar.</p>
        <div class="card">${lfToggles}</div>
      </div>
      <div>
        <h2 style="margin-bottom:6px">🔓 Fächer</h2>
        <p style="color:var(--muted2);font-size:0.83rem;margin-bottom:12px">Fächer für alle Nutzer freischalten.</p>
        <div class="card">${fachToggles}</div>
      </div>
    </div>

    <h2 style="margin-bottom:16px">👥 Benutzerverwaltung</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Vorname</th><th>Rolle</th><th>Registriert</th><th>Rolle ändern</th></tr></thead>
      <tbody>${userRows}</tbody>
    </table></div>
    <div id="role-msg" style="margin-top:12px"></div>
  `);

  setMobile(`
    <div class="mob-greeting" style="font-size:1.1rem">⚙️ Admin Panel</div>
    <div class="mob-stats" style="margin-bottom:20px">
      <div class="mob-stat"><div class="mob-stat-val gradient-text">${uCount||0}</div><div class="mob-stat-lbl">👥 Benutzer</div></div>
      <div class="mob-stat"><div class="mob-stat-val gradient-text">${iCount||0}</div><div class="mob-stat-lbl">📄 Inhalte</div></div>
    </div>
    <div class="mob-section">🔓 Lernfelder</div>
    <div class="card" style="margin-bottom:20px">${lfToggles}</div>
    <div class="mob-section">🔓 Fächer</div>
    <div class="card" style="margin-bottom:20px">${fachToggles}</div>
    <div class="mob-section">👥 Benutzer</div>
    ${mobUserCards}
    <div id="role-msg" style="margin-top:12px"></div>
  `);
}

async function toggleLF(lfId, value) {
  const { error } = await db.from('lernfelder').update({ freigeschaltet:value }).eq('id', lfId);
  if (error) alert('Fehler: ' + error.message);
}

async function toggleFach(fachId, value) {
  const { error } = await db.from('faecher').update({ freigeschaltet:value }).eq('id', fachId);
  if (error) alert('Fehler: ' + error.message);
}

async function changeRole(userId, newRole) {
  const { error } = await db.from('profiles').update({ role:newRole }).eq('id', userId);
  const msg = error
    ? `<div class="alert alert-error">Fehler: ${error.message}</div>`
    : `<div class="alert alert-success">Rolle geändert ✅</div>`;
  document.querySelectorAll('#role-msg').forEach(el => {
    el.innerHTML = msg;
    setTimeout(() => el.innerHTML = '', 3000);
  });
}
