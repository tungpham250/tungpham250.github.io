import { summaryByChannel, dailyViews, staleTasks, filterVideos } from '../data.js';
import { prepare, table, node } from './shared.js';
import { metric, panel, channelBadge, formatNumber, trendChart, progress, icon } from './visuals.js';
export function render(state, el) {
  if (!prepare(state, el, 'Tổng quan')) return;
  const { channels, totals } = summaryByChannel(state.data);
  if(!channels.length) {el.dataset.state=state.status==='ready'?'empty':state.status;el.append(node('p','Chưa có dữ liệu kênh.'));return;}
  const metrics=node('div');metrics.className='metrics-grid';
  metrics.append(
    metric('Tổng lượt xem YouTube',totals.tong_xem_yt,'Tổng lượt xem từ các kênh','eye'),
    metric('Video đã xuất bản',totals.da_dang,`${formatNumber(totals.dang_hom_nay)} video được đăng hôm nay`,'video','teal'),
    metric('Đang chờ duyệt',totals.cho_duyet,`${formatNumber(totals.cho_dang)} video đã sẵn sàng đăng`,'clock','amber'),
    metric('Video tạo hôm nay',totals.tao_hom_nay,`${channels.length} kênh trong không gian làm việc`,'activity','pink')
  );el.append(metrics);
  const grid=node('div');grid.className='overview-grid';
  const chart=panel('Lượt xem theo ngày','7 ngày gần nhất · Tổng hợp mọi nền tảng');
  const link=node('a','Xem phân tích ↗');link.href='#/luot-xem';link.className='text-link';chart.firstChild.append(link);
  trendChart(chart,dailyViews(state.data,7),7);grid.append(chart);
  const pipeline=panel('Tiến độ xuất bản','Hàng đợi nội dung của bạn');pipeline.classList.add('pipeline');
  const total=totals.cho_duyet+totals.cho_dang+totals.da_dang+totals.loi;
  for(const [label,key,tone,symbol] of [['Chờ duyệt','cho_duyet','amber','clock'],['Sẵn sàng đăng','cho_dang','purple','video'],['Đã xuất bản','da_dang','teal','check'],['Cần xử lý','loi','pink','alert']]) {
    const row=node('div');row.className=`pipeline-row tone-${tone}`;
    const heading=node('div');const name=node('span');name.append(icon(symbol),document.createTextNode(label));heading.append(name,node('strong',formatNumber(totals[key])));
    row.append(heading,progress(totals[key],total,label));pipeline.append(row);
  }
  const queueLink=node('a','Mở thư viện video →');queueLink.href='#/video';queueLink.className='pipeline-link';pipeline.append(queueLink);grid.append(pipeline);el.append(grid);
  const sectionHeading=node('div');sectionHeading.className='section-heading';sectionHeading.append(node('h3','Các kênh của bạn'),node('span',`${channels.length} kênh kết nối`));el.append(sectionHeading);
  const channelGrid=node('div');channelGrid.className='channels-grid';
  for(const channel of channels) {
    const card=node('article');card.className='channel-card';card.dataset.channel=channel.kenh;
    const head=node('div');head.className='channel-card-heading';const name=node('div');name.append(node('h4',channel.ten),node('p',channel.kenh==='vi'?'TikTok':channel.kenh==='en'?'YouTube':channel.kenh));head.append(channelBadge(channel.kenh),name);
    card.append(head);
    const count=node('div');count.className='channel-count';count.append(node('strong',formatNumber(channel.da_dang)),node('span','video đã xuất bản'));card.append(count);
    const views=node('p',`${formatNumber(channel.tong_xem_yt)} lượt xem YouTube`);views.className='channel-views';card.append(views);
    const stats=node('dl');for(const [label,key] of [['Chờ duyệt','cho_duyet'],['Chờ đăng','cho_dang'],['Có lỗi','loi']]){const stat=node('div');stat.append(node('dt',label),node('dd',formatNumber(channel[key])));stats.append(stat);}card.append(stats);
    const today=node('p',`Hôm nay: ${formatNumber(channel.tao_hom_nay)} video tạo · ${formatNumber(channel.dang_hom_nay)} video đăng`);today.className='channel-today';card.append(today);
    const schedule=node('p',`Khung giờ đăng: ${channel.khung_gio || 'Chưa thiết lập'}`);schedule.className='channel-schedule';card.append(schedule);channelGrid.append(card);
  }el.append(channelGrid);
  const lower=node('div');lower.className='overview-grid';
  const recent=panel('Nội dung gần đây','Video mới được tạo trong hệ thống');
  const all=node('a','Tất cả video ↗');all.href='#/video';all.className='text-link';recent.firstChild.append(all);
  table(recent,filterVideos(state.data).slice(0,5),[['tieu_de','Tiêu đề video'],['kenh','Kênh'],['trang_thai','Trạng thái']],'5 video được tạo gần đây');lower.append(recent);
  const health=panel('Nhịp hệ thống','Trạng thái các tác vụ tự động');
  const healthLabels={ok:'Đúng hạn',stale:'Cần kiểm tra',unknown:'Chưa rõ',unmonitored:'Chưa đặt ngưỡng'};
  for(const task of staleTasks(state.data)) {
    const row=node('div');row.className='task-mini';row.dataset.health=task.health;
    const copy=node('div');copy.append(node('strong',task.viec),node('small',task.ageHours===null?'Chưa có lần chạy':`${Math.max(0,task.ageHours).toFixed(1)} giờ từ lần chạy cuối`));
    const badge=node('span',healthLabels[task.health]);badge.className='status-badge';badge.dataset.status=task.health;row.append(copy,badge);health.append(row);
  }
  const healthLink=node('a','Chi tiết hệ thống →');healthLink.href='#/he-thong';healthLink.className='pipeline-link';health.append(healthLink);lower.append(health);el.append(lower);
}
