// ── AUTH & INIT ──────────────────────────────────────────────
let USER = null, PROFILE = null;
const isMobile = () => window.innerWidth <= 700;

db.auth.getSession().then(async ({ data: { session } }) => {
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  USER = session.user;

  // Profil + alle Home-Daten GLEICHZEITIG laden
  const [
    { data: profile },
    { data: lernfelder },
    { data: fortschritt },
    { data: fachFortschritt },
    { data: arbeiten },
  ] = await Promise.all([
    db.from('profiles').select('*').eq('id', USER.id).maybeSingle(),
    db.from('lernfelder').select('id, nummer, name, beschreibung, icon, freigeschaltet').order('nummer'),
    db.from('fortschritt').select('inhalt_id').eq('user_id', USER.id).eq('abgeschlossen', true),
    db.from('fach_fortschritt').select('inhalt_id').eq('user_id', USER.id).eq('abgeschlossen', true),
    db.from('arbeiten').select('id, titel, typ, beschreibung, zeitlimit_minuten, max_fragen').eq('aktiv', true).order('erstellt_am', { ascending: false }).limit(3),
  ]);

  PROFILE = profile;

  if (!PROFILE) {
    await db.auth.signOut();
    window.location.href = 'index.html';
    return;
  }

  // Cache befüllen
  if (typeof _lfCache !== 'undefined') {
    _lfCache['fortschritt_' + USER.id] = (fortschritt||[]).map(f => f.inhalt_id);
  }

  const roleColors = { admin: 'badge-admin', mod: 'badge-mod', azubi: 'badge-user' };
  const initials   = PROFILE.username.substring(0, 2).toUpperCase();

  // Desktop UI
  const nameEl  = document.getElementById('nav-name');
  const badgeEl = document.getElementById('nav-badge');
  if (nameEl)  nameEl.textContent = PROFILE.username;
  if (badgeEl) badgeEl.innerHTML  = `<span class="badge ${roleColors[PROFILE.role]}">${PROFILE.role}</span>`;

  // Mobile UI
  const mobBadgeEl = document.getElementById('mob-badge');
  const mobAvatar  = document.getElementById('mob-avatar');
  if (mobBadgeEl) mobBadgeEl.innerHTML = `<span class="badge ${roleColors[PROFILE.role]}">${PROFILE.role}</span>`;
  if (mobAvatar) {
    mobAvatar.innerHTML = `${initials} <span style="font-size:1.1rem;margin-left:4px">🚪</span>`;
    mobAvatar.style.cssText += ';width:auto;padding:0 12px;border-radius:12px;display:flex;align-items:center;';
    mobAvatar.onclick = () => {
      if (confirm('Abmelden?')) {
        db.auth.signOut().then(() => window.location.href = 'index.html');
      }
    };
  }

  // Navigation aufbauen
  buildSidebar();
  buildBottomNav();

  // Home mit bereits geladenen Daten rendern — kein zweiter DB-Call!
  showHomeWithData({ lernfelder, fortschritt, fachFortschritt, arbeiten });

  // Loader entfernen
  document.body.classList.remove('app-loading');
  const loader = document.getElementById('initial-loader');
  if (loader) setTimeout(() => loader.remove(), 400);
});

// Logout Button Desktop
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    if (confirm('Wirklich abmelden?')) {
      await db.auth.signOut();
      window.location.href = 'index.html';
    }
  });
}