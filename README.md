# Attendance Routine

Web application สำหรับค้นหาและออกรายงานข้อมูลเช็คอิน/เช็คเอาท์พนักงาน

- Frontend: React + TypeScript + MUI + Vite
- Backend: ASP.NET Core 8 Web API + Entity Framework Core 8
- Database: SQL Server (`Attendances` และ `Employees`)
- Excel: ดาวน์โหลดจากหน้าจอและสร้างอัตโนมัติทุกวันเวลา 09:00 น. (Asia/Bangkok)

## 1. ตั้งค่าฐานข้อมูล

แนะนำให้ส่ง connection string ผ่าน environment variable และไม่ commit รหัสผ่านลง Git:

```powershell
$env:ConnectionStrings__AttendanceDb = "Server=YOUR_SERVER;Database=YOUR_DATABASE;User ID=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=True"
```

อีกทางหนึ่ง ให้คัดลอก `backend/AttendanceRoutine.Api/appsettings.Local.example.json` เป็น `appsettings.Local.json` แล้วกรอกค่าจริง ไฟล์ local นี้ถูก ignore โดย Git แล้ว

ระบบจะตรวจหาคอลัมน์ชื่อที่พบบ่อยให้อัตโนมัติ หาก schema จริงใช้ชื่ออื่น ให้ระบุ mapping ใน `appsettings.Local.json`:

```json
{
  "DatabaseMapping": {
    "AttendanceIdColumn": "Id",
    "AttendanceEmployeeKeyColumn": "EmployeeId",
    "CheckInColumn": "CheckIn",
    "CheckOutColumn": "CheckOut",
    "EmployeeKeyColumn": "Id",
    "EmployeeCodeColumn": "EmployeeCode",
    "EmployeeNameColumn": "FullName",
    "DepartmentColumn": "Department"
  }
}
```

## 2. รัน Backend

ต้องติดตั้ง .NET 8 SDK:

```powershell
dotnet restore AttendanceRoutine.sln
dotnet run --project backend/AttendanceRoutine.Api
```

- API: `http://localhost:5187`
- Swagger: `http://localhost:5187/swagger`
- ตรวจ DB/schema: `http://localhost:5187/api/health`

## 3. รัน Frontend

ต้องติดตั้ง Node.js 20+ และ pnpm:

```powershell
cd frontend
pnpm install
pnpm dev
```

เปิด `http://localhost:5173` โดย Vite จะ proxy `/api` ไป Backend อัตโนมัติ

## 4. Excel ประจำวัน

ค่าเริ่มต้นอยู่ใน `appsettings.json`:

- รันเวลา 09:00 น. ตาม timezone Asia/Bangkok
- สร้างรายงานของวันก่อนหน้า (`DaysOffset: -1`) เพื่อให้ข้อมูลเช็คเอาท์ครบ
- เก็บไฟล์ที่ `Attendance_Report/Attendance_yyyy-MM-dd.xlsx` ภายใต้โฟลเดอร์ `Report`
- ถ้าต้องการรายงานของวันปัจจุบัน ให้เปลี่ยน `DaysOffset` เป็น `0`
- Service ต้องรันอยู่ต่อเนื่องในเวลา 09:00 น.; สำหรับ production ควรรันเป็น Windows Service, IIS Application Pool ที่ AlwaysRunning หรือ container ที่มี restart policy

สร้างไฟล์รายวันด้วยตนเองได้ที่ `POST /api/reports/daily/{yyyy-MM-dd}` และดาวน์โหลดตามตัวกรองได้ที่ `GET /api/attendances/export`

หน้า `Setting` บน Web สามารถเปิด/ปิด Auto Excel, กำหนดเวลารัน, เลือกข้อมูลของวันปัจจุบันหรือวันก่อนหน้า และ Browse เพื่อเลือกโฟลเดอร์จัดเก็บภายในโฟลเดอร์ `Report` ได้ ค่าที่บันทึกจะเก็บที่ `backend/AttendanceRoutine.Api/App_Data/report-settings.json` และ scheduler จะรับค่าใหม่ระหว่างที่ Service ทำงาน

## ข้อควรระวังสำหรับ Production

- สร้าง SQL login แบบ read-only เฉพาะฐานข้อมูล/ตารางที่ใช้ แทนบัญชี `sa`
- เก็บ connection string ใน environment variable หรือ secret manager
- จำกัด CORS, เพิ่ม authentication/authorization และให้บริการผ่าน HTTPS
- ให้สิทธิ์เขียนเฉพาะโฟลเดอร์ Export แก่ account ที่รัน service

## Troubleshooting การเชื่อม SQL Server

ถ้า `/api/health` ตอบว่า database unreachable ให้ตรวจว่า SQL Server เปิด TCP/IP และ firewall แล้ว รวมถึงตรวจชื่อ instance/port ที่ใช้งานจริง หากไม่ใช่ default instance ให้เปลี่ยน `Server` เป็น `192.168.11.100\\INSTANCE_NAME` หรือ `192.168.11.100,PORT` ใน connection string
