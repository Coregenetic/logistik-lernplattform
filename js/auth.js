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
  document.getElementById('nav-name').textContent = PROFILE.username;
  document.getElementById('nav-badge').innerHTML =
    `<span class="badge ${roleColors[PROFILE.role]}">${PROFILE.role}</span>`;

  // Mobile header
  document.getElementById('mob-badge').innerHTML =
    `<span class="badge ${roleColors[PROFILE.role]}">${PROFILE.role}</span>`;
  const mobAvatar = document.getElementById('mob-avatar');
  mobAvatar.textContent = initials;
  mobAvatar.onclick = () => {
    if (confirm('Abmelden?')) { db.auth.signOut(); window.location.href = 'index.html'; }
  };

  buildSidebar();
  buildBottomNav();
  showHome();
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await db.auth.signOut();
  window.location.href = 'index.html';
});
