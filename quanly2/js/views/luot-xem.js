import { dailyViews } from '../data.js';
import { prepare, select, table } from './shared.js';
import { trendChart, panel, formatNumber } from './visuals.js';
export function render(state, el) {
  const ready = prepare(state, el, 'Lượt xem');
  select(el, 'Khoảng thời gian', 'range', [7, 14, 30].map(n => [n, `${n} ngày`]), state.filters.range);
  if (ready) {
    const records=dailyViews(state.data,state.filters.range);
    const chart=panel('Hiệu suất nội dung',`${state.filters.range} ngày gần nhất · ${formatNumber(records.reduce((sum,row)=>sum+row.luot_xem,0))} lượt xem`);
    trendChart(chart,records,state.filters.range);el.append(chart);
    if(!records.length && state.status==='ready') el.dataset.state='empty';
    table(el, records, [['ngay', 'Ngày'], ['kenh', 'Kênh'], ['luot_xem', 'Lượt xem']], 'Tổng lượt xem mỗi ngày theo kênh (mọi nền tảng)');
  }
}
