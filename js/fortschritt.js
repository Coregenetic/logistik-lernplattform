// ── FORTSCHRITT ───────────────────────────────────────────────
async function showFortschritt() {
  setActive('lnk-fp', 'bn-fp');
  const [{ data: fp }, { data: fachFp }] = await Promise.all([
    db.from('fortschritt').select('*, inhalte(titel, typ, lernfelder(nummer, name))').eq('user_id', USER.id).eq('abgeschlossen', true),
    db.from('fach_fortschritt').select('*, fach_inhalte(titel, typ, fach_kapitel(name, faecher(name)))').eq('user_id', USER.id).eq('abgeschlossen', true),
  ]);

  const leer = '<div class="alert alert-info">Noch nichts abgeschlossen. Leg los! 💪</div>';

  const lfTable = fp && fp.length ? `
    <div class="table-wrap"><table>
      <thead><tr><th>Lernfeld</th><th>Inhalt</th><th>Typ</th><th>Abgeschlossen</th></tr></thead>
      <tbody>${fp.map(f=>`<tr>
        <td>LF ${f.inhalte?.lernfelder?.nummer}: ${f.inhalte?.lernfelder?.name}</td>
        <td>${f.inhalte?.titel}</td>
        <td style="text-transform:capitalize">${f.inhalte?.typ}</td>
        <td style="color:var(--correct)">✅ ${new Date(f.completed_at).toLocaleDateString('de-DE')}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : leer;

  const fachTable = fachFp && fachFp.length ? `
    <div class="table-wrap" style="margin-top:8px"><table>
      <thead><tr><th>Fach</th><th>Inhalt</th><th>Typ</th><th>Abgeschlossen</th></tr></thead>
      <tbody>${fachFp.map(f=>`<tr>
        <td>${f.fach_inhalte?.fach_kapitel?.faecher?.name}</td>
        <td>${f.fach_inhalte?.titel}</td>
        <td style="text-transform:capitalize">${f.fach_inhalte?.typ}</td>
        <td style="color:var(--correct)">✅ ${new Date(f.completed_at).toLocaleDateString('de-DE')}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : '';

  const total = (fp?.length||0) + (fachFp?.length||0);

  setDesktop(`
    <h1 style="margin-bottom:6px">Mein Fortschritt</h1>
    <p style="color:var(--muted2);margin-bottom:24px">${total} Inhalt${total!==1?'e':''} abgeschlossen</p>
    <h2 style="margin-bottom:12px">📚 Lernfelder</h2>${lfTable}
    ${fachTable ? `<h2 style="margin-top:28px;margin-bottom:12px">📘 Fächer</h2>${fachTable}` : ''}
  `);

  const mobCards = [
    ...(fp||[]).map(f => ({ label:`LF ${f.inhalte?.lernfelder?.nummer}`, titel:f.inhalte?.titel, date:f.completed_at })),
    ...(fachFp||[]).map(f => ({ label:f.fach_inhalte?.fach_kapitel?.faecher?.name, titel:f.fach_inhalte?.titel, date:f.completed_at })),
  ].sort((a,b) => new Date(b.date)-new Date(a.date));

  setMobile(`
    <div class="mob-greeting" style="font-size:1.1rem">📊 Mein Fortschritt</div>
    <div class="mob-greeting-sub" style="margin-bottom:20px">${total} Inhalt${total!==1?'e':''} abgeschlossen</div>
    ${mobCards.length ? mobCards.map(f=>`
      <div class="mob-lf-card" style="cursor:default">
        <div class="mob-lf-icon-wrap" style="font-size:1rem">✅</div>
        <div class="mob-lf-info">
          <div class="mob-lf-num">${f.label}</div>
          <div class="mob-lf-name">${f.titel}</div>
          <div style="font-size:0.72rem;color:var(--muted2);margin-top:3px">${new Date(f.date).toLocaleDateString('de-DE')}</div>
        </div>
      </div>`).join('') : leer}
  `);
}
