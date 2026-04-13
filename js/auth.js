// ── AUTH & INIT ──────────────────────────────────────────────
let USER = null, PROFILE = null;
const isMobile = () => window.innerWidth <= 700;

db.auth.getSession().then(async ({ data: { session } }) => {
  // Wenn keine Session da ist, sofort zurück zum Login
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
  
  USER = session.user;

  // Profil laden
  const { data } = await db.from('profiles').select('*').eq('id', USER.id).maybeSingle();
  PROFILE = data;
  
  if (!PROFILE) {
    await db.auth.signOut();
    window.location.href = 'index.html';
    return;
  }

  const roleColors = { admin:'badge-admin', mod:'badge-mod', azubi:'badge-user' };
  const initials   = PROFILE.username.substring(0, 2).toUpperCase();

  // Desktop UI befüllen
  const nameEl = document.getElementById('nav-name');
  const badgeEl = document.getElementById('nav-badge');
  if (nameEl) nameEl.textContent = PROFILE.username;
  if (badgeEl) badgeEl.innerHTML = `<span class="badge ${roleColors[PROFILE.role]}">${PROFILE.role}</span>`;

  // Mobile UI befüllen
  const mobBadgeEl = document.getElementById('mob-badge');
  const mobAvatar = document.getElementById('mob-avatar');
  if (mobBadgeEl) mobBadgeEl.innerHTML = `<span class="badge ${roleColors[PROFILE.role]}">${PROFILE.role}</span>`;
  if (mobAvatar) {
    mobAvatar.innerHTML = `${initials} <span style="font-size:1.1rem;margin-left:4px">🚪</span>`;
    mobAvatar.style.width = 'auto'; 
    mobAvatar.style.padding = '0 12px';
    mobAvatar.style.borderRadius = '12px';
    mobAvatar.style.display = 'flex';
    mobAvatar.style.alignItems = 'center';
    
    mobAvatar.onclick = () => {
      if (confirm('Abmelden?')) { 
        db.auth.signOut().then(() => window.location.href = 'index.html'); 
      }
    };
  }

  // Navigation und Startseite aufbauen
  buildSidebar();
  buildBottomNav();
  
  // Warten bis Home-Content bereit ist
  await showHome();

  // FINALER SCHRITT: Lade-Status entfernen und App einblenden
  document.body.classList.remove('app-loading');
  const loader = document.getElementById('initial-loader');
  if (loader) {
    setTimeout(() => loader.remove(), 400); // Sanftes Entfernen nach dem Fade-Out
  }
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
