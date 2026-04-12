// ── VOKABEL TRAINER ───────────────────────────────────────────
async function startVokabelTrainer(kapitelId, fachId, richtung) {
  showSpinner();
  const { data: vokabeln }   = await db.from('vokabeln').select('*').eq('kapitel_id', kapitelId).order('reihenfolge');
  const { data: fortschritt } = await db.from('vokabel_fortschritt').select('*').eq('user_id', USER.id);
  if (!vokabeln || !vokabeln.length) return;

  const fpMap = {};
  (fortschritt||[]).forEach(f => { fpMap[f.vokabel_id] = f; });

  const shuffled = [...vokabeln].sort(() => Math.random() - 0.5);
  let current = 0, richtig = 0, falsch = 0, revealed = false;

  const styles = `<style>
    .vt-wrap{max-width:560px}
    .vt-progress{height:5px;background:var(--border);border-radius:99px;overflow:hidden;margin-bottom:16px}
    .vt-progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width 0.4s}
    .vt-counter{font-size:0.78rem;color:var(--muted2);margin-bottom:8px}
    .vt-scores{display:flex;gap:16px;margin-bottom:20px;font-size:0.85rem}
    .vt-score-r{color:var(--correct);font-weight:600}.vt-score-f{color:var(--danger);font-weight:600}
    .vt-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:32px 28px;text-align:center;margin-bottom:20px;min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
    .vt-lang{font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px}
    .vt-word{font-size:1.6rem;font-weight:700}
    .vt-example{font-size:0.82rem;color:var(--muted2);font-style:italic}
    .vt-streak{font-size:0.75rem;color:var(--muted);margin-top:4px}
    .vt-label{font-size:0.78rem;color:var(--muted2);margin-bottom:8px;text-align:center}
    .vt-input{width:100%;background:var(--surface2);border:2px solid var(--border2);border-radius:14px;color:var(--text);font-family:inherit;font-size:1rem;padding:14px;outline:none;transition:border-color 0.2s;text-align:center}
    .vt-input:focus{border-color:var(--accent)}
    .vt-input.correct{border-color:var(--correct);background:#10b98110}
    .vt-input.wrong{border-color:var(--danger);background:#ef444410}
    .vt-feedback{padding:12px 16px;border-radius:12px;margin:12px 0;font-size:0.88rem;display:none;text-align:center;line-height:1.5}
    .vt-feedback.correct{background:#10b98115;border:1px solid #10b98144;color:var(--correct)}
    .vt-feedback.wrong{background:#ef444415;border:1px solid #ef444444;color:#fca5a5}
    .vt-btn-row{display:flex;gap:10px;margin-top:4px}
    .vt-btn{flex:1;padding:13px;border:none;border-radius:14px;font-family:inherit;font-size:0.95rem;font-weight:600;cursor:pointer;transition:opacity 0.15s}
    .vt-btn-check{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
    .vt-btn-next{background:var(--surface2);border:1px solid var(--border2);color:var(--text);display:none}
    .vt-result{text-align:center;padding:20px 0}
    .vt-result-score{font-size:3rem;font-weight:700;margin:12px 0}
  </style>`;

  const dirLabel = richtung === 'en-de'
    ? { title:'🇬🇧 Englisch → Deutsch', from:'🇬🇧 Englisch', to:'🇩🇪 Auf Deutsch' }
    : { title:'🇩🇪 Deutsch → Englisch', from:'🇩🇪 Deutsch',  to:'🇬🇧 In English' };

  function cardHTML() {
    const v   = shuffled[current];
    const fp  = fpMap[v.id];
    const frageWort = richtung === 'en-de' ? v.en : v.de;
    return styles + `<div class="vt-wrap">
      <div class="vt-progress"><div class="vt-progress-fill" style="width:${(current/shuffled.length)*100}%"></div></div>
      <div class="vt-counter">Vokabel ${current+1} von ${shuffled.length}</div>
      <div class="vt-scores">
        <span class="vt-score-r">✅ ${richtig} richtig</span>
        <span class="vt-score-f">❌ ${falsch} falsch</span>
      </div>
      <div class="vt-card">
        <div class="vt-lang">${dirLabel.from}</div>
        <div class="vt-word">${frageWort}</div>
        ${v.beispiel && richtung==='de-en' ? `<div class="vt-example">"${v.beispiel}"</div>` : ''}
        ${fp && fp.richtig_count > 0 ? `<div class="vt-streak">🔥 ${fp.richtig_count}× richtig beantwortet</div>` : ''}
      </div>
      <div class="vt-label">${dirLabel.to}</div>
      <input class="vt-input" type="text" id="vt-input" placeholder="Deine Übersetzung..." autocomplete="off">
      <div class="vt-feedback" id="vt-feedback"></div>
      <div class="vt-btn-row">
        <button class="vt-btn vt-btn-check" id="vt-check" onclick="vtCheck()">✓ Überprüfen</button>
        <button class="vt-btn vt-btn-next"  id="vt-next"  onclick="vtNext()">Weiter →</button>
      </div>
    </div>`;
  }

  function resultHTML() {
    const pct   = Math.round((richtig/shuffled.length)*100);
    const emoji = pct>=80?'🎉':pct>=50?'👍':'📚';
    const msg   = pct>=80?'Klasse! Du kennst die Vokabeln!':pct>=50?'Gut! Noch etwas üben.':'Nicht aufgeben – nochmal versuchen!';
    return styles + `<div class="vt-wrap"><div class="vt-result">
      <div style="font-size:3rem">${emoji}</div>
      <h2 style="margin:12px 0 4px">Training abgeschlossen!</h2>
      <div class="vt-result-score gradient-text">${pct}%</div>
      <p style="color:var(--muted2);margin-bottom:20px">${msg}</p>
      <p style="font-size:0.85rem;color:var(--muted2);margin-bottom:24px">${richtig} von ${shuffled.length} Vokabeln richtig</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="startVokabelTrainer(${kapitelId},${fachId},'${richtung}')">🔄 Nochmal</button>
        <button class="btn btn-secondary" onclick="startVokabelTrainer(${kapitelId},${fachId},'${richtung==='en-de'?'de-en':'en-de'}')">⇄ Richtung wechseln</button>
        <button class="btn btn-secondary" onclick="showKapitel(${kapitelId},${fachId})">← Zurück</button>
      </div>
    </div></div>`;
  }

  function render() {
    const backD = `<button class="btn btn-secondary btn-sm" onclick="showKapitel(${kapitelId},${fachId})" style="margin-bottom:20px">← Zurück</button>`;
    const backM = `<button class="mob-back" onclick="showKapitel(${kapitelId},${fachId})">← Zurück</button>`;
    const titleD = `<h1 style="margin-bottom:20px">${dirLabel.title}</h1>`;
    const titleM = `<div style="font-size:1.1rem;font-weight:700;margin-bottom:16px">${dirLabel.title}</div>`;
    setDesktop(backD + titleD + cardHTML());
    setMobile(backM + titleM + cardHTML());
    const inp = document.getElementById('vt-input');
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { revealed ? vtNext() : vtCheck(); }
      });
    }
  }

  window.vtCheck = function() {
    const v      = shuffled[current];
    const answer = (document.getElementById('vt-input')?.value || '').trim().toLowerCase();
    const correct = (richtung==='en-de' ? v.de : v.en).toLowerCase();
    const variants = correct.split(/[\/,;]/).map(s => s.trim()).filter(Boolean);
    const isOk = answer.length >= 2 && variants.some(variant =>
      answer.includes(variant) || variant.includes(answer)
    );

    revealed = true;
    const inp = document.getElementById('vt-input');
    const fb  = document.getElementById('vt-feedback');
    const fp  = fpMap[v.id] || { richtig_count:0, falsch_count:0 };

    if (isOk) {
      richtig++;
      inp.classList.add('correct');
      fb.className = 'vt-feedback correct';
      fb.innerHTML = `✅ Richtig! &nbsp;<strong>${richtung==='en-de' ? v.de : v.en}</strong>`;
      fpMap[v.id] = { ...fp, richtig_count: fp.richtig_count+1 };
      db.from('vokabel_fortschritt').upsert({ user_id:USER.id, vokabel_id:v.id, richtig_count:fp.richtig_count+1, falsch_count:fp.falsch_count, zuletzt_gelernt:new Date().toISOString() }, { onConflict:'user_id,vokabel_id' });
    } else {
      falsch++;
      inp.classList.add('wrong');
      fb.className = 'vt-feedback wrong';
      fb.innerHTML = `❌ Falsch. Richtig: <strong style="color:var(--text)">${richtung==='en-de' ? v.de : v.en}</strong>`;
      fpMap[v.id] = { ...fp, falsch_count: fp.falsch_count+1 };
      db.from('vokabel_fortschritt').upsert({ user_id:USER.id, vokabel_id:v.id, richtig_count:fp.richtig_count, falsch_count:fp.falsch_count+1, zuletzt_gelernt:new Date().toISOString() }, { onConflict:'user_id,vokabel_id' });
    }
    if (v.beispiel && richtung==='en-de') {
      fb.innerHTML += `<div style="margin-top:6px;font-size:0.8rem;color:var(--muted2);font-style:italic">"${v.beispiel}"</div>`;
    }
    fb.style.display='block';
    inp.disabled = true;
    document.getElementById('vt-check').style.display='none';
    document.getElementById('vt-next').style.display='block';
  };

  window.vtNext = function() {
    current++; revealed = false;
    if (current >= shuffled.length) {
      const backD = `<button class="btn btn-secondary btn-sm" onclick="showKapitel(${kapitelId},${fachId})" style="margin-bottom:20px">← Zurück</button>`;
      const backM = `<button class="mob-back" onclick="showKapitel(${kapitelId},${fachId})">← Zurück</button>`;
      setDesktop(backD + resultHTML());
      setMobile(backM + resultHTML());
      return;
    }
    render();
  };

  render();
}
