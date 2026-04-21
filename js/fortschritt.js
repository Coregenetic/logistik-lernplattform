// ── FORTSCHRITT & PROFIL ──────────────────────────────────────

async function showFortschritt() {
  setActive('lnk-fp', 'bn-fp');
  showSpinner();

  const [
    { data: fp },
    { data: fachFp },
    { data: lernfelder },
    { data: faecher },
    { data: inhalte },
    { data: fachInhalte },
    { data: pruefungen },
  ] = await Promise.all([
    db.from('fortschritt').select('*, inhalte(titel, typ, lernfelder(nummer, name))').eq('user_id', USER.id).eq('abgeschlossen', true).order('completed_at', { ascending: false }),
    db.from('fach_fortschritt').select('*, fach_inhalte(titel, typ, fach_kapitel(name, faecher(name, icon)))').eq('user_id', USER.id).eq('abgeschlossen', true).order('completed_at', { ascending: false }),
    db.from('lernfelder').select('id, nummer, name, icon, freigeschaltet').order('nummer'),
    db.from('faecher').select('id, name, icon').order('reihenfolge'),
    db.from('inhalte').select('id, lernfeld_id').eq('aktiv', true),
    db.from('fach_inhalte').select('id, kapitel_id, fach_kapitel(fach_id)'),
    db.from('arbeiten_ergebnisse').select('score_prozent, beendet_am, arbeiten(titel)').eq('user_id', USER.id).not('beendet_am', 'is', null).order('beendet_am', { ascending: false }),
  ]);

  const totalInhalte = (inhalte?.length || 0) + (fachInhalte?.length || 0);
  const totalDone    = (fp?.length || 0) + (fachFp?.length || 0);
  const gesamtPct    = totalInhalte > 0 ? Math.round((totalDone / totalInhalte) * 100) : 0;
  const avgScore     = pruefungen?.length
    ? Math.round(pruefungen.reduce((s, e) => s + (e.score_prozent || 0), 0) / pruefungen.length)
    : null;

  // Streak berechnen (aufeinanderfolgende Tage mit Aktivität)
  const allDates = [
    ...(fp||[]).map(f => new Date(f.completed_at).toDateString()),
    ...(fachFp||[]).map(f => new Date(f.completed_at).toDateString()),
  ];
  const uniqueDates = [...new Set(allDates)].sort((a,b) => new Date(b)-new Date(a));
  let streak = 0;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now()-86400000).toDateString();
  if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
    for (let i = 0; i < uniqueDates.length; i++) {
      const d = new Date(uniqueDates[i]);
      const prev = new Date(uniqueDates[i-1] || uniqueDates[0]);
      if (i === 0) { streak = 1; continue; }
      const diff = Math.round((prev - d) / 86400000);
      if (diff === 1) streak++;
      else break;
    }
  }

  // Fortschritt pro Lernfeld
  const lfProgress = (lernfelder||[]).map(lf => {
    const lfInhalte = (inhalte||[]).filter(i => i.lernfeld_id === lf.id).length;
    const lfDone    = (fp||[]).filter(f => f.inhalte?.lernfelder?.nummer === lf.nummer).length;
    const pct       = lfInhalte > 0 ? Math.round((lfDone / lfInhalte) * 100) : 0;
    return { ...lf, lfInhalte, lfDone, pct };
  }).filter(lf => lf.lfInhalte > 0);

  // Fortschritt pro Fach
  const fachProgress = (faecher||[]).map(f => {
    const fItems = (fachInhalte||[]).filter(fi => fi.fach_kapitel?.fach_id === f.id).length;
    const fDone  = (fachFp||[]).filter(ff => ff.fach_inhalte?.fach_kapitel?.faecher?.name === f.name).length;
    const pct    = fItems > 0 ? Math.round((fDone / fItems) * 100) : 0;
    return { ...f, fItems, fDone, pct };
  }).filter(f => f.fItems > 0);

  function pBar(pct, color) {
    const c = color || (pct >= 80 ? 'var(--correct)' : pct >= 40 ? 'var(--accent)' : 'var(--warning)');
    return `<div style="height:6px;background:var(--border);border-radius:99px;overflow:hidden;margin-top:6px">
      <div style="height:100%;width:${pct}%;background:${c};border-radius:99px;transition:width 0.5s"></div>
    </div>`;
  }

  const scoreColor = avgScore === null ? 'var(--muted2)' : avgScore >= 75 ? 'var(--correct)' : avgScore >= 50 ? 'var(--warning)' : 'var(--danger)';

  // Chronologische Aktivitätsliste
  const allActivity = [
    ...(fp||[]).map(f => ({
      label: `LF ${f.inhalte?.lernfelder?.nummer}`,
      titel: f.inhalte?.titel,
      typ: f.inhalte?.typ,
      date: f.completed_at,
    })),
    ...(fachFp||[]).map(f => ({
      label: f.fach_inhalte?.fach_kapitel?.faecher?.name,
      titel: f.fach_inhalte?.titel,
      typ: f.fach_inhalte?.typ,
      date: f.completed_at,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const typeIcon = { text:'📄', quiz:'❓', lernkarten:'🃏', grammatik:'📝', vokabeln:'🗂' };

  function formatDate(d) {
    return new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  const activityHTML = allActivity.length ? allActivity.map(a => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:36px;height:36px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">
        ${typeIcon[a.typ] || '📄'}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.titel}</div>
        <div style="font-size:0.75rem;color:var(--muted2);margin-top:1px">${a.label}</div>
      </div>
      <div style="font-size:0.75rem;color:var(--correct);flex-shrink:0;font-weight:600">✅ ${formatDate(a.date)}</div>
    </div>`).join('')
  : '<div style="color:var(--muted2);font-size:0.85rem;padding:12px 0">Noch nichts abgeschlossen. Leg los! 💪</div>';

  const pruefungHTML = pruefungen?.length ? pruefungen.slice(0, 5).map(e => {
    const sc = e.score_prozent;
    const c  = sc >= 80 ? 'var(--correct)' : sc >= 50 ? 'var(--warning)' : 'var(--danger)';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="font-size:0.875rem;font-weight:600">${e.arbeiten?.titel || 'Prüfung'}</div>
        <div style="font-weight:800;color:${c};font-family:'Syne',sans-serif">${sc}%</div>
      </div>`;
  }).join('')
  : '<div style="color:var(--muted2);font-size:0.85rem;padding:12px 0">Noch keine Prüfungen abgelegt.</div>';

  // ── DESKTOP ───────────────────────────────────────────────
  setDesktop(`
    <h1 style="margin-bottom:24px">📊 Mein Fortschritt</h1>

    <!-- STATS -->
    <div class="grid-4" style="margin-bottom:28px">
      <div class="stat-card">
        <div class="stat-icon">📚</div>
        <div class="stat-value gradient-text">${totalDone}</div>
        <div class="stat-label">Inhalte erledigt</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-value gradient-text">${gesamtPct}%</div>
        <div class="stat-label">Gesamtfortschritt</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-value" style="font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;color:${scoreColor}">${avgScore !== null ? avgScore + '%' : '—'}</div>
        <div class="stat-label">Ø Prüfungsscore</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔥</div>
        <div class="stat-value gradient-text">${streak}</div>
        <div class="stat-label">Lern-Streak (Tage)</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">
      <!-- LERNFELDER FORTSCHRITT -->
      <div>
        <h2 style="margin-bottom:14px">📚 Lernfelder</h2>
        <div class="card">
          ${lfProgress.length ? lfProgress.map(lf => `
            <div style="padding:10px 0;border-bottom:1px solid var(--border)">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
                <div style="font-size:0.875rem;font-weight:600">${lf.icon || '📦'} LF ${lf.nummer}: ${lf.name}</div>
                <div style="font-size:0.78rem;font-weight:700;color:${lf.pct >= 80 ? 'var(--correct)' : lf.pct >= 40 ? 'var(--accent)' : 'var(--warning)'}">${lf.pct}%</div>
              </div>
              <div style="font-size:0.72rem;color:var(--muted2);margin-bottom:4px">${lf.lfDone} von ${lf.lfInhalte} Inhalten</div>
              ${pBar(lf.pct)}
            </div>`).join('')
          : '<div style="color:var(--muted2);font-size:0.85rem;padding:12px 0">Noch keine Inhalte gestartet.</div>'}
        </div>
      </div>

      <!-- FÄCHER + PRÜFUNGEN -->
      <div style="display:flex;flex-direction:column;gap:20px">
        <div>
          <h2 style="margin-bottom:14px">📘 Fächer</h2>
          <div class="card">
            ${fachProgress.length ? fachProgress.map(f => `
              <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
                  <div style="font-size:0.875rem;font-weight:600">${f.icon} ${f.name}</div>
                  <div style="font-size:0.78rem;font-weight:700;color:${f.pct >= 80 ? 'var(--correct)' : f.pct >= 40 ? 'var(--accent)' : 'var(--warning)'}">${f.pct}%</div>
                </div>
                <div style="font-size:0.72rem;color:var(--muted2);margin-bottom:4px">${f.fDone} von ${f.fItems} Inhalten</div>
                ${pBar(f.pct)}
              </div>`).join('')
            : '<div style="color:var(--muted2);font-size:0.85rem;padding:12px 0">Noch keine Inhalte gestartet.</div>'}
          </div>
        </div>

        <div>
          <h2 style="margin-bottom:14px">📝 Letzte Prüfungen</h2>
          <div class="card">${pruefungHTML}</div>
        </div>
      </div>
    </div>

    <!-- AKTIVITÄT -->
    <h2 style="margin-bottom:14px">🕐 Zuletzt abgeschlossen</h2>
    <div class="card">${activityHTML}</div>
  `);

  // ── MOBILE ────────────────────────────────────────────────
  setMobile(`
    <div class="mob-greeting">📊 Mein Fortschritt</div>
    <div class="mob-greeting-sub" style="margin-bottom:20px">${totalDone} von ${totalInhalte} Inhalten erledigt</div>

    <div class="mob-stats" style="margin-bottom:20px">
      <div class="mob-stat">
        <div class="mob-stat-val gradient-text">${gesamtPct}%</div>
        <div class="mob-stat-lbl">📈 Gesamt</div>
      </div>
      <div class="mob-stat">
        <div class="mob-stat-val" style="color:${scoreColor}">${avgScore !== null ? avgScore + '%' : '—'}</div>
        <div class="mob-stat-lbl">📝 Ø Score</div>
      </div>
      <div class="mob-stat">
        <div class="mob-stat-val gradient-text">${streak}</div>
        <div class="mob-stat-lbl">🔥 Streak</div>
      </div>
      <div class="mob-stat">
        <div class="mob-stat-val gradient-text">${totalDone}</div>
        <div class="mob-stat-lbl">✅ Erledigt</div>
      </div>
    </div>

    <div class="mob-section">📚 Lernfelder</div>
    <div class="card" style="margin-bottom:20px;padding:12px 16px">
      ${lfProgress.length ? lfProgress.map(lf => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px">
            <span style="font-size:0.82rem;font-weight:600">${lf.icon || '📦'} LF ${lf.nummer}</span>
            <span style="font-size:0.78rem;font-weight:700;color:${lf.pct >= 80 ? 'var(--correct)' : 'var(--accent)'}">${lf.pct}%</span>
          </div>
          ${pBar(lf.pct)}
        </div>`).join('')
      : '<div style="color:var(--muted2);font-size:0.85rem;padding:8px 0">Noch nichts gestartet.</div>'}
    </div>

    <div class="mob-section">🕐 Zuletzt abgeschlossen</div>
    <div class="card" style="padding:8px 16px">
      ${allActivity.slice(0, 10).map(a => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:1rem">${typeIcon[a.typ] || '📄'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:0.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.titel}</div>
            <div style="font-size:0.72rem;color:var(--muted2)">${a.label}</div>
          </div>
          <div style="font-size:0.7rem;color:var(--correct);flex-shrink:0">✅ ${formatDate(a.date)}</div>
        </div>`).join('') || '<div style="color:var(--muted2);font-size:0.85rem;padding:8px 0">Noch nichts abgeschlossen.</div>'}
    </div>
  `);
}

// ── PROFIL ────────────────────────────────────────────────────
async function showProfil() {
  setActive('lnk-profil', 'bn-profil');
  showSpinner();

  const [
    { data: fp },
    { data: fachFp },
    { data: pruefungen },
    { data: neuigkeiten },
    { data: neueFachInhalte },
    { data: quizSessions },
  ] = await Promise.all([
    db.from('fortschritt').select('inhalt_id').eq('user_id', USER.id).eq('abgeschlossen', true),
    db.from('fach_fortschritt').select('inhalt_id').eq('user_id', USER.id).eq('abgeschlossen', true),
    db.from('arbeiten_ergebnisse').select('score_prozent').eq('user_id', USER.id).not('beendet_am', 'is', null),
    db.from('inhalte').select('id, titel, typ, created_at, lernfelder(nummer, name)').order('created_at', { ascending: false }).limit(8),
    db.from('fach_inhalte').select('id, titel, typ, erstellt_am, fach_kapitel(name, faecher(name))').order('erstellt_am', { ascending: false }).limit(8),
    db.from('quiz_session').select('inhalt_id, inhalt_typ, current_index, updated_at').eq('user_id', USER.id),
  ]);

  const totalDone = (fp?.length || 0) + (fachFp?.length || 0);
  const avgScore  = pruefungen?.length
    ? Math.round(pruefungen.reduce((s, e) => s + (e.score_prozent || 0), 0) / pruefungen.length)
    : null;

  const roleColors = { admin: 'badge-admin', mod: 'badge-mod', azubi: 'badge-user' };
  const initials   = PROFILE.username.substring(0, 2).toUpperCase();
  const joinDate   = new Date(PROFILE.created_at).toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' });

  // Neuigkeiten zusammenführen und sortieren
  const allNew = [
    ...(neuigkeiten||[]).map(n => ({
      titel: n.titel, typ: n.typ,
      date: n.created_at,
      label: `LF ${n.lernfelder?.nummer}: ${n.lernfelder?.name}`,
    })),
    ...(neueFachInhalte||[]).map(n => ({
      titel: n.titel, typ: n.typ,
      date: n.erstellt_am,
      label: n.fach_kapitel?.faecher?.name + ' → ' + n.fach_kapitel?.name,
    })),
  ].filter(n => n.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  const typeIcon  = { text:'📄', quiz:'❓', lernkarten:'🃏', grammatik:'📝', vokabeln:'🗂' };
  const typeLabel = { text:'Text', quiz:'Quiz', lernkarten:'Lernkarten', grammatik:'Grammatik', vokabeln:'Vokabeln' };

  function formatDate(d) {
    return new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  const neuigkeitenHTML = allNew.length ? allNew.map(n => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:36px;height:36px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">
        ${typeIcon[n.typ] || '📄'}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:0.875rem">${typeLabel[n.typ] || 'Inhalt'} hinzugefügt: <span style="color:var(--accent)">${n.titel}</span></div>
        <div style="font-size:0.75rem;color:var(--muted2);margin-top:1px">${n.label} · ${formatDate(n.date)}</div>
      </div>
    </div>`).join('')
  : '<div style="color:var(--muted2);font-size:0.85rem;padding:12px 0">Noch keine Inhalte vorhanden.</div>';

  // Offene Quiz-Sessions
  const sessionHTML = quizSessions?.length ? quizSessions.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.2rem">❓</span>
        <div>
          <div style="font-size:0.875rem;font-weight:600">Quiz fortsetzen</div>
          <div style="font-size:0.75rem;color:var(--muted2)">Bei Frage ${s.current_index + 1} aufgehört · ${formatDate(s.updated_at)}</div>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="resumeQuizSession('${s.inhalt_id}','${s.inhalt_typ}')">▶ Weiter</button>
    </div>`).join('')
  : '<div style="color:var(--muted2);font-size:0.85rem;padding:12px 0">Keine offenen Quiz-Sessions.</div>';

  const html = `
    <!-- PROFIL HEADER -->
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:28px">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:#fff;flex-shrink:0;box-shadow:0 4px 20px #3b7ff540">
        ${initials}
      </div>
      <div>
        <h1 style="margin-bottom:4px">${PROFILE.username}</h1>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="badge badge-${roleColors[PROFILE.role] || 'badge-user'}">${PROFILE.role}</span>
          <span style="font-size:0.82rem;color:var(--muted2)">Dabei seit ${joinDate}</span>
        </div>
      </div>
    </div>

    <!-- STATS -->
    <div class="grid-3" style="margin-bottom:28px">
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value gradient-text">${totalDone}</div>
        <div class="stat-label">Inhalte erledigt</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-value" style="font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;color:${avgScore !== null ? (avgScore >= 75 ? 'var(--correct)' : avgScore >= 50 ? 'var(--warning)' : 'var(--danger)') : 'var(--muted2)'}">${avgScore !== null ? avgScore + '%' : '—'}</div>
        <div class="stat-label">Ø Prüfungsscore</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-value gradient-text">${pruefungen?.length || 0}</div>
        <div class="stat-label">Prüfungen abgelegt</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:28px">
      <!-- NEUIGKEITEN -->
      <div>
        <h2 style="margin-bottom:14px">🔔 Neuigkeiten</h2>
        <div class="card">${neuigkeitenHTML}</div>
      </div>

      <!-- OFFENE SESSIONS -->
      <div>
        <h2 style="margin-bottom:14px">▶ Weitermachen</h2>
        <div class="card">${sessionHTML}</div>

        <!-- PASSWORT ÄNDERN -->
        <h2 style="margin-top:20px;margin-bottom:14px">🔑 Passwort ändern</h2>
        <div class="card">
          <div class="form-group">
            <label class="form-label">Neues Passwort</label>
            <input class="form-input" type="password" id="new-pw" placeholder="Mindestens 6 Zeichen">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Passwort bestätigen</label>
            <input class="form-input" type="password" id="new-pw2" placeholder="Nochmal eingeben">
          </div>
          <div id="pw-msg" style="margin-top:10px"></div>
          <button class="btn btn-primary" style="margin-top:12px" onclick="changePw()">💾 Passwort speichern</button>
        </div>
      </div>
    </div>
  `;

  setDesktop(`<h1 style="margin-bottom:24px">👤 Mein Profil</h1>${html}`);
  setMobile(`
    <div class="mob-greeting">👤 Mein Profil</div>
    <div style="margin-bottom:20px">${html}</div>
  `);
}

// ── PASSWORT ÄNDERN ───────────────────────────────────────────
async function changePw() {
  const pw  = document.getElementById('new-pw')?.value;
  const pw2 = document.getElementById('new-pw2')?.value;
  const msg = document.getElementById('pw-msg');
  if (!pw || pw.length < 6) return msg.innerHTML = '<div class="alert alert-error">Mindestens 6 Zeichen.</div>';
  if (pw !== pw2) return msg.innerHTML = '<div class="alert alert-error">Passwörter stimmen nicht überein.</div>';
  const { error } = await db.auth.updateUser({ password: pw });
  if (error) return msg.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  msg.innerHTML = '<div class="alert alert-success">✅ Passwort geändert!</div>';
  document.getElementById('new-pw').value  = '';
  document.getElementById('new-pw2').value = '';
  setTimeout(() => msg.innerHTML = '', 3000);
}

// ── QUIZ SESSION RESUME ───────────────────────────────────────
async function resumeQuizSession(inhaltId, inhaltTyp) {
  showSpinner();
  let inhalt;
  if (inhaltTyp === 'fach') {
    const { data } = await db.from('fach_inhalte').select('*, fach_kapitel(id,name,faecher(id,name))').eq('id', inhaltId).maybeSingle();
    inhalt = data;
    if (inhalt) renderQuiz(inhalt, `← ${inhalt.fach_kapitel?.name}`, () => showKapitel(inhalt.fach_kapitel?.id, inhalt.fach_kapitel?.faecher?.id), async () => {
      await markFachDone(inhalt.id, inhalt.fach_kapitel?.id, inhalt.fach_kapitel?.faecher?.id, false);
    });
  } else {
    const { data } = await db.from('inhalte').select('*, lernfelder(id,nummer,name)').eq('id', inhaltId).maybeSingle();
    inhalt = data;
    if (inhalt) renderQuiz(inhalt, `← LF ${inhalt.lernfelder?.nummer}`, () => showLernfeldDetail(inhalt.lernfelder?.id), async () => {
      await markDone(inhalt.id, inhalt.lernfelder?.id, false);
    });
  }
}