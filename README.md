
# 🕊️ SUPERAI-INNOVATOR-@KMITL  
> ระบบ AI ตรวจจับนกพิราบจากภาพโดรนแบบเรียลไทม์

โครงการนี้พัฒนาระบบปัญญาประดิษฐ์โดยใช้ **YOLOv11** เพื่อตรวจจับนกพิราบจากภาพหรือวิดีโอของโดรนแบบเรียลไทม์  
ช่วยเพิ่มความปลอดภัยในการบิน โดยเฉพาะบริเวณ **รันเวย์** และ **ลานจอดเครื่องบิน** ที่นกพิราบอาจก่อให้เกิดอันตรายได้

---

## 📌 ข้อกำหนดเบื้องต้น

- 🐍 Python 3.x  
- 📦 pip  
- 🧪 virtualenv *(แนะนำให้ใช้)*

---

## 🛠️ การติดตั้ง

### 1️⃣ สร้างและเปิดใช้งาน Virtual Environment

```bash
# สร้าง virtual environment
python -m venv myenv

# เปิดใช้งาน virtual environment
# สำหรับ Windows
myenv\Scripts\activate

# สำหรับ Linux / macOS
source myenv/bin/activate
```

### 2️⃣ ติดตั้ง Dependencies

```bash
pip install -r Web/requirements.txt
```

---

## 🧠 การเทรนโมเดล YOLOv11

1. 📂 ไปที่โฟลเดอร์ `AI/Train`  
2. 📘 เปิดไฟล์ `train_Yolo11.ipynb`  
3. ✏️ แก้ไขเส้นทางชุดข้อมูลและพารามิเตอร์ตามคำแนะนำในโน้ตบุ๊ก  
4. ▶️ รันโค้ดเพื่อเริ่มการเทรน

📌 **หมายเหตุ:** สามารถทดสอบโมเดลที่เทรนแล้วได้โดยใช้ `test.ipynb`

---

## 🌐 การรันเว็บแอปพลิเคชัน

### 1️⃣ เปิดเซิร์ฟเวอร์ด้วยคำสั่ง

```bash
cd Web/
uvicorn backend.app.main:app --reload --port 8000
```

### 2️⃣ เข้าใช้งานที่

[http://localhost:8000](http://localhost:8000)

---

## 🚀 การใช้งาน

### 🔹 เทรนโมเดล
- ตรวจสอบว่าโฟลเดอร์ `AI/Datasets/` มีข้อมูล
- เปิด `train_Yolo11.ipynb` และรันตามคำแนะนำ

### 🔹 ทดสอบโมเดล
- ใช้ `test.ipynb` เพื่อทดลองกับภาพ/วิดีโอจริง

### 🔹 รันเว็บแอป
```bash
cd Web/
uvicorn backend.app.main:app --reload --port 8000
```
- อัปโหลดภาพหรือวิดีโอที่ต้องการตรวจจับไปยัง `Assets/Video`
- เข้าดูผลลัพธ์แบบเรียลไทม์ผ่านหน้าเว็บ

---

## 📂 โครงสร้างโปรเจกต์

```
SUPERAI-INNOVATOR-@KMITL/
│
├── AI/
│   ├── Train/
│   │   ├── train_Yolo11.ipynb
│   │   └── test.ipynb
│
├── Assets/
│   └── Video/
│
├── Web/
│   ├── backend/
│   │   └── app/
│   │       └── main.py
│   └── requirements.txt
│
└── README.md
```

---

## 😂 Coding !Is Happy

![Funny Pigeon](https://media.giphy.com/media/jUwpNzg9IcyrK/giphy.gif)