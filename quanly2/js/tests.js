import { normalize, toObjects, summaryByChannel, dailyViews, topVideos, filterVideos, staleTasks, dayKey, number } from './data.js';
import { decrypt } from './crypto.js';

/** Shared by test.html and Node; crypto test generates a real spec-compliant envelope. */
export async function runTests(raw) {
  const results = [], data = normalize(raw), now = new Date(raw.cap_nhat);
  const check = async (name, test) => {
    try { if (!await test()) throw new Error('Kết quả không đúng'); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const before = JSON.stringify(data);
  await check('Ánh xạ theo header đảo vị trí, giữ cột lạ', () => data.bang.kenh[0].kenh === 'vi' && data.bang.kenh[0].extra === 'giữ lại');
  await check('Thiếu bảng/cột và hàng không hợp lệ', () => normalize({ bang: {} }).bang.videos.length === 0 && toObjects([['id', 'thich'], ['a'], null])[0].thich === 0);
  await check('Số chuỗi, rỗng, NaN, Infinity đều an toàn', () => number('100') === 100 && ['', undefined, 'bad', Infinity].every(v => number(v) === 0));
  await check('Tổng kênh và tên kênh mặc định', () => {
    const result = summaryByChannel(data);
    return result.totals.tong_xem_yt === 300 && result.totals.cho_duyet === 2 && result.channels[0].ten === 'Mẹo AI Văn Phòng';
  });
  await check('Lượt xem gộp ngày/kênh, mọi nền tảng', () => dailyViews(data, 7, now).find(row => row.ngay === '2026-11-11' && row.kenh === 'vi').luot_xem === 30);
  await check('Khoảng 7 ngày gồm ngày đầu, bỏ tương lai và ngày lỗi', () => dailyViews(data, 7, now).length === 3);
  await check('Khoảng 14 và 30 ngày đúng ranh giới', () => dailyViews(data, 14, now).length === 5 && dailyViews(data, 30, now).length === 6);
  await check('Đổi timestamp sang ngày Việt Nam', () => dayKey('2026-11-10T18:00:00Z') === '2026-11-11' && dayKey('2026-02-30') === '');
  await check('Top video sắp xếp số, giới hạn n', () => topVideos(data, 2).map(row => row.id).join() === 'b,a' && topVideos(data, 0).length === 0);
  await check('Bộ lọc kết hợp kênh/trạng thái/ngày/text', () => filterVideos(data, { kenh: 'vi', trang_thai: 'cho_duyet', from: '2026-11-10', to: '2026-11-10', search: 'MẸO' })[0]?.id === 'a');
  await check('Lọc theo ngày đăng, bỏ ngày trống', () => filterVideos(data, { dateField: 'ngay_dang', from: '2026-11-11', to: '2026-11-11' }).map(row => row.id).join() === 'b');
  await check('Sắp xếp mọi cột, kể cả cột bổ sung', () => filterVideos(data, { sortBy: 'luot_xem', sortDir: 'asc' })[0].id === 'c' && filterVideos(data, { sortBy: 'id', sortDir: 'desc' })[0].id === 'c');
  await check('Ngưỡng stale dùng >26h và >3h, không dùng >=', () => {
    const result = staleTasks(data, now);
    return result[0].stale && !result[1].stale && result[4].stale && !result[5].stale;
  });
  await check('Task thiếu ngày, ngày tương lai và chưa đặt ngưỡng', () => {
    const result = staleTasks(data, now);
    return result[2].health === 'unmonitored' && result[3].health === 'unknown' && result[6].health === 'unknown';
  });
  await check('Selectors không sửa dataset gốc', () => before === JSON.stringify(data));
  await check('Dataset rỗng có kết quả rỗng và tổng bằng 0', () => topVideos(null).length === 0 && filterVideos(null).length === 0 && staleTasks(null).length === 0 && dailyViews(null).length === 0 && summaryByChannel(null).totals.da_dang === 0);
  let envelope;
  const password = 'mật khẩu kiểm thử 🔐';
  await check('Giải mã mẫu PBKDF2 310000 / AES-256-GCM đúng đặc tả', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 310000 }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(raw))));
    const b64 = value => btoa(String.fromCharCode(...value));
    envelope = { v: 1, kdf: 'PBKDF2-SHA256', iter: 310000, salt: b64(salt), iv: b64(iv), ct: b64(encrypted) };
    return JSON.stringify(await decrypt(envelope, password)) === JSON.stringify(raw);
  });
  await check('Sai mật khẩu trả về OperationError', async () => {
    try { await decrypt(envelope, 'sai'); return false; } catch (error) { return error.name === 'OperationError'; }
  });
  await check('Ciphertext bị sửa không thể giải mã', async () => {
    const ct = atob(envelope.ct); const changed = btoa(String.fromCharCode(ct.charCodeAt(0) ^ 1) + ct.slice(1));
    try { await decrypt({ ...envelope, ct: changed }, password); return false; } catch (error) { return error.name === 'OperationError'; }
  });
  return results;
}

if (typeof document !== 'undefined') {
  try {
    const results = await runTests(JSON.parse(document.getElementById('fixture').textContent));
    for (const result of results) {
      const li = document.createElement('li'); li.dataset.result = result.pass ? 'pass' : 'fail';
      li.textContent = `${result.pass ? 'PASS' : 'FAIL'} — ${result.name}${result.error ? `: ${result.error}` : ''}`;
      document.getElementById('results').append(li);
    }
    const failed = results.filter(result => !result.pass).length;
    document.getElementById('result').textContent = `${results.length - failed}/${results.length} PASS; ${failed} FAIL`;
    document.body.dataset.state = failed ? 'error' : 'ready';
  } catch (error) {
    document.body.dataset.state = 'error'; document.getElementById('result').textContent = `FAIL — ${error.message}`;
  }
}
