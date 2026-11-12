import { CHANNELS, number } from '../data.js';
import { node } from './dom.js';

export const formatNumber = value => new Intl.NumberFormat('vi-VN').format(number(value));
export const compactNumber = value => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(number(value));
export const STATUS_LABELS = { da_dang: 'Đã đăng', cho_duyet: 'Chờ duyệt', cho_dang: 'Chờ đăng', loi: 'Có lỗi' };
export const LABELS = { kenh:'Kênh', id:'ID video', ngay_tao:'Ngày tạo', ngay_dang:'Ngày đăng', trang_thai:'Trạng thái', tieu_de:'Tiêu đề video', loai_khung:'Khung hình', kieu:'Loại', thoi_luong:'Thời lượng', youtube_url:'YouTube', luot_xem:'Lượt xem', thich:'Lượt thích', binh_luan:'Bình luận', tiktok:'TikTok', loi_cuoi:'Lỗi gần nhất' };
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, text) => {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  return el;
};
const PATHS = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  chart:'M4 4v16h17 M8 15l4-5 4 2 5-7',
  award:'M8 3h8v8l-4 3-4-3z M8 5H4v3l4 2 M16 5h4v3l-4 2 M12 14v6 M8 21h8',
  video:'M3 5h18v14H3z M10 9l5 3-5 3z',
  activity:'M2 12h5l3-8 4 16 3-8h5',
  logout:'M9 4H4v16h5 M13 8l5 4-5 4 M8 12h12',
  refresh:'M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0 1 14-2l1 6 M19 16a8 8 0 0 1-14 2l-1-6',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
  check:'M5 12l4 4L19 6',
  alert:'M12 3L2 21h20z M12 9v5 M12 17v1'
};
export function icon(name) {
  const el = svg('svg', { viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.65, 'stroke-linecap':'round', 'stroke-linejoin':'round', 'aria-hidden':'true', class:'icon' });
  el.append(svg('path', { d: PATHS[name] || PATHS.video })); return el;
}
export function channelBadge(code) {
  const el = node('span'); el.className = 'channel-badge'; el.dataset.channel = code;
  el.title = CHANNELS[code] || code; el.textContent = code === 'vi' ? 'AI' : code === 'en' ? 'OF' : String(code || '—').toUpperCase(); return el;
}
export function panel(title, subtitle) {
  const el = node('article'); el.className = 'panel';
  const head = node('div'); head.className = 'panel-heading';
  const copy = node('div'); copy.append(node('h3', title)); if (subtitle) copy.append(node('p', subtitle));
  head.append(copy); el.append(head); return el;
}
export function metric(label, value, detail, symbol, tone = 'purple') {
  const el = node('article'); el.className = `metric metric-${tone}`;
  const head = node('div'); head.className = 'metric-heading'; head.append(node('span', label), icon(symbol));
  el.append(head, node('strong', formatNumber(value)), node('p', detail)); return el;
}
export function trendChart(el, records, range) {
  if (!records.length) { const empty=node('p','Chưa có lượt xem trong khoảng thời gian này.'); empty.className='empty-message'; el.append(empty); return; }
  const groups = new Map();
  for (const row of records) { if(!groups.has(row.kenh)) groups.set(row.kenh, new Map()); groups.get(row.kenh).set(row.ngay,row.luot_xem); }
  const dates = [...new Set(records.map(row=>row.ngay))].sort();
  const max = Math.max(1,...records.map(row=>number(row.luot_xem))) * 1.15;
  const mobile=window.matchMedia('(max-width:720px)').matches;
  const w=mobile?400:760, h=240, left=46, right=18, top=16, bottom=34;
  const plotW=w-left-right, plotH=h-top-bottom;
  const graph=svg('svg',{ viewBox:`0 0 ${w} ${h}`, class:'trend-chart', role:'img', 'aria-label':`Lượt xem theo kênh trong ${range} ngày. Ngày không có số liệu được ngắt đường biểu diễn.` });
  graph.append(svg('title',{},`Lượt xem theo ngày trong ${range} ngày`));
  for(let i=0;i<=4;i++) {
    const y=top+plotH*i/4;
    graph.append(svg('line',{x1:left,y1:y,x2:w-right,y2:y,class:'chart-grid'}),svg('text',{x:left-10,y:y+4,'text-anchor':'end',class:'chart-label'},compactNumber(max*(1-i/4))));
  }
  const start = new Date(`${dates[0]}T00:00:00Z`).getTime();
  const end = new Date(`${dates.at(-1)}T00:00:00Z`).getTime();
  const xAt = date => left + (end===start ? plotW/2 : (Date.parse(`${date}T00:00:00Z`)-start)/(end-start)*plotW);
  const colors=['#ab93ff','#63c9d6','#edb974','#e48eaa'];
  let groupIndex=0;
  const legend=node('div'); legend.className='chart-legend';
  for(const [code,values] of groups) {
    const seriesIndex=code==='vi'?0:code==='en'?1:code==='ucl'?2:groupIndex%colors.length;
    const color=colors[seriesIndex];
    let path='', previous=null;
    for(const date of dates) {
      if(!values.has(date)) {previous=null; continue;}
      const time=Date.parse(`${date}T00:00:00Z`), x=xAt(date), y=top+plotH*(1-values.get(date)/max);
      const contiguous=previous!==null && time-previous===86400000;
      path+=`${contiguous?' L':' M'}${x},${y}`; previous=time;
      const point=svg('circle',{cx:x,cy:y,r:3,fill:color}); point.append(svg('title',{},`${date} · ${CHANNELS[code]||code}: ${formatNumber(values.get(date))} lượt xem`)); graph.append(point);
    }
    graph.append(svg('path',{d:path,fill:'none',stroke:color,'stroke-width':2.5,'stroke-linecap':'round','stroke-linejoin':'round'}));
    const item=node('span'); item.className=`legend-item series-${seriesIndex}`; item.append(node('i'),node('span',CHANNELS[code]||code));legend.append(item);groupIndex++;
  }
  const step=Math.max(1,Math.ceil(dates.length/(mobile?4:7)));
  dates.filter((_,index)=>index%step===0 || index===dates.length-1).forEach(date=>graph.append(svg('text',{x:xAt(date),y:h-7,'text-anchor':'middle',class:'chart-label'},`${date.slice(8)}/${date.slice(5,7)}`)));
  el.append(graph,legend);
}
export function progress(value, max, label) {
  const el=node('progress'); el.max=Math.max(1,max);el.value=value;el.setAttribute('aria-label',label);return el;
}
