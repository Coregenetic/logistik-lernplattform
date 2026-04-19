// ── NAVIGATION ───────────────────────────────────────────────

function buildSidebar() {
  const isMod   = ['admin','mod'].includes(PROFILE.role);
  const isAdmin = PROFILE.role === 'admin';
  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-title">Navigation</div>
    <button class="sidebar-link active" id="lnk-home"      onclick="showHome()">        <span class="sidebar-icon">🏠</span>Dashboard</button>
    <button class="sidebar-link"        id="lnk-lf"        onclick="showLernfelder()">  <span class="sidebar-icon">📚</span>Lernfelder</button>
    <button class="sidebar-link"        id="lnk-pruefung"  onclick="showPruefungen()">  <span class="sidebar-icon">📝</span>Prüfungen & Arbeiten</button>
    <button class="sidebar-link"        id="lnk-fp"        onclick="showFortschritt()"> <span class="sidebar-icon">📊</span>Mein Fortschritt</button>

    <div class="sidebar-title" style="margin-top:12px">Fächer</div>
    <button class="sidebar-link" id="lnk-fach-1" onclick="showFach(1)"><span class="sidebar-icon">🇬🇧</span>Englisch</button>
    <button class="sidebar-link" id="lnk-fach-2" onclick="showFach(2)"><span class="sidebar-icon">💬</span>Kommunikation</button>
    <button class="sidebar-link" id="lnk-fach-3" onclick="showFach(3)"><span class="sidebar-icon">📊</span>WiPo</button>

    ${isMod ? `
    <div class="sidebar-title" style="margin-top:12px">Verwaltung</div>
    <button class="sidebar-link" id="lnk-inhalte"     onclick="showInhalte()">    <span class="sidebar-icon">✏️</span>Inhalte bearbeiten</button>
    <button class="sidebar-link" id="lnk-quiz-import" onclick="showQuizImport()"> <span class="sidebar-icon">⚡</span>Importieren</button>
    <button class="sidebar-link" id="lnk-arbeit-neu"  onclick="showArbeitErstellen()"><span class="sidebar-icon">➕</span>Arbeit erstellen</button>
    ` : ''}
    ${isAdmin ? `
    <button class="sidebar-link" id="lnk-admin" onclick="showAdmin()"><span class="sidebar-icon">⚙️</span>Admin Panel</button>
    ` : ''}

    <div style="flex-grow:1"></div>
    <button class="sidebar-link" style="margin-top:20px;color:var(--danger)"
            onclick="db.auth.signOut().then(()=>window.location.href='index.html')">
      <span class="sidebar-icon">🚪</span>Abmelden
    </button>
  `;
}

function buildBottomNav() {
  const isMod   = ['admin','mod'].includes(PROFILE.role);
  const isAdmin = PROFILE.role === 'admin';
  const items = [
    { id:'bn-home',     icon:'🏠', label:'Start',      fn:'showHome()' },
    { id:'bn-lf',       icon:'📚', label:'Lernfelder', fn:'showLernfelder()' },
    { id:'bn-pruefung', icon:'📝', label:'Prüfungen',  fn:'showPruefungen()' },
    { id:'bn-faecher',  icon:'📘', label:'Fächer',     fn:'showFaecherMob()' },
    { id:'bn-fp',       icon:'📊', label:'Fortschritt',fn:'showFortschritt()' },
    ...(isMod   ? [{ id:'bn-mod',   icon:'✏️', label:'Verwalten', fn:'showModMenu()' }] : []),
    ...(isAdmin && !isMod ? [{ id:'bn-admin', icon:'⚙️', label:'Admin', fn:'showAdmin()' }] : []),
  ];
  document.getElementById('bottom-nav').innerHTML = items.map(i => `
    <button class="bn-item" id="${i.id}" onclick="${i.fn}">
      <span class="bn-icon">${i.icon}</span>
      <span>${i.label}</span>
    </button>`).join('');
}

// ── ACTIVE STATE ─────────────────────────────────────────────
function setActive(desktopId, mobileId) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.bn-item').forEach(l => l.classList.remove('active'));
  if (desktopId) { const el = document.getElementById(desktopId); if (el) el.classList.add('active'); }
  if (mobileId)  { const el = document.getElementById(mobileId);  if (el) el.classList.add('active'); }
}

// ── CONTENT HELPERS ───────────────────────────────────────────
function setDesktop(html) { document.getElementById('main').innerHTML = html; }
function setMobile(html)  { document.getElementById('mob-main').innerHTML = html; }
function setMain(html)    { setDesktop(html); setMobile(html); }

function showSpinner() {
  const s = '<div style="display:flex;justify-content:center;padding:40px"><div class="spinner"></div></div>';
  setDesktop(s); setMobile(s);
}

// ── MOD MENU (mobile only) ────────────────────────────────────
function showModMenu() {
  setActive(null, 'bn-mod');
  const isAdmin = PROFILE.role === 'admin';
  setMobile(`
    <div class="mob-greeting">Verwaltung</div>
    <div class="mob-greeting-sub" style="margin-bottom:20px">Mod-Bereich</div>

    <div class="mob-menu-card" onclick="showInhalte()">
      <div class="mob-menu-icon">✏️</div>
      <div class="mob-menu-info">
        <div class="mob-menu-title">Inhalte bearbeiten</div>
        <div class="mob-menu-sub">Lernfeld- & Fach-Inhalte verwalten</div>
      </div>
      <div class="mob-lf-arrow">›</div>
    </div>

    <div class="mob-menu-card" onclick="showQuizImport()">
      <div class="mob-menu-icon">⚡</div>
      <div class="mob-menu-info">
        <div class="mob-menu-title">Quiz & Vokabeln importieren</div>
        <div class="mob-menu-sub">JSON, CSV oder aus Dokument generieren</div>
      </div>
      <div class="mob-lf-arrow">›</div>
    </div>

    <div class="mob-menu-card" onclick="showArbeitErstellen()">
      <div class="mob-menu-icon">➕</div>
      <div class="mob-menu-info">
        <div class="mob-menu-title">Arbeit / Prüfung erstellen</div>
        <div class="mob-menu-sub">Neue Prüfung konfigurieren</div>
      </div>
      <div class="mob-lf-arrow">›</div>
    </div>

    ${isAdmin ? `
    <div class="mob-menu-card" onclick="showAdmin()">
      <div class="mob-menu-icon">⚙️</div>
      <div class="mob-menu-info">
        <div class="mob-menu-title">Admin Panel</div>
        <div class="mob-menu-sub">Benutzer & Lernfelder verwalten</div>
      </div>
      <div class="mob-lf-arrow">›</div>
    </div>` : ''}
  `);
}
