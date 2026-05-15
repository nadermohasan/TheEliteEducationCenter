// Navbar.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default function Navbar({ userName = 'مستخدم', role = 'student' }) {
  const navigate = useNavigate();
  const [branch, setBranch] = useState('');

  useEffect(() => {
    const fetchBranch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('branch')
          .eq('id', user.id)
          .maybeSingle();
        setBranch(profile?.branch || '');
      }
    };
    fetchBranch();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const nameParts = userName.trim().split(/\s+/);
  let displayName = nameParts[0];
  if (nameParts.length > 1) {
    const lastIdx = nameParts.length - 1;
    const secondToLast = nameParts[lastIdx - 1];
    const compoundPrefixes = ['أبو', 'ابو'];
    if (compoundPrefixes.includes(secondToLast) && nameParts.length > 2) {
      displayName = `${nameParts[0]} ${secondToLast} ${nameParts[lastIdx]}`;
    } else {
      displayName = `${nameParts[0]} ${nameParts[lastIdx]}`;
    }
  }

  return (
    <>
      <header className="dashboard-header">
        {/* زر الخروج - اليسار */}
        <div className="header-left">
          <button onClick={handleLogout} className="logout-button">
            <span className="logout-text">خروج</span>
            <span className="logout-icon"><LogoutIcon /></span>
          </button>
        </div>

        {/* الشعار - المنتصف */}
        <div className="logo-section">
          <div className="logo-wrapper-dash">
            <div className="logo-glow"></div>
            <img src="https://i.imgur.com/hP8TbH5.png" alt="شعار المركز" className="logo-img-dash" />
          </div>
        </div>

        {/* معلومات المستخدم - اليمين */}
        <div className="user-section">
          <div className="user-info">
            <div className="user-text">
              <span className="user-name">{displayName}</span>
            </div>
            <div className="user-avatar">
              <UserIcon />
            </div>
          </div>
        </div>
      </header>

      <style>{`
        .dashboard-header {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 10px 24px;
          display: grid;
          /* تقسيم الشاشة لـ 3 أجزاء متساوية لضمان توسيط اللوجو */
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          border-radius: 0 0 24px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 0;
          z-index: 1000;
          direction: rtl;
        }

        .header-left { display: flex; justify-content: flex-start; }
        .user-section { display: flex; justify-content: flex-end; }

        /* ========== Logo Section ========== */
        .logo-section {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-wrapper-dash {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
        }

        .logo-img-dash {
          height: 50px;
          width: auto;
          object-fit: contain;
          position: relative;
          z-index: 2;
        }

        /* ========== User Section ========== */
        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 100%;
        }

        .user-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.9rem;
          font-family: 'Cairo', sans-serif;
          /* ضمان سطر واحد */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px; /* لضمان عدم تداخل النص مع اللوجو في الموبايلات الصغيرة جداً */
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #f1f5f9;
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          flex-shrink: 0; /* منع انضغاط الصورة */
        }

        /* ========== Logout Button ========== */
        .logout-button {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #fff;
          border: 1px solid #fee2e2;
          color: #dc2626;
          padding: 8px 14px;
          border-radius: 12px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-button:hover {
          background-color: #fef2f2;
          transform: translateY(-1px);
        }

        /* ========== Responsive - Mobile ========== */
        @media (max-width: 768px) {
          .dashboard-header {
            padding: 8px 12px;
            grid-template-columns: 1fr auto 1fr; /* الحفاظ على التوزيعه لتوسيط اللوجو */
          }
          
          .logo-img-dash {
            height: 40px;
          }

          .logout-text {
            display: inline-block; /* ضمان ظهور الكلمة */
            font-size: 0.8rem;
          }

          .logout-button {
            padding: 6px 10px;
            border-radius: 10px;
          }

          .user-name {
            font-size: 0.8rem;
            max-width: 80px; /* تصغير المساحة المتاحة للاسم في الموبايل */
          }

          .user-avatar {
            width: 35px;
            height: 35px;
          }
        }

        @media (max-width: 380px) {
            .logout-text { font-size: 0.75rem; }
            .user-name { display: none; } /* في الموبايلات الضيقة جداً، نكتفي بالأفاتار للحفاظ على اللوجو في النص */
        }
      `}</style>
    </>
  );
}
