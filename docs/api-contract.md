# API contract - ร่างสำหรับทีม

ยังไม่มี endpoints ที่ใช้งานได้ ตารางนี้เป็นรายการกลุ่ม API เพื่อแบ่งงาน ต้องเติม request/response ก่อน implementation

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
