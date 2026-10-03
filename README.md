# Jazz Club Management System

โปรเจกต์วิชา SE212 สำหรับจัดการการจองโต๊ะ การแสดง พนักงาน เมนู/stock ออเดอร์ และบันทึกการชำระเงิน

## สถานะ

ตอนนี้เป็น **โครงสร้างไฟล์เริ่มต้นเท่านั้น** ยังไม่มี CRUD, API หรือการเชื่อม MySQL ที่ทำงานได้ ไฟล์ JavaScript และ SQL ที่เตรียมไว้เป็นจุดเริ่มต้นสำหรับพัฒนาต่อ ยังไม่ต้องรัน `npm install` หรือ import SQL

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
├── tests/                     # ที่เก็บ integration tests เมื่อมี API
├── .env.example               # ตัวอย่าง config ฝั่ง server
└── .gitignore
```

ไฟล์ `.gitkeep` ใช้ให้ Git เก็บโฟลเดอร์ที่ยังว่าง ลบได้เมื่อมีไฟล์งานจริง

## การไหลของข้อมูล

ใช้ **MVC แบบแยกตามหน้าที่** โดย Model อยู่ใน `src/models/`, View อยู่ใน `src/views/` และ Controller อยู่ใน `src/controllers/`

เมื่อเริ่ม implementation เส้นทางการทำงานจะเป็น:

- เปิดหน้าเว็บ: `Browser → Route → Controller → HTML View`
- อ่าน/บันทึกข้อมูล: `JavaScript ในหน้าเว็บ → API Route → Controller → Model → MySQL` แล้วส่ง JSON กลับให้หน้าเว็บแสดงผล

ยังใช้ HTML/JavaScript ตาม proposal โดย controller ส่งไฟล์ HTML และ API ส่ง JSON ส่วน Express เสิร์ฟ CSS/JS/รูปภาพจาก `public/` รายละเอียดอยู่ใน [Architecture](docs/architecture.md)

หน้าเว็บเรียก API ผ่าน `public/js/api.js` ส่วนการเชื่อม MySQL อยู่ใน `src/config/db.js` เท่านั้น เมื่อตั้งค่าการเชื่อมจริงให้คัดลอก `.env.example` เป็น `.env` ที่ root และกำหนดให้ server โหลดไฟล์นี้

เมื่อเริ่มเขียน server ให้สร้าง `package.json` ที่ root พร้อม dependencies และคำสั่ง start หลังทีมตกลงเวอร์ชัน Node.js ที่ใช้ร่วมกัน

## เริ่มทำงานร่วมกัน

1. อ่าน [ขอบเขตและคำถามที่ค้าง](docs/requirements.md) แล้วตกลงกติกาธุรกิจ
2. Fifa นำการปรับ ERD และทุกคนตรวจ ก่อน Garnet เขียน schema และ seed
3. ตกลงรูปแบบ request/response ใน [API contract](docs/api-contract.md) เพื่อให้ทำหน้าเว็บและ backend พร้อมกันได้
4. แบ่งงานตาม [แผนทีม](docs/team-plan.md) และทำให้หนึ่ง flow เชื่อมครบก่อนขยายฟีเจอร์
