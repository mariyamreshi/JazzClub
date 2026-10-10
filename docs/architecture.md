# Architecture: MVC

## หน้าที่ของแต่ละส่วน

ใช้โครงสร้าง MVC ที่แยกไฟล์ตามหน้าที่ใน `src/` โดยยังใช้ HTML/CSS/JavaScript + Node.js/Express + MySQL ตาม proposal

| ส่วน | โฟลเดอร์ | หน้าที่ |
| --- | --- | --- |
| Model | `src/models/` | เข้าถึง MySQL ด้วย SQL และ parameterized queries |
| View | `src/views/` | หน้า HTML สำหรับแสดงข้อมูลและรับข้อมูลจากผู้ใช้ |
| Controller | `src/controllers/` | รับ request ตรวจข้อมูล เรียก model และเลือก response |
| Routes | `src/routes/` | จับคู่ URL/HTTP method กับ controller |
| Config | `src/config/` | ตั้งค่าการเชื่อมฐานข้อมูล |
| Middleware | `src/middleware/` | การตรวจ request และจัดการ error ร่วมกัน |
| Static assets | `public/` | CSS, JavaScript ฝั่ง browser และรูปภาพ |

`src/app.js` ใช้ประกอบ Express application ส่วน `src/server.js` โหลด config และเริ่ม server โดย `src/config/env.js` โหลด `.env` จาก root

## View และการเรียกข้อมูล

หน้าแรกอยู่ที่ `src/views/index.html` สร้างหน้าฟีเจอร์ใน `src/views/pages/` เช่น `reservations.html`, `shows.html`, `staffing.html`, `menu.html`, `orders.html` และ `reports.html`

Page routes เรียก controller ที่ส่ง HTML ด้วย `res.sendFile()` และ data routes ใต้ `/api` เรียก controller ที่ตอบ JSON ด้วย `res.json()` โดยใช้ URL หน้าเว็บและ API แยกกัน เช่น `/reservations` กับ `/api/reservations`

View ยังเป็น HTML ปกติ จึงไม่ใช้ `res.render()` เว้นแต่ภายหลังทีมเลือก template engine และตั้งค่าเพิ่ม หน้า HTML เรียก API ผ่าน JavaScript เพื่อแสดงข้อมูลจากฐานข้อมูล

ให้ Express เสิร์ฟ static assets จาก `public/` ที่ URL `/` เช่น `public/css/style.css` จะใช้ URL `/css/style.css` และ `public/js/api.js` จะใช้ URL `/js/api.js` ใช้ URL แบบเริ่มด้วย `/` ในหน้าเว็บเพื่อให้ใช้ได้จากทุก page route

## ตัวอย่างไฟล์สำหรับฟีเจอร์การจอง

รายการนี้เป็นแนวทางตั้งชื่อสำหรับไฟล์ที่จะสร้างเมื่อเริ่มพัฒนา:

```text
src/
├── models/reservations.model.js
├── views/pages/reservations.html
├── controllers/reservations.controller.js
└── routes/reservations.routes.js
public/
├── css/reservations.css
└── js/pages/reservations.js
```

การทำงานที่ตั้งใจไว้:

1. ผู้ใช้เปิด `/reservations` → route เรียก controller → ส่ง HTML View
2. JavaScript ใน View เรียก `/api/reservations` → route เรียก controller
3. Controller ตรวจ request แล้วเรียก Model เพื่ออ่านหรือบันทึก MySQL
4. Model คืนข้อมูล → Controller ตอบ JSON → JavaScript อัปเดต View

SQL อยู่ใน Model และใช้ connection pool จาก `src/config/db.js` เก็บ credentials ใน `.env` ที่ root เพิ่ม service เฉพาะเมื่อ logic ข้ามหลาย model ซับซ้อนขึ้น เช่น ออเดอร์พร้อมการตัด stock ที่ต้องทำใน transaction

## กลุ่มข้อมูลที่ต้องพัฒนา

- ลูกค้า โต๊ะ และการจอง
- ศิลปิน การแสดง และผู้เข้าชม
- พนักงานและเวร
- เมนูและ stock
- ออเดอร์ รายการอาหาร และการชำระเงิน
- รายงาน 3 ข้อตาม proposal

ทุกกลุ่มใช้โฟลเดอร์ models/views/controllers ชุดเดียวกัน ตั้งชื่อไฟล์ตาม resource เพื่อให้ทีมแบ่งงานตามฟีเจอร์ได้

## Database

- `database/schema.sql`: schema สำหรับติดตั้งฐานข้อมูลใหม่ หลังตรวจ ERD/3NF
- `database/seed.sql`: ข้อมูลจำลองที่สอดคล้องกับ constraints
- `database/reports/`: query ของรายงานแต่ละข้อ
- `database/migrations/`: การเปลี่ยน schema หลังทีมเริ่มใช้งานฐานข้อมูลร่วมกัน

ตั้งชื่อ SQL tables เป็น `customers`, `club_tables`, `reservations`, `artists`, `shows`, `employees`, `employee_shifts`, `menu_items`, `orders`, `order_items`, `payments`, `show_attendance` เพื่อหลีกเลี่ยงชื่ออย่าง `Table` และ `Order` ที่ชนกับคำ SQL

## สถานะ

ตอนนี้มีหน้าแรก ระบบจอง Show และ Menu ที่เชื่อม MySQL แล้ว Customer/Table/Reservation และ Artist/Show ถูกแยกตารางตาม ERD ส่วน Employee, Shift, Schedule, Order, Order Item และ Payment ยังไม่ได้พัฒนา
