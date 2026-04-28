import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FileText, Home, ListChecks, Check, X, Bookmark, MoveHorizontal
} from "lucide-react";
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

  const getOptionLabel = (index) => {
    if (index === undefined || index === null) return "-";
    const labels = ['أ', 'ب', 'ج', 'د', 'هـ'];
    return labels[index] || index;
  };

  return (
    <div className="nokhba-institutional-v4">
      <Navbar userName={result.studentName} />

      <main className="main-wrapper">
        {/* رأس التقرير */}
        <header className="report-header">
          <div className="title-section">
            <div className="icon-wrap">
              <FileText size={24} />
            </div>
            <div>
              <h1>ملخص محاولة الاختبار</h1>
              <p>اسم الطالب: {result.studentName}</p>
            </div>
          </div>

          <div className="grade-card">
            <div className="grade-label">الدرجــــــة</div>
            <div className="grade-value">
              <span className="current">{score}</span>
              <span className="of">/</span>
              <span className="total">{total}</span>
            </div>
          </div>
        </header>

        {/* شريط الإحصائيات السريع */}
        <div className="summary-bar">
          <div className="summary-item">
            <span className="dot success"></span>
            <span>الإجابات الصحيحة: <b>{score}</b></span>
          </div>
          <div className="summary-item">
            <span className="dot danger"></span>
            <span>الإجابات الخاطئة: <b>{total - score}</b></span>
          </div>
          <div className="summary-item">
            <Bookmark size={14} />
            <span>إجمالي الأسئلة: <b>{total}</b></span>
          </div>
        </div>
       
        {/* جدول مراجعة الإجابات */}
        <section className="table-section">
          <div className="section-title">
            <ListChecks size={20} />
            <h2>تفاصيل ورقة الإجابة</h2>
          </div>
<div className="mobile-scroll-hint">
  <MoveHorizontal size={16} />
  <span>مرر لليمين أو لليسار لمشاهدة جميع الأعمدة</span>
</div>
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th width="70">#</th>
                  <th>نص السؤال</th>
                  <th width="120" className="text-center">إجابة الطالب</th>
                  <th width="120" className="text-center">الإجابة النموذجية</th>
                  <th width="100" className="text-center">الدرجة القصوى</th>
                  <th width="100" className="text-center">النقاط</th>
                </tr>
              </thead>
              <tbody>
                {result.questions.map((q, index) => {
                  const userAnswerId = result.selectedAnswers?.[q.id];
                  const isCorrect = parseInt(userAnswerId) === parseInt(q.correct_option);

                  return (
                    <tr key={index} className={isCorrect ? '' : 'inactive-row'}>
                      <td className="id-col">{index + 1}</td>
                      <td className="q-text-cell" title={q.question_text}>
                        {q.question_text}
                      </td>
                      <td className="text-center">
                        <span className={`choice-pill ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                          {getOptionLabel(userAnswerId)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="choice-pill is-actual">
                          {getOptionLabel(q.correct_option)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="max-point-badge">{q.points || "1.00"}</span>
                      </td>
                      <td className="text-center">
                        <span className={`point-badge ${isCorrect ? 'plus' : 'zero'}`}>
                          {isCorrect ? '1.00' : '0.00'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="footer-actions">
          <button className="btn-dashboard" onClick={() => navigate('/dashboard')}>
            <Home size={18} /> العودة للوحة التحكم
          </button>
        </div>
      </main>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');

        .nokhba-institutional-v4 {
          direction: rtl;
          font-family: 'Cairo';
          background-color: #fcfcfc;
          min-height: 100vh;
          color: #2d3748;
        }

        .main-wrapper {
          max-width: 1000px;
          margin: 0 auto;
          padding: 50px 20px 100px;
        }

        /* Report Header */
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          padding: 30px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          margin-bottom: 25px;
        }

        .title-section { display: flex; align-items: center; gap: 20px; }
        .icon-wrap { 
          width: 50px; height: 50px; background: #f1f5f9; color: #1e3a8a; 
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
        }
        .title-section h1 { font-size: 1.5rem; font-weight: 800; color: #1e3a8a; margin: 0; }
        .title-section p { color: #718096; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }

        .grade-card { text-align: left; border-right: 1px solid #edf2f7; padding-right: 30px; }
        .grade-label { font-size: 0.75rem; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px; }
        .grade-value { display: flex; align-items: baseline; gap: 4px; margin-top: 2px; }
        .grade-value .current { font-size: 2.2rem; font-weight: 800; color: #1e3a8a; }
        .grade-value .of { color: #cbd5e0; font-size: 1.2rem; }
        .grade-value .total { font-size: 1.2rem; font-weight: 700; color: #718096; }

        /* Summary Bar */
        .summary-bar {
          display: flex; gap: 30px; padding: 15px 30px; 
          background: #f8fafc; border-radius: 10px; margin-bottom: 40px;
          border: 1px solid #edf2f7;
        }
        .summary-item { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: #4a5568; }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot.success { background: #10b981; }
        .dot.danger { background: #ef4444; }

        /* Table Section */
        .table-section { margin-bottom: 30px; }
        .section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .section-title h2 { font-size: 1.1rem; font-weight: 700; color: #2d3748; margin: 0; }

        /* Table Styles (matching TeacherDashboard modern-table) */
        .table-responsive {
          width: 100%;
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
        }

        .modern-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 700px;
        }

        .modern-table th {
          background: #f1f5f9;
          padding: 16px 20px;
          color: #475569;
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e2e8f0;
          text-align: center;
        }

        .modern-table td {
          padding: 20px 15px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          vertical-align: middle;
          font-size: 0.95rem;
        }

        .modern-table tbody tr:hover td {
          background-color: #f8fafc;
        }

        .modern-table tbody tr:last-child td {
          border-bottom: none;
        }

        .id-col { 
          background: #f8fafc; 
          border-radius: 6px; 
          text-align: center; 
          font-weight: 700; 
          color: #1e3a8a; 
          font-size: 0.9rem;
        }

        .q-text-cell {
          max-width: 300px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 600;
          color: #0f172a;
        }

        .choice-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .choice-pill.is-correct {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .choice-pill.is-wrong {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .choice-pill.is-actual {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        .max-point-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #f1f5f9;
          color: #475569;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .point-badge {
          display: inline-block;
          padding: 4px 16px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .point-badge.plus {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .point-badge.zero {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .inactive-row td {
          opacity: 0.99; /* slight dimming for wrong answers */
        }
        .text-center { text-align: center !important; }

        /* Actions */
        .footer-actions { margin-top: 50px; text-align: center; }
        .btn-dashboard {
          background: #4776ff;
          color: #ffffff;
          border: none;
          border-radius: 50px;
          padding: 14px 36px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          transition: all 0.25s;
          box-shadow: 0 4px 12px rgba(30,58,138,0.2);
        }
        .btn-dashboard:hover {
          background: #153072;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(30,58,138,0.3);
        }
.mobile-scroll-hint {
  display: none; /* مخفي افتراضيًا */
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 16px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  color: #0369a1;
  font-size: 0.8rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .mobile-scroll-hint {
    display: flex; /* يظهر في الجوال فقط */
  }
        /* Mobile adjustments */
        @media (max-width: 768px) {
          .report-header { 
            flex-direction: column; 
            align-items: center; 
            text-align: center; 
            gap: 20px; 
          }
          .grade-card { 
            border-right: none; 
            border-top: 1px solid #edf2f7; 
            padding: 20px 0 0; 
            width: 100%; 
            text-align: center;
          }
          .grade-value {
            justify-content: center;
          }
          .summary-bar { flex-direction: column; gap: 10px; }
          /* Hide number column on mobile */
          .modern-table th:nth-child(1),
          .modern-table td:nth-child(1) { display: none; }
        }
      `}</style>
    </div>
  );
}