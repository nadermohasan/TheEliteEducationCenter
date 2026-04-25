import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, RotateCcw, LayoutDashboard, Trophy, Award, FileText } from "lucide-react";
import Footer from './Footer';
import Navbar from './Navbar';

export default function QuizResult() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (state && state.questions) {
      setResult(state);
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [state, navigate]);

  if (!result) return null;

  const score = result.score || 0;
  const total = result.total_questions || 0;
  const isPass = (score / total) >= 0.5;

  // دالة لتحويل رقم الخيار إلى حرف (أ، ب، ج، د) أو (A, B, C, D)
  const getOptionLabel = (index) => {
    if (index === undefined || index === null) return "-";
    const labels = ['أ', 'ب', 'ج', 'د', 'هـ'];
    return labels[index] || index;
  };

  return (
    <div className="modern-result-page">
      <Navbar userName={result.studentName || 'طالب'} />

      <main className="container">
        {/* قسم عرض الدرجة الرئيسي */}
        <section className="score-hero">
          <div className="hero-content">
            <div className="icon-badge">
              <Trophy size={40} className={isPass ? "gold" : "silver"} />
            </div>
            <h1 className="main-title">الدرجة النهائية</h1>
            <div className="score-wrapper">
              <span className="big-score">{score}</span>
              <span className="score-divider">/</span>
              <span className="big-score">{total}</span>
            </div>
          </div>
        </section>

        {/* إحصائيات سريعة */}
        <div className="quick-stats-row">
          <div className="stat-pill">
            <CheckCircle2 size={18} className="text-success" />
            <span>الإجابات الصحيحة: <b>{score}</b></span>
          </div>
          <div className="stat-pill">
            <XCircle size={18} className="text-danger" />
            <span>الإجابات الخاطئة: <b>{total - score}</b></span>
          </div>
          <div className="stat-pill">
            <FileText size={18} className="text-primary" />
            <span>عدد الأسئلة: <b>{total}</b></span>
          </div>
        </div>

        {/* جدول مراجعة الإجابات المطور للموبايل */}
        <div className="table-container">
          <div className="table-header">
            <h3><Award size={20} /> تحليل الإجابات التفصيلي</h3>
          </div>
          <div className="responsive-table">
            <table className="custom-table">
              <thead>
                <tr>
                  <th width="8%">#</th>
                  <th width="52%">السؤال</th>
                  <th width="15%" className="text-center">إجابتك</th>
                  <th width="15%" className="text-center">الصحيحة</th>
                  <th width="10%" className="text-center">الدرجة</th>
                </tr>
              </thead>
              <tbody>
                {result.questions.map((q, index) => {
                  const userAnswerId = result.selectedAnswers?.[q.id];
                  const isCorrect = parseInt(userAnswerId) === parseInt(q.correct_option);

                  return (
                    <tr key={index} className={isCorrect ? "row-correct" : "row-wrong"}>
                      <td className="text-center font-bold">{index + 1}</td>
                      <td className="question-text">{q.question_text}</td>
                      <td className="text-center">
                        <span className={`option-circle ${isCorrect ? 'bg-success' : 'bg-danger'}`}>
                          {getOptionLabel(userAnswerId)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="option-circle bg-info">
                          {getOptionLabel(q.correct_option)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`score-badge ${isCorrect ? 'plus' : 'zero'}`}>
                          {isCorrect ? '1' : '0'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* أزرار التحكم */}
        <div className="action-bar">
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard size={18} /> العودة للرئيسية
          </button>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>
            <RotateCcw size={18} /> إعادة الاختبار
          </button>
        </div>
      </main>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');

        .modern-result-page {
          direction: rtl;
          font-family: 'Cairo', sans-serif;
          background-color: #ffffff;
          min-height: 100vh;
          color: #1e293b;
        }

        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 30px 15px;
        }

        .score-hero {
          background: #f8fafc;
          border-radius: 20px;
          padding: 30px;
          text-align: center;
          border: 1px solid #e2e8f0;
          margin-bottom: 25px;
        }

        .score-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin: 10px 0;
        }

        .big-score { font-size: 4rem; font-weight: 800; color: #0f172a; }
        .score-divider { font-size: 3rem; color: #cbd5e0; font-weight: 300; }

        .icon-badge {
          width: 70px; height: 70px; background: white; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .icon-badge .gold { color: #eab308; }
        .icon-badge .silver { color: #94a3b8; }

        .quick-stats-row {
          display: flex; gap: 10px; justify-content: center; margin-bottom: 30px;
        }
        .stat-pill {
          background: #f1f5f9; padding: 6px 16px; border-radius: 50px;
          display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #475569;
        }

        .table-container {
          background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;
        }
        .table-header { padding: 15px 20px; border-bottom: 1px solid #f1f5f9; background: #fcfcfc; }
        .table-header h3 { display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 700; }

        .custom-table { width: 100%; border-collapse: collapse; }
        .custom-table th { background: #f8fafc; padding: 12px 15px; font-weight: 700; color: #64748b; font-size: 0.85rem; border-bottom: 2px solid #e2e8f0; }
        .custom-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        
        .question-text { font-weight: 600; font-size: 0.9rem; line-height: 1.5; color: #334155; }

        /* دائرة رمز الخيار */
        .option-circle {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 8px; font-weight: 700; font-size: 0.9rem;
        }
        .bg-success { background: #dcfce7; color: #15803d; }
        .bg-danger { background: #fef2f2; color: #991b1b; }
        .bg-info { background: #eff6ff; color: #1e40af; }

        .score-badge { font-weight: 800; font-size: 1rem; }
        .score-badge.plus { color: #10b981; }
        .score-badge.zero { color: #cbd5e0; }

        .action-bar { display: flex; gap: 12px; margin-top: 30px; justify-content: center; }
        .btn {
          display: flex; align-items: center; gap: 8px; padding: 10px 20px;
          border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; font-size: 0.9rem;
        }
        .btn-primary { background: #0f172a; color: white; border: none; }
        .btn-outline { background: white; color: #0f172a; border: 1px solid #e2e8f0; }

        @media (max-width: 600px) {
          .big-score { font-size: 3rem; }
          .score-divider { font-size: 2rem; }
          .container { padding: 15px 10px; }
          .custom-table td, .custom-table th { padding: 10px 8px; }
          .question-text { font-size: 0.8rem; }
          .option-circle { width: 28px; height: 28px; font-size: 0.8rem; }
          .action-bar { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}