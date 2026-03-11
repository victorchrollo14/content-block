const BASE_URL = 'https://vz83d6k8.us-east.insforge.app';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTAyODl9.XsmS2-vr0aYcqndMPlQWqe1pXO4QFw9IZnjoXoSq99Y';

const authStatusEl = document.getElementById('auth-status');
const authBtnEl = document.getElementById('auth-btn');
const dashboardLinkEl = document.getElementById('dashboard-link');
const openDashboardEl = document.getElementById('open-dashboard');
const quickAddEl = document.getElementById('quick-add');
const quickBlockInputEl = document.getElementById('quickBlockInput');
const quickBlockBtnEl = document.getElementById('quickBlockBtn');
const statusEl = document.getElementById('status');

const AUTH_COOKIE = 'insforge-session';

void init();

async function init() {
  await checkAuth();
  setupEventListeners();
}

async function getSession() {
  try {
    const response = await fetch(`${BASE_URL}/auth/v1/session`, {
      headers: {
        'apikey': ANON_KEY
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }
  return null;
}

async function checkAuth() {
  const session = await getSession();
  
  if (session?.user) {
    authStatusEl.textContent = `Signed in as ${session.user.email || 'User'}`;
    authBtnEl.textContent = 'Open Dashboard';
    authBtnEl.onclick = () => chrome.tabs.create({ url: BASE_URL });
    dashboardLinkEl.classList.remove('hidden');
    quickAddEl.classList.remove('hidden');
  } else {
    authStatusEl.textContent = 'Not signed in';
    authBtnEl.textContent = 'Sign In';
    authBtnEl.onclick = () => chrome.tabs.create({ url: BASE_URL });
    dashboardLinkEl.classList.add('hidden');
    quickAddEl.classList.add('hidden');
  }
}

function setupEventListeners() {
  openDashboardEl.onclick = (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: BASE_URL });
  };
  
  quickBlockBtnEl.onclick = addQuickBlock;
  quickBlockInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addQuickBlock();
  });
  
  setInterval(checkAuth, 10000);
}

async function addQuickBlock() {
  const domain = quickBlockInputEl.value.trim().toLowerCase().replace(/^\.+/, '').replace(/\/+$/, '');
  
  if (!domain) return;
  
  const session = await getSession();
  if (!session?.user) {
    showStatus('Please sign in on dashboard');
    return;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/rest/v1/blocked_sites`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      quickBlockInputEl.value = '';
      showStatus(`Blocked ${domain}!`);
    } else {
      const err = await response.json();
      showStatus(err.message || 'Failed to block site.');
    }
  } catch (err) {
    console.error('Block error:', err);
    showStatus('Failed to block site.');
  }
}

function showStatus(msg) {
  statusEl.textContent = msg;
  setTimeout(() => {
    statusEl.textContent = '';
  }, 2000);
}
