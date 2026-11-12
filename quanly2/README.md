# CrewReel — dashboard quản lý

HTML/CSS/JavaScript ES modules thuần, không build, không backend, không thư viện ngoài. Chỉ thêm tệp trong `quanly2/`; nguồn `quanly/data.json` và dashboard cũ được giữ nguyên.

## Chạy

Có thể bấm **Khám phá bản demo** để vào ngay, không cần nhập mật khẩu. Giao diện Studio mới dùng nền tối, sidebar, thẻ thống kê, biểu đồ SVG, tiến độ xuất bản, trạng thái tác vụ và bảng video có bộ lọc. Trên điện thoại điều hướng chuyển lên trên; bảng rộng cuộn ngang trong vùng riêng. Font hệ thống, icon SVG và hình minh họa CSS đều nội bộ, không tải tài nguyên ngoài.

Để xem thử: tích **Dùng dữ liệu giả**, nhập mật khẩu **`demo123`**, rồi bấm Đăng nhập. Có 36 video mẫu, 30 ngày thống kê, 3 kênh (ucl chưa có video) và các tác vụ đúng hạn/quá hạn. Ngày mẫu tự tính theo thời điểm mở, nên bộ lọc ngày luôn có dữ liệu. Banner trong app ghi rõ chế độ xem thử. Chế độ này không fetch nguồn thật; mật khẩu công khai chỉ dùng để xem dữ liệu giả, không mở dữ liệu thật. Bỏ tích để đăng nhập nguồn mã hóa bằng mật khẩu hiện tại. Đăng xuất xóa cả mật khẩu và lựa chọn chế độ; tải lại trang giữ chế độ trong `sessionStorage['crewreel.mode']`. Module `js/demo.js` cung cấp `loadDemo(password, now)`; dùng chung selectors/store/views với nguồn thật.

Trên GitHub Pages mở `/quanly2/`. Để chạy cục bộ, đứng tại gốc repo rồi chạy `python -m http.server 8000`, mở `http://localhost:8000/quanly2/`. Cần HTTPS hoặc localhost vì WebCrypto; mở trực tiếp bằng `file://` không hỗ trợ ES modules/fetch.

Mở `/quanly2/test.html` để xem PASS/FAIL. Fixture nhỏ được khai báo inline trong trang, không tải dữ liệu thật. Các test bao gồm selectors, header đảo vị trí, bảng/cột thiếu, ngày Việt Nam, ranh giới 7/14/30 ngày, ngưỡng stale, tính bất biến và mã hóa/giải mã mẫu đúng đặc tả (kèm sai mật khẩu và ciphertext bị sửa).

## Cấu trúc và luồng dữ liệu

```text
index.html             login, thanh điều hướng và 5 section
css/base.css           theme Studio, reset, responsive và các token màu
js/crypto.js           decrypt(envelope, password), chỉ WebCrypto
js/data.js             load, normalize, toObjects, selectors thuần
js/state.js            store nhỏ và subscribe/notify
js/views/shared.js     helper DOM semantic, gán nội dung bằng textContent
js/views/dom.js        tạo node bằng textContent, dùng chung cho bảng/biểu đồ
js/views/visuals.js    icon, thẻ số liệu, nhãn và biểu đồ SVG không dùng CDN
js/views/*.js          từng view export render(state, el)
js/app.js              đăng nhập, routing hash, timer, sự kiện bộ lọc
test.html              dataset giả inline và kết quả kiểm thử
js/tests.js            bộ kiểm thử dùng chung trình duyệt/Node
```

1. Nhập mật khẩu → `load(password, {signal})` GET `../quanly/data.json?t=<Date.now()>` tính từ trang. URL được resolve bằng `import.meta.url` để chạy cả Pages ở subpath. Fetch không dùng cache, không gửi credentials, không theo redirect.
2. `decrypt()` giải mã → `normalize()` chuyển bảng từ mảng sang object → `setState()` thông báo subscribers → `render(state, el)` cho các view.
3. Mật khẩu được lưu duy nhất trong `sessionStorage['crewreel.password']` sau khi giải mã thành công; không dùng localStorage, URL, log hoặc tệp. Mật khẩu chỉ tồn tại tạm trong bộ nhớ khi nhập/giải mã. Tải lại trang sẽ dùng lại phiên. Nếu storage bị chặn, dữ liệu vẫn xem được sau đăng nhập nhưng cần đăng nhập lại để làm mới.
4. Làm mới tự động mỗi 5 phút sau khi đăng nhập; nút “Làm mới” dùng cùng luồng. Chỉ một yêu cầu chạy tại một thời điểm. Lỗi refresh giữ dữ liệu thành công gần nhất với `data-state="error"` và thông báo rõ. `lastUpdated` là thời điểm tải thành công trên máy khách; `data.cap_nhat` là thời điểm cập nhật nguồn. Hiển thị cả hai, “N phút trước” tính từ `lastUpdated`.
5. Đăng xuất xóa mật khẩu phiên, input, data và nội dung DOM; hủy fetch, bỏ kết quả giải mã đang chạy và dừng timer refresh. Không có đăng nhập lại ngầm sau đăng xuất.

Sai mật khẩu dẫn tới AES-GCM `OperationError` → thông báo **Sai mật khẩu**. Ciphertext hỏng có thể tạo cùng lỗi xác thực; không thể phân biệt hai trường hợp bằng AES-GCM. Lỗi mạng/HTTP/schema được báo riêng.

## Hợp đồng dữ liệu

Không thay đổi định dạng nguồn:

```json
{"v":1,"kdf":"PBKDF2-SHA256","iter":310000,"salt":"<base64 16 byte>","iv":"<base64 12 byte>","ct":"<base64 ciphertext + tag>"}
```

Khóa PBKDF2 SHA-256: mật khẩu UTF-8, salt từ envelope, số vòng `iter` (nguồn hiện tại: 310000), khóa AES-GCM 256 bit, IV 12 byte và authentication tag 128 bit nằm cuối `ct`. Plaintext UTF-8 JSON:

```text
{cap_nhat: ISO có +07:00, bang: {kenh: [headers,...rows], videos: [...], luot_xem: [...], he_thong: [...]}}
```

Các header hiện tại:

- `kenh`: kenh, ten, youtube, facebook, tiktok, khung_gio, cho_duyet, cho_dang, da_dang, loi, tao_hom_nay, dang_hom_nay, tong_xem_yt, cap_nhat.
- `videos`: kenh, id, ngay_tao, ngay_dang, trang_thai, tieu_de, loai_khung, kieu, thoi_luong, youtube_url, luot_xem, thich, binh_luan, tiktok, loi_cuoi.
- `luot_xem`: ngay, kenh, video, nen_tang, luot_xem, thich, binh_luan.
- `he_thong`: viec, lan_cuoi, lich, ghi_chu.

`toObjects(table)` ánh xạ theo **tên header**, không cố định vị trí. Cột thêm được giữ; ô/cột thiếu dùng chuỗi rỗng hoặc 0 đối với header số đã biết. Bảng thiếu thành `[]`; các bảng không bắt buộc có dữ liệu. Số chuỗi chuyển thành số hữu hạn; rỗng, thiếu, NaN/Infinity thành 0. Header số: các metric của kênh, `thoi_luong`, `luot_xem`, `thich`, `binh_luan`. Nếu `thoi_luong` không phải số (ví dụ `01:30`) thì thành 0; nguồn nên gửi số theo đơn vị đang dùng. Trạng thái và các trường khác giữ nguyên, không suy diễn enum.

Tên kênh mặc định: `vi` = Mẹo AI Văn Phòng (TikTok), `en` = One Fact a Day (YouTube), `ucl` = Champions League. Không tạo hàng kênh giả khi nguồn không có hàng đó. Mã kênh khác vẫn hiển thị được.

## API selectors thuần

Tất cả nhận `data` **đã normalize** làm tham số đầu, không đọc store, DOM hoặc storage, không sửa dữ liệu gốc:

```js
summaryByChannel(data) // {channels: [...], totals: {...}} từ bảng kenh
dailyViews(data, range = 7, now = new Date()) // [{ngay, kenh, luot_xem}]
topVideos(data, n = 10) // mảng video sắp giảm theo lượt xem
filterVideos(data, filters = {}) // mảng đã lọc/sắp xếp
staleTasks(data, now = new Date()) // mọi tác vụ kèm health/stale/ageHours/thresholdHours
```

`dailyViews` gộp mọi nền tảng theo ngày/kênh, không cộng dồn bảng videos. Range hỗ trợ 7/14/30 **ngày lịch**, gồm ngày hiện tại và N−1 ngày trước theo UTC+07; bỏ ngày lỗi và tương lai, không tạo hàng 0 cho ngày thiếu. Tham số `now` giúp kiểm thử lặp lại được. Dashboard dùng ngày hiện tại thực tế, không neo vào nguồn cũ.

`filterVideos` hỗ trợ `kenh`, `trang_thai`, `from`, `to` (YYYY-MM-DD, gồm cả hai đầu), `search` (không phân biệt hoa/thường trên tất cả trường), `dateField` (`ngay_tao` mặc định hoặc `ngay_dang`), `sortBy` (bất kỳ tên cột), `sortDir` (`asc`/`desc`, mặc định desc). Khi có lọc ngày, video thiếu ngày bị loại. Tìm kiếm áp dụng khi nhấn Enter hoặc rời ô. Bảng giữ mọi cột tiêu chuẩn và cột bổ sung; bấm tiêu đề để đảo chiều sắp xếp.

`staleTasks`: tên tác vụ khớp chính xác `Tạo video` → quá **26 giờ**; `Duyệt và đăng` → quá **3 giờ**. Đúng ngưỡng vẫn `ok`. Ngày thiếu/sai/tương lai → `unknown`, tác vụ chưa cấu hình ngưỡng → `unmonitored`. Các giá trị `health`: `ok`, `stale`, `unknown`, `unmonitored`; hàng DOM có `data-health`. Thời gian nguồn cần có múi giờ để diễn giải nhất quán.

## State và view

Store: `{data, filters, lastUpdated, status, error}`. Dùng `getState()`, `setState(patch)`, `setFilters(patch)`, `subscribe(listener)` (trả hàm unsubscribe), `notify()`. Không sửa trực tiếp object state. `initialFilters()` tạo bộ lọc mới.

Mỗi section dùng `data-state="loading|ready|empty|error"`, cùng `aria-busy`, thông báo lỗi/không có dữ liệu. Login thêm trạng thái `idle`. View có thể render lại nhiều lần; DOM controls dùng event delegation ở app. Timestamp và sức khỏe tác vụ cập nhật mỗi phút, không fetch thêm.

Route/section: `#/tong-quan`, `#/luot-xem`, `#/top-video`, `#/video`, `#/he-thong`; hash lạ về tổng quan. Giữ `#login`, `#app`, id section và các hook `id`, `name`, `data-sort` khi thiết kế UI. Theme nằm trong `css/base.css`; đổi các biến `:root` để thay bảng màu. Biểu đồ hiển thị dữ liệu thật theo ngày, ngắt đường ở khoảng thiếu dữ liệu; rê vào từng điểm để đọc giá trị. Tổng quan dùng 7 ngày gần nhất; màn phân tích hỗ trợ 7/14/30 ngày. Không thêm chỉ số tăng trưởng giả.

## Thêm một view

1. Tạo `js/views/ten-view.js`, export `render(state, el)`; dùng selector thuần để chuẩn bị dữ liệu và `prepare`/`table` nếu phù hợp.
2. Thêm `<section id="ten-view" data-state="loading" hidden>` trong `main`, thêm link `#/ten-view` trong nav.
3. Import module trong `app.js`, thêm vào `routes`. Vòng lặp route tự render và ẩn/hiện section.
4. Nếu cần bộ lọc, thêm giá trị mặc định vào `initialFilters()`; control có `name` tương ứng sẽ được event delegation xử lý.
5. Thêm kiểm thử selector vào `runTests()` với fixture nhỏ và thời gian cố định.

Ứng dụng không gọi API YouTube/TikTok, không nhúng tài nguyên từ URL trong dữ liệu, không dùng CDN hay analytics. Ngoài tài nguyên HTML/CSS/JS nội bộ, chỉ fetch tệp dữ liệu đã chỉ định. CSP chặn script/style ngoài và form submission; việc bảo vệ dữ liệu dựa vào mã hóa nguồn, không phải việc giấu mã HTML trên GitHub Pages.
