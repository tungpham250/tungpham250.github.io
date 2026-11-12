import { CHANNELS, dayKey, normalize } from './data.js';

// Public sample data only. This password never unlocks the real encrypted source.
export const DEMO_PASSWORD = 'demo123';
export async function loadDemo(password, now = new Date()) {
  if (password !== DEMO_PASSWORD) throw new DOMException('Sai mật khẩu', 'OperationError');
  const ago = hours => new Date(now.getTime() - hours * 3600000).toISOString();
  const asTable = (headers, records) => [headers, ...records.map(record => headers.map(key => record[key] ?? ''))];
  const statuses = ['da_dang', 'da_dang', 'cho_duyet', 'cho_dang', 'loi', 'da_dang'];
  const titles = ['Mẹo Excel tiết kiệm thời gian', 'Một sự thật thú vị về vũ trụ', 'Tóm tắt văn bản bằng AI', 'Why the ocean looks blue', 'Tạo slide tự động', 'A surprising fact about nature'];
  const videos = Array.from({ length: 36 }, (_, index) => {
    const trang_thai = statuses[index % statuses.length];
    const published = trang_thai === 'da_dang';
    return {
      kenh: index % 2 ? 'en' : 'vi', id: `demo-${String(index + 1).padStart(3, '0')}`,
      ngay_tao: ago(index * 18 + 1), ngay_dang: published ? ago(index * 18) : '',
      trang_thai, tieu_de: `${titles[index % titles.length]} #${index + 1}`,
      loai_khung: '9:16', kieu: 'short', thoi_luong: 30 + index % 31,
      youtube_url: '', luot_xem: published ? (index + 1) * 137 : 0,
      thich: published ? (index + 1) * 9 : 0, binh_luan: published ? index + 1 : 0,
      tiktok: '', loi_cuoi: trang_thai === 'loi' ? 'Lỗi render mẫu — đang chờ thử lại' : ''
    };
  });
  const daily = [];
  for (let day = 0; day < 30; day++) {
    for (const kenh of ['vi', 'en']) {
      for (const nen_tang of ['youtube', 'tiktok']) {
        const luot_xem = (30 - day) * (kenh === 'vi' ? 41 : 67) + (nen_tang === 'tiktok' ? 120 : 0);
        daily.push({ ngay: dayKey(ago(day * 24)), kenh, video: '', nen_tang,
          luot_xem, thich: Math.floor(luot_xem / 12), binh_luan: Math.floor(luot_xem / 100) });
      }
    }
  }
  const channels = Object.entries(CHANNELS).map(([kenh, ten]) => {
    const own = videos.filter(video => video.kenh === kenh);
    const count = status => own.filter(video => video.trang_thai === status).length;
    return { kenh, ten, youtube: '', facebook: '', tiktok: '', khung_gio: '08:00, 12:00, 19:00',
      cho_duyet: count('cho_duyet'), cho_dang: count('cho_dang'), da_dang: count('da_dang'), loi: count('loi'),
      tao_hom_nay: own.filter(video => dayKey(video.ngay_tao) === dayKey(now)).length,
      dang_hom_nay: own.filter(video => dayKey(video.ngay_dang) === dayKey(now)).length,
      tong_xem_yt: own.reduce((sum, video) => sum + video.luot_xem, 0), cap_nhat: now.toISOString() };
  });
  return normalize({ cap_nhat: now.toISOString(), bang: {
    kenh: asTable(['kenh', 'ten', 'youtube', 'facebook', 'tiktok', 'khung_gio', 'cho_duyet', 'cho_dang', 'da_dang', 'loi', 'tao_hom_nay', 'dang_hom_nay', 'tong_xem_yt', 'cap_nhat'], channels),
    videos: asTable(['kenh', 'id', 'ngay_tao', 'ngay_dang', 'trang_thai', 'tieu_de', 'loai_khung', 'kieu', 'thoi_luong', 'youtube_url', 'luot_xem', 'thich', 'binh_luan', 'tiktok', 'loi_cuoi'], videos),
    luot_xem: asTable(['ngay', 'kenh', 'video', 'nen_tang', 'luot_xem', 'thich', 'binh_luan'], daily),
    he_thong: asTable(['viec', 'lan_cuoi', 'lich', 'ghi_chu'], [
      { viec: 'Tạo video', lan_cuoi: ago(1), lich: 'Mỗi ngày', ghi_chu: 'Dữ liệu giả: tác vụ đúng hạn' },
      { viec: 'Duyệt và đăng', lan_cuoi: ago(4), lich: 'Mỗi giờ', ghi_chu: 'Dữ liệu giả: tác vụ quá hạn' },
      { viec: 'Đồng bộ thống kê', lan_cuoi: ago(0.5), lich: 'Mỗi giờ', ghi_chu: 'Dữ liệu giả: chưa cấu hình ngưỡng' }
    ])
  } });
}
