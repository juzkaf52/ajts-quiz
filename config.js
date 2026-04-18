// config.js — Shared across all pages
const API_URL = 'https://script.google.com/macros/s/AKfycbyjQteF1Z5je8hNJJAtzCPofE14drp0sO4ql6Y0MiBOY0Lc0diIaCLVIwGzKOHZW5im/exec'; // Replace with your deployed URL

async function api(action, payload = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

function getUser() {
  try { return JSON.parse(sessionStorage.getItem('ajts_user') || 'null'); } catch { return null; }
}
function setUser(u) { sessionStorage.setItem('ajts_user', JSON.stringify(u)); }
function logout() { sessionStorage.removeItem('ajts_user'); window.location.href = 'index.html'; }
function requireAuth(role) {
  const u = getUser();
  if (!u) { window.location.href = 'index.html'; return null; }
  if (role === 'teacher' && u.role === 'student') { window.location.href = 'index.html'; return null; }
  if (role === 'admin' && u.role !== 'admin') { window.location.href = 'index.html'; return null; }
  return u;
}
function isAdmin(u) { return u && u.role === 'admin'; }
function isTeacher(u) { return u && (u.role === 'teacher' || u.role === 'admin'); }

function toast(msg, type = 'success') {
  let t = document.getElementById('__toast');
  if (!t) {
    t = document.createElement('div'); t.id = '__toast';
    t.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(80px);
      padding:13px 28px;border-radius:10px;font-family:'Tajawal',sans-serif;font-size:.95rem;font-weight:600;
      z-index:9999;transition:transform .3s cubic-bezier(.34,1.56,.64,1);pointer-events:none;white-space:nowrap;max-width:90vw;text-align:center;`;
    document.body.appendChild(t);
  }
  t.style.background = type === 'error' ? '#7f1d1d' : type === 'warn' ? '#78350f' : '#14532d';
  t.style.color = '#fff';
  t.style.border = `1px solid ${type === 'error' ? '#ef4444' : type === 'warn' ? '#f59e0b' : '#4ade80'}`;
  t.textContent = msg;
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(80px)'; }, 3500);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}
function formatDateTime(iso) {
  if (!iso) return '—';
  return formatDate(iso) + ' ' + formatTime(iso);
}
function pctColor(p) {
  return p >= 75 ? '#4ade80' : p >= 45 ? '#fcd34d' : '#f87171';
}
function pctGrade(p) {
  return p >= 90 ? 'Excellent' : p >= 75 ? 'Very Good' : p >= 60 ? 'Good' : p >= 45 ? 'Pass' : 'Needs Improvement';
}
