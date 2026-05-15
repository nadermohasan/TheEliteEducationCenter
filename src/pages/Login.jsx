import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import Footer from './Footer';

export default function Auth() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [isAdminVerify, setIsAdminVerify] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const [loginId, setLoginId] = useState('');
  const [signupId, setSignupId] = useState('');
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

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
      toast.error('تعذر جلب بيانات الصلاحيات، راجع الإدارة');
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

  const ensureProfile = async (userId, nationalIdValue, fullNameValue, branchValue, phoneValue) => {
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
          nationalID: nationalIdValue,
          name: fullNameValue,
          role: 'student',
          branch: branchValue,
          phone: phoneValue
        }]);
      if (insertError) throw insertError;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentId = isLoginView ? loginId : signupId;

    if (!currentId.trim()) {
      toast.error('رقم الهوية مطلوب');
      return;
    }

    if (/\s/.test(currentId)) {
      toast.error('رقم الهوية لا يجب أن يحتوي على مسافات');
      return;
    }

    const idRegex = /^\d+$/;
    if (!idRegex.test(currentId)) {
      toast.error('يجب أن يتكون رقم الهوية من أرقام فقط');
      return;
    }

    if (currentId.length !== 9) {
      toast.error('رقم الهوية يجب أن يكون 9 أرقام');
      return;
    }

    if (!isLoginView && !isAdminVerify) {
      if (!fullName.trim()) {
        toast.error('الرجاء إدخال الاسم الرباعي');
        return;
      }
      if (!branch) {
        toast.error('الرجاء اختيار الفرع الدراسي');
        return;
      }
      if (!phone.trim()) {
        toast.error('الرجاء إدخال رقم الجوال');
        return;
      }

      const phoneRegex = /^(059|056)\d{7}$/;
      if (!phoneRegex.test(phone.trim())) {
        toast.error('يرجى إدخال رقم جوال صحيح');
        return;
      }
    }

    const email = `${currentId}@nokhba.local`;

    if (isAdminVerify) {
      if (!adminPassword.trim()) {
        toast.error('الرجاء إدخال كود التأكيد');
        return;
      }
      setLoading(true);
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: adminPassword,
      });

      if (signInError) {
        toast.error('كود التأكيد غير صحيح');
        setLoading(false);
        return;
      }

      if (authData.user) {
        navigate('/admin');
      }
      return;
    }

    setLoading(true);

    if (isLoginView) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('nationalID', currentId)
        .maybeSingle();

      if (profile && profile.role === 'admin') {
        setIsAdminVerify(true);
        setLoading(false);
        return;
      }

      const password = currentId;
      let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

        if (!resetError) {
          toast.error('هذا الحساب يحتاج تحديث. جاري تحويلك لإنشاء حساب...');
          setIsLoginView(false);
          setSignupId(currentId);
          setLoading(false);
          return;
        }

        toast.error('رقم الهوية غير مسجل. الرجاء إنشاء حساب جديد');
        setLoading(false);
        return;
      }

      if (authData.user) {
        try {
          await ensureProfile(authData.user.id, currentId, '', '', '');
          await checkRoleAndRedirect(authData.user.id);
        } catch (err) {
          toast.error('حدث خطأ. يرجى المحاولة مرة أخرى');
          setLoading(false);
        }
      }
    } else {
      const password = currentId;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        if (signUpError.message?.includes('duplicate') || signUpError.message?.includes('already')) {
          toast('هذا الرقم مسجل بالفعل. جاري تسجيل الدخول...');

          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (loginError) {
            toast.error('كلمة المرور غير متطابقة. تواصل مع الإدارة لتحديث الحساب');
            setLoading(false);
            return;
          }

          if (loginData.user) {
            await checkRoleAndRedirect(loginData.user.id);
            return;
          }
        }

        toast.error('يرجى التأكد من صحة البيانات');
        setLoading(false);
        return;
      }

      if (signUpData.user) {
        try {
          await ensureProfile(signUpData.user.id, currentId, fullName, branch, phone);
          await checkRoleAndRedirect(signUpData.user.id);
        } catch (profileError) {
          console.error('فشل إنشاء البروفايل:', profileError);
          toast.error('تم إنشاء الحساب ولكن فشل حفظ الملف الشخصي');
          await supabase.auth.signOut();
          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="auth-page-container">
      {/* ----- قسم اللوجو الاحترافي المحسّن ----- */}
      <div className="top-logo-container">
        <div className="premium-logo-wrapper">
          <img
            src="https://i.imgur.com/hP8TbH5.png"
            alt="النخبة"
            className="premium-logo-img"
          />
        </div>
      </div>

      <div className="auth-card">
        <h1 className="auth-title">
          {isAdminVerify ? 'تأكيد هوية الإدارة' : isLoginView ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
        </h1>

        <form onSubmit={handleSubmit} className="auth-form">
          {isAdminVerify ? (
            <div className="input-group">
              <label>
                <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                كلمة المرور
              </label>
              <div className="input-wrapper">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="•••••••"
                  required
                  className="auth-input"
                  style={{ direction: 'ltr', textAlign: 'right' }}
                />
              </div>
            </div>
          ) : (
            <>
              {!isLoginView && (
                <>
                  <div className="input-group">
                    <label>
                      <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      الاسم الرباعي
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مثال: نادر محمد حسن أبو سليمان"
                        required
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>
                      <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
                      </svg>
                      الفرع الدراسي
                    </label>
                    <div className="input-wrapper">
                      <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        required
                        className="auth-input"
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="" disabled>اختر الفرع</option>
                        <option value="العلمي">العلمي</option>
                        <option value="الأدبي">الأدبي</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>
                      <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                      </svg>
                      رقم الجوال
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="059xxxxxxx :مثال"
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="input-group">
                <label>
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  رقم الهوية
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={isLoginView ? loginId : signupId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\s/g, '');
                      isLoginView ? setLoginId(val) : setSignupId(val);
                    }}
                    placeholder="أدخل رقم الهوية"
                    required
                    className="auth-input"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'جاري التحميل...' : isAdminVerify ? 'تأكيد الدخول' : isLoginView ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </button>
        </form>

        <div className="toggle-view">
          {isAdminVerify ? (
            <p>ليس لديك صلاحيات مدير ؟<span onClick={() => { setIsAdminVerify(false); setAdminPassword(''); }}>تسجيل الدخول</span></p>
          ) : isLoginView ? (
            <p>ليس لديك حساب؟ <span onClick={() => setIsLoginView(false)}>إنشاء حساب جديد</span></p>
          ) : (
            <p>لديك حساب بالفعل؟ <span onClick={() => setIsLoginView(true)}>تسجيل الدخول</span></p>
          )}
        </div>
      </div>
      <Footer />

      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');

  :root {
    color-scheme: light only;
  }

  button {
    font-family: 'Cairo', sans-serif;
  }

  body, html {
    margin: 0;
    padding: 0;
    font-family: 'Cairo', sans-serif;
    background: #eef5ff;
    color: #1e293b;
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

  /* ---------- قسم اللوجو ---------- */

  .top-logo-container {
    position: relative;
    margin-top: 30px;
    margin-bottom: -40px;
    z-index: 20;
    display: flex;
    justify-content: center;
    width: 100%;
    animation: logoEntrance 1.2s cubic-bezier(0.23, 1, 0.32, 1) both;
  }

  .premium-logo-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    filter: drop-shadow(0 15px 35px rgba(74, 138, 218, 0.2));
    transition: all 0.5s ease;
    animation: floating 4s ease-in-out infinite;
  }

  .premium-logo-img {
    width: 260px;
    height: auto;
    display: block;
    position: relative;
    z-index: 2;
    /* اللمعان الناعم على الشعار نفسه */
    -webkit-mask-image: -webkit-radial-gradient(white, black);
  }

  /* لمعان ناعم فوق اللوجو فقط */
  .premium-logo-wrapper::after {
    content: "";
    position: absolute;
    top: 8%;
    left: -35%;
    width: 30%;
    height: 84%;
    background: linear-gradient(
      115deg,
      transparent 0%,
      rgba(255, 255, 255, 0.08) 20%,
      rgba(255, 255, 255, 0.45) 50%,
      rgba(255, 255, 255, 0.08) 80%,
      transparent 100%
    );
    filter: blur(10px);
    transform: skewX(-18deg);
    z-index: 3;
    pointer-events: none;
    animation: shimmer 4.8s ease-in-out infinite;
    mix-blend-mode: screen;
  }

  .premium-logo-wrapper:hover {
    transform: scale(1.04) translateY(-4px);
    filter: drop-shadow(0 20px 45px rgba(74, 138, 218, 0.28));
  }

  /* ---------- الأنيميشن ---------- */

  @keyframes logoEntrance {
    0% {
      opacity: 0;
      transform: translateY(-40px) scale(0.85);
      filter: blur(10px);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  @keyframes floating {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-14px);
    }
  }

  @keyframes shimmer {
    0% {
      left: -35%;
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    50% {
      left: 105%;
      opacity: 1;
    }
    100% {
      left: 105%;
      opacity: 0;
    }
  }

  @keyframes cardFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ---------- الكارد ---------- */

  .auth-card {
    background: white;
    width: 100%;
    max-width: 400px;
    margin-top: 5px;
    padding: 30px;
    border-radius: 20px;
    box-shadow: 0 15px 35px rgba(0,0,0,0.05);
    z-index: 10;
    color: #2c3e50;
    animation: cardFadeIn 1s ease-out 0.3s both;
  }

  .auth-title {
    text-align: center;
    color: #2c3e50;
    margin-bottom: 25px;
    font-size: 22px;
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
    color: #4a5568;
    margin-bottom: 6px;
  }

  .label-icon {
    width: 16px;
    height: 16px;
    color: #4a8ada;
  }

  .input-wrapper input,
  .input-wrapper select {
    width: 100%;
    padding: 12px 15px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-family: 'Cairo', sans-serif;
    font-size: 14px;
    box-sizing: border-box;
    transition: 0.3s;
    background: #f8fafc;
    color: #1e293b;
    text-align: right;
  }

  .input-wrapper input:focus,
  .input-wrapper select:focus {
    outline: none;
    border-color: #4a8ada;
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

  /* ---------- الموبايل ---------- */

  @media (max-width: 480px) {
    .premium-logo-img {
      width: 200px;
    }

    .auth-card {
      padding: 25px 20px;
    }

    .top-logo-container {
      margin-bottom: -30px;
    }
  }
`}</style>

    </div>
  );
}
