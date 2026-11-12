import { staleTasks } from '../data.js';
import { prepare, table, node } from './shared.js';
import { metric } from './visuals.js';
export function render(state, el) {
  if (!prepare(state, el, 'Hệ thống')) return;
  const labels = { stale: 'Quá hạn', ok: 'Đúng hạn', unknown: 'Thiếu hoặc sai thời gian', unmonitored: 'Chưa đặt ngưỡng' };
  const tasks = staleTasks(state.data).map(row => ({ ...row, tinh_trang: labels[row.health],
    so_gio: row.ageHours === null ? '' : row.ageHours.toFixed(1) }));
  const stats=node('div');stats.className='metrics-grid health-metrics';
  stats.append(metric('Tác vụ theo dõi',tasks.length,'Tổng số tác vụ trong hệ thống','activity'),metric('Đang đúng hạn',tasks.filter(t=>t.health==='ok').length,'Theo ngưỡng thời gian đã thiết lập','check','teal'),metric('Cần kiểm tra',tasks.filter(t=>t.health==='stale'||t.health==='unknown').length,'Quá hạn hoặc thiếu thời gian chạy','alert','amber'));el.append(stats);
  table(el, tasks, [['viec', 'Công việc'], ['lan_cuoi', 'Lần cuối'], ['lich', 'Lịch'], ['ghi_chu', 'Ghi chú'], ['so_gio', 'Số giờ từ lần cuối'], ['thresholdHours', 'Ngưỡng giờ'], ['tinh_trang', 'Tình trạng']], 'Sức khỏe tác vụ');
}
