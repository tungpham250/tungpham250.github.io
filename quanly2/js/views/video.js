import { CHANNELS, filterVideos } from '../data.js';
import { prepare, table, select, input, node, columnLabel } from './shared.js';
import { STATUS_LABELS } from './visuals.js';
const STANDARD = ['kenh', 'id', 'ngay_tao', 'ngay_dang', 'trang_thai', 'tieu_de', 'loai_khung', 'kieu', 'thoi_luong', 'youtube_url', 'luot_xem', 'thich', 'binh_luan', 'tiktok', 'loi_cuoi'];
export function render(state, el) {
  const ready = prepare(state, el, 'Video');
  const filters = state.filters, records = state.data?.bang.videos ?? [];
  const controls = node('fieldset'); controls.append(node('legend', 'Bộ lọc video'));
  const codes = [...new Set([...Object.keys(CHANNELS), ...records.map(row => row.kenh)])].filter(Boolean);
  select(controls, 'Kênh', 'kenh', [['', 'Tất cả'], ...codes.map(code => [code, CHANNELS[code] || code])], filters.kenh);
  select(controls, 'Trạng thái', 'trang_thai', [['', 'Tất cả'], ...[...new Set(records.map(row => row.trang_thai))].filter(Boolean).sort().map(value => [value, STATUS_LABELS[value] || value])], filters.trang_thai);
  select(controls, 'Lọc theo ngày', 'dateField', [['ngay_tao', 'Ngày tạo'], ['ngay_dang', 'Ngày đăng']], filters.dateField);
  input(controls, 'Từ ngày', 'from', 'date', filters.from);
  input(controls, 'Đến ngày', 'to', 'date', filters.to);
  const search=input(controls, 'Tìm kiếm video', 'search', 'search', filters.search);search.placeholder='Tiêu đề, ID, nội dung…';search.title='Nhấn Enter hoặc rời ô để tìm kiếm';
  const reset = node('button', 'Xóa bộ lọc'); reset.type = 'button'; reset.dataset.resetFilters = ''; controls.append(reset);
  el.append(controls);
  if (filters.from && filters.to && filters.from > filters.to) el.append(node('p', 'Từ ngày phải trước hoặc bằng đến ngày.'));
  if (!ready) return;
  const order=['tieu_de','kenh','trang_thai','luot_xem','ngay_tao',...STANDARD];
  const columns = [...new Set([...order, ...records.flatMap(Object.keys)])].map(key => [key, columnLabel(key)]);
  const filtered=filterVideos(state.data,filters);
  const count=node('p',`${filtered.length} / ${records.length} video · Bấm tiêu đề cột để sắp xếp`);count.className='results-count';el.append(count);
  table(el, filtered, columns, 'Thư viện nội dung', filters);
}
