import { formatNumber, channelBadge, STATUS_LABELS, LABELS } from './visuals.js';
import { node } from './dom.js';
export { node } from './dom.js';
const descriptions = {
  'Tổng quan':'Nắm nhịp vận hành, theo dõi từng kênh và sẵn sàng cho video tiếp theo.',
  'Lượt xem':'Theo dõi sức hút của nội dung qua từng ngày, trên mọi nền tảng.',
  'Top video':'Những nội dung đang mang về nhiều lượt xem nhất cho các kênh của bạn.',
  'Video':'Tất cả nội dung, từ bản nháp đầu tiên đến video đã xuất bản.',
  'Hệ thống':'Theo dõi lịch chạy và phát hiện các tác vụ cần được chú ý.'
};
/** All data enters textContent, never HTML. No external URL is fetched or embedded. */
export function prepare(state, el, title) {
  el.replaceChildren(node('h2', title));
  const description=node('p',descriptions[title] || '');description.className='view-description';el.append(description);
  el.dataset.state = state.status === 'error' ? 'error' : state.status === 'loading' ? 'loading' : 'ready';
  el.setAttribute('aria-busy', String(state.status === 'loading'));
  if (state.status === 'loading') el.append(node('p', 'Đang tải dữ liệu…'));
  if (state.status === 'error') {
    const error = node('p', state.error || 'Không tải được dữ liệu.');
    error.setAttribute('role', 'alert'); el.append(error);
    if (state.data) el.append(node('p', 'Đang hiển thị dữ liệu đã tải trước đó.'));
  }
  return Boolean(state.data);
}
export function table(el, records, columns, caption, { sortBy, sortDir } = {}) {
  if (!records.length) {
    if (el.dataset.state === 'ready') el.dataset.state = 'empty';
    const message=node('p', 'Chưa có dữ liệu phù hợp. Hãy thử thay đổi bộ lọc hoặc làm mới dữ liệu.');message.className='empty-message';el.append(message);
    return;
  }
  const wrapper = node('div'); wrapper.className = 'table-scroll';wrapper.tabIndex=0;wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label',caption);
  const table = node('table'); table.append(node('caption', caption));
  const head = node('thead'), header = node('tr');
  for (const [key, label] of columns) {
    const th = node('th'); th.scope = 'col';
    if (sortBy !== undefined) {
      th.setAttribute('aria-sort', sortBy === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      const button = node('button', label); button.type = 'button'; button.dataset.sort = key;button.title=`Sắp xếp theo ${label}`; th.append(button);
    } else th.textContent = label;
    header.append(th);
  }
  head.append(header); table.append(head);
  const body = node('tbody');
  for (const record of records) {
    const tr = node('tr');
    if (record.health) tr.dataset.health = record.health;
    for (const [key] of columns) {
      const cell=node('td');cell.dataset.column=key;
      const value=record[key] ?? '';
      if(key==='kenh') cell.append(channelBadge(value));
      else if(key==='trang_thai' || key==='tinh_trang') {
        const badge=node('span',STATUS_LABELS[value] || value);badge.className='status-badge';badge.dataset.status=record.health || value;cell.append(badge);
      } else if(['luot_xem','thich','binh_luan','cho_duyet','cho_dang','da_dang','loi','tao_hom_nay','dang_hom_nay','tong_xem_yt'].includes(key)) {cell.className='numeric';cell.textContent=formatNumber(value);}
      else if(['ngay_tao','ngay_dang','lan_cuoi'].includes(key) && value && Number.isFinite(Date.parse(value))) {
        const time=node('time',new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}));time.dateTime=new Date(value).toISOString();cell.append(time);
      } else cell.textContent=value === '' ? '—' : String(value);
      tr.append(cell);
    }
    body.append(tr);
  }
  table.append(body); wrapper.append(table); el.append(wrapper);
}
export const columnLabel = key => LABELS[key] || key;
export function select(el, label, name, values, selected) {
  const wrapper = node('label', `${label} `), input = node('select'); input.name = name;
  for (const [value, text] of values) {
    const option = node('option', text); option.value = value; input.append(option);
  }
  input.value = String(selected); wrapper.append(input); el.append(wrapper); return input;
}
export function input(el, label, name, type, value) {
  const wrapper = node('label', `${label} `), control = node('input');
  control.name = name; control.type = type; control.value = value; wrapper.append(control); el.append(wrapper); return control;
}
