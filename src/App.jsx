import { HashRouter, Routes, Route } from "react-router-dom"; // ⬅️ تم تغيير BrowserRouter إلى HashRouter
import Login from "./pages/Login";
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import Dashboard from "./pages/Dashboard";
import QuizPage from './pages/QuizPage';
import QuizResult from './pages/QuizResult';

export default function App() {
  return (
    <HashRouter>  {/* ⬅️ تم الاستبدال هنا */}
      <Routes>
        {/* صفحات الدخول */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* لوحات التحكم الخاصة بالأدوار المختلفة */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />

        {/* صفحات الاختبار والنتائج */}
        <Route path="/quiz/:subjectId" element={<QuizPage />} />
        <Route path="/result" element={<QuizResult />} /> 

        {/* صفحة تنبيه للمسارات غير الموجودة */}
        <Route path="*" element={
          <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'Cairo' }}>
            <h1>404</h1>
            <p>عذراً، هذه الصفحة غير موجودة.</p>
            <a href="#/">العودة للرئيسية</a>  {/* ⬅️ استخدم href="#/" بدلاً من "/" */}
          </div>
        } />
      </Routes>
    </HashRouter>
  );
}