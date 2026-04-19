# 🚀 Elite Education Center | نظام الاختبارات الإلكترونية

> منصة احترافية لإدارة الاختبارات، الطلاب، وبنك الأسئلة — مصممة لتجربة سريعة، مرنة، وقابلة للتوسع.

![status](https://img.shields.io/badge/status-active-success)
![tech](https://img.shields.io/badge/stack-React%20%7C%20Supabase-blue)
![license](https://img.shields.io/badge/license-MIT-green)

---

## ✨ لماذا هذا المشروع مميز؟

- ⚡ تجربة مستخدم سريعة (Vite + React 18)
- 🔐 نظام مصادقة وصلاحيات متكامل (طالب / معلم / Admin)
- 🧠 بنك أسئلة ذكي وقابل للتوسع
- 📊 نتائج فورية وتحليل أداء
- ☁️ Backend كامل بدون سيرفر (Supabase)

---

## 🎯 نظرة عامة

منصة **Elite Education Center** تم تصميمها لحل مشكلة إدارة الاختبارات التقليدية وتحويلها إلى تجربة رقمية متكاملة:

- إدارة المستخدمين والمواد
- إنشاء اختبارات ديناميكية
- تتبع أداء الطلاب
- دعم العمل حتى مع انقطاع الاتصال

---

## 🖥️ Demo (لقطة سريعة)

> قريباً سيتم إضافة رابط مباشر + Screenshots

---

## 🧩 المميزات

### 👨‍🎓 الطالب
- دخول سريع + إنشاء حساب
- واجهة بسيطة وسهلة
- اختبار بمؤقت زمني ⏱️
- حفظ تلقائي للإجابات
- استئناف عند انقطاع الإنترنت
- عرض النتائج فوراً مع تحليل الإجابات

### 👩‍🏫 المعلم
- إدارة بنك الأسئلة بالكامل
- رفع أسئلة بالجملة (Excel / JSON)
- إدارة نصوص القراءة (English exams)
- تخصيص كل مادة (مدة + عدد الأسئلة)
- تفعيل/تعطيل مجموعات الأسئلة

### 🛠️ Admin
- إدارة المستخدمين
- التحكم في محاولات الطلاب
- Dashboard بإحصائيات مباشرة

---

## 🧰 Tech Stack

- **Frontend:** React 18 + Vite
- **Routing:** React Router DOM
- **Backend:** Supabase
- **Auth & DB:** Supabase Auth + PostgreSQL
- **UI:** Lucide Icons + CSS-in-JS
- **Notifications:** React Hot Toast
- **Data Handling:** XLSX

---

## ⚙️ Quick Start

### 1️⃣ Clone
```bash
git clone <repository-url>
cd elite-exam-system
```

### 2️⃣ Install
```bash
npm install
```

### 3️⃣ Environment
```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### 4️⃣ Run
```bash
npm run dev
```

---

## 🗄️ Database Design

| Table | Description |
|------|------------|
| profiles | Users & roles |
| subjects | Subjects config |
| questions | Question bank |
| passages | Reading content |
| attempts | Exam sessions |
| attempt_questions | سوال لكل محاولة |
| results | Final results |

---

## 📁 Project Structure

```
src/
├── pages/
├── components/
├── supabaseClient.js
├── App.jsx
└── main.jsx
```

---

## 📈 مستقبل المشروع

- 🔹 إضافة AI لتوليد الأسئلة
- 🔹 تحليل أداء متقدم للطلاب
- 🔹 دعم موبايل (React Native)
- 🔹 نظام تقارير PDF

---

## 🤝 Contributing

Pull requests مرحب بها ❤️

---

## 👨‍💻 Developer

**Nader Sulieman**  
- GitHub  
- LinkedIn  

---

## ⭐ If you like this project

اعمل ⭐ للمشروع على GitHub — ده بيساعد جداً 🙌
