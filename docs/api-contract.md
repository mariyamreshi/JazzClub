# API contract - ร่างสำหรับทีม

## API การจองที่ใช้งานได้

`GET /api/reservations` ใช้ร่วมกันในหน้า Admin `/admin/overview.html` และ `/admin/reservations.html` คืน `{"data":[...]}` โดยแต่ละรายการมี `id`, `guest_name`, `phone_number`, `zone`, `table_number`, `date` (`YYYY-MM-DD`) และ `time` (`HH:mm`)
เรียงวันที่ใหม่ก่อน เวลาเข้าเรียงจากน้อยไปมาก และ ID ใหม่ก่อนเมื่อวัน/เวลาเท่ากัน
ตอบ HTTP 200 พร้อม `Cache-Control: no-store` หรือ `data: []` เมื่อไม่มีรายการ หากฐานข้อมูลล้มเหลวตอบ HTTP 500 พร้อม `INTERNAL_ERROR`
หน้า Admin ค้นหาชื่อ เบอร์โทร โต๊ะ โซน หรือรหัสการจองได้ และกรองตามวันที่ร่วมกับการค้นหาได้
ปุ่ม Refresh โหลดข้อมูลล่าสุดจาก MySQL โดยรักษาตัวกรองเดิม ทั้งสองหน้าโหลดใหม่เมื่อกลับมาโฟกัสแท็บ และทุก 10 วินาทีขณะหน้าเปิดอยู่ จำนวนบนเมนูคือจำนวนการจองทั้งหมด
ทั้งสองหน้าใช้ปุ่ม Add reservation, Edit และ Delete ชุดเดียวกัน ระหว่างเปิดฟอร์มหรือยืนยันลบจะพักการโหลดอัตโนมัติเพื่อรักษาข้อมูลที่กำลังแก้

`PUT /api/reservations/:id` รับข้อมูลครบ 6 ช่องเหมือน POST ตรวจชื่อ เบอร์โทร โซน/โต๊ะ วันที่และเวลา แล้วแก้ไขรายการตาม id
ตอบ HTTP 200 พร้อม `{"data":{"id":1,...}}` รวมข้อมูลที่บันทึก หากโต๊ะ/วัน/เวลาปลายทางถูกจองแล้วตอบ HTTP 409 (`TABLE_ALREADY_BOOKED`) โดยข้อมูลเดิมยังอยู่
บันทึกโดยไม่เปลี่ยนข้อมูลก็สำเร็จได้ การย้ายโต๊ะ วัน หรือเวลาจะคืนช่วงเดิมให้จองใหม่

`DELETE /api/reservations/:id` ลบรายการจากฐานข้อมูลถาวรและตอบ HTTP 204 ไม่มี body โต๊ะ/วันนั้นจึงกลับมาว่าง
หน้าเว็บมีหน้าต่างยืนยันชื่อ รหัสการจอง โต๊ะและวันก่อนส่ง DELETE และมีปุ่ม Cancel
PUT/DELETE ตอบ HTTP 400 เมื่อ id ไม่ถูกต้อง, 404 (`RESERVATION_NOT_FOUND`) เมื่อรายการถูกลบไปแล้ว และ 500 เมื่อฐานข้อมูลล้มเหลว
หลังบันทึกหรือลบสำเร็จจะโหลดรายการและยอดรวมใหม่โดยรักษาตัวกรอง ยังไม่มีสถานะยกเลิกหรือถังขยะสำหรับกู้คืน

`POST /api/reservations` รับ JSON จากหน้า `/reserve.html` หรือฟอร์ม Add reservation ใน Admin และบันทึกลงตาราง `reservations` เดียวกัน:

ฟอร์มเพิ่มจาก Admin รับชื่อ เบอร์โทร วันที่ เวลา โซน และโต๊ะ โดยเติมวันที่จากตัวกรองที่เลือกไว้ได้ เมื่อเพิ่มสำเร็จจะล้างคำค้นและแสดงรายการของวันที่จองใหม่ หากโต๊ะซ้ำจะเก็บข้อมูลที่กรอกไว้และแจ้งข้อผิดพลาดให้เปลี่ยนโต๊ะ วัน หรือเวลา

```json
{
  "guest_name": "Example Guest",
  "phone_number": "0812345678",
  "zone": "Front Stage",
  "table_number": "F01",
  "date": "2026-12-09",
  "time": "20:30"
}
```

ทุกช่องจำเป็นต้องเป็น string ที่ไม่ว่าง เบอร์โทรเก็บเป็นข้อความเพื่อรักษาเลข 0 นำหน้า
ชื่อยาวไม่เกิน 100 ตัวอักษร เบอร์โทรไม่เกิน 25 ตัวอักษร มีตัวเลข 7–15 หลัก
รองรับเครื่องหมาย + นำหน้า เว้นวรรค วงเล็บ และขีดในเบอร์โทร
วันที่ต้องมีจริงในรูปแบบ `YYYY-MM-DD` (ปี 1000–9999) และเวลาเลือกได้เฉพาะ `20:00`, `20:30` หรือ `21:00` ตามเวลาท้องถิ่นของร้าน (Asia/Bangkok)
โซนและรหัสโต๊ะต้องตรงกับผังหน้าเว็บ: Front Stage (F01–F04), Main Floor (M01–M03), VIP Lounge (VIP-1–VIP-2), Bar Counter (B01–B04)

- สำเร็จ: HTTP 201, `{"data":{"id":1,...}}` โดย data มีข้อมูลทั้ง 6 ช่องที่บันทึกแล้ว
- ข้อมูลไม่ถูกต้อง: HTTP 400, `{"error":{"code":"VALIDATION_ERROR","message":"..."}}`
- โต๊ะถูกจองในวันและเวลาเดียวกันแล้ว: HTTP 409, `{"error":{"code":"TABLE_ALREADY_BOOKED","message":"..."}}`
- บันทึกไม่สำเร็จ: HTTP 500, `{"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred."}}`

หน้าเว็บแสดงใบยืนยันหลังได้รับผลสำเร็จเท่านั้น และปิดปุ่มระหว่างบันทึกเพื่อกันการกดซ้ำ
ฐานข้อมูลเก็บ `customer_id`, `table_id`, `date_time`, `status` ตาม ERD และใช้ unique key (`table_id`, `date_time`) ป้องกันการจองโต๊ะและเวลาซ้ำ การลบผ่าน Admin เป็นการลบถาวร

`GET /api/reservations/availability?date=2026-10-16&time=20:30` คืนเฉพาะรหัสโต๊ะที่ถูกจองในช่วงนั้น ไม่เปิดเผยชื่อหรือเบอร์โทร:

```json
{"data":{"date":"2026-10-16","time":"20:30","booked_tables":["F02"]}}
```

ตอบ HTTP 200 และ `Cache-Control: no-store` ถ้ายังไม่มีการจองจะคืน `booked_tables: []`
วันที่หรือเวลาขาด/ไม่ถูกต้องตอบ HTTP 400 ส่วนฐานข้อมูลล้มเหลวตอบ HTTP 500
หน้าเว็บโหลดสถานะเมื่อเปิดหน้า เปลี่ยนวัน เปลี่ยนเวลา หรือปิดใบยืนยัน โต๊ะที่ถูกจองเป็นสีเทาและเลือกไม่ได้ทุกโซน
ระหว่างโหลดหรือเมื่อโหลดไม่สำเร็จจะปิดการจองและให้ลองโหลดใหม่ หาก POST ตอบ 409 จะโหลดสถานะโต๊ะใหม่และแจ้งให้เลือกโต๊ะอื่น

## API รายการ Show ที่ใช้งานได้

`GET /api/shows` join ตาราง `shows` กับ `artists` และเรียงตาม `performance_date`, `start_time`, `show_id`:

```json
{
  "data": [
    {
      "show_id": 1,
      "artist_id": 1,
      "artist_name": "The Araya Quartet",
      "artist_type": "group",
      "genre": "Contemporary Jazz",
      "performance_date": "2026-10-16",
      "start_time": "20:30",
      "end_time": "22:30"
    }
  ]
}
```

`show_id` เป็นเลขรันอัตโนมัติ วันที่และเวลาเป็นข้อความตามเวลาท้องถิ่นของร้าน (Asia/Bangkok) ไม่มีการแปลง timezone
ตอบ HTTP 200 พร้อม `Cache-Control: no-store` และคืน `data: []` เมื่อยังไม่มี Show
หากฐานข้อมูลล้มเหลวจะตอบ HTTP 500 พร้อม `INTERNAL_ERROR`

หน้า `/show.html` ดึงรายการใหม่เมื่อเปิด/รีเฟรชหน้า ไม่จำกัดจำนวนไว้ที่ 5 รายการ
รองรับ loading, empty และ error พร้อมปุ่มลองใหม่ แสดงรูปประกอบทั่วไปโดยไม่เก็บรูปหรือราคาในตาราง
ปุ่มลูกศรเปิด `/reserve.html?show_id=1` และหน้าจองเรียก `GET /api/shows/1` เพื่ออ่าน Show ที่เลือกจากฐานข้อมูล
API รายละเอียดคืน `{"data":{...}}` ที่มี 8 ฟิลด์เหมือนแต่ละรายการด้านบน ใช้ HTTP 400 เมื่อ ID ไม่ถูกต้อง, 404 พร้อม `SHOW_NOT_FOUND` เมื่อไม่พบ Show และ 500 เมื่อฐานข้อมูลล้มเหลว
หน้าจองใช้ `performance_date` เป็นวันที่จองและตั้งเวลาเข้าเริ่มต้นเป็น `start_time` ผู้ใช้ยังเลือกเวลาเข้าได้
การ์ด Show กับใบยืนยันใช้ `artist_name` และ `genre` จาก SQL ส่วนการ์ดแสดงวัน/เวลาแทนราคาที่ไม่มีใน schema
หากไม่พบ Show หรือโหลดไม่สำเร็จจะปิดการจองและให้เลือก Show อื่น/ลองใหม่ โดยไม่ใช้วันที่หรือศิลปินตัวอย่างแทน
เปิด `/reserve.html` โดยไม่มี `show_id` ยังจองทั่วไปได้ แต่ต้องเลือกวันที่เอง
การบันทึกการจองยังเก็บ 6 ช่องตามเดิม โดยยังไม่ได้เพิ่ม foreign key `show_id` ในตาราง `reservations`
API เพิ่ม/แก้ไข/ลบ Show สำหรับหน้าแอดมินยังไม่ได้พัฒนา

## API เมนูที่ใช้งานได้

`GET /api/menu-items` คืนเฉพาะรายการที่ `stock_quantity > 0` สำหรับหน้า `/menu.html` เรียงตามหมวดหมู่และชื่อ ส่วน `GET /api/admin/menu-items` คืนทุกรายการสำหรับหน้า `/admin/menu.html`

แต่ละรายการตรงกับ `MENU_ITEM` ใน ERD และมีเฉพาะ `item_id`, `item_name`, `category`, `price` และ `stock_quantity` ราคาเป็นข้อความทศนิยมสองตำแหน่ง และสต็อกเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป หมวดหมู่ที่รับได้คือ `recommended`, `seasonal`, `cocktail`, `liquor`, `dessert` และ `appetizer`

```json
{
  "data": [
    {
      "item_id": 1,
      "item_name": "Truffle Cream Pasta",
      "category": "recommended",
      "price": "18.50",
      "stock_quantity": 12
    }
  ]
}
```

`POST /api/menu-items` เพิ่มรายการใหม่, `PUT /api/menu-items/:itemId` แก้ไข และ `DELETE /api/menu-items/:itemId` ลบถาวร POST/PUT รับข้อมูลครบทุกช่องยกเว้น `item_id` ชื่อต้องไม่ซ้ำ ราคาต้องมากกว่าศูนย์ และ `stock_quantity` ต้องเป็นจำนวนเต็มไม่ติดลบ

- POST สำเร็จ: HTTP 201 พร้อมรายการที่สร้าง
- PUT สำเร็จ: HTTP 200 พร้อมรายการหลังแก้ไข
- DELETE สำเร็จ: HTTP 204 ไม่มี body
- ข้อมูลหรือ ID ไม่ถูกต้อง: HTTP 400 (`VALIDATION_ERROR`)
- ชื่อซ้ำ: HTTP 409 (`MENU_ITEM_ALREADY_EXISTS`)
- ไม่พบรายการ: HTTP 404 (`MENU_ITEM_NOT_FOUND`)
- ฐานข้อมูลล้มเหลว: HTTP 500 (`INTERNAL_ERROR`)

หน้าเมนูลูกค้าเริ่มที่หมวด Recommended และรองรับการค้นหาร่วมกับตัวกรอง หน้า Admin แสดงจำนวนรายการ จำนวนรายการที่มีสต็อก และสต็อกรวม พร้อมกรองตามชื่อ หมวดหมู่ หรือสถานะสต็อกได้ เมื่อตั้ง `stock_quantity` เป็น 0 รายการจะหายจากหน้าลูกค้าแต่ยังอยู่ใน Admin

## API สั่งอาหารตามโต๊ะที่ใช้งานได้

`GET /api/tables` คืน `table_id`, `capacity` และ `zone` ของโต๊ะสถานะ `available` เพื่อสร้างตัวเลือก Table ID ใน pop-up หน้าเมนู

`POST /api/orders` รับข้อมูลดังนี้:

```json
{
  "table_id": "F01",
  "item_id": 7,
  "quantity": 2
}
```

เมื่อสำเร็จ ระบบค้นหา Order สถานะ `pending`, `preparing` หรือ `served` ของโต๊ะนั้นก่อน ถ้ามีอยู่จะเพิ่มจำนวนใน `order_items` เดิม หรือเพิ่มรายการเมนูใหม่เข้า Order เดิม ถ้ายังไม่มีจึงสร้าง Order ใหม่สำหรับโต๊ะนั้น ระบบเก็บ `price_at_time`, ตัด `menu_items.stock_quantity` และคำนวณยอดรวมใหม่ภายใน transaction เดียวกัน

`GET /api/orders` คืน Order ที่ไม่ถูกยกเลิก โดยแต่ละ Order มี `table_id`, `total`, `payment` และ array `items` ที่รวม quantity ของเมนูชนิดเดียวกันแล้ว หน้า `/admin/order.html` เรียก API นี้ทุก 3 วินาที จึงแสดงคำสั่งซื้อเพิ่มเติมของโต๊ะเดิมใน card เดิม แยก card เมื่อเป็นคนละโต๊ะ และเก็บ Order ที่ชำระแล้วไว้เป็นประวัติ

- สำเร็จ: HTTP 201 พร้อม `order_id`, `table_id`, `status`, `total` และรายละเอียดรายการ
- ข้อมูลไม่ถูกต้อง: HTTP 400 (`VALIDATION_ERROR`)
- ไม่พบโต๊ะหรือเมนู: HTTP 404 (`TABLE_NOT_FOUND`, `MENU_ITEM_NOT_FOUND`)
- โต๊ะไม่พร้อมหรือสต็อกไม่พอ: HTTP 409 (`TABLE_NOT_AVAILABLE`, `INSUFFICIENT_STOCK`)

ERD ฉบับแก้ไขต้องเพิ่ม `table_id` เป็น FK ใน `ORDER` และเพิ่มความสัมพันธ์ `TABLE (1) — (N) ORDER` ส่วน `PAYMENT` คง `order_id` เป็น FK โดยไม่เพิ่ม `table_id` เพราะหาโต๊ะผ่าน `PAYMENT → ORDER → TABLE` ได้

## API ชำระเงินที่ใช้งานได้

`POST /api/payments` รับข้อมูลดังนี้:

```json
{
  "order_id": 4,
  "payment_method": "PromptPay",
  "amount": "14.00"
}
```

รองรับวิธีชำระ `Cash`, `Credit Card` และ `PromptPay` จำนวนเงินต้องเท่ากับยอดรวมปัจจุบันของ Order ระบบล็อก Order, เพิ่ม Payment และเปลี่ยนสถานะ Order เป็น `paid` ภายใน transaction เดียวกัน โดยหนึ่ง Order ชำระได้ครั้งเดียว หน้า Admin เปิด pop-up จากปุ่ม `Collect payment` และเติมยอดที่ต้องชำระให้อัตโนมัติ

- สำเร็จ: HTTP 201 พร้อม `payment_id`, `order_id`, `table_id`, `payment_method`, `amount` และ `payment_time`
- ข้อมูลไม่ถูกต้อง: HTTP 400 (`VALIDATION_ERROR`)
- ไม่พบ Order: HTTP 404 (`ORDER_NOT_FOUND`)
- Order ถูกยกเลิก ยอดไม่ตรง หรือชำระแล้ว: HTTP 409 (`ORDER_NOT_PAYABLE`, `PAYMENT_AMOUNT_MISMATCH`, `PAYMENT_EXISTS`)

## API พนักงานที่ใช้งานได้

`GET /api/employees` คืน Employee ทุกคนจาก MySQL โดยแต่ละรายการมี `employee_id`, `employee_name`, `phone`, `status` และ `employment_type` ตรงกับ ERD ส่วน `GET /api/employees/:employeeId` คืนรายการตาม ID

`POST /api/employees` เพิ่ม Employee, `PUT /api/employees/:employeeId` แก้ไข และ `DELETE /api/employees/:employeeId` ลบรายการ หน้า `/admin/employees.html` ใช้ API ชุดนี้สำหรับค้นหา กรอง และจัดการข้อมูล

สถานะที่รับได้คือ `Active`, `On leave`, `Inactive` และประเภทการจ้างคือ `Full-time`, `Part-time` เบอร์โทรต้องมีตัวเลข 7–15 หลักและไม่ซ้ำกับ Employee คนอื่น ข้อมูลไม่ถูกต้องตอบ HTTP 400, เบอร์ซ้ำตอบ 409, ไม่พบ ID ตอบ 404 และลบ Employee ที่ถูก Shift อ้างอิงตอบ 409

## API เวรพนักงานที่ใช้งานได้

`GET /api/employee-shifts?from=2026-10-12&to=2026-10-18` คืน Shift ในช่วงวันที่ โดยแต่ละรายการมีฟิลด์ตาม ERD คือ `shift_id`, `employee_id`, `show_id`, `role`, `shift_date`, `start_time`, `end_time` และมีชื่อ Employee, Artist กับเวลา Show ที่ join มาเพื่อแสดงในหน้า Admin ส่วน `GET /api/employee-shifts/:shiftId` คืน Shift เดียวตาม ID

`POST /api/employee-shifts` และ `PUT /api/employee-shifts/:shiftId` รับข้อมูลดังนี้:

```json
{
  "employee_id": 1,
  "show_id": 2,
  "role": "Bartender",
  "shift_date": "2026-10-17",
  "start_time": "19:00",
  "end_time": "23:30"
}
```

ระบบอนุญาตเฉพาะ Employee สถานะ `Active`, กำหนดให้ `shift_date` ตรงกับวันของ Show และป้องกันช่วงเวลาทับซ้อนของ Employee คนเดียวกัน การเพิ่มและแก้ไขตรวจ FK กับตาราง `employees` และ `shows` ใน transaction ส่วน `DELETE /api/employee-shifts/:shiftId` ลบเฉพาะ assignment

- เพิ่มสำเร็จ: HTTP 201; แก้ไขสำเร็จ: HTTP 200; ลบสำเร็จ: HTTP 204
- ข้อมูลหรือ ID ไม่ถูกต้อง: HTTP 400 (`VALIDATION_ERROR`)
- ไม่พบ Employee, Show หรือ Shift: HTTP 404 (`EMPLOYEE_NOT_FOUND`, `SHOW_NOT_FOUND`, `SHIFT_NOT_FOUND`)
- Employee ไม่ Active, วันไม่ตรง Show หรือเวลาทับซ้อน: HTTP 409 (`EMPLOYEE_NOT_ACTIVE`, `SHIFT_DATE_MISMATCH`, `SHIFT_OVERLAP`)

## API ส่วนอื่น

Endpoints ที่มีแล้ว: `GET /api/health` ตอบ `{"data":{"server":"ok"}}` และ `GET /api/health/db` ตอบ `{"data":{"database":"ok"}}` เมื่อเชื่อม MySQL ได้ หรือ HTTP 503 พร้อม error code `DATABASE_UNAVAILABLE` เมื่อไม่พร้อม

ตารางด้านล่างยังเป็นรายการกลุ่ม API สำหรับงานธุรกิจที่ต้องพัฒนาต่อ ต้องเติม request/response ก่อน implementation

| กลุ่ม | Resource path ที่เสนอ | ผู้ดูแลเบื้องต้น |
| --- | --- | --- |
| ลูกค้า/การจอง | `/api/customers`, `/api/reservations` | Garnet |
| ศิลปิน/การแสดง/ผู้เข้าชม | `/api/artists`, `/api/shows`, `/api/show-attendance` | Fifa |
| stock | `/api/stock` | Mary |
| จัดการออเดอร์เพิ่มเติม | `PUT /api/orders`, `/api/orders/:id/items` | Garnet |
| โต๊ะว่าง | `/api/reports/table-availability` | Fifa + Garnet |
| ความพร้อมของ show | `/api/reports/show-readiness` | Mary + Garnet |
| ออเดอร์/ชำระเงินต่อการจอง | `/api/reports/reservation-summary` | Mary + Garnet |

## สิ่งที่ต้องกำหนดสำหรับแต่ละ endpoint

- method/path และหน้าที่เรียกใช้
- query/path parameters และ JSON request ตัวอย่าง
- JSON response ตัวอย่าง รวมกรณีไม่มีข้อมูล
- required fields, validation และ status codes
- รูปแบบวันเวลา/timezone, จำนวนเงิน และชื่อ fields ที่ใช้ร่วมกัน
- กติกาเมื่อข้อมูลซ้ำ ถูกอ้างอิง หรือตรวจพบการจองซ้อน

ตัวอย่างรูปแบบ response ที่เสนอให้ใช้ร่วมกัน:

```json
{"data": []}
```

```json
{"error": {"code": "VALIDATION_ERROR", "message": "..."}}
```

รูปแบบนี้ยังเป็นข้อเสนอ ให้ทีมตกลงและใส่ตัวอย่างข้อมูลจริงก่อนเริ่ม mock หน้าเว็บ
