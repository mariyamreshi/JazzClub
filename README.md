# Jazz Club Management System

โปรเจกต์วิชา SE212 สำหรับจัดการการจองโต๊ะ การแสดง พนักงาน เมนู/stock ออเดอร์ และบันทึกการชำระเงิน

## สถานะ

ตอนนี้เปิดหน้าแรกและหน้าจองผ่าน Express ได้ มี API ตรวจสถานะ server และ MySQL รวมถึง `POST /api/reservations` สำหรับบันทึกการจอง 6 ช่อง: guest_name, phone_number, zone, table_number, date, time พร้อมรหัส id หน้าเว็บแสดงใบยืนยันหลังบันทึกสำเร็จ หน้าจองตรวจโต๊ะที่ถูกจองตามวันที่และแสดงเป็นสีเทา โดยหนึ่งโต๊ะจองได้หนึ่งครั้งต่อวัน ส่วนฟีเจอร์ธุรกิจอื่นยังไม่ได้พัฒนา

ใช้ stack ตาม proposal: **HTML/CSS/JavaScript + Node.js/Express + MySQL** และเริ่มพัฒนาบน localhost โดยไม่มี login/roles หรือแอปมือถือ

## โครงสร้าง

```text
JazzClub/
├── src/
│   ├── models/                # Model: SQL และการเข้าถึง MySQL
│   ├── views/                 # View: หน้า HTML
│   │   ├── index.html         # หน้าเริ่มต้นของ scaffold
│   │   └── pages/             # หน้าจัดการแต่ละกลุ่มงาน
│   ├── controllers/           # Controller: รับ request เรียก model ตอบกลับ
│   ├── routes/index.js        # จับคู่ URL กับ controller
│   ├── config/db.js           # MySQL connection pool
│   ├── middleware/            # ตรวจ request และจัดการ error ร่วมกัน
│   ├── app.js                 # ตั้งค่า Express และรวม routes
│   └── server.js              # เริ่ม server
├── public/                    # ไฟล์ static สำหรับ browser
│   ├── css/
│   ├── js/
│   │   ├── api.js             # จุดเรียก API ร่วมกัน
│   │   └── pages/             # JavaScript ของแต่ละหน้า
│   └── images/
├── database/
│   ├── schema.sql             # สร้างตารางหลังตกลง ERD
│   ├── seed.sql               # ข้อมูลตัวอย่าง
│   ├── reports/               # SQL สำหรับรายงาน 3 ข้อ
│   └── migrations/            # การเปลี่ยน schema หลังมีฐานข้อมูลร่วม
├── docs/
│   ├── architecture.md        # วิธีวางไฟล์ตาม MVC
│   ├── api-contract.md        # ข้อตกลง API
│   ├── requirements.md        # ขอบเขตและเรื่องที่ต้องตกลง
│   ├── team-plan.md           # ข้อเสนอแบ่งงาน 3 คน
│   └── erd/                   # ERD และ data dictionary
├── scripts/check-db.js        # ทดสอบ SELECT 1 กับ MySQL จริง
├── tests/                     # ทดสอบ HTTP โดยจำลองผลจากฐานข้อมูล
├── package.json               # dependencies และคำสั่ง npm
├── package-lock.json          # เวอร์ชัน dependencies ที่ทีมใช้ร่วมกัน
├── .env.example               # ตัวอย่าง config ฝั่ง server
└── .gitignore
```

ไฟล์ `.gitkeep` ใช้ให้ Git เก็บโฟลเดอร์ที่ยังว่าง ลบได้เมื่อมีไฟล์งานจริง

## การไหลของข้อมูล

ใช้ **MVC แบบแยกตามหน้าที่** โดย Model อยู่ใน `src/models/`, View อยู่ใน `src/views/` และ Controller อยู่ใน `src/controllers/`

เส้นทางการทำงาน:

- เปิดหน้าเว็บ: `Browser → Route → Controller → HTML View`
- อ่าน/บันทึกข้อมูล: `JavaScript ในหน้าเว็บ → API Route → Controller → Model → MySQL` แล้วส่ง JSON กลับให้หน้าเว็บแสดงผล

ยังใช้ HTML/JavaScript ตาม proposal โดย controller ส่งไฟล์ HTML และ API ส่ง JSON ส่วน Express เสิร์ฟ CSS/JS/รูปภาพจาก `public/` รายละเอียดอยู่ใน [Architecture](docs/architecture.md)

หน้าเว็บเรียก API ผ่าน `public/js/api.js` ส่วนการเชื่อม MySQL อยู่ใน `src/config/db.js` เท่านั้น ตั้งค่าการเชื่อมโดยคัดลอก `.env.example` เป็น `.env` ที่ root; `src/config/env.js` โหลดไฟล์นี้ให้อัตโนมัติ

## วิธีเปิดโปรเจกต์

ใช้ Node.js 22 ขึ้นไป เปิด terminal ที่ root ของโปรเจกต์:

```sh
npm ci
```

ถ้ายังไม่มี `.env` ให้คัดลอก `.env.example` เป็น `.env` แล้วแก้ `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` ให้ตรงกับ MySQL ของตัวเอง (ไม่ต้องใส่รหัสผ่านในแชตหรือ Git)

```sh
npm run dev
```

เปิด <http://127.0.0.1:3000> คำสั่ง dev จะ restart เมื่อไฟล์ server เปลี่ยน หรือใช้ `npm start` เพื่อเปิดแบบปกติ ปิดด้วย Ctrl+C; หากพอร์ตถูกใช้ ให้เปลี่ยน `PORT` ใน `.env`

## เตรียมและทดสอบ MySQL

ต้องมี MySQL Server ที่กำลังทำงานและบัญชีที่เข้าถึงฐานข้อมูลได้ MySQL Workbench ใช้เป็น client เพื่อเชื่อม server; การติดตั้ง Workbench อย่างเดียวไม่ได้ยืนยันว่ามี server ทำงานอยู่

เปิด SQL editor ใน connection ของตัวเอง แล้วสร้างฐานข้อมูลเปล่าถ้ายังไม่มี:

```sql
CREATE DATABASE IF NOT EXISTS jazzclub CHARACTER SET utf8mb4;
```

ตั้ง `DB_NAME=jazzclub` และใช้บัญชี MySQL ของตัวเองใน `.env` ค่า `jazzclub_app` ในตัวอย่างเป็นชื่อที่ต้องสร้างและให้สิทธิ์ก่อนใช้ หรือเปลี่ยนเป็นบัญชีสำหรับพัฒนาที่มีอยู่แล้ว โปรแกรมไม่ได้สร้างบัญชีหรือฐานข้อมูลให้อัตโนมัติ

```sh
npm run db:check
```

ถ้าเชื่อมสำเร็จจะเห็น `MySQL connected: SELECT 1 succeeded.` ไม่ต้องมีตารางจริงเพื่อทดสอบคำสั่งนี้ ข้อผิดพลาดหลัก:

- `ECONNREFUSED`: server ยังไม่เปิด หรือ host/port ไม่ตรง
- `ER_ACCESS_DENIED_ERROR`: บัญชี รหัสผ่าน หรือสิทธิ์ไม่ตรง
- `ER_BAD_DB_ERROR`: ยังไม่มีฐานข้อมูลชื่อตาม `DB_NAME`

สร้างตารางการจองด้วย `npm run db:init` หลังเชื่อมฐานข้อมูลได้ คำสั่งอ่าน `database/schema.sql` และสร้างตาราง `reservations` ถ้ายังไม่มี โดยไม่ลบข้อมูลเดิม คำสั่งนี้ยังเพิ่ม unique key สำหรับหนึ่งโต๊ะต่อวันในฐานข้อมูลเดิมด้วย หากมีข้อมูลจองซ้ำจะหยุดและแจ้งให้ตรวจสอบ โดยไม่ลบข้อมูลใด ๆ ส่วน `seed.sql` ยังไม่มีข้อมูลตัวอย่าง

เปิด `/reserve.html` เลือกโต๊ะ กรอกชื่อ เบอร์โทร วันที่และเวลา แล้วกดยืนยัน ข้อมูลจะถูกบันทึกลง MySQL ตรวจข้อมูลใน SQL editor ได้ด้วย:

```sql
SELECT id, guest_name, phone_number, zone, table_number, `date`, `time`
FROM reservations
ORDER BY id DESC;
```

## Endpoints ที่ใช้งานได้

| Method | URL | ผลลัพธ์ |
| --- | --- | --- |
| GET | `/` | หน้าแรก HTML |
| GET | `/reserve.html` | หน้าจองโต๊ะ |
| POST | `/api/reservations` | บันทึกการจองลง MySQL และตอบ HTTP 201 หรือ HTTP 409 เมื่อโต๊ะถูกจองวันนั้นแล้ว |
| GET | `/api/reservations/availability?date=YYYY-MM-DD` | รายการรหัสโต๊ะที่ถูกจองในวันที่เลือก |
| GET | `/api/health` | HTTP 200 เมื่อ Express ทำงาน ไม่ตรวจ MySQL |
| GET | `/api/health/db` | HTTP 200 เมื่อ `SELECT 1` สำเร็จ หรือ HTTP 503 เมื่อฐานข้อมูลไม่พร้อม |

Express เสิร์ฟไฟล์ใน `public/` เช่น `/js/api.js` และ bind เฉพาะ `127.0.0.1` โดยค่าเริ่มต้น หน้าเว็บเปิดได้แม้ MySQL ยังไม่พร้อม; การเปิดเว็บสำเร็จไม่ได้ยืนยันการเชื่อมฐานข้อมูล

## ตรวจสอบโค้ด

```sh
npm test
```

ทดสอบ HTTP routes, static files, ขอบเขตไฟล์ที่เปิดเผย และการตอบเมื่อฐานข้อมูลพร้อม/ไม่พร้อม โดยจำลองผลจาก model ใน automated tests ใช้ `npm run db:check` แยกต่างหากเพื่อตรวจ MySQL จริง

เอกสารอ้างอิง: [Express](https://expressjs.com/en/starter/installing/), [MySQL2](https://sidorares.github.io/node-mysql2/docs), [dotenv](https://github.com/motdotla/dotenv#usage)

## เริ่มทำงานร่วมกัน

1. อ่าน [ขอบเขตและคำถามที่ค้าง](docs/requirements.md) แล้วตกลงกติกาธุรกิจ
2. Fifa นำการปรับ ERD และทุกคนตรวจ ก่อน Garnet เขียน schema และ seed
3. ตกลงรูปแบบ request/response ใน [API contract](docs/api-contract.md) เพื่อให้ทำหน้าเว็บและ backend พร้อมกันได้
4. แบ่งงานตาม [แผนทีม](docs/team-plan.md) และทำให้หนึ่ง flow เชื่อมครบก่อนขยายฟีเจอร์
