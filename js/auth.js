// ── AUTH & INIT ──────────────────────────────────────────────
let USER = null, PROFILE = null;
const isMobile = () => window.innerWidth <= 700;

db.auth.getSession().then(async ({ data: { session } }) => {
  if (!session) return window.location.href = 'index.html';
  USER = session.user;

  const { data } = await db.from('profiles').select('*').eq('id', USER.id).maybeSingle();
  PROFILE = data;
  if (!PROFILE) return window.location.href = 'index.html';

  const roleColors = { admin:'badge-admin', mod:'badge-mod', user:'badge-user' };
  const initials   = PROFILE.username.substring(0, 2).toUpperCase();

  // Desktop navbar
  const navNameEl = document.getElementById('nav-name');
  if (navNameEl) navNameEl.textContent = PROFILE.username;
  
  const navBadgeEl = document.getElementById('nav-badge');
  if (navBadgeEl) navBadgeEl.innerHTML = `<span class="badge ${roleColors[PROFILE.role]}">${PROFILE.role}</span>`;

  // Mobile header
  const mobBadgeEl = document.getElementById('mob-badge');
  if (mobBadgeEl) mobBadgeEl.innerHTML = `<span class="badge ${roleColors[PROFILE.role]}">${PROFILE.role}</span>`;
  
  const mobAvatar = document.getElementById('mob-avatar');
  if (mobAvatar) {
    // Macht den Logout-Button auf dem Handy offensichtlicher (Initialen + Tür-Icon)
    mobAvatar.innerHTML = `${initials} <span style="font-size:1.1rem;margin-left:4px">🚪</span>`;
    mobAvatar.style.width = 'auto'; 
    mobAvatar.style.padding = '0 14px';
    mobAvatar.style.borderRadius = '12px';
    mobAvatar.onclick = () => {
      if (confirm('Möchtest du dich wirklich abmelden?')) { 
        db.auth.signOut().then(() => window.location.href = 'index.html'); 
      }
    };
  }

  buildSidebar();
  buildBottomNav();
  showHome();
});

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    await db.auth.signOut();
    window.location.href = 'index.html';
  });
}
