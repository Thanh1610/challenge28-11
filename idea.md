🎯 TÓM TẮT MỤC TIÊU

Tự động lấy email Gmail đã gắn sao (flagged/starred) → tạo task trong Notion → theo dõi trạng thái xử lý.

---

🏗️ 1. Kiến trúc & stack

```
mail-to-task/
├── src/
│   ├── gmail.ts          # OAuth + đọc email gắn sao
│   ├── notion.ts         # Ghi page vào database Notion
│   ├── sync.ts           # Pipeline Gmail → Notion
│   └── types.ts
├── src/lib/env.ts        # helper đọc biến môi trường
├── index.ts              # entry point, chạy sync()
├── tsconfig.json         # cấu hình TS (ts-node)
├── package.json
├── .env / .env.example
└── token.json            # sinh sau lần OAuth đầu tiên
```

- Ngôn ngữ: TypeScript + `ts-node`.
- Thư viện chính: `googleapis`, `@google-cloud/local-auth`, `@notionhq/client`, `dotenv`.

---

🔐 2. Setup Gmail API 

1. Vào https://console.cloud.google.com/ → chọn/tạo project.
2. Enable **Gmail API**.
3. Vào **OAuth consent screen** → type “External”, publish ở trạng thái testing.
4. Add chính tài khoản của bạn vào mục **Test users** (nếu không sẽ bị 403 khi auth).
5. Tạo OAuth Client ID → chọn *Desktop App* → tải `credentials.json` và đặt ở root repo.
6. Chạy `npm install` (đã bao gồm googleapis/local-auth).
7. Lần đầu chạy `npx ts-node index.ts`:
   - Script log URL OAuth → mở trình duyệt, đăng nhập, copy `code=`.
   - Dán code vào terminal → tool sinh `token.json` để reuse những lần sau.

---

🗂️ 3. Setup Notion API

1. Tạo integration tại https://www.notion.so/my-integrations → copy **Internal Integration Secret** → `NOTION_TOKEN`.
2. Tạo database mới (cùng workspace) với các property:

| Name      | Type      | Ghi chú                                  |
|-----------|-----------|------------------------------------------|
| Title     | Title     | Giữ nguyên tên “Title”                   |
| Email     | Text      | Lưu snippet nội dung email               |
| From      | Text      | Địa chỉ người gửi                        |
| Summary   | Text      | Tóm tắt AI (hoặc snippet nếu chưa bật AI)|
| Processed | Checkbox  | Đánh dấu đã xử lý (mặc định false)       |

3. Share database cho integration “MailToTask Automation” với quyền *Can edit*.
4. Lấy `NOTION_DATABASE_ID`: copy chuỗi 32 ký tự trong URL (không kèm `?v=`).

---

📌 4. Biến môi trường (`.env`)

```
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
GMAIL_REDIRECT_URI=http://localhost
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- `.env` đặt ở root, đã được `.gitignore`.
- Có thể thêm `.env.example` để chia sẻ template.

---

🧑‍💻 6. Cách chạy sync

1. Đảm bảo `credentials.json`, `.env`, `token.json` (sau lần auth đầu) đều nằm ở root.
2. `npx ts-node index.ts`
   - Lần đầu: nhập OAuth code → sinh `token.json`.
   - Các lần sau: script tự sử dụng token refresh.
3. Log hiển thị `Found X starred emails` và từng dòng `Creating task for: ...`.
4. Mở Notion → kiểm tra các page mới sinh ra với đúng cột dữ liệu.

---

🔁 6. Cron / Automation (tuỳ chọn)

Tạo workflow GitHub Actions `mail-to-notion.yml`:

```yaml
name: Mail to Notion Sync
on:
  schedule:
    - cron: "*/30 * * * *"
  workflow_dispatch:
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npx ts-node index.ts
        env:
          GMAIL_CLIENT_ID: ${{ secrets.GMAIL_CLIENT_ID }}
          GMAIL_CLIENT_SECRET: ${{ secrets.GMAIL_CLIENT_SECRET }}
          GMAIL_REDIRECT_URI: ${{ secrets.GMAIL_REDIRECT_URI }}
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
```

Khi chạy trên cloud, cần upload `credentials.json` & `token.json` lên secret hoặc viết bước sinh token bằng service account (ngoài phạm vi MVP).

---

🎥 7. Demo script (1–2 phút)

1. Mở Gmail → gắn sao 1 email demo.
2. Terminal: `npx ts-node index.ts`.
3. Quan sát log “Creating task…”.
4. Mở Notion:
   - Cho thấy bảng `MailToTask Automation` đã có title, snippet, from, summary.
   - Tick checkbox `Processed` nếu đã hoàn thành.
5. (Nếu bật AI) nhấn mạnh cột Summary chỉ mất vài giây để đọc.

---

📝 8. Reflection / Lợi ích

- Trước đây: đọc email quan trọng, copy/paste sang Notion thủ công → dễ sót việc.
- Nay: chỉ việc gắn sao → cron hoặc script thủ công đẩy sang Notion, đảm bảo không bỏ lỡ.
- (Có thể mở rộng sau bằng AI summary nếu cần).
- Có thể mở rộng bằng label “Processed”, dedupe theo `message.id`, hoặc kết nối thêm Slack để nhắc nhở.

---

✅ Checklist vận hành

- [ ] `.env` đầy đủ và không commit.
- [ ] `credentials.json` + `token.json` tồn tại.
- [ ] Gmail project đã thêm bạn vào *Test users*.
- [ ] Database Notion đã share cho integration, cột đúng tên/type.
- [ ] `npx ts-node index.ts` chạy thành công (log `Sync complete.`).
- [ ] Có ảnh/chụp màn hình Notion + log để phục vụ demo.

Khi cần mở rộng, ưu tiên:
1. AI summary (nếu có ngân sách).
2. Cron chạy định kỳ.
3. Reflection & tài liệu (PDF/README) để nộp bài.