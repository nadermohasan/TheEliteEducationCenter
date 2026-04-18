import { HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import Login from "./pages/Login";
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import Dashboard from "./pages/Dashboard";
import QuizPage from './pages/QuizPage';
import QuizResult from './pages/QuizResult';

export default function App() {
  return (
    <>
      <Toaster 
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: { fontFamily: 'Cairo, sans-serif' },
        }}
      />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/quiz/:subjectId" element={<QuizPage />} />
          <Route path="/result" element={<QuizResult />} />
          <Route path="*" element={
            <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'Cairo' }}>
              <h1>404</h1>
              <p>عذراً، هذه الصفحة غير موجودة.</p>
              <a href="#/">العودة للرئيسية</a>
            </div>
          } />
        </Routes>
      </HashRouter>
    </>
  );
}