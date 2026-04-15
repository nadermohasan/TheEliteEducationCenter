import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Footer from './Footer';
import {
  BookOpen,
  Languages,
  Calculator,
  Globe,
  Laptop,
  Atom,
  Landmark
} from "lucide-react";

// أيقونة الخروج
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// شاشة التحميل الاحترافية
const LoadingScreen = () => (
  <div className="loading-overlay">
    <div className="loading-container">
      <div className="loading-logo-wrapper">
        <img src="https://i.imgur.com/p1hg12H.png" alt="شعار المركز" className="loading-logo" />
      </div>
      <div className="loading-spinner-ring"></div>
      <div className="loading-progress-bar">
        <div className="loading-progress-fill"></div>
      </div>
      <p className="loading-text">جاري تحميل اختبارات الطالب...</p>
      <p className="loading-subtext">مركز النخبة التعليمي</p>
    </div>
    <style>{`
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #f0f4f9 0%, #e0eaf5 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        direction: rtl;
        font-family: 'Cairo', sans-serif;
      }
      .loading-container {
        text-align: center;
        padding: 40px;
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(10px);
        border-radius: 32px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        min-width: 280px;
        animation: fadeInUp 0.5s ease-out;
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .loading-logo-wrapper {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0% { transform: scale(1); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
        50% { transform: scale(1.05); box-shadow: 0 12px 30px rgba(0,0,0,0.15); }
        100% { transform: scale(1); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
      }
      .loading-logo {
        width: 55px;
        height: auto;
      }

      .loading-progress-bar {
        width: 200px;
        height: 6px;
        background: #e2e8f0;
        border-radius: 10px;
        margin: 20px auto;
        overflow: hidden;
      }
      .loading-progress-fill {
        width: 60%;
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        border-radius: 10px;
        animation: loadingProgress 1.5s ease-in-out infinite;
      }
      @keyframes loadingProgress {
        0% { width: 0%; }
        50% { width: 70%; }
        100% { width: 100%; }
      }
      .loading-text {
        font-size: 1rem;
        font-weight: 600;
        color: #1e293b;
        margin: 10px 0 5px;
      }
      .loading-subtext {
        font-size: 0.85rem;
        color: #64748b;
      }
      @media (max-width: 480px) {
        .loading-container {
          padding: 30px;
          min-width: 240px;
        }
        .loading-logo-wrapper {
          width: 60px;
          height: 60px;
        }
        .loading-logo {
          width: 40px;
        }
        .loading-spinner-ring {
          width: 40px;
          height: 40px;
        }
      }
    `}</style>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // دالة الحصول على تصميم المادة بناءً على الاسم
  const getSubjectStyle = useCallback((subjectName) => {
    if (!subjectName) return {
      icon: <BookOpen />,
      bg: 'linear-gradient(135deg, #f1f5f9, #cbd5e1)',
      color: '#334155'
    };

    const name = subjectName.toLowerCase();

    if (name.includes("اللغة الإنجليزية") || name.includes("إنجليز"))
      return {
        icon: <Languages />,
        bg: 'linear-gradient(135deg, #dbeafe, #a5b4fc)',
        color: '#1e3a8a'
      };

    if (name.includes("عربية") || name.includes("لغتي"))
      return {
        icon: <BookOpen />,
        bg: 'linear-gradient(135deg, #fef08a, #facc15)',
        color: '#713f12'
      };

    if (name.includes("رياضيات") || name.includes("حساب"))
      return {
        icon: <Calculator />,
        bg: 'linear-gradient(135deg, #fca5a5, #ef4444)',
        color: '#ffffff'
      };

    if (name.includes("تاريخ"))
      return {
        icon: <Landmark />,
        bg: 'linear-gradient(135deg, #bbf7d0, #4ade80)',
        color: '#14532d'
      };

    if (name.includes("جغرافيا"))
      return {
        icon: <Globe />,
        bg: 'linear-gradient(135deg, #a5f3fc, #22d3ee)',
        color: '#164e63'
      };

    if (name.includes("حاسب") || name.includes("تكنولوجيا"))
      return {
        icon: <Laptop />,
        bg: 'linear-gradient(135deg, #3b82f6, #1e40af)',
        color: '#ffffff'
      };

    if (name.includes("الثقافة العلمية") || name.includes("كيمياء"))
      return {
        icon: <Atom />,
        bg: 'linear-gradient(135deg, #d9f99d, #84cc16)',
        color: '#3f6212'
      };

    return {
      icon: <BookOpen />,
      bg: 'linear-gradient(135deg, #f1f5f9, #cbd5e1)',
      color: '#334155'
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          // جلب ملف المستخدم (الاسم)
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', currentUser.id)
            .maybeSingle(); // استخدام maybeSingle لتجنب الخطأ
            
          if (profileError) {
            console.error('خطأ في جلب بيانات المستخدم:', profileError);
          }
          setUser(profile);
        } else {
          navigate('/login');
          return;
        }

        // جلب المساقات
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('*');

        if (subjectsData) {
          setSubjects(subjectsData);
        }
      } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
      } finally {
        // تأخير بسيط لإظهار شاشة التحميل بشكل طبيعي (اختياري)
        setTimeout(() => setLoading(false), 300);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const displayName = user?.name || 'طالب';

  // عرض شاشة التحميل الاحترافية
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="dashboard-container">
      {/* الشريط العلوي */}
      <header className="dashboard-header">
        <button onClick={handleLogout} className="logout-button">
          <span>خروج</span>
          <span className="logout-icon"><LogoutIcon/></span>
        </button>

        <div className="logo-section">
          <div className="logo-wrapper-dash">
            <img src="https://i.imgur.com/p1hg12H.png" alt="شعار المركز" className="logo-img-dash"/>
          </div>
          <span className="logo-text-dash">مركز النخبة التعليمي</span>
        </div>

        <div className="user-section">
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <img
              src={`https://api.dicebear.com/7.x/avataaars-neutral/svg?seed=${displayName}`}
              alt="Avatar"
              className="user-avatar"
            />
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="dashboard-main">
        <h1>قم بمحاولة أداء الاختبارات الآن!</h1>

        {subjects.length === 0 ? (
          <div className="no-subjects">
            <div className="no-subjects-icon">📚</div>
            <h3>لا توجد مواد متاحة حالياً</h3>
            <p>يرجى التواصل مع الإدارة لإضافة المواد والاختبارات</p>
          </div>
        ) : (
          <div className="subjects-grid">
            {subjects.map((subject) => {
              const style = getSubjectStyle(subject.name);
              return (
                <Link to={`/quiz/${subject.id}`} key={subject.id} className="subject-card-link">
                  <div 
                    className="subject-card"
                    style={{ background: style.bg, color: style.color }}
                  >
                    <div className="card-icon">{style.icon}</div>
                    <span className="card-title">{subject.name}</span>
                    <span className="hover-text">ابدأ الاختبار</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        
        .dashboard-container {
          direction: rtl;
          font-family: 'Cairo', sans-serif;
          background: linear-gradient(180deg, #f0f4f9 0%, #e0eaf5 100%);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .dashboard-header {
          background-color: #ffffff;
          padding: 12px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 0 0 24px 24px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.04);
          margin-bottom: 28px;
          position: sticky;
          top: 0;
          z-index: 1000;
          background: rgba(255,255,255,0.95);
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-right: 13%;
        }

        .logo-wrapper-dash {
          background-color: white;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
        }

        .logo-img-dash {
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
        }

        .logo-text-dash {
          font-weight: 800;
          font-size: 1.2rem;
          color: #1e3a8a;
        }

        .user-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-name {
          font-weight: 600;
          color: #334155;
          font-size: 1rem;
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: #f1f5f9;
          border: 2px solid #e2e8f0;
        }

        .logout-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 8px 18px;
          border-radius: 30px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
        }

        .logout-button:hover {
          background-color: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }
        .logout-icon {
          width: 18px;
          height: 18px;
          display: flex;
        }

        .logout-icon svg {
          width: 100%;
          height: 100%;
        }

        .dashboard-main {
          flex-grow: 1;
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          text-align: center;
        }

        .dashboard-main h1 {
          font-size: 24px;
          color: #1e293b;
          margin-bottom: 40px;
          font-weight: 700;
        }

        .subjects-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .no-subjects {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 24px;
          margin-top: 20px;
        }
        .no-subjects-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.6;
        }
        .no-subjects h3 {
          color: #1e293b;
          margin-bottom: 8px;
        }
        .no-subjects p {
          color: #64748b;
        }

        @media (max-width: 900px) {
          .subjects-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 700px) {
          .dashboard-header {
            padding: 10px 16px;
          }
          .logo-text-dash {
            display: none;
          }
          .logo-section {
            margin-inline-start: 4%;
            margin-right: 0;
          }
        }

        @media (max-width: 500px) {
          .subjects-grid { grid-template-columns: 1fr; }
        }
        
        .subject-card-link {
          text-decoration: none;
        }

        .subject-card {
          border-radius: 16px;
          padding: 35px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          height: 180px;
        }

        .subject-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 20px rgba(0,0,0,0.1);
        }

        .card-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-icon svg {
          width: 100%;
          height: 100%;
        }

        .card-title {
          font-size: 18px;
          font-weight: 700;
          text-align: center;
          z-index: 1;
        }

        .hover-text {
          font-size: 13px;
          font-weight: 600;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
          position: absolute;
          bottom: 20px;
        }

        .subject-card:hover .hover-text {
          opacity: 1;
          transform: translateY(0);
        }

        .subject-card:hover .card-title {
          transform: translateY(-10px);
          transition: transform 0.3s ease;
        }
      `}</style>
    </div>
  );
}