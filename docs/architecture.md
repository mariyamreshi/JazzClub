# Architecture และการวางไฟล์

## รูปแบบเบื้องต้น

ใช้ repository เดียว แยก frontend, backend และ database เพื่อให้ทีมเล็กติดตามงานง่าย ข้อเสนอเมื่อเริ่มเขียน server คือให้ Express เสิร์ฟ `frontend/` และ API ใต้ `/api` จาก origin เดียวกัน

## Frontend

สร้างหน้าใน `frontend/pages/` ตามกลุ่มงาน เช่น `reservations.html`, `shows.html`, `staffing.html`, `menu.html`, `orders.html` และ `reports.html` หนึ่งหน้าอาจมีหลายส่วนย่อย ไม่จำเป็นต้องมีหนึ่งหน้าต่อหนึ่งตาราง

เก็บ logic แต่ละหน้าใน `frontend/assets/js/pages/` ด้วยชื่อเดียวกับหน้า ส่วน `assets/js/api.js` เก็บฟังก์ชันเรียก API ร่วมกัน เก็บ CSS รวมใน `assets/css/` และแยกไฟล์รายหน้าเมื่อจำเป็น

## Backend

แยกตามฟีเจอร์เพื่อให้แต่ละคนแก้คนละโฟลเดอร์:

| Module | ข้อมูลที่รับผิดชอบ |
| --- | --- |
| reservations | Customer, Table, Reservation |
| shows | Artist, Show, Show_Attendance |
| staffing | Employee, Employee_Shift |
| menu | Menu_Item และการจัดการ stock ตามกติกาที่ทีมตกลง |
| orders | Order, Order_Item, Payment |
| reports | รวมข้อมูลข้าม module เพื่อสร้างรายงาน |

เมื่อเริ่มแต่ละ resource ให้สร้างไฟล์ใน module ที่เกี่ยวข้อง ตัวอย่าง:

```text
modules/reservations/
├── customers.routes.js
├── customers.controller.js
├── customers.model.js
├── tables.routes.js
├── tables.controller.js
├── tables.model.js
├── reservations.routes.js
├── reservations.controller.js
└── reservations.model.js
```

- `routes`: กำหนด URL และ HTTP method
- `controller`: รับ request ตรวจข้อมูล เรียก model และตอบ response
- `model`: SQL และการเข้าถึงฐานข้อมูล โดยใช้ parameterized queries
- เพิ่ม `service` เมื่อมี logic ข้ามหลายตาราง เช่น สร้างออเดอร์พร้อมรายการอาหารและตัด stock ใน transaction

ไม่ต้องสร้างไฟล์ทุกชั้นไว้ล่วงหน้าหากยังไม่มีงานที่ใช้ ตั้งชื่อ SQL tables เป็น `customers`, `club_tables`, `reservations`, `artists`, `shows`, `employees`, `employee_shifts`, `menu_items`, `orders`, `order_items`, `payments`, `show_attendance` เพื่อหลีกเลี่ยงชื่ออย่าง `Table` และ `Order` ที่ชนกับคำ SQL

## Database

- `schema.sql`: schema สำหรับติดตั้งฐานข้อมูลใหม่ หลังตรวจ ERD/3NF
- `seed.sql`: ข้อมูลจำลองที่สอดคล้องกับ constraints
- `reports/`: query ของรายงานแต่ละข้อ เพื่อให้ตรวจและนำไปใช้ใน backend ได้
- `migrations/`: ใช้เมื่อมี schema ที่ทีมเริ่มใช้งานแล้ว ตั้งชื่อเรียงลำดับ เช่น `001_add_reservation_end_time.sql`; ตอนนั้นต้องตกลงขั้นตอนรันและปรับ schema.sql ให้ตรงกันด้วย

ห้ามฝังรหัสผ่าน MySQL ใน frontend หรือ commit ไฟล์ `.env`
