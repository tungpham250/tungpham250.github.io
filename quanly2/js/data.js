import { decrypt } from './crypto.js';

export const CHANNELS = Object.freeze({ vi: 'Mẹo AI Văn Phòng', en: 'One Fact a Day', ucl: 'Champions League' });
export const METRICS = ['cho_duyet', 'cho_dang', 'da_dang', 'loi', 'tao_hom_nay', 'dang_hom_nay', 'tong_xem_yt'];
const NUMERIC = new Set([...METRICS, 'thoi_luong', 'luot_xem', 'thich', 'binh_luan']);
export const number = value => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

/** Column positions come exclusively from the header; unknown columns survive. */
export function toObjects(table) {
  if (!Array.isArray(table) || !Array.isArray(table[0])) return [];
  const [headers, ...rows] = table;
  return rows.filter(Array.isArray).map(row => Object.fromEntries(
    headers.flatMap((header, index) => typeof header === 'string' && header.trim()
      ? [[header.trim(), NUMERIC.has(header.trim()) ? number(row[index]) : (row[index] ?? '')]] : [])
  ));
}

export function normalize(raw) {
  if (!raw || typeof raw.bang !== 'object' || raw.bang === null || Array.isArray(raw.bang)) {
    throw new Error('Dữ liệu giải mã thiếu bảng bang.');
  }
  return { cap_nhat: raw.cap_nhat ?? '', bang: Object.fromEntries(
    ['kenh', 'videos', 'luot_xem', 'he_thong'].map(name => [name, toObjects(raw.bang[name])])
  ) };
}

/** Sole runtime data request. Resolve relative to this module, including project Pages. */
export async function load(password, { signal } = {}) {
  const url = new URL('../../quanly/data.json', import.meta.url);
  url.searchParams.set('t', Date.now());
  const response = await fetch(url, { cache: 'no-store', signal, credentials: 'omit', redirect: 'error' });
  if (!response.ok) throw new Error(`Không tải được dữ liệu (HTTP ${response.status}).`);
  return normalize(await decrypt(await response.json(), password));
}

const rows = (data, name) => data?.bang?.[name] ?? [];
export function summaryByChannel(data) {
  const channels = rows(data, 'kenh').map(row => ({ ...row, ten: row.ten || CHANNELS[row.kenh] || row.kenh,
    ...Object.fromEntries(METRICS.map(key => [key, number(row[key])])) }));
  const totals = Object.fromEntries(METRICS.map(key => [key, channels.reduce((sum, row) => sum + row[key], 0)]));
  return { channels, totals };
}

/** YYYY-MM-DD is a Vietnam calendar day; timestamps are converted to UTC+07. */
export function dayKey(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value ? value : '';
  }
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time + 7 * 3600000).toISOString().slice(0, 10) : '';
}

/** Inclusive calendar range ending at now; no interpolation or invented counts. */
export function dailyViews(data, range = 7, now = new Date()) {
  const days = [7, 14, 30].includes(Number(range)) ? Number(range) : 7;
  const end = dayKey(now);
  if (!end) return [];
  const start = new Date(Date.parse(`${end}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10);
  const groups = new Map();
  for (const row of rows(data, 'luot_xem')) {
    const ngay = dayKey(row.ngay);
    if (!ngay || ngay < start || ngay > end) continue;
    const key = JSON.stringify([ngay, row.kenh]);
    const group = groups.get(key) ?? { ngay, kenh: row.kenh, luot_xem: 0 };
    group.luot_xem += number(row.luot_xem);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.ngay.localeCompare(b.ngay) || String(a.kenh).localeCompare(String(b.kenh)));
}

export function topVideos(data, n = 10) {
  return [...rows(data, 'videos')].sort((a, b) => number(b.luot_xem) - number(a.luot_xem))
    .slice(0, Math.max(0, Math.floor(number(n))));
}

export function filterVideos(data, filters = {}) {
  const { kenh = '', trang_thai = '', from = '', to = '', search = '', dateField = 'ngay_tao', sortBy = 'ngay_tao', sortDir = 'desc' } = filters;
  const query = String(search).trim().toLocaleLowerCase('vi');
  const result = rows(data, 'videos').filter(row => {
    const date = dayKey(row[dateField]);
    return (!kenh || row.kenh === kenh) && (!trang_thai || row.trang_thai === trang_thai) &&
      (!from || (date && date >= from)) && (!to || (date && date <= to)) &&
      (!query || Object.values(row).some(value => String(value).toLocaleLowerCase('vi').includes(query)));
  });
  return result.sort((a, b) => {
    const comparison = NUMERIC.has(sortBy) ? number(a[sortBy]) - number(b[sortBy])
      : String(a[sortBy] ?? '').localeCompare(String(b[sortBy] ?? ''), 'vi', { numeric: true });
    return comparison * (sortDir === 'asc' ? 1 : -1);
  });
}

export function staleTasks(data, now = new Date()) {
  const thresholds = { 'Tạo video': 26, 'Duyệt và đăng': 3 };
  return rows(data, 'he_thong').map(row => {
    const thresholdHours = Object.hasOwn(thresholds, row.viec) ? thresholds[row.viec] : null;
    const time = row.lan_cuoi ? new Date(row.lan_cuoi).getTime() : NaN;
    const ageHours = Number.isFinite(time) ? (new Date(now).getTime() - time) / 3600000 : null;
    const health = ageHours === null || !Number.isFinite(ageHours) || ageHours < 0 ? 'unknown'
      : thresholdHours === null ? 'unmonitored' : ageHours > thresholdHours ? 'stale' : 'ok';
    return { ...row, ageHours, thresholdHours, stale: health === 'stale', health };
  });
}
