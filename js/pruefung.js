// ── PRÜFUNGEN & ARBEITEN ──────────────────────────────────────

// ── ÜBERSICHT ─────────────────────────────────────────────────
async function showPruefungen() {
  setActive('lnk-pruefung', 'bn-pruefung');
  showSpinner();
  const isMod = ['admin','mod'].includes(PROFILE.role);

  const { data: arbeiten } = await db.from('arbeiten')
    .select('*').eq('aktiv', true).order('erstellt_am', { ascending: false });

  const typIcon  = { pruefung:'📝', arbeit:'📋' };
  const typLabel = { pruefung:'Prüfungsmodus', arbeit:'Klassenarbeit' };

  const cards = (arbeiten||[]).map(a => `
    <div class="card" style="margin-bottom:14px;cursor:pointer" onclick="showArbeitDetail(${a.id})">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">
            ${typIcon[a.typ]} ${typLabel[a.typ]}
            ${a.zeitlimit_minuten ? ` · ⏱ ${a.zeitlimit_minuten} Min` : ' · Kein Zeitlimit'}
          </div>
          <div style="font-weight:700;font-size:1rem">${a.titel}</div>
          ${a.beschreibung ? `<div style="font-size:0.82rem;color:var(--muted2);margin-top:2px">${a.beschreibung}</div>` : ''}
          <div style="font-size:0.78rem;color:var(--muted2);margin-top:4px">
            Max. ${a.max_fragen} Fragen
          </div>
        </div>
        <span style="color:var(--accent);font-size:1.3rem">→</span>
      </div>
    </div>`).join('') || '<div class="alert alert-info">Noch keine Prüfungen oder Arbeiten angelegt.</div>';

  const mobCards = (arbeiten||[]).map(a => `
    <div class="mob-lf-card" onclick="showArbeitDetail(${a.id})">
      <div class="mob-lf-icon-wrap">${typIcon[a.typ]}</div>
      <div class="mob-lf-info">
        <div class="mob-lf-num">${typLabel[a.typ]}${a.zeitlimit_minuten ? ` · ${a.zeitlimit_minuten} Min` : ''}</div>
        <div class="mob-lf-name">${a.titel}</div>
        ${a.beschreibung ? `<div style="font-size:0.75rem;color:var(--muted2)">${a.beschreibung}</div>` : ''}
      </div>
      <div class="mob-lf-arrow">›</div>
    </div>`).join('') || '<div class="alert alert-info">Noch keine Prüfungen angelegt.</div>';

  setDesktop(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div>
        <h1 style="margin-bottom:4px">📝 Prüfungen & Arbeiten</h1>
        <p style="color:var(--muted2)">Starte einen Prüfungsmodus oder simuliere eine Klassenarbeit</p>
      </div>
      ${isMod ? `<button class="btn btn-primary" onclick="showArbeitErstellen()">➕ Neue Arbeit</button>` : ''}
    </div>
    ${cards}
  `);

  setMobile(`
    <div class="mob-greeting">📝 Prüfungen</div>
    <div class="mob-greeting-sub" style="margin-bottom:20px">Wähle einen Modus</div>
    ${isMod ? `<button class="btn btn-primary btn-full btn-sm" style="margin-bottom:16px" onclick="showArbeitErstellen()">➕ Neue Arbeit erstellen</button>` : ''}
    ${mobCards}
  `);
}

// ── ARBEIT DETAIL ─────────────────────────────────────────────
async function showArbeitDetail(arbeitId) {
  showSpinner();
  const isMod = ['admin','mod'].includes(PROFILE.role);

  const [{ data: arbeit }, { data: meinErgebnis }] = await Promise.all([
    db.from('arbeiten').select('*').eq('id', arbeitId).maybeSingle(),
    db.from('arbeiten_ergebnisse').select('*')
      .eq('arbeit_id', arbeitId).eq('user_id', USER.id)
      .order('beendet_am', { ascending: false }).limit(1)
  ]);
  if (!arbeit) return showPruefungen();

  const typIcon  = { pruefung:'📝', arbeit:'📋' };
  const typLabel = { pruefung:'Prüfungsmodus', arbeit:'Klassenarbeit' };
  const letztes  = meinErgebnis?.[0];

  const letztesHTML = letztes ? `
    <div class="card" style="margin-bottom:20px;border-left:4px solid var(--correct)">
      <div style="font-size:0.82rem;color:var(--muted2);margin-bottom:6px">Letztes Ergebnis</div>
      <div style="font-size:1.8rem;font-weight:700;color:var(--correct)">${letztes.score_prozent}%</div>
      <div style="font-size:0.82rem;color:var(--muted2);margin-top:4px">
        ✅ ${letztes.richtig} richtig · ⚡ ${letztes.teilweise} teilweise · ❌ ${letztes.falsch} falsch
      </div>
      <button class="btn btn-secondary btn-sm" style="margin-top:10px"
              onclick="showErgebnisDetail(${letztes.id})">📊 Auswertung ansehen</button>
    </div>` : '';

  const deleteBtn = isMod ? `
    <button class="btn btn-danger btn-sm" onclick="deleteArbeit(${arbeitId})">🗑 Löschen</button>` : '';

  const infoHTML = `
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div><div style="font-size:0.75rem;color:var(--muted2)">Typ</div><div style="font-weight:600">${typLabel[arbeit.typ]}</div></div>
        <div><div style="font-size:0.75rem;color:var(--muted2)">Fragen</div><div style="font-weight:600">Max. ${arbeit.max_fragen}</div></div>
        <div><div style="font-size:0.75rem;color:var(--muted2)">Zeitlimit</div><div style="font-weight:600">${arbeit.zeitlimit_minuten ? arbeit.zeitlimit_minuten+' Min' : 'Keines'}</div></div>
      </div>
    </div>`;

  setDesktop(`
    <button class="btn btn-secondary btn-sm" onclick="showPruefungen()" style="margin-bottom:20px">← Zurück</button>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div>
        <div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px">
          ${typIcon[arbeit.typ]} ${typLabel[arbeit.typ]}
        </div>
        <h1>${arbeit.titel}</h1>
        ${arbeit.beschreibung ? `<p style="color:var(--muted2)">${arbeit.beschreibung}</p>` : ''}
      </div>
      ${deleteBtn}
    </div>
    ${infoHTML}
    ${letztesHTML}
    <button class="btn btn-primary" style="width:100%;padding:16px;font-size:1.05rem"
            onclick="startArbeit(${arbeitId})">
      🚀 ${letztes ? 'Nochmal starten' : 'Jetzt starten'}
    </button>
  `);

  setMobile(`
    <button class="mob-back" onclick="showPruefungen()">← Zurück</button>
    <div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">
      ${typIcon[arbeit.typ]} ${typLabel[arbeit.typ]}
    </div>
    <div style="font-size:1.1rem;font-weight:700;margin-bottom:4px">${arbeit.titel}</div>
    ${arbeit.beschreibung ? `<div style="font-size:0.83rem;color:var(--muted2);margin-bottom:16px">${arbeit.beschreibung}</div>` : '<div style="margin-bottom:16px"></div>'}
    ${infoHTML}
    ${letztesHTML}
    <button class="btn btn-primary btn-full" style="padding:16px;font-size:1.05rem"
            onclick="startArbeit(${arbeitId})">
      🚀 ${letztes ? 'Nochmal starten' : 'Jetzt starten'}
    </button>
    ${isMod ? `<button class="btn btn-danger btn-full btn-sm" style="margin-top:10px" onclick="deleteArbeit(${arbeitId})">🗑 Löschen</button>` : ''}
  `);
}

// ── ARBEIT STARTEN ────────────────────────────────────────────
async function startArbeit(arbeitId) {
  showSpinner();
  const { data: arbeit } = await db.from('arbeiten').select('*').eq('id', arbeitId).maybeSingle();
  if (!arbeit) return;

  // Fragen aus allen konfigurierten Quellen sammeln
  let alleFragen = [];

  // Aus Lernfeldern
  if (arbeit.lernfeld_ids?.length) {
    const { data: lf_inhalte } = await db.from('inhalte')
      .select('id, titel, inhalt, lernfelder(nummer, name)')
      .in('lernfeld_id', arbeit.lernfeld_ids)
      .eq('typ', 'quiz');
    (lf_inhalte||[]).forEach(i => {
      (i.inhalt?.fragen||[]).forEach(f => {
        alleFragen.push({ ...f, _quelle: `LF ${i.lernfelder?.nummer}: ${i.lernfelder?.name}`, _titel: i.titel });
      });
    });
  }

  // Aus Fach-Kapiteln
  if (arbeit.fach_kapitel_ids?.length) {
    const { data: fach_inhalte } = await db.from('fach_inhalte')
      .select('id, titel, inhalt, fach_kapitel(name, faecher(name))')
      .in('kapitel_id', arbeit.fach_kapitel_ids)
      .eq('typ', 'quiz');
    (fach_inhalte||[]).forEach(i => {
      (i.inhalt?.fragen||[]).forEach(f => {
        alleFragen.push({ ...f, _quelle: `${i.fach_kapitel?.faecher?.name}: ${i.fach_kapitel?.name}`, _titel: i.titel });
      });
    });
  }

  // Aus Unterrichtsstunden
  if (arbeit.stunden_ids?.length) {
    const { data: std_inhalte } = await db.from('inhalte')
      .select('id, titel, inhalt, unterrichtsstunden(kw, thema)')
      .in('stunde_id', arbeit.stunden_ids)
      .eq('typ', 'quiz');
    (std_inhalte||[]).forEach(i => {
      (i.inhalt?.fragen||[]).forEach(f => {
        alleFragen.push({ ...f, _quelle: `KW ${i.unterrichtsstunden?.kw}: ${i.unterrichtsstunden?.thema}`, _titel: i.titel });
      });
    });
  }

  if (!alleFragen.length) {
    alert('Keine Quizfragen in dieser Konfiguration gefunden. Bitte Inhalte hinzufügen.');
    return showArbeitDetail(arbeitId);
  }

  // Mischen und auf max_fragen begrenzen
  alleFragen = alleFragen.sort(() => Math.random() - 0.5).slice(0, arbeit.max_fragen);

  // Ergebnis-Eintrag anlegen
  const { data: ergebnis } = await db.from('arbeiten_ergebnisse').insert({
    arbeit_id: arbeitId, user_id: USER.id, gestartet_am: new Date().toISOString()
  }).select().maybeSingle();

  renderPruefung(arbeit, alleFragen, ergebnis?.id);
}

// ── PRÜFUNGS-RENDERER ─────────────────────────────────────────
function renderPruefung(arbeit, fragen, ergebnisId) {
  let current = 0;
  let ergebnisse = []; // { frage, antwort, verdict, matched, missing }
  let timerInterval = null;
  let verbleibend = arbeit.zeitlimit_minuten ? arbeit.zeitlimit_minuten * 60 : null;

  function formatTime(sek) {
    const m = Math.floor(sek / 60);
    const s = sek % 60;
    return `${m}:${s.toString().padStart(2,'0')}`;
  }

  function timerColor(sek) {
    if (!verbleibend) return 'var(--muted2)';
    const pct = sek / (arbeit.zeitlimit_minuten * 60);
    if (pct > 0.5) return 'var(--correct)';
    if (pct > 0.2) return 'var(--warning)';
    return 'var(--danger)';
  }

  function renderFrage() {
    const f      = fragen[current];
    const isMob  = window.innerWidth <= 700;
    const pct    = Math.round((current / fragen.length) * 100);
    const timer  = verbleibend !== null
      ? `<div id="pruef-timer" style="font-size:1rem;font-weight:700;color:${timerColor(verbleibend)}">⏱ ${formatTime(verbleibend)}</div>`
      : '';
    const bildHTML = f.bild
      ? `<div style="margin-bottom:14px;border-radius:14px;overflow:hidden;border:1px solid var(--border)">
           <img src="${f.bild}" alt="Bild zur Frage"
                style="width:100%;max-height:280px;object-fit:contain;background:var(--surface2);display:block"
                onerror="this.parentElement.style.display='none'">
         </div>` : '';

    const html = `
      <div style="max-width:680px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:0.78rem;color:var(--muted2)">
            Frage ${current+1} von ${fragen.length}
            <span style="color:var(--muted2);margin-left:8px;font-size:0.72rem">${f._quelle||''}</span>
          </div>
          ${timer}
        </div>
        <div style="height:5px;background:var(--border);border-radius:99px;overflow:hidden;margin-bottom:20px">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width 0.4s"></div>
        </div>
        ${bildHTML}
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:22px;margin-bottom:14px;font-size:1rem;font-weight:600;line-height:1.5">
          ${f.frage}
        </div>
        <textarea id="pruef-answer" class="form-input" rows="4"
          placeholder="Antwort hier schreiben..."
          style="font-size:1rem;line-height:1.6;resize:none;margin-bottom:12px"></textarea>
        <div style="display:flex;gap:10px">
          <button class="btn btn-primary" style="flex:1;padding:14px" onclick="pruefAbgeben()">
            ✓ ${current < fragen.length - 1 ? 'Weiter' : 'Abschließen'}
          </button>
          <button class="btn btn-secondary" style="padding:14px 18px" onclick="pruefAbbrechen(${arbeit.id})"
                  title="Abbrechen">✕</button>
        </div>
      </div>`;

    if (isMob) { setMobile(html); setDesktop(''); }
    else        { setDesktop(html); setMobile(''); }

    setTimeout(() => {
      document.getElementById('pruef-answer')?.focus();
      document.getElementById('pruef-answer')?.addEventListener('keydown', e => {
        if ((e.ctrlKey||e.metaKey) && e.key==='Enter') pruefAbgeben();
      });
    }, 50);
  }

  // Timer starten
  if (verbleibend !== null) {
    timerInterval = setInterval(() => {
      verbleibend--;
      const el = document.getElementById('pruef-timer');
      if (el) {
        el.textContent = `⏱ ${formatTime(verbleibend)}`;
        el.style.color = timerColor(verbleibend);
      }
      if (verbleibend <= 0) {
        clearInterval(timerInterval);
        alert('⏱ Zeit abgelaufen! Die Prüfung wird jetzt ausgewertet.');
        pruefBeenden();
      }
    }, 1000);
  }

  window.pruefAbgeben = function() {
    const antwort = document.getElementById('pruef-answer')?.value.trim() || '';
    const f       = fragen[current];
    const result  = bewerte(antwort, f);
    ergebnisse.push({ frage: f.frage, muster: f.muster, quelle: f._quelle||'', antwort, ...result });
    current++;
    if (current >= fragen.length) {
      clearInterval(timerInterval);
      pruefBeenden();
    } else {
      renderFrage();
    }
  };

  window.pruefAbbrechen = function(aId) {
    if (!confirm('Prüfung wirklich abbrechen? Der Fortschritt geht verloren.')) return;
    clearInterval(timerInterval);
    showArbeitDetail(aId);
  };

  async function pruefBeenden() {
    // Statistik berechnen
    let richtig = 0, teilweise = 0, falsch = 0;
    const missingMap = {};

    ergebnisse.forEach(e => {
      if (e.verdict === 'richtig')   richtig++;
      else if (e.verdict === 'teilweise') teilweise++;
      else falsch++;
      (e.missing||[]).forEach(kw => { missingMap[kw] = (missingMap[kw]||0) + 1; });
    });

    const pts = richtig + teilweise * 0.5;
    const scoreProzent = Math.round((pts / fragen.length) * 100);

    // Ergebnis speichern
    if (ergebnisId) {
      await db.from('arbeiten_ergebnisse').update({
        score_prozent: scoreProzent,
        richtig, teilweise, falsch,
        details: ergebnisse,
        beendet_am: new Date().toISOString()
      }).eq('id', ergebnisId);
    }

    showStatistik({ arbeit, ergebnisse, richtig, teilweise, falsch, scoreProzent, missingMap, ergebnisId });
  }

  renderFrage();
}

// ── STATISTIK ─────────────────────────────────────────────────
async function showErgebnisDetail(ergebnisId) {
  showSpinner();
  const { data: erg } = await db.from('arbeiten_ergebnisse')
    .select('*, arbeiten(titel, typ)').eq('id', ergebnisId).maybeSingle();
  if (!erg) return showPruefungen();

  const missingMap = {};
  (erg.details||[]).forEach(e => {
    (e.missing||[]).forEach(kw => { missingMap[kw] = (missingMap[kw]||0) + 1; });
  });

  const pts = erg.richtig + erg.teilweise * 0.5;
  showStatistik({
    arbeit: erg.arbeiten,
    ergebnisse: erg.details||[],
    richtig: erg.richtig,
    teilweise: erg.teilweise,
    falsch: erg.falsch,
    scoreProzent: erg.score_prozent,
    missingMap,
    ergebnisId
  });
}

function showStatistik({ arbeit, ergebnisse, richtig, teilweise, falsch, scoreProzent, missingMap, ergebnisId }) {
  const gesamt = ergebnisse.length;
  const emoji  = scoreProzent >= 80 ? '🎉' : scoreProzent >= 60 ? '👍' : scoreProzent >= 40 ? '📚' : '💪';
  const note   = scoreProzent >= 87 ? '1' : scoreProzent >= 75 ? '2' : scoreProzent >= 62 ? '3' : scoreProzent >= 50 ? '4' : scoreProzent >= 37 ? '5' : '6';

  const noteColor = note <= '2' ? 'var(--correct)' : note <= '3' ? '#22d3ee' : note <= '4' ? 'var(--warning)' : 'var(--danger)';
  const scoreColor = scoreProzent >= 80 ? 'var(--correct)' : scoreProzent >= 60 ? '#22d3ee' : scoreProzent >= 40 ? 'var(--warning)' : 'var(--danger)';
  const scoreBg = scoreProzent >= 80 ? '#10b98115' : scoreProzent >= 60 ? '#22d3ee15' : scoreProzent >= 40 ? '#f59e0b15' : '#ef444415';
  const scoreBorder = scoreProzent >= 80 ? '#10b98130' : scoreProzent >= 60 ? '#22d3ee30' : scoreProzent >= 40 ? '#f59e0b30' : '#ef444430';

  // Themen-Auswertung
  const themenMap = {};
  ergebnisse.forEach(e => {
    const q = e.quelle || 'Sonstige';
    if (!themenMap[q]) themenMap[q] = { richtig:0, teilweise:0, falsch:0, gesamt:0 };
    themenMap[q].gesamt++;
    themenMap[q][e.verdict]++;
  });

  const themenHTML = Object.entries(themenMap).map(([thema, t]) => {
    const tPct  = Math.round(((t.richtig + t.teilweise * 0.5) / t.gesamt) * 100);
    const color = tPct >= 80 ? 'var(--correct)' : tPct >= 50 ? 'var(--warning)' : 'var(--danger)';
    const bg    = tPct >= 80 ? '#10b98112' : tPct >= 50 ? '#f59e0b12' : '#ef444412';
    return `
      <div style="padding:14px;background:${bg};border:1px solid var(--border);border-radius:12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-weight:600;font-size:0.875rem">${thema}</div>
          <div style="font-weight:800;font-size:1rem;color:${color}">${tPct}%</div>
        </div>
        <div style="height:6px;background:var(--border);border-radius:99px;overflow:hidden;margin-bottom:6px">
          <div style="height:100%;width:${tPct}%;background:${color};border-radius:99px;transition:width 0.6s ease"></div>
        </div>
        <div style="display:flex;gap:12px;font-size:0.75rem;color:var(--muted2)">
          <span style="color:var(--correct)">✅ ${t.richtig} richtig</span>
          <span style="color:var(--warning)">⚡ ${t.teilweise} teilweise</span>
          <span style="color:var(--danger)">❌ ${t.falsch} falsch</span>
        </div>
      </div>`;
  }).join('');

  // Fehlende Keywords
  const topMissing = Object.entries(missingMap).sort((a,b) => b[1]-a[1]).slice(0, 10);
  const missingHTML = topMissing.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:8px">
        ${topMissing.map(([kw, count]) => `
          <div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;background:#ef444415;border:1px solid #ef444430;border-radius:99px">
            <span style="font-size:0.82rem;font-weight:600">${kw}</span>
            <span style="font-size:0.72rem;color:var(--danger);font-weight:700">${count}×</span>
          </div>`).join('')}
       </div>`
    : `<div style="display:flex;align-items:center;gap:8px;color:var(--correct);font-size:0.88rem;font-weight:600">
         <span>🎉</span><span>Keine fehlenden Keywords – top!</span>
       </div>`;

  // Empfehlungen
  const schwachThemen = Object.entries(themenMap)
    .filter(([,t]) => ((t.richtig + t.teilweise * 0.5) / t.gesamt) < 0.6)
    .map(([thema]) => thema);

  const empfehlung = schwachThemen.length
    ? `<div style="background:#ef444412;border:1px solid #ef444430;border-radius:14px;padding:16px;margin-bottom:20px">
        <div style="font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px">
          <span>💡</span><span>Diese Themen nochmal wiederholen</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${schwachThemen.map(t => `
            <div style="display:flex;align-items:center;gap:8px;font-size:0.85rem">
              <span style="color:var(--danger)">•</span>
              <span>${t}</span>
            </div>`).join('')}
        </div>
       </div>`
    : `<div style="background:#10b98112;border:1px solid #10b98130;border-radius:14px;padding:16px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
        <span style="font-size:1.3rem">✅</span>
        <div>
          <div style="font-weight:700">Alle Themen gut beherrscht!</div>
          <div style="font-size:0.82rem;color:var(--muted2);margin-top:2px">Weiter so – du bist bestens vorbereitet.</div>
        </div>
       </div>`;

  // Einzelfragen
  const fragenHTML = ergebnisse.map((e, i) => {
    const colors = { richtig:'var(--correct)', teilweise:'var(--warning)', falsch:'var(--danger)' };
    const bgs    = { richtig:'#10b98110', teilweise:'#f59e0b10', falsch:'#ef444410' };
    const icons  = { richtig:'✅', teilweise:'⚡', falsch:'❌' };
    const labels = { richtig:'Richtig', teilweise:'Teilweise', falsch:'Falsch' };
    return `
      <div style="padding:16px;background:${bgs[e.verdict]};border:1px solid var(--border);border-radius:14px;margin-bottom:10px;border-left:3px solid ${colors[e.verdict]}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
          <div style="font-weight:600;font-size:0.9rem;flex:1;line-height:1.5">${i+1}. ${e.frage}</div>
          <span style="padding:3px 10px;background:${bgs[e.verdict]};border:1px solid ${colors[e.verdict]}40;border-radius:99px;font-size:0.72rem;font-weight:700;color:${colors[e.verdict]};white-space:nowrap;flex-shrink:0">
            ${icons[e.verdict]} ${labels[e.verdict]}
          </span>
        </div>
        ${e.antwort ? `
          <div style="background:var(--surface2);border-radius:8px;padding:10px;margin-bottom:8px;font-size:0.82rem">
            <div style="font-size:0.72rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Deine Antwort</div>
            <div style="color:var(--text)">${e.antwort}</div>
          </div>` : ''}
        <div style="background:var(--surface2);border-radius:8px;padding:10px;font-size:0.82rem">
          <div style="font-size:0.72rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Musterlösung</div>
          <div style="color:var(--text)">${e.muster}</div>
        </div>
        ${e.missing?.length ? `
          <div style="margin-top:8px;font-size:0.75rem;color:var(--danger)">
            <span style="font-weight:700">Fehlende Keywords:</span> ${e.missing.join(', ')}
          </div>` : ''}
        ${e.matched?.length ? `
          <div style="margin-top:4px;font-size:0.75rem;color:var(--correct)">
            <span style="font-weight:700">Erkannte Keywords:</span> ${e.matched.join(', ')}
          </div>` : ''}
      </div>`;
  }).join('');

  const html = `
    <button class="btn btn-secondary btn-sm" onclick="showPruefungen()" style="margin-bottom:24px">← Übersicht</button>

    <!-- HERO ERGEBNIS -->
    <div style="background:${scoreBg};border:1px solid ${scoreBorder};border-radius:20px;padding:32px;text-align:center;margin-bottom:20px;position:relative;overflow:hidden">
      <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;background:${scoreColor}15;border-radius:50%;filter:blur(30px);pointer-events:none"></div>
      <div style="font-size:2.5rem;margin-bottom:12px">${emoji}</div>
      <div style="font-family:'Syne',sans-serif;font-size:4rem;font-weight:800;color:${scoreColor};line-height:1">${scoreProzent}%</div>
      <div style="font-size:0.85rem;color:var(--muted2);margin-top:6px">${gesamt} Fragen beantwortet</div>

      <!-- NOTE BADGE -->
      <div style="display:inline-flex;align-items:center;gap:8px;margin-top:16px;padding:8px 20px;background:var(--surface);border:1px solid ${noteColor}40;border-radius:99px">
        <span style="font-size:0.82rem;color:var(--muted2)">Note</span>
        <span style="font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;color:${noteColor}">${note}</span>
      </div>
    </div>

    <!-- STAT KARTEN -->
    <div class="grid-3" style="margin-bottom:20px">
      <div style="background:#10b98112;border:1px solid #10b98128;border-radius:14px;padding:18px;text-align:center">
        <div style="font-size:2rem;font-weight:800;color:var(--correct);font-family:'Syne',sans-serif">${richtig}</div>
        <div style="font-size:0.78rem;color:var(--muted2);margin-top:4px;font-weight:600">✅ Richtig</div>
      </div>
      <div style="background:#f59e0b12;border:1px solid #f59e0b28;border-radius:14px;padding:18px;text-align:center">
        <div style="font-size:2rem;font-weight:800;color:var(--warning);font-family:'Syne',sans-serif">${teilweise}</div>
        <div style="font-size:0.78rem;color:var(--muted2);margin-top:4px;font-weight:600">⚡ Teilweise</div>
      </div>
      <div style="background:#ef444412;border:1px solid #ef444428;border-radius:14px;padding:18px;text-align:center">
        <div style="font-size:2rem;font-weight:800;color:var(--danger);font-family:'Syne',sans-serif">${falsch}</div>
        <div style="font-size:0.78rem;color:var(--muted2);margin-top:4px;font-weight:600">❌ Falsch</div>
      </div>
    </div>

    ${empfehlung}

    <!-- THEMEN -->
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <h3>📊 Auswertung nach Thema</h3>
      </div>
      <p style="color:var(--muted2);font-size:0.82rem;margin-bottom:14px">Wie gut hast du jedes Thema beherrscht?</p>
      ${themenHTML}
    </div>

    <!-- KEYWORDS -->
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:4px">🔑 Häufig vergessene Begriffe</h3>
      <p style="color:var(--muted2);font-size:0.82rem;margin-bottom:14px">Diese Keywords fehlten in deinen Antworten am häufigsten.</p>
      ${missingHTML}
    </div>

    <!-- EINZELFRAGEN -->
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:14px">📋 Alle Fragen im Detail</h3>
      ${fragenHTML}
    </div>

    <div style="display:flex;gap:10px">
      <button class="btn btn-secondary" style="flex:1;padding:14px" onclick="showPruefungen()">
        ← Übersicht
      </button>
      <button class="btn btn-primary" style="flex:2;padding:14px" onclick="startArbeit(${arbeit.id||0})">
        🔄 Nochmal versuchen
      </button>
    </div>
  `;

  setDesktop(html);
  setMobile(`<button class="mob-back" onclick="showPruefungen()">← Übersicht</button>${html}`);
}

// ── ARBEIT ERSTELLEN (MOD) ────────────────────────────────────
async function showArbeitErstellen() {
  setActive('lnk-arbeit-neu', 'bn-mod');
  showSpinner();

  const [{ data: lernfelder }, { data: kapitel }, { data: stunden }] = await Promise.all([
    db.from('lernfelder').select('id, nummer, name').order('nummer'),
    db.from('fach_kapitel').select('*, faecher(name)').order('fach_id').order('reihenfolge'),
    db.from('unterrichtsstunden').select('id, kw, datum, thema, lernfeld_id, lernfelder(nummer)').order('datum')
  ]);

  function formatDatum(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  const lfChecks = (lernfelder||[]).map(lf => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer">
      <input type="checkbox" value="${lf.id}" class="chk-lf">
      <span>LF ${lf.nummer}: ${lf.name}</span>
    </label>`).join('');

  const fachChecks = (kapitel||[]).map(k => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer">
      <input type="checkbox" value="${k.id}" class="chk-fach">
      <span>${k.faecher?.name} → ${k.name}</span>
    </label>`).join('');

  const stundenChecks = (stunden||[]).map(s => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer">
      <input type="checkbox" value="${s.id}" class="chk-stunde">
      <span>KW ${s.kw} · ${formatDatum(s.datum)} – ${s.thema}</span>
    </label>`).join('') || '<div style="color:var(--muted2);font-size:0.85rem">Noch keine Unterrichtsstunden angelegt.</div>';

  const html = `
    <button class="btn btn-secondary btn-sm" onclick="showPruefungen()" style="margin-bottom:20px">← Zurück</button>
    <h1 style="margin-bottom:6px">➕ Neue Arbeit / Prüfung</h1>
    <p style="color:var(--muted2);margin-bottom:24px">Konfiguriere den Prüfungsmodus für die Klasse.</p>

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:14px">1. Grundinfos</h3>
      <div class="grid-2">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Titel</label>
          <input class="form-input" type="text" id="arb-titel" placeholder="z.B. Klassenarbeit LF1 – KW 20">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Typ</label>
          <select class="form-input" id="arb-typ">
            <option value="arbeit">📋 Klassenarbeit</option>
            <option value="pruefung">📝 Prüfungsmodus</option>
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label class="form-label">Beschreibung (optional)</label>
        <input class="form-input" type="text" id="arb-beschreibung" placeholder="z.B. Themen: LF1 KW14-16">
      </div>
      <div class="grid-2" style="margin-top:0">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Zeitlimit (Minuten, 0 = keins)</label>
          <input class="form-input" type="number" id="arb-zeitlimit" value="45" min="0" max="180">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Max. Fragen</label>
          <input class="form-input" type="number" id="arb-maxfragen" value="15" min="5" max="50">
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:6px">2. Lernfelder</h3>
      <p style="color:var(--muted2);font-size:0.82rem;margin-bottom:10px">Quizze aus diesen Lernfeldern werden einbezogen.</p>
      ${lfChecks}
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:6px">3. Unterrichtsstunden</h3>
      <p style="color:var(--muted2);font-size:0.82rem;margin-bottom:10px">Nur Quizze aus diesen spezifischen Stunden einbeziehen.</p>
      ${stundenChecks}
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:6px">4. Fächer</h3>
      <p style="color:var(--muted2);font-size:0.82rem;margin-bottom:10px">Quizze aus diesen Fach-Kapiteln einbeziehen.</p>
      ${fachChecks}
    </div>

    <div id="arb-result" style="margin-bottom:12px"></div>
    <button class="btn btn-primary" style="width:100%;padding:14px" onclick="saveArbeit()">
      💾 Arbeit speichern & veröffentlichen
    </button>
  `;

  setDesktop(html);
  setMobile(`<button class="mob-back" onclick="showPruefungen()">← Zurück</button>${html}`);
}

async function saveArbeit() {
  const titel      = document.getElementById('arb-titel')?.value.trim();
  const typ        = document.getElementById('arb-typ')?.value;
  const beschr     = document.getElementById('arb-beschreibung')?.value.trim();
  const zeitlimit  = parseInt(document.getElementById('arb-zeitlimit')?.value)||0;
  const maxFragen  = parseInt(document.getElementById('arb-maxfragen')?.value)||15;
  const resultEl   = document.getElementById('arb-result');

  if (!titel) return resultEl.innerHTML = '<div class="alert alert-error">Bitte Titel eingeben.</div>';

  const lfIds     = [...document.querySelectorAll('.chk-lf:checked')].map(el => parseInt(el.value));
  const fachIds   = [...document.querySelectorAll('.chk-fach:checked')].map(el => parseInt(el.value));
  const stundenIds= [...document.querySelectorAll('.chk-stunde:checked')].map(el => parseInt(el.value));

  if (!lfIds.length && !fachIds.length && !stundenIds.length) {
    return resultEl.innerHTML = '<div class="alert alert-error">Bitte mindestens eine Quelle auswählen.</div>';
  }

  const { error } = await db.from('arbeiten').insert({
    titel,
    typ,
    beschreibung: beschr || null,
    zeitlimit_minuten: zeitlimit || null,
    max_fragen: maxFragen,
    lernfeld_ids: lfIds,
    fach_kapitel_ids: fachIds,
    stunden_ids: stundenIds,
    erstellt_von: USER.id
  });

  if (error) return resultEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;

  resultEl.innerHTML = '<div class="alert alert-success">✅ Gespeichert! Die Klasse kann jetzt starten.</div>';
  setTimeout(() => showPruefungen(), 1500);
}

async function deleteArbeit(arbeitId) {
  if (!confirm('Diese Arbeit und alle Ergebnisse wirklich löschen?')) return;
  await db.from('arbeiten').delete().eq('id', arbeitId);
  showPruefungen();
}