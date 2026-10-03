# API contract - ร่างสำหรับทีม

## API การจองที่ใช้งานได้

`POST /api/reservations` รับ JSON จากหน้า `/reserve.html` และบันทึกลงตาราง `reservations`:

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
วันที่ต้องมีจริงในรูปแบบ `YYYY-MM-DD` (ปี 1000–9999) และเวลาใช้ `HH:mm` แบบ 24 ชั่วโมง ตามเวลาท้องถิ่นของร้าน (Asia/Bangkok)
โซนและรหัสโต๊ะต้องตรงกับผังหน้าเว็บ: Front Stage (F01–F04), Main Floor (M01–M03), VIP Lounge (VIP-1–VIP-2), Bar Counter (B01–B04)

- สำเร็จ: HTTP 201, `{"data":{"id":1,...}}` โดย data มีข้อมูลทั้ง 6 ช่องที่บันทึกแล้ว
- ข้อมูลไม่ถูกต้อง: HTTP 400, `{"error":{"code":"VALIDATION_ERROR","message":"..."}}`
- โต๊ะถูกจองในวันนั้นแล้ว (ไม่ขึ้นกับเวลาเข้า): HTTP 409, `{"error":{"code":"TABLE_ALREADY_BOOKED","message":"..."}}`
- บันทึกไม่สำเร็จ: HTTP 500, `{"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred."}}`

หน้าเว็บแสดงใบยืนยันหลังได้รับผลสำเร็จเท่านั้น และปิดปุ่มระหว่างบันทึกเพื่อกันการกดซ้ำ
หนึ่งโต๊ะจองได้หนึ่งครั้งต่อวัน โดยใช้ unique key (`date`, `table_number`) ใน MySQL ป้องกันคำขอพร้อมกัน
เวลาเข้าเป็นข้อมูลของการจอง ไม่ได้แบ่งรอบโต๊ะ ยังไม่มี API แก้ไข/ยกเลิก

`GET /api/reservations/availability?date=2026-10-16` คืนเฉพาะรหัสโต๊ะที่ถูกจองในวันนั้น ไม่เปิดเผยชื่อหรือเบอร์โทร:

```json
{"data":{"date":"2026-10-16","booked_tables":["F02"]}}
```

ตอบ HTTP 200 และ `Cache-Control: no-store` ถ้ายังไม่มีการจองจะคืน `booked_tables: []`
วันที่ขาดหรือไม่ถูกต้องตอบ HTTP 400 ส่วนฐานข้อมูลล้มเหลวตอบ HTTP 500
หน้าเว็บโหลดสถานะเมื่อเปิดหน้า เปลี่ยนวัน หรือปิดใบยืนยัน โต๊ะที่ถูกจองเป็นสีเทาและเลือกไม่ได้ทุกโซน
ระหว่างโหลดหรือเมื่อโหลดไม่สำเร็จจะปิดการจองและให้ลองโหลดใหม่ หาก POST ตอบ 409 จะโหลดสถานะโต๊ะใหม่และแจ้งให้เลือกโต๊ะอื่น

## API รายการ Show ที่ใช้งานได้

`GET /api/shows` ดึงทุกรายการจากตาราง `shows` เรียงตาม `show_date`, `start_time`, `show_id`:

```json
{
  "data": [
    {
      "show_id": 1,
      "show_date": "2026-10-16",
      "artist": "The Araya Quartet",
      "genre": "Contemporary Jazz",
      "start_time": "20:30"
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
API รายละเอียดคืน `{"data":{...}}` ที่มี 5 ฟิลด์เหมือนแต่ละรายการด้านบน ใช้ HTTP 400 เมื่อ ID ไม่ถูกต้อง, 404 พร้อม `SHOW_NOT_FOUND` เมื่อไม่พบ Show และ 500 เมื่อฐานข้อมูลล้มเหลว
หน้าจองใช้ `show_date` เป็นวันที่จอง (อ่านอย่างเดียวสำหรับ Show ที่เลือก) และตั้งเวลาเข้าเริ่มต้นเป็น `start_time` ผู้ใช้ยังเลือกเวลาเข้าได้
การ์ด Show กับใบยืนยันใช้ `artist` และ `genre` จาก SQL ส่วนการ์ดแสดงวัน/เวลาแทนราคาที่ไม่มีใน schema
หากไม่พบ Show หรือโหลดไม่สำเร็จจะปิดการจองและให้เลือก Show อื่น/ลองใหม่ โดยไม่ใช้วันที่หรือศิลปินตัวอย่างแทน
เปิด `/reserve.html` โดยไม่มี `show_id` ยังจองทั่วไปได้ แต่ต้องเลือกวันที่เอง
การบันทึกการจองยังเก็บ 6 ช่องตามเดิม โดยยังไม่ได้เพิ่ม foreign key `show_id` ในตาราง `reservations`
API เพิ่ม/แก้ไข/ลบ Show สำหรับหน้าแอดมินยังไม่ได้พัฒนา

## API ส่วนอื่น

Endpoints ที่มีแล้ว: `GET /api/health` ตอบ `{"data":{"server":"ok"}}` และ `GET /api/health/db` ตอบ `{"data":{"database":"ok"}}` เมื่อเชื่อม MySQL ได้ หรือ HTTP 503 พร้อม error code `DATABASE_UNAVAILABLE` เมื่อไม่พร้อม

ตารางด้านล่างยังเป็นรายการกลุ่ม API สำหรับงานธุรกิจที่ต้องพัฒนาต่อ ต้องเติม request/response ก่อน implementation

| กลุ่ม | Resource path ที่เสนอ | ผู้ดูแลเบื้องต้น |
| --- | --- | --- |
| ลูกค้า/โต๊ะ/การจอง | `/api/customers`, `/api/tables`, `/api/reservations` | Garnet |
| ศิลปิน/การแสดง/ผู้เข้าชม | `/api/artists`, `/api/shows`, `/api/show-attendance` | Fifa |
| พนักงาน/เวร | `/api/employees`, `/api/employee-shifts` | Mary |
| เมนู/stock | `/api/menu-items` | Mary |
| ออเดอร์/รายการ/ชำระเงิน | `/api/orders`, `/api/orders/:id/items`, `/api/payments` | Garnet |
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
