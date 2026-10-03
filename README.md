# Jazz Club Management System

โปรเจกต์วิชา SE212 สำหรับจัดการการจองโต๊ะ การแสดง พนักงาน เมนู/stock ออเดอร์ และบันทึกการชำระเงิน

## สถานะ

ตอนนี้เป็น **โครงสร้างไฟล์เริ่มต้นเท่านั้น** ยังไม่มี CRUD, API หรือการเชื่อม MySQL ที่ทำงานได้ ไฟล์ JavaScript และ SQL ที่เตรียมไว้เป็นจุดเริ่มต้นสำหรับพัฒนาต่อ ยังไม่ต้องรัน `npm install` หรือ import SQL

ใช้ stack ตาม proposal: **HTML/CSS/JavaScript + Node.js/Express + MySQL** และเริ่มพัฒนาบน localhost โดยไม่มี login/roles หรือแอปมือถือ

## โครงสร้าง

```text
JazzClub/
├── frontend/
│   ├── index.html              # หน้าเริ่มต้นของ scaffold
│   ├── pages/                  # หน้าจัดการแต่ละกลุ่มงาน
│   └── assets/
│       ├── css/                # CSS ส่วนกลางและของแต่ละหน้า
│       ├── js/
│       │   ├── api.js          # จุดเรียก backend ร่วมกัน
│       │   └── pages/          # JavaScript ของแต่ละหน้า
│       └── images/
├── backend/
│   ├── .env.example           # ตัวอย่าง config ฝั่ง server
│   ├── src/
│   │   ├── app.js             # ตั้งค่า Express และรวม routes
│   │   ├── server.js          # เริ่ม server
│   │   ├── config/db.js       # MySQL connection pool
│   │   ├── routes/index.js    # รวม API routes
│   │   ├── middleware/        # ตรวจ request และจัดการ error ร่วมกัน
│   │   └── modules/
│   │       ├── reservations/ # ลูกค้า โต๊ะ และการจอง
│   │       ├── shows/         # ศิลปิน การแสดง และผู้เข้าชม
│   │       ├── staffing/      # พนักงานและเวร
│   │       ├── menu/          # เมนูและ stock
│   │       ├── orders/        # ออเดอร์ รายการอาหาร และการชำระเงิน
│   │       └── reports/       # รายงาน 3 ข้อตาม proposal
│   └── tests/                 # ที่เก็บ integration tests เมื่อมี API
├── database/
│   ├── schema.sql            # สร้างตารางและ constraints หลังตกลง ERD
│   ├── seed.sql              # ข้อมูลตัวอย่าง
│   ├── reports/              # SQL สำหรับรายงาน 3 ข้อ
│   └── migrations/           # การเปลี่ยน schema หลังมีฐานข้อมูลร่วม
├── docs/
│   ├── architecture.md       # วิธีวางไฟล์และขอบเขตแต่ละ module
│   ├── api-contract.md       # ข้อตกลง API สำหรับ frontend/backend
│   ├── requirements.md       # ขอบเขตและเรื่องที่ต้องตกลงก่อนเขียน logic
│   ├── team-plan.md          # ข้อเสนอแบ่งงาน 3 คนและ milestones
│   └── erd/                  # ERD และ data dictionary
└── .gitignore
```

ไฟล์ `.gitkeep` ใช้ให้ Git เก็บโฟลเดอร์ที่ยังว่าง ลบได้เมื่อมีไฟล์งานจริง

## การไหลของข้อมูล

`หน้าเว็บ → HTTP/JSON → Express API → SQL → MySQL`

หน้าเว็บเรียก backend ผ่าน `frontend/assets/js/api.js` ส่วนการเชื่อม MySQL อยู่ใน `backend/src/config/db.js` เท่านั้น เมื่อตั้งค่าการเชื่อมจริงให้คัดลอก `backend/.env.example` เป็น `backend/.env` และกำหนดให้ backend โหลดไฟล์นี้

เมื่อเริ่มเขียน backend ให้สร้าง `backend/package.json` พร้อม dependencies และคำสั่ง start หลังทีมตกลงเวอร์ชัน Node.js ที่ใช้ร่วมกัน

## เริ่มทำงานร่วมกัน

1. อ่าน [ขอบเขตและคำถามที่ค้าง](docs/requirements.md) แล้วตกลงกติกาธุรกิจ
2. Fifa นำการปรับ ERD และทุกคนตรวจ ก่อน Garnet เขียน schema และ seed
3. ตกลงรูปแบบ request/response ใน [API contract](docs/api-contract.md) เพื่อให้ทำหน้าเว็บและ backend พร้อมกันได้
4. แบ่งงานตาม [แผนทีม](docs/team-plan.md) และทำให้หนึ่ง flow เชื่อมครบก่อนขยายฟีเจอร์
