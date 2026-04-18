import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import Footer from './Footer';

export default function Auth() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from || '/dashboard';

  const checkRoleAndRedirect = async (userId) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      toast.error('تعذر جلب بيانات الصلاحيات، راجع الإدارة.');
      setLoading(false);
      return false;
    }

    if (profile.role === 'admin') {
      navigate('/admin');
    } else if (profile.role === 'teacher') {
      navigate('/teacher');
    } else {
      navigate(from, { replace: true });
    }
    return true;
  };

  const ensureProfile = async (userId, usernameValue, fullNameValue) => {
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          username: usernameValue,
          name: fullNameValue,
          role: 'student'
        }]);
      if (insertError) throw insertError;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      toast.error('اسم المستخدم مطلوب');
      return;
    }

    setLoading(true);
    const email = `${username.toLowerCase().replace(/\s/g, '')}@nokhba.local`;

    if (isLoginView) {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        toast.error('اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }
      
      if (authData.user) {
        try {
          await ensureProfile(authData.user.id, username, fullName || username);
          await checkRoleAndRedirect(authData.user.id);
        } catch (err) {
          toast.error('حدث خطأ في تجهيز حسابك. يرجى المحاولة مرة أخرى');
          setLoading(false);
        }
      }
    } else {
      if (!fullName.trim()) {
        toast.error('الرجاء إدخال الاسم الرباعي');
        setLoading(false);
        return;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        toast.error('يرجى التأكد من صحة البيانات المدخلة');
        setLoading(false);
        return;
      }
      
      if (authData.user) {
        try {
          await ensureProfile(authData.user.id, username, fullName);
          await checkRoleAndRedirect(authData.user.id);
        } catch (profileError) {
          console.error('فشل إنشاء البروفايل:', profileError);
          toast.error('تم إنشاء الحساب ولكن فشل حفظ الملف الشخصي. يرجى التواصل مع الدعم الفني');
          await supabase.auth.signOut();
          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="auth-page-container">
      <div className="top-logo-container">
        <div className="top-logo-content">
          <div className="logo-image-wrapper">
            <img src="https://i.imgur.com/p1hg12H.png" alt="شعار مركز النخبة" className="logo-image" />
          </div>
          <div className="logo-text-group">
            <span className="logo-text">مركز النخبة التعليمي</span>
            <span className="logo-slogan">The Elite Education Center</span>
          </div>
        </div>
      </div>

      <div className="auth-card">
        <h1 className="auth-title">{isLoginView ? 'تسجيل الدخول الموحد' : 'إنشاء حساب جديد'}</h1>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          
          {!isLoginView && (
            <div className="input-group">
              <label>
                الاسم الرباعي
                <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ادخل اسمك الرباعي"
                  required={!isLoginView}
                  className="auth-input"
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label>
              اسم المستخدم
              <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: nader"
                required
                className="auth-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label>
              كلمة المرور
              <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </label>
            <div className="input-wrapper">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="auth-input"
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'جاري التحميل...' : (isLoginView ? 'تسجيل الدخول' : 'إنشاء حساب')}
          </button>
        </form>

        <div className="toggle-view">
          {isLoginView ? (
            <p>ليس لديك حساب؟ <span onClick={() => setIsLoginView(false)}>إنشاء حساب طالب جديد</span></p>
          ) : (
            <p>لديك حساب بالفعل؟ <span onClick={() => setIsLoginView(true)}>تسجيل الدخول</span></p>
          )}
        </div>
      </div>
      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
        
<<<<<<< HEAD
        /* إجبار التصميم على استخدام الألوان الفاتحة وتجاهل Dark Mode */
        :root {
          color-scheme: light only;
        }
        
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Cairo', sans-serif;
          background: #eef5ff; /* خلفية فاتحة ثابتة */
          color: #1e293b; /* لون نص أساسي */
        }

        .auth-page-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          direction: rtl;
          background: linear-gradient(135deg, #eef5ff 0%, #d8e8fc 100%);
          position: relative;
          padding: 20px;
          box-sizing: border-box;
        }

        .top-logo-container {
          position: absolute;
          top: 30px;
          display: flex;
          justify-content: center;
          width: 100%;
          z-index: 5;
        }

        .top-logo-content {
          display: flex;
          align-items: center;
          gap: 15px;
          color: #1a4f8b;
        }

        .logo-text-group {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .logo-text {
          font-size: 24px;
          font-weight: 700;
          color: #1a4f8b; /* لون ثابت */
          line-height: 1.3;
        }

        .logo-slogan {
          font-size: 15px;
          font-weight: 500;
          color: #3a6ea5;
          letter-spacing: 0.5px;
          margin-top: 2px;
          margin-right: 9%;
        }

        .logo-image-wrapper {
          background: white;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .logo-image {
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
        }

        .auth-card {
          background: white;
          width: 100%;
          max-width: 400px;
          margin-top: 130px; /* زيادة قليلاً لاستيعاب الشعار مع الشعار الفرعي */
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.05);
          z-index: 10;
          color: #2c3e50; /* لون النص داخل البطاقة */
        }

        .auth-title {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 25px;
          font-size: 22px;
        }

        .error-alert {
          background: #fff5f5;
          color: #e74c3c;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 15px;
          border: 1px solid #fed7d7;
          font-size: 13px;
          text-align: center;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .input-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #4a5568; /* لون ثابت */
          margin-bottom: 6px;
        }

        .label-icon {
          width: 16px;
          height: 16px;
          color: #4a8ada;
        }

        .input-wrapper input {
          width: 100%;
          padding: 12px 15px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-family: 'Cairo', sans-serif;
          font-size: 14px;
          box-sizing: border-box;
          transition: 0.3s;
          background: #f8fafc;
          color: #1e293b; /* لون النص داخل الحقل - مهم جداً */
          -webkit-text-fill-color: #1e293b; /* يجبر اللون في متصفحات WebKit */
        }

        /* مكان العنصر النائب (placeholder) */
        .input-wrapper input::placeholder {
          color: #94a3b8;
          opacity: 1; /* مهم في بعض المتصفحات */
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: #4a8ada;
          background: white;
          box-shadow: 0 0 0 3px rgba(74, 138, 218, 0.1);
        }

        .submit-btn {
          width: 100%;
          padding: 12px;
          background: #4a8ada;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.3s;
          margin-top: 10px;
        }

        .submit-btn:hover {
          background: #3b76c4;
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          background: #cbd5e0;
          cursor: not-allowed;
        }

        .toggle-view {
          text-align: center;
          margin-top: 20px;
          font-size: 14px;
          color: #4a5568;
        }

        .toggle-view span {
          color: #4a8ada;
          cursor: pointer;
          font-weight: 700;
          margin-right: 5px;
        }

        .toggle-view span:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .auth-card { padding: 25px 20px; }
          .logo-text { font-size: 20px; }
          .logo-slogan { font-size: 12px; }
          .logo-image-wrapper { width: 60px; height: 60px; }
          .top-logo-content { gap: 10px; }
        }
=======
        :root { color-scheme: light only; }
        body, html { margin: 0; padding: 0; font-family: 'Cairo', sans-serif; background: #eef5ff; color: #1e293b; }
        .auth-page-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; direction: rtl; background: linear-gradient(135deg, #eef5ff 0%, #d8e8fc 100%); position: relative; padding: 20px; box-sizing: border-box; }
        .top-logo-container { position: absolute; top: 30px; display: flex; justify-content: center; width: 100%; z-index: 5; }
        .top-logo-content { display: flex; align-items: center; gap: 15px; color: #1a4f8b; }
        .logo-text-group { display: flex; flex-direction: column; align-items: flex-start; }
        .logo-text { font-size: 24px; font-weight: 700; color: #1a4f8b; line-height: 1.3; }
        .logo-slogan { font-size: 15px; font-weight: 500; color: #3a6ea5; letter-spacing: 0.5px; margin-top: 2px; margin-right: 9%; }
        .logo-image-wrapper { background: white; width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
        .logo-image { max-width: 90%; max-height: 90%; object-fit: contain; }
        .auth-card { background: white; width: 100%; max-width: 400px; margin-top: 130px; padding: 30px; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.05); z-index: 10; color: #2c3e50; }
        .auth-title { text-align: center; color: #2c3e50; margin-bottom: 25px; font-size: 22px; }
        .error-alert { background: #fff5f5; color: #e74c3c; padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #fed7d7; font-size: 13px; text-align: center; }
        .auth-form { display: flex; flex-direction: column; gap: 18px; }
        .input-group label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #4a5568; margin-bottom: 6px; }
        .label-icon { width: 16px; height: 16px; color: #4a8ada; }
        .input-wrapper input { width: 100%; padding: 12px 15px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-family: 'Cairo', sans-serif; font-size: 14px; box-sizing: border-box; transition: 0.3s; background: #f8fafc; color: #1e293b; -webkit-text-fill-color: #1e293b; }
        .input-wrapper input::placeholder { color: #94a3b8; opacity: 1; }
        .input-wrapper input:focus { outline: none; border-color: #4a8ada; background: white; box-shadow: 0 0 0 3px rgba(74, 138, 218, 0.1); }
        .submit-btn { width: 100%; padding: 12px; background: #4a8ada; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; transition: 0.3s; margin-top: 10px; }
        .submit-btn:hover { background: #3b76c4; transform: translateY(-1px); }
        .submit-btn:disabled { background: #cbd5e0; cursor: not-allowed; }
        .toggle-view { text-align: center; margin-top: 20px; font-size: 14px; color: #4a5568; }
        .toggle-view span { color: #4a8ada; cursor: pointer; font-weight: 700; margin-right: 5px; }
        .toggle-view span:hover { text-decoration: underline; }
        @media (max-width: 480px) { .auth-card { padding: 25px 20px; } .logo-text { font-size: 20px; } .logo-slogan { font-size: 12px; } .logo-image-wrapper { width: 60px; height: 60px; } .top-logo-content { gap: 10px; } }
>>>>>>> bd51822 (update project)
      `}</style>
    </div>
  );
}
