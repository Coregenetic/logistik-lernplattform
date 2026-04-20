// ── VOKABEL TRAINER ───────────────────────────────────────────
async function startVokabelTrainer(kapitelId, fachId, richtung) {
  showSpinner();
  const { data: vokabeln }    = await db.from('vokabeln').select('*').eq('kapitel_id', kapitelId).order('reihenfolge');
  const { data: fortschritt } = await db.from('vokabel_fortschritt').select('*').eq('user_id', USER.id);
  if (!vokabeln || !vokabeln.length) return;

  const fpMap = {};
  (fortschritt||[]).forEach(f => { fpMap[f.vokabel_id] = f; });

  const shuffled = [...vokabeln].sort(() => Math.random() - 0.5);
  let current = 0, richtig = 0, falsch = 0, revealed = false;

  const dirLabel = richtung === 'en-de'
    ? { title: '&#127468;&#127463; Englisch &rarr; Deutsch', from: '&#127468;&#127463; ENGLISCH', to: '&#127465;&#127466; Auf Deutsch' }
    : { title: '&#127465;&#127466; Deutsch &rarr; Englisch', from: '&#127465;&#127466; DEUTSCH',  to: '&#127468;&#127463; In English' };

  // Findet Element im aktiven Container (Mobile oder Desktop)
  function getEl(id) {
    const isMob = window.innerWidth <= 700;
    const container = isMob
      ? document.getElementById('mob-main')
      : document.getElementById('main');
    return container ? container.querySelector('#' + id) : document.getElementById(id);
  }

  const styles = '<style>' +
    '.vt-wrap{max-width:580px}' +
    '.vt-progress-wrap{margin-bottom:20px}' +
    '.vt-progress-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}' +
    '.vt-progress-label{font-size:0.78rem;color:var(--muted2);font-weight:600}' +
    '.vt-progress{height:6px;background:var(--border);border-radius:99px;overflow:hidden}' +
    '.vt-progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width 0.5s ease}' +
    '.vt-scores{display:flex;gap:10px;margin-bottom:20px}' +
    '.vt-score-pill{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:99px;font-size:0.82rem;font-weight:700}' +
    '.vt-score-r{background:#10b98115;border:1px solid #10b98130;color:var(--correct)}' +
    '.vt-score-f{background:#ef444415;border:1px solid #ef444430;color:var(--danger)}' +
    '.vt-card{border-radius:20px;padding:32px 28px;text-align:center;margin-bottom:20px;min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border:1px solid var(--border);background:var(--surface);transition:background 0.3s,border-color 0.3s}' +
    '.vt-card.state-correct{background:#10b98112;border-color:#10b98135}' +
    '.vt-card.state-wrong{background:#ef444412;border-color:#ef444435}' +
    '.vt-card-reveal{animation:revealIn 0.3s cubic-bezier(0.34,1.56,0.64,1)}' +
    '@keyframes revealIn{from{transform:scale(0.95);opacity:0.5}to{transform:scale(1);opacity:1}}' +
    '.vt-lang{font-size:0.68rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1.2px}' +
    '.vt-word{font-size:1.9rem;font-weight:800;font-family:"Syne",sans-serif;line-height:1.2}' +
    '.vt-answer-word{font-size:1.5rem;font-weight:800;font-family:"Syne",sans-serif}' +
    '.vt-example{font-size:0.82rem;color:var(--muted2);font-style:italic;max-width:320px}' +
    '.vt-streak{font-size:0.72rem;color:var(--warning);font-weight:600}' +
    '.vt-verdict{font-size:0.9rem;font-weight:700;padding:4px 14px;border-radius:99px}' +
    '.vt-verdict.correct{background:#10b98125;color:var(--correct)}' +
    '.vt-verdict.wrong{background:#ef444425;color:var(--danger)}' +
    '.vt-label{font-size:0.78rem;color:var(--muted2);margin-bottom:8px;text-align:center;font-weight:600}' +
    '.vt-input{width:100%;background:var(--surface2);border:2px solid var(--border2);border-radius:14px;color:var(--text);font-family:inherit;font-size:1rem;padding:14px 18px;outline:none;transition:all 0.2s;text-align:center}' +
    '.vt-input:focus{border-color:var(--accent);background:var(--surface3);box-shadow:0 0 0 3px var(--accent-glow)}' +
    '.vt-input.correct{border-color:var(--correct);background:#10b98112}' +
    '.vt-input.wrong{border-color:var(--danger);background:#ef444412}' +
    '.vt-input:disabled{opacity:0.8;cursor:default}' +
    '.vt-answer-area{margin-bottom:16px}' +
    '.vt-btn-row{display:flex;gap:10px}' +
    '.vt-btn{flex:1;padding:14px;border:none;border-radius:14px;font-family:inherit;font-size:0.95rem;font-weight:700;cursor:pointer;transition:all 0.18s}' +
    '.vt-btn:active{transform:scale(0.97)}' +
    '.vt-btn-check{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 2px 12px #3b7ff530}' +
    '.vt-btn-check:hover{opacity:0.92}' +
    '.vt-btn-next{background:var(--surface2);border:1px solid var(--border2);color:var(--text);display:none}' +
    '.vt-btn-next:hover{background:var(--surface3)}' +
    '.vt-result{text-align:center;padding:12px 0}' +
    '.vt-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}' +
    '.vt-result-stat{border-radius:14px;padding:16px;text-align:center}' +
    '.vt-result-val{font-size:2rem;font-weight:800;font-family:"Syne",sans-serif;line-height:1}' +
    '.vt-result-lbl{font-size:0.75rem;color:var(--muted2);margin-top:4px;font-weight:600}' +
    '.vt-result-btns{display:flex;flex-direction:column;gap:10px;margin-top:20px}' +
    '</style>';

  function cardHTML() {
    const v = shuffled[current];
    const fp = fpMap[v.id];
    const frageWort = richtung === 'en-de' ? v.en : v.de;
    const pct = Math.round((current / shuffled.length) * 100);
    const beispiel = (v.beispiel && richtung === 'de-en') ? '<div class="vt-example">"' + v.beispiel + '"</div>' : '';
    const streak = (fp && fp.richtig_count > 0) ? '<div class="vt-streak">&#128293; ' + fp.richtig_count + '&times; richtig</div>' : '';

    return styles +
      '<div class="vt-wrap">' +
        '<div class="vt-progress-wrap">' +
          '<div class="vt-progress-top">' +
            '<span class="vt-progress-label">Vokabel ' + (current+1) + ' von ' + shuffled.length + '</span>' +
            '<span class="vt-progress-label">' + pct + '%</span>' +
          '</div>' +
          '<div class="vt-progress"><div class="vt-progress-fill" style="width:' + pct + '%"></div></div>' +
        '</div>' +
        '<div class="vt-scores">' +
          '<div class="vt-score-pill vt-score-r">&#10003; ' + richtig + ' richtig</div>' +
          '<div class="vt-score-pill vt-score-f">&#10007; ' + falsch + ' falsch</div>' +
        '</div>' +
        '<div class="vt-card" id="vt-card">' +
          '<div class="vt-lang">' + dirLabel.from + '</div>' +
          '<div class="vt-word">' + frageWort + '</div>' +
          beispiel + streak +
        '</div>' +
        '<div class="vt-answer-area">' +
          '<div class="vt-label">' + dirLabel.to + '</div>' +
          '<input class="vt-input" type="text" id="vt-input" placeholder="Deine &Uuml;bersetzung..." autocomplete="off">' +
        '</div>' +
        '<div class="vt-btn-row">' +
          '<button class="vt-btn vt-btn-check" id="vt-check" onclick="vtCheck()">&#10003; &Uuml;berpr&uuml;fen</button>' +
          '<button class="vt-btn vt-btn-next" id="vt-next" onclick="vtNext()">Weiter &rarr;</button>' +
        '</div>' +
      '</div>';
  }

  function resultHTML() {
    const pct   = Math.round((richtig / shuffled.length) * 100);
    const emoji = pct >= 80 ? '&#127881;' : pct >= 50 ? '&#128077;' : '&#128218;';
    const msg   = pct >= 80 ? 'Klasse! Du kennst die Vokabeln!' : pct >= 50 ? 'Gut! Noch etwas &uuml;ben.' : 'Nicht aufgeben &ndash; nochmal versuchen!';
    const scoreColor  = pct >= 80 ? 'var(--correct)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
    const scoreBg     = pct >= 80 ? '#10b98115' : pct >= 50 ? '#f59e0b15' : '#ef444415';
    const scoreBorder = pct >= 80 ? '#10b98130' : pct >= 50 ? '#f59e0b30' : '#ef444430';
    const gegRichtung = richtung === 'en-de' ? 'de-en' : 'en-de';

    return styles +
      '<div class="vt-wrap"><div class="vt-result">' +
        '<div style="font-size:3rem;margin-bottom:12px">' + emoji + '</div>' +
        '<h2 style="margin-bottom:6px">Training abgeschlossen!</h2>' +
        '<p style="color:var(--muted2);font-size:0.88rem;margin-bottom:20px">' + msg + '</p>' +
        '<div style="background:' + scoreBg + ';border:1px solid ' + scoreBorder + ';border-radius:20px;padding:24px;margin-bottom:16px">' +
          '<div style="font-family:\'Syne\',sans-serif;font-size:3.5rem;font-weight:800;color:' + scoreColor + ';line-height:1">' + pct + '%</div>' +
          '<div style="font-size:0.82rem;color:var(--muted2);margin-top:6px">' + shuffled.length + ' Vokabeln trainiert</div>' +
        '</div>' +
        '<div class="vt-result-grid">' +
          '<div class="vt-result-stat" style="background:#10b98112;border:1px solid #10b98128">' +
            '<div class="vt-result-val" style="color:var(--correct)">' + richtig + '</div>' +
            '<div class="vt-result-lbl">&#10003; Richtig</div>' +
          '</div>' +
          '<div class="vt-result-stat" style="background:#ef444412;border:1px solid #ef444428">' +
            '<div class="vt-result-val" style="color:var(--danger)">' + falsch + '</div>' +
            '<div class="vt-result-lbl">&#10007; Falsch</div>' +
          '</div>' +
        '</div>' +
        '<div class="vt-result-btns">' +
          '<button class="btn btn-primary" style="padding:13px" onclick="startVokabelTrainer(' + kapitelId + ',' + fachId + ',\'' + richtung + '\')">&#128260; Nochmal trainieren</button>' +
          '<button class="btn btn-secondary" style="padding:13px" onclick="startVokabelTrainer(' + kapitelId + ',' + fachId + ',\'' + gegRichtung + '\')">&#8644; Richtung wechseln</button>' +
          '<button class="btn btn-secondary" style="padding:13px" onclick="showKapitel(' + kapitelId + ',' + fachId + ')">&#8592; Zur&uuml;ck zum Kapitel</button>' +
        '</div>' +
      '</div></div>';
  }

  function render() {
    const isMob  = window.innerWidth <= 700;
    const backD  = '<button class="btn btn-secondary btn-sm" onclick="showKapitel(' + kapitelId + ',' + fachId + ')" style="margin-bottom:20px">&larr; Zur&uuml;ck</button>';
    const backM  = '<button class="mob-back" onclick="showKapitel(' + kapitelId + ',' + fachId + ')">&larr; Zur&uuml;ck</button>';
    const titleD = '<h1 style="margin-bottom:20px">' + dirLabel.title + '</h1>';
    const titleM = '<div style="font-size:1.1rem;font-weight:700;margin-bottom:16px">' + dirLabel.title + '</div>';

    if (isMob) {
      setMobile(backM + titleM + cardHTML());
      setDesktop('');
    } else {
      setDesktop(backD + titleD + cardHTML());
      setMobile('');
    }

    setTimeout(function() {
      const inp = getEl('vt-input');
      if (inp) {
        inp.focus();
        inp.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { revealed ? vtNext() : vtCheck(); }
        });
      }
    }, 50);
  }

  window.vtCheck = function() {
    const v       = shuffled[current];
    const inp     = getEl('vt-input');
    const card    = getEl('vt-card');
    const checkBtn= getEl('vt-check');
    const nextBtn = getEl('vt-next');

    const answer  = (inp ? inp.value : '').trim().toLowerCase();
    const correct = (richtung === 'en-de' ? v.de : v.en).toLowerCase();
    const variants = correct.split(/[\/,;]/).map(function(s) { return s.trim(); }).filter(Boolean);
    const isOk = answer.length >= 2 && variants.some(function(variant) {
      return answer.includes(variant) || variant.includes(answer);
    });

    revealed = true;
    const fp = fpMap[v.id] || { richtig_count: 0, falsch_count: 0 };
    const correctWord = richtung === 'en-de' ? v.de : v.en;
    const beispiel = v.beispiel ? '<div class="vt-example">"' + v.beispiel + '"</div>' : '';

    if (inp) inp.disabled = true;

    if (isOk) {
      richtig++;
      if (inp) inp.classList.add('correct');
      if (card) {
        card.classList.add('state-correct', 'vt-card-reveal');
        card.innerHTML =
          '<div style="font-size:2rem">&#9989;</div>' +
          '<div class="vt-verdict correct">Richtig!</div>' +
          '<div class="vt-answer-word">' + correctWord + '</div>' +
          beispiel;
      }
      fpMap[v.id] = Object.assign({}, fp, { richtig_count: fp.richtig_count + 1 });
      db.from('vokabel_fortschritt').upsert({ user_id: USER.id, vokabel_id: v.id, richtig_count: fp.richtig_count + 1, falsch_count: fp.falsch_count, zuletzt_gelernt: new Date().toISOString() }, { onConflict: 'user_id,vokabel_id' });
    } else {
      falsch++;
      if (inp) inp.classList.add('wrong');
      if (card) {
        card.classList.add('state-wrong', 'vt-card-reveal');
        card.innerHTML =
          '<div style="font-size:2rem">&#10060;</div>' +
          '<div class="vt-verdict wrong">Falsch &mdash; Richtige Antwort:</div>' +
          '<div class="vt-answer-word">' + correctWord + '</div>' +
          beispiel;
      }
      fpMap[v.id] = Object.assign({}, fp, { falsch_count: fp.falsch_count + 1 });
      db.from('vokabel_fortschritt').upsert({ user_id: USER.id, vokabel_id: v.id, richtig_count: fp.richtig_count, falsch_count: fp.falsch_count + 1, zuletzt_gelernt: new Date().toISOString() }, { onConflict: 'user_id,vokabel_id' });
    }

    if (checkBtn) checkBtn.style.display = 'none';
    if (nextBtn)  nextBtn.style.display  = 'block';
  };

  window.vtNext = function() {
    current++;
    revealed = false;
    if (current >= shuffled.length) {
      const isMob = window.innerWidth <= 700;
      const backD = '<button class="btn btn-secondary btn-sm" onclick="showKapitel(' + kapitelId + ',' + fachId + ')" style="margin-bottom:20px">&larr; Zur&uuml;ck</button>';
      const backM = '<button class="mob-back" onclick="showKapitel(' + kapitelId + ',' + fachId + ')">&larr; Zur&uuml;ck</button>';
      if (isMob) { setMobile(backM + resultHTML()); setDesktop(''); }
      else       { setDesktop(backD + resultHTML()); setMobile(''); }
      return;
    }
    render();
  };

  render();
}