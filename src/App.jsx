import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AccessLinkHandler from './pages/AccessLinkHandler';
import QuizPage from './pages/QuizPage';
import QuizResult from './pages/QuizResult'; // إضافة استيراد صفحة النتائج
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* صفحات الدخول */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/access/:token" element={<AccessLinkHandler />} />

        {/* لوحات التحكم الخاصة بالأدوار المختلفة */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />

        {/* صفحات الاختبار والنتائج */}
        <Route path="/quiz/:subjectId" element={<QuizPage />} />
        <Route path="/result" element={<QuizResult />} /> 

        {/* صفحة تنبيه للمسارات غير الموجودة (اختياري) */}
        <Route path="*" element={
          <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'Cairo' }}>
            <h1>404</h1>
            <p>عذراً، هذه الصفحة غير موجودة.</p>
            <a href="/">العودة للرئيسية</a>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}