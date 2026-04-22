import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Footer from "./Footer";
import Navbar from "./Navbar";
import {
  BookOpen,
  Languages,
  Calculator,
  Globe,
  Laptop,
  Landmark,
  ScrollText,
  FlaskConical,
  Atom,
  Microscope,
  Leaf,
} from "lucide-react";

// شاشة التحميل
const LoadingScreen = () => (
  <div className="loading-overlay">
    <div className="loading-content">
      <div className="status-section">
        <h2 className="loading-title">يرجى الانتظار</h2>
        <div className="loading-bar-container">
          <div className="loading-bar-shimmer"></div>
        </div>
        <p className="loading-text">جاري تحضير بيئة الاختبارات...</p>
      </div>
    </div>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
      .loading-overlay{position:fixed;inset:0;background:#f8fafc;display:flex;align-items:center;justify-content:center;z-index:9999;direction:rtl;font-family:'Cairo',sans-serif;overflow:hidden}
      .loading-overlay::before{content:'';position:absolute;width:150%;height:150%;background:radial-gradient(circle at center,rgba(59,130,246,0.05) 0%,transparent 70%);animation:rotateBg 10s linear infinite}
      @keyframes rotateBg{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      .loading-content{position:relative;text-align:center;display:flex;flex-direction:column;align-items:center;gap:20px}
      .loading-title{color:#1e293b;font-size:1.8rem;font-weight:700;margin-bottom:15px}
      .loading-text{color:#64748b;font-size:1rem;margin-top:15px;animation:fadeInOut 2s infinite}
      .loading-bar-container{width:260px;height:6px;background:#e2e8f0;border-radius:10px;position:relative;overflow:hidden;margin:0 auto}
      .loading-bar-shimmer{position:absolute;top:0;left:0;height:100%;width:40%;background:linear-gradient(90deg,transparent,#3b82f6,transparent);animation:shimmer 1.5s infinite ease-in-out}
      @keyframes shimmer{0%{left:-50%}100%{left:150%}}
      @keyframes fadeInOut{0%,100%{opacity:0.7}50%{opacity:1}}
      @media (max-width:480px){.loading-title{font-size:1.5rem}.loading-bar-container{width:200px}}
    `}</style>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userBranch, setUserBranch] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
const getSubjectStyle = useCallback((subjectName) => {
  if (!subjectName)
    return {
      icon: <BookOpen />,
      bg: "linear-gradient(135deg, #f1f5f9, #cbd5e1)", // رمادي فاتح محايد
      color: "#1e293b",
    };

  const name = subjectName.toLowerCase();

  // 1. اللغة الإنجليزية - أزرق بحري هادئ
  if (name.includes("اللغة الإنجليزية") || name.includes("english"))
    return {
      icon: <Languages />,
      bg: "linear-gradient(135deg, #4f709c, #213555)",
      color: "#f0f3f8",
    };

  // 2. اللغة العربية - بني رملي دافئ
  if (name.includes("اللغة العربية") || name.includes("عربية"))
    return {
      icon: <ScrollText />,
      bg: "linear-gradient(135deg, #d4a373, #8b5a2b)",
      color: "#fefae0",
    };

  // 3. الرياضيات - أحمر خمري ناعم
  if (name.includes("الرياضيات"))
    return {
      icon: <Calculator />,
      bg: "linear-gradient(135deg, #d56b6b, #9d4040)",
      color: "#fff5f5",
    };

  // 4. التاريخ - أخضر زيتوني ترابي
  if (name.includes("التاريخ"))
    return {
      icon: <Landmark />,
      bg: "linear-gradient(135deg, #7d9b76, #4a5d47)",
      color: "#edf2e9",
    };

  // 5. الجغرافيا - فيروزي مخضر (Teal)
  if (name.includes("الجغرافيا"))
    return {
      icon: <Globe />,
      bg: "linear-gradient(135deg, #61a5a4, #2e5a5a)",
      color: "#e0f2f1",
    };

  // 6. تكنولوجيا المعلومات - بنفسجي فاتح (Lavender)
  if (name.includes("تكنولوجيا المعلومات"))
    return {
      icon: <Laptop />,
      bg: "linear-gradient(135deg, #a88bbd, #6b4e7a)",
      color: "#f4edf8",
    };

  // 7. كيمياء - وردي خوخي ناعم
  if (name.includes("كيمياء"))
    return {
      icon: <FlaskConical />,
      bg: "linear-gradient(135deg, #e5989b, #b56576)",
      color: "#fdf0f0",
    };

  // 8. فيزياء - أزرق سماوي بارد
  if (name.includes("فيزياء"))
    return {
      icon: <Atom />,
      bg: "linear-gradient(135deg, #74b9cf, #3f729b)",
      color: "#e6f3fa",
    };

  // 9. أحياء - أخضر فاتح منعش
  if (name.includes("أحياء"))
    return {
      icon: <Microscope />,
      bg: "linear-gradient(135deg, #7fbf7f, #4a7a4a)",
      color: "#eaf5ea",
    };

  // 10. الثقافة العلمية - أصفر خردلي هادئ
  if (name.includes("الثقافة العلمية"))
    return {
      icon: <Leaf />,
      bg: "linear-gradient(135deg, #d9b650, #a8862a)",
      color: "#fcf5e6",
    };

  // 11. التربية الإسلامية - أخضر فستقي ناعم
  if (
    name.includes("التربية الإسلامية") ||
    name.includes("إسلامية") ||
    name.includes("دين")
  )
    return {
      icon: <BookOpen />,
      bg: "linear-gradient(135deg, #8fbc8f, #557c55)",
      color: "#f0f7f0",
    };

  // 12. افتراضي - رمادي محايد
  return {
    icon: <BookOpen />,
    bg: "linear-gradient(135deg, #f1f5f9, #cbd5e1)",
    color: "#1e293b",
  };
}, []);


  // دالة تصفية المواد حسب الفرع (مع تشخيص)
  const filterSubjectsByBranch = useCallback((subjectsList, studentBranch) => {
    console.log("👤 فرع الطالب:", studentBranch);
    console.log(
      "📚 المواد قبل التصفية:",
      subjectsList.map((s) => ({ name: s.name, branch: s.branch })),
    );

    if (!studentBranch) {
      // إذا لم يكن للطالب فرع (حسابات قديمة)، نعرض جميع المواد
      return subjectsList;
    }

    const filtered = subjectsList.filter((subject) => {
      const subjectBranch = subject.branch;

      // إذا كانت المادة مشتركة أو غير محددة (للتوافق) → تظهر
      if (!subjectBranch || subjectBranch === "مشترك") {
        return true;
      }

      // إذا كانت المادة تطابق فرع الطالب → تظهر
      if (subjectBranch === studentBranch) {
        return true;
      }

      // غير ذلك لا تظهر
      return false;
    });

    console.log(
      "✅ المواد بعد التصفية:",
      filtered.map((s) => s.name),
    );
    return filtered;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (!currentUser) {
          navigate("/login");
          return;
        }

        // جلب بيانات الطالب والفرع
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, branch")
          .eq("id", currentUser.id)
          .maybeSingle();

        setUser(profile);
        const branch = profile?.branch || "";
        setUserBranch(branch);

        const { data: subjectsData } = await supabase
          .from("subjects")
          .select("id, name, duration_minutes, questions_count, branch")
          .order("id", { ascending: true });

        if (subjectsData) {
          // تصفية المواد حسب الفرع
          const filtered = filterSubjectsByBranch(subjectsData, branch);
          setSubjects(filtered);
        }
      } catch (error) {
        console.error("خطأ في تحميل البيانات:", error);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };

    fetchData();
  }, [navigate, filterSubjectsByBranch]);

  useEffect(() => {
    document.title = "الصفحة الرئيسية";
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="dashboard-container">
      <Navbar userName={user?.name || "طالب"} />

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
                <Link
                  to={`/quiz/${subject.id}`}
                  key={subject.id}
                  className="subject-card-link"
                >
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
        .dashboard-container{direction:rtl;font-family:'Cairo',sans-serif;background:linear-gradient(180deg,#f0f4f9 0%,#e0eaf5 100%);min-height:100vh;display:flex;flex-direction:column}
        .dashboard-main{flex-grow:1;max-width:1000px;margin:0 auto;padding:20px;text-align:center}
        .dashboard-main h1{font-size:24px;color:#1e293b;margin-bottom:40px;font-weight:700}
        .subjects-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
        .no-subjects{text-align:center;padding:60px 20px;background:white;border-radius:24px;margin-top:20px}
        .no-subjects-icon{font-size:64px;margin-bottom:16px;opacity:0.6}
        .no-subjects h3{color:#1e293b;margin-bottom:8px}
        .no-subjects p{color:#64748b}
        @media (max-width:900px){.subjects-grid{grid-template-columns:repeat(2,1fr)}}
        @media (max-width:500px){.subjects-grid{grid-template-columns:1fr}}
        .subject-card-link{text-decoration:none}
        .subject-card{border-radius:16px;padding:35px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;position:relative;overflow:hidden;transition:transform 0.3s,box-shadow 0.3s;box-shadow:0 4px 10px rgba(0,0,0,0.05);height:180px}
        .subject-card:hover{transform:translateY(-5px);box-shadow:0 12px 20px rgba(0,0,0,0.1)}
        .card-icon{width:60px;height:60px;display:flex;align-items:center;justify-content:center}
        .card-icon svg{width:100%;height:100%}
        .card-title{font-size:18px;font-weight:700;text-align:center;z-index:1}
        .hover-text{font-size:13px;font-weight:600;opacity:0;transform:translateY(10px);transition:all 0.3s;position:absolute;bottom:20px}
        .subject-card:hover .hover-text{opacity:1;transform:translateY(0)}
        .subject-card:hover .card-title{transform:translateY(-10px);transition:transform 0.3s}
      `}</style>
    </div>
  );
}
