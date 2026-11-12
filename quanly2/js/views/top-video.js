import { topVideos } from '../data.js';
import { prepare, table, node } from './shared.js';
import { channelBadge, formatNumber, progress } from './visuals.js';
export function render(state, el) {
  if (!prepare(state, el, 'Top video')) return;
  const records=topVideos(state.data,10);
  if(records.length) {
    const leaders=node('div');leaders.className='leaders-grid';
    records.slice(0,3).forEach((video,index)=>{
      const card=node('article');card.className='leader-card';const header=node('div');header.className='leader-heading';header.append(node('span',`#${index+1}`),channelBadge(video.kenh));card.append(header,node('h3',video.tieu_de));
      const count=node('p');count.append(node('strong',formatNumber(video.luot_xem)),document.createTextNode(' lượt xem'));card.append(count,progress(video.luot_xem,Math.max(1,records[0].luot_xem),'Lượt xem so với video dẫn đầu'));leaders.append(card);
    });el.append(leaders);
  }
  table(el, records, [['kenh', 'Kênh'], ['id', 'ID'], ['tieu_de', 'Tiêu đề'], ['luot_xem', 'Lượt xem'], ['youtube_url', 'URL YouTube']], '10 video có lượt xem cao nhất');
}
