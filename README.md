# Jazz Club Management System

โปรเจกต์วิชา SE212 สำหรับจัดการการจองโต๊ะ การแสดง พนักงาน เมนู/stock ออเดอร์ และบันทึกการชำระเงิน

## สถานะ

ตอนนี้เปิดหน้าแรก หน้าจอง หน้า Show และหน้าเมนูผ่าน Express ได้ ระบบจองและเมนูเชื่อม MySQL แล้ว หน้าเมนูลูกค้าอ่านเฉพาะรายการที่มีสต็อก ค้นหา กรอง และสั่งอาหารตาม Table ID ได้ ส่วน `/admin/menu.html` เพิ่ม แก้ไขสต็อก และลบรายการเมนูได้จากฐานข้อมูล

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

สร้างตารางด้วย `npm run db:init` หลังเชื่อมฐานข้อมูลได้ คำสั่งอ่าน `database/schema.sql` และสร้าง `customers`, `club_tables`, `reservations`, `artists`, `shows`, `employees`, `menu_items`, `orders` และ `order_items` ถ้ายังไม่มี โดย `orders.table_id` เป็นส่วนเพิ่มจาก ERD เดิมเพื่อระบุว่าออเดอร์เป็นของโต๊ะใด

ถ้าฐานข้อมูลมี `menu_items` รุ่นก่อนหน้า `db:init` จะรัน `003-align-menu-item-with-erd.sql` เพื่อย้ายสถานะเดิมเป็น `category`/`stock_quantity` และปรับตารางให้เหลือฟิลด์ตาม ERD บัญชีที่ใช้รันคำสั่งนี้จึงต้องมีสิทธิ์ `ALTER` สำหรับการ migration

ฐานข้อมูลรุ่นก่อนหน้าที่เก็บชื่อแขก/โต๊ะไว้ใน `reservations` และชื่อศิลปินไว้ใน `shows` จะใช้ `004-normalize-reservations-and-shows.sql` แยกข้อมูลไปยัง Customer, Table และ Artist พร้อมรักษา ID เดิมและเพิ่ม Foreign Key การจองซ้ำตรวจตามโต๊ะ วัน และเวลาที่ตรงกัน

รัน `npm run db:seed` เพื่อเพิ่ม Show ตัวอย่าง 5 รายการ, Employee 4 รายการ และเมนูตัวอย่าง 10 รายการในหมวด Recommended, Seasonal, Cocktail, Liquor, Dessert และ Appetizer รันซ้ำจะข้ามข้อมูลที่ตรงกับตัวอย่างเดิม หรือใช้ `npm run db:setup` เพื่อสร้างตารางและเติมตัวอย่างต่อกัน

หน้า `/show.html` ดึง Show พร้อม `artist_id`, `artist_name`, `artist_type`, `genre`, `performance_date`, `start_time` และ `end_time` ผ่าน `GET /api/shows` เรียงตามวันและเวลา ส่วนหน้าแอดมินเพิ่ม Show ยังไม่ได้พัฒนา

เปิด `/reserve.html` เลือกโต๊ะ กรอกชื่อ เบอร์โทร วันที่และเวลา แล้วกดยืนยัน ข้อมูลจะถูกบันทึกลง MySQL ตรวจข้อมูลใน SQL editor ได้ด้วย:

```sql
SELECT r.reservation_id, c.name, c.phone, t.table_id, t.zone,
       r.date_time, r.status
FROM reservations r
JOIN customers c ON c.customer_id = r.customer_id
JOIN club_tables t ON t.table_id = r.table_id
ORDER BY r.reservation_id DESC;
```

## Endpoints ที่ใช้งานได้

| Method | URL | ผลลัพธ์ |
| --- | --- | --- |
| GET | `/` | หน้าแรก HTML |
| GET | `/reserve.html` | หน้าจองโต๊ะ |
| GET | `/admin/reservations.html` | รายการจองสำหรับ Admin พร้อมค้นหา กรองวันที่ Add reservation, Edit และ Delete (ยืนยันก่อนลบ) |
| GET | `/admin/overview.html` | Overview ที่มีรายการจองจาก API เดียวกัน อัปเดตทุก 10 วินาทีขณะเปิดหน้า |
| GET | `/api/reservations` | รายการจองจาก MySQL พร้อมข้อมูลทั้ง 6 ช่องและ id |
| PUT | `/api/reservations/:id` | แก้ไขข้อมูลการจอง ตรวจโต๊ะ/วัน/เวลาซ้ำก่อนบันทึก |
| DELETE | `/api/reservations/:id` | ลบรายการถาวรและคืนโต๊ะให้จองได้ |
| GET | `/show.html` | หน้ารายการแสดงจากฐานข้อมูล |
| GET | `/api/shows` | รายการ Show เรียงตามวันและเวลา |
| GET | `/api/shows/:showId` | รายละเอียด Show ที่เลือก หรือ HTTP 404 เมื่อไม่มี Show |
| GET | `/menu.html` | หน้าเมนูลูกค้า ค้นหาและกรอง Recommended/หมวดหมู่ได้ |
| GET | `/admin/menu.html` | หน้าจัดการเมนู พร้อมค้นหา กรอง เพิ่ม แก้ไขสต็อก และลบ |
| GET | `/api/menu-items` | รายการเมนูที่ `stock_quantity` มากกว่า 0 สำหรับหน้าลูกค้า |
| GET | `/api/admin/menu-items` | รายการเมนูทั้งหมดสำหรับ Admin |
| POST | `/api/menu-items` | เพิ่มรายการเมนูและตอบ HTTP 201 |
| PUT | `/api/menu-items/:itemId` | แก้ไขชื่อ หมวดหมู่ ราคา และจำนวนสต็อก |
| DELETE | `/api/menu-items/:itemId` | ลบรายการเมนูถาวรและตอบ HTTP 204 |
| GET | `/api/tables` | รายการโต๊ะที่พร้อมรับออเดอร์สำหรับ pop-up หน้าเมนู |
| GET | `/api/orders` | ออเดอร์ที่ยังไม่ยกเลิก พร้อมรายการรวมตามโต๊ะและข้อมูลการชำระเงินสำหรับหน้า Admin |
| POST | `/api/orders` | เพิ่มรายการลง Order ที่เปิดอยู่ของ Table ID เดิม หรือสร้าง Order ใหม่สำหรับโต๊ะอื่น พร้อมตัด stock ใน transaction เดียวกัน |
| POST | `/api/payments` | บันทึกการชำระเต็มจำนวนหนึ่งครั้งต่อ Order และเปลี่ยนสถานะ Order เป็น `paid` ใน transaction เดียวกัน |
| GET | `/admin/order.html` | หน้า Admin Order จาก MySQL พร้อมปุ่มคิดเงิน pop-up และรีเฟรชอัตโนมัติทุก 3 วินาที |
| GET | `/admin/employees.html` | หน้าจัดการ Employee พร้อมค้นหา กรอง เพิ่ม แก้ไข และลบ |
| GET | `/api/employees` | รายการ Employee จาก MySQL ตาม field ใน ERD |
| GET | `/api/employees/:employeeId` | Employee ตาม ID หรือ HTTP 404 เมื่อไม่พบ |
| POST | `/api/employees` | เพิ่ม Employee และตอบ HTTP 201 |
| PUT | `/api/employees/:employeeId` | แก้ไขชื่อ เบอร์โทร สถานะ และประเภทการจ้าง |
| DELETE | `/api/employees/:employeeId` | ลบ Employee ที่ไม่ได้ถูก Shift อ้างอิง |
| GET | `/admin/shifts.html` | หน้าจัดการ Employee Shift รายสัปดาห์ พร้อมค้นหา กรอง เพิ่ม แก้ไข และลบ |
| GET | `/api/employee-shifts?from=YYYY-MM-DD&to=YYYY-MM-DD` | Shift ในช่วงวันที่ พร้อมชื่อ Employee และข้อมูล Show |
| GET | `/api/employee-shifts/:shiftId` | Shift ตาม ID หรือ HTTP 404 เมื่อไม่พบ |
| POST | `/api/employee-shifts` | เพิ่ม Shift ตามฟิลด์ใน ERD และตอบ HTTP 201 |
| PUT | `/api/employee-shifts/:shiftId` | แก้ไข Employee, Show, Role, วันที่ และเวลา |
| DELETE | `/api/employee-shifts/:shiftId` | ลบเฉพาะ Shift assignment และตอบ HTTP 204 |
| POST | `/api/reservations` | บันทึก Customer และ Reservation ที่อ้างอิง Table ด้วย Foreign Key |
| GET | `/api/reservations/availability?date=YYYY-MM-DD&time=HH:mm` | รายการรหัสโต๊ะที่ถูกจองในวันและเวลาที่เลือก |
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
