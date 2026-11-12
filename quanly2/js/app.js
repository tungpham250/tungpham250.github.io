import { load } from './data.js';
import { loadDemo, DEMO_PASSWORD } from './demo.js';
import { icon } from './views/visuals.js';
import { getState, setState, setFilters, subscribe, initialFilters } from './state.js';
import * as overview from './views/tong-quan.js';
import * as views from './views/luot-xem.js';
import * as top from './views/top-video.js';
import * as videos from './views/video.js';
import * as tasks from './views/he-thong.js';

const routes = { 'tong-quan': overview, 'luot-xem': views, 'top-video': top, video: videos, 'he-thong': tasks };
const $ = id => document.getElementById(id);
const SESSION_KEY = 'crewreel.password';
const MODE_KEY = 'crewreel.mode';
let demoMode = false;
let authenticated = false, controller = null, epoch = 0, refreshTimer = null;
function readPassword() { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } }
function forgetPassword() { try { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(MODE_KEY); } catch { /* Storage may be disabled. */ } }
function errorText(error) {
  return error.name === 'OperationError' ? 'Sai mật khẩu' : (error.message || 'Không tải được dữ liệu.');
}
function updateTime() {
  const { data, lastUpdated } = getState();
  const time = lastUpdated ? new Date(lastUpdated) : null;
  $('updated').replaceChildren();
  if (!time) { $('updated').textContent = 'Chưa cập nhật.'; return; }
  const stamp = document.createElement('time'); stamp.dateTime = time.toISOString();
  stamp.textContent = time.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  $('updated').append('Tải thành công: ', stamp, ` (${Math.max(0, Math.floor((Date.now() - time.getTime()) / 60000))} phút trước). Dữ liệu nguồn: ${data?.cap_nhat || 'Không rõ'}`);
}
function render() {
  const state = getState();
  const requested = location.hash.slice(2);
  const active = Object.hasOwn(routes, requested) ? requested : 'tong-quan';
  $('route-label').textContent = { 'tong-quan':'Tổng quan', 'luot-xem':'Phân tích lượt xem', 'top-video':'Top video', video:'Thư viện video', 'he-thong':'Hệ thống' }[active];
  if (location.hash !== `#/${active}`) history.replaceState(null, '', `#/${active}`);
  for (const [id, view] of Object.entries(routes)) {
    const el = $(id); el.hidden = id !== active;
    if (authenticated) view.render(state, el);
  }
  for (const link of document.querySelectorAll('nav a')) {
    if (link.hash === `#/${active}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  $('refresh').disabled = state.status === 'loading'; updateTime();
  $('refresh').classList.toggle('is-loading',state.status==='loading');
}
function showLogin(message = '', status = 'idle') {
  $('login').hidden = false; $('app').hidden = true;
  $('login').dataset.state = status; $('login-message').textContent = message;
}
async function refresh(password, login = false) {
  if (controller) return;
  const requestEpoch = epoch;
  controller = new AbortController();
  setState({ status: 'loading', error: '' });
  if (login) {
    showLogin('Đang giải mã…', 'loading');
    $('login-form').querySelector('button').disabled = true;
  }
  try {
    const data = demoMode ? await loadDemo(password) : await load(password, { signal: controller.signal });
    if (requestEpoch !== epoch) return;
    let storageMessage = '';
    if (login) {
      try { sessionStorage.setItem(SESSION_KEY, password); sessionStorage.setItem(MODE_KEY, demoMode ? 'demo' : 'live'); }
      catch { storageMessage = 'Trình duyệt chặn sessionStorage; cần đăng nhập lại khi làm mới.'; }
      authenticated = true; $('password').value = '';
      $('demo-banner').hidden = !demoMode;
      $('session-label').textContent=demoMode?'Không gian xem thử':'Phiên được mã hóa';
      $('login').hidden = true; $('app').hidden = false;
      clearInterval(refreshTimer);
      refreshTimer = setInterval(refreshFromSession, 5 * 60 * 1000);
    }
    setState({ data, lastUpdated: new Date().toISOString(), status: 'ready', error: '' });
    if (storageMessage) setState({ status: 'error', error: storageMessage });
  } catch (error) {
    if (requestEpoch !== epoch || error.name === 'AbortError') return;
    if (login) {
      if (error.name === 'OperationError') forgetPassword();
      showLogin(errorText(error), 'error');
    }
    setState({ status: 'error', error: errorText(error) });
  } finally {
    // A pre-logout response must never modify a newer session.
    if (requestEpoch === epoch) {
      controller = null; $('login-form').querySelector('button').disabled = false;
    }
  }
}
function refreshFromSession() {
  if (!authenticated) return;
  const password = readPassword();
  if (password === null) { setState({ status: 'error', error: 'Phiên không có mật khẩu. Vui lòng đăng xuất rồi đăng nhập lại.' }); return; }
  void refresh(password);
}
$('login-form').addEventListener('submit', event => {
  event.preventDefault();
  if ($('password').value) {
    if (controller) return;
    demoMode = $('demo-mode').checked;
    const password = $('password').value; $('password').value = '';
    void refresh(password, true);
  }
});
$('refresh').addEventListener('click', refreshFromSession);
$('try-demo').addEventListener('click', () => {
  if(controller) return;
  $('demo-mode').checked=true;demoMode=true;
  void refresh(DEMO_PASSWORD,true);
});
$('logout').addEventListener('click', () => {
  epoch++; controller?.abort(); controller = null; authenticated = false;
  clearInterval(refreshTimer); forgetPassword(); $('password').value = '';
  demoMode = false; $('demo-mode').checked = false; $('demo-banner').hidden = true;
  for (const id of Object.keys(routes)) { $(id).replaceChildren(); $(id).dataset.state = 'loading'; }
  setState({ data: null, filters: initialFilters(), lastUpdated: null, status: 'idle', error: '' });
  $('login-form').querySelector('button').disabled = false;
  showLogin(); $('password').focus();
});
$('app').addEventListener('change', event => {
  const { name, value } = event.target;
  if (Object.hasOwn(getState().filters, name)) {
    setFilters({ [name]: name === 'range' ? Number(value) : value });
    const replacement = $('app').querySelector(`[name="${name}"]`);
    replacement?.focus();
  }
});
$('app').addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.name === 'search') { event.preventDefault(); event.target.blur(); }
});
$('app').addEventListener('click', event => {
  const sort = event.target.closest('[data-sort]');
  if (sort) {
    const { sortBy, sortDir } = getState().filters;
    setFilters({ sortBy: sort.dataset.sort, sortDir: sortBy === sort.dataset.sort && sortDir === 'asc' ? 'desc' : 'asc' });
    $('video').querySelector(`[data-sort="${CSS.escape(sort.dataset.sort)}"]`)?.focus();
  }
  if (event.target.closest('[data-reset-filters]')) setState({ filters: initialFilters() });
});
window.addEventListener('hashchange', () => { render(); window.scrollTo(0,0); });
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(render,150);
});
subscribe(render);
for(const target of document.querySelectorAll('[data-icon]')) target.append(icon(target.dataset.icon));
// Refresh relative timestamps and health thresholds without another request.
setInterval(() => { updateTime(); if (authenticated && location.hash === '#/he-thong') tasks.render(getState(), $('he-thong')); }, 60000);
render();
const stored = readPassword();
try { demoMode = sessionStorage.getItem(MODE_KEY) === 'demo'; } catch { /* Use real source by default. */ }
$('demo-mode').checked = demoMode;
if (stored !== null) void refresh(stored, true);
