import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AccessLinkHandler() {
  const { token } = useParams(); // يستخرج الـ token من الرابط (مثال: ABC123)
  const navigate = useNavigate();
  const location = useLocation();

  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      // 1. التحقق من وجود جلسة مستخدم (مسجل دخوله)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // 2. إذا لم يكن مسجلاً، أعد توجيهه لصفحة الدخول مع حفظ هذا الرابط
        navigate('/login', { state: { from: location.pathname }, replace: true });
        return;
      }

      // 3. إذا كان مسجلاً، تحقق من صلاحية الرابط في قاعدة البيانات
      const { data: linkData, error } = await supabase
        .from('access_links')
        .select('*')
        .eq('token', token)
        .eq('student_id', session.user.id) // الأهم: التأكد أن الرابط يخص هذا الطالب
        .single(); // نتوقع وجود رابط واحد فقط أو لا شيء

      if (error || !linkData) {
        setErrorMessage('هذا الرابط غير صالح، منتهي الصلاحية، أو لا يخص حسابك.');
        setStatus('error');
      } else if (linkData.is_active) {
        // 4. الرابط صالح! احفظه في المتصفح وانتقل للوحة التحكم
        localStorage.setItem('active_quiz_token', token); // سنستخدمه لاحقاً
        setStatus('success');
        // تأخير بسيط قبل التوجيه لإعطاء إحساس بالتحميل
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        setErrorMessage('تم تعطيل هذا الرابط. يرجى مراجعة الإدارة.');
        setStatus('error');
      }
    };

    validateToken();
  }, [token, navigate, location]);

  // عرض واجهة بسيطة للمستخدم أثناء التحقق
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return <p>جاري التحقق من صلاحية الرابط...</p>;
      case 'success':
        return <p>تم التحقق بنجاح! جاري توجيهك إلى لوحة التحكم...</p>;
      case 'error':
        return (
          <>
            <h2>خطأ في الوصول</h2>
            <p>{errorMessage}</p>
            <Link to="/dashboard" className="back-link">العودة إلى لوحة التحكم</Link>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="status-container">
      <div className="status-card">
        {renderContent()}
      </div>
      <style>{`
        .status-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #f4f7f9;
          font-family: 'Cairo', sans-serif;
          direction: rtl;
        }
        .status-card {
          background-color: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          text-align: center;
          max-width: 400px;
        }
        .status-card h2 {
          color: #e74c3c;
          margin-bottom: 15px;
        }
        .status-card p {
          font-size: 16px;
          color: #34495e;
          line-height: 1.6;
        }
        .back-link {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            transition: background-color 0.3s;
        }
        .back-link:hover {
            background-color: #2980b9;
        }
      `}</style>
    </div>
  );
}
