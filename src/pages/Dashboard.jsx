import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  BookOpen,
  Languages,
  Calculator,
  Globe,
  Laptop,
  Atom,
  Landmark,
  LogOut
} from "lucide-react";

// --- أيقونات SVG المصممة خصيصاً لتطابق التصميم ---
const Icons = {
  English: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 12h18" /><path d="M12 5v14" /><path d="M8 8.5h2M7 11.5l2-3 2 3" /><path d="M15 11.5v-3h2.5" /></svg>,
  Arabic: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15H6.5a2.5 2.5 0 0 0 0 5H20" /><path d="M8 7h6" /><path d="M8 11h8" /></svg>,
  Math: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8" /><path d="M8 10h8" /><path d="M8 14h8" /><path d="M8 18h8" /></svg>,
  History: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16" /><path d="M4 2h16" /><path d="M6 2v20" /><path d="M10 2v20" /><path d="M14 2v20" /><path d="M18 2v20" /></svg>,
  Islamic: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /><circle cx="15" cy="9" r="1" fill="currentColor" /></svg>,
  Geography: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  IT: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /><circle cx="12" cy="10" r="2" /><path d="M12 8V6" /><path d="M12 14v-2" /><path d="M10 10H8" /><path d="M16 10h-2" /></svg>,
  Science: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(135 12 12)" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>,
  Default: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
};
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // تعريف الألوان والتنسيقات الأساسية
  const stylesConfig = {
    english: { bg: 'linear-gradient(135deg, #dbeafe, #a5b4fc)', color: '#1e3a8a', icon: <Icons.English /> },
    arabic: { bg: 'linear-gradient(135deg, #fef08a, #facc15)', color: '#713f12', icon: <Icons.Arabic /> },
    math: { bg: 'linear-gradient(135deg, #fca5a5, #ef4444)', color: '#ffffff', icon: <Icons.Math /> },
    history: { bg: 'linear-gradient(135deg, #bbf7d0, #4ade80)', color: '#14532d', icon: <Icons.History /> },
    islamic: { bg: 'linear-gradient(135deg, #e9d5ff, #c084fc)', color: '#4c1d95', icon: <Icons.Islamic /> },
    geography: { bg: 'linear-gradient(135deg, #a5f3fc, #22d3ee)', color: '#164e63', icon: <Icons.Geography /> },
    it: { bg: 'linear-gradient(135deg, #3b82f6, #1e40af)', color: '#ffffff', icon: <Icons.IT /> },
    science: { bg: 'linear-gradient(135deg, #d9f99d, #84cc16)', color: '#3f6212', icon: <Icons.Science /> },
    default: { bg: 'linear-gradient(135deg, #f1f5f9, #cbd5e1)', color: '#334155', icon: <Icons.Default /> }
  };

const getSubjectStyle = (subjectName) => {
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
};
  
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        // جلب ملف المستخدم (الاسم)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', currentUser.id)
          .single();
          
        if (profileError) {
            console.error('خطأ في جلب بيانات المستخدم (تأكد من RLS في Supabase):', profileError);
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
      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div className="loading-screen">جاري تحميل لوحة التحكم...</div>;
  }

  // إذا لم يجد الاسم، سيعرض 'طالب'
  const displayName = user?.name || 'طالب';

  return (
    <div className="dashboard-container">
      {/* الشريط العلوي */}
      <header className="dashboard-header">
        <div className="logo-section">
  <div className="logo-wrapper-dash">
    <img 
      src="https://i.imgur.com/p1hg12H.png" 
      alt="شعار المركز" 
      className="logo-img-dash"
    />
  </div>
  <span className="logo-text-dash">مركز النخبة التعليمي</span>
</div>
        
        <div className="center-title">
          لوحة تحكم الاختبارات التعليمية
        </div>

        <div className="user-section">
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <img src={`https://api.dicebear.com/7.x/avataaars-neutral/svg?seed=${displayName}`} alt="Avatar" className="user-avatar"/>
          </div>
          <button onClick={handleLogout} className="logout-button">
  خروج
  <span className="logout-icon">
    <LogoutIcon />
  </span>
</button>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="dashboard-main">
        <h1>قم بمحاولة أداء الاختبارات الآن!</h1>

        <div className="subjects-grid">
          {subjects.map((subject) => {
            // استخدام الوظيفة الذكية للحصول على التصميم
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
      </main>

      {/* الشريط السفلي */}
      <footer className="dashboard-footer">
        <p>2026 Nader Mohamed &copy;</p>
        <p>جميع الحقوق محفوظة - مركز النخبة التعليمي</p>
      </footer>
      
      {/* التنسيقات */}
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
          border-radius: 0 0 20px 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
          margin-bottom: 30px;
        }

        /* تنسيق حاوية اللوجو الجديدة في الداشبورد */
.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-wrapper-dash {
  background-color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border: 1px solid #e2e8f0;
}

.logo-img-dash {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

.logo-text-dash {
  font-weight: 700;
  font-size: 18px;
  color: #1e3a8a;
  letter-spacing: -0.5px;
}

/* تعديل للهواتف لضمان عدم زحام الشريط العلوي */
@media (max-width: 600px) {
  .logo-text-dash {
    display: none; /* إخفاء النص في الشاشات الصغيرة جداً والاكتفاء باللوجو */
  }
  .logo-wrapper-dash {
    width: 40px;
    height: 40px;
  }
}

        .center-title {
              font-size: 16px;
    font-weight: 700;
    margin-right: 103px;
    color: #1e293b;
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
          color: #475569;
          font-size: 15px;
        }

        .user-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background-color: #f1f5f9;
          border: 2px solid #e2e8f0;
        }

        .logout-button {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 8px 16px;
          border-radius: 12px;
          font-family: 'Cairo', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-button:hover {
          background-color: #f8fafc;
          color: #ef4444;
          border-color: #ef4444;
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
          width: 100%;
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

        @media (max-width: 900px) {
          .subjects-grid { grid-template-columns: repeat(2, 1fr); }
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

        .dashboard-footer {
          padding: 25px;
          text-align: center;
          font-size: 14px;
          color: #64748b;
        }

        .dashboard-footer p {
          margin: 6px 0;
        }
        
        .loading-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-size: 20px;
          font-family: 'Cairo', sans-serif;
          color: #334155;
        }
      `}</style>
    </div>
  );
}