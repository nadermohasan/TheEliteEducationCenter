import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FileText, Home, ListChecks, Check, X, Bookmark
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

  // دالة مساعدة لاستخلاص نص الإجابة من الخيارات
  const getOptionText = (question, optionIndex) => {
    if (optionIndex === undefined || optionIndex === null) return "-";
    if (question?.options && Array.isArray(question.options)) {
      return question.options[optionIndex] || getOptionLabel(optionIndex);
    }
    return getOptionLabel(optionIndex);
  };

  // تصفية الأسئلة الخاطئة فقط لعرض الجوال
  const wrongQuestions = result.questions.filter(q => {
    const userAnswerId = result.selectedAnswers?.[q.id];
    return parseInt(userAnswerId) !== parseInt(q.correct_option);
  });

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
            <div className="title-content">
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

        {/* قسم تفاصيل الإجابات */}
        <section className="table-section">
          <div className="section-title">
            <ListChecks size={20} />
            <h2>تفاصيل ورقة الإجابة</h2>
          </div>

          {/* الجدول - للشاشات الكبيرة فقط */}
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th width="70">#</th>
                  <th>نص السؤال</th>
                  <th className="text-center">إجابة الطالب</th>
                  <th className="text-center">الإجابة النموذجية</th>
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
                        <span className={`answer-badge ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                          {getOptionText(q, userAnswerId)}
                        </span>
                      </td>
                      <td className="text-center">
  <span className="answer-badge is-correct-model">
    {getOptionText(q, q.correct_option)}
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

          {/* بطاقة واحدة مخصصة للموبايل – تظهر الأسئلة الخاطئة فقط */}
          <div className="single-card-mobile">
            {wrongQuestions.length > 0 ? (
              <div className="mobile-card">
                {wrongQuestions.map((q, index) => {
                  const userAnswerId = result.selectedAnswers?.[q.id];
                  return (
                    <div key={index} className="question-row">
                      <div className="row-header">
                        <span className="row-number">#{result.questions.indexOf(q) + 1}</span>
                        <span className="row-question-text">{q.question_text}</span>
                        <X size={18} className="icon-wrong" />
                      </div>
                      <div className="row-meta">
                        <span className="meta-item">
                          إجابتك: <span className="badge-wrong">
                            {getOptionText(q, userAnswerId)}
                          </span>
                        </span>
                        <span className="meta-item">
                          الصحيحة: <span className="badge-model">
                            {getOptionText(q, q.correct_option)}
                          </span>
                        </span>
                      </div>
                      {index < wrongQuestions.length - 1 && <div className="row-divider" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mobile-card" style={{ textAlign: 'center', padding: '24px' }}>
                <Check size={32} className="icon-correct" />
                <p style={{ marginTop: 12, color: '#065f46', fontWeight: 600 }}>جميع الإجابات صحيحة!</p>
              </div>
            )}
          </div>
        </section>

        <div className="footer-actions">
          <button className="btn-dashboard" onClick={() => navigate('/dashboard')}>
            <Home size={18} /> العودة للمواد الدراسية
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

        .summary-bar {
          display: flex; gap: 30px; padding: 15px 30px; 
          background: #f8fafc; border-radius: 10px; margin-bottom: 40px;
          border: 1px solid #edf2f7;
        }
        .summary-item { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: #4a5568; }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot.success { background: #10b981; }
        .dot.danger { background: #ef4444; }

        .table-section { margin-bottom: 30px; }
        .section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .section-title h2 { font-size: 1.1rem; font-weight: 700; color: #2d3748; margin: 0; }

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
  max-width: 320px;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.7;
  word-break: break-word;
}

        /* استبدال choice-pill بـ answer-badge للنصوص */
        .answer-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.85rem;
  max-width: 100%;
  word-break: break-word;
  white-space: normal;
  line-height: 1.6;
  text-align: start;
}

        .answer-badge.is-correct-model {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.answer-badge.is-correct {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        .answer-badge.is-wrong {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .answer-badge.is-model {
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
          opacity: 0.99;
        }
        .text-center { text-align: center !important; }

        /* البطاقة الواحدة للموبايل */
        .single-card-mobile {
          display: none;
          margin-top: 20px;
        }

        .mobile-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .question-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .row-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .row-number {
          font-weight: 800;
          color: #1e3a8a;
          background: #f1f5f9;
          border-radius: 8px;
          padding: 2px 8px;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .row-question-text {
          font-weight: 600;
          color: #0f172a;
          flex: 1;
          font-size: 0.9rem;
          line-height: 1.5;
          word-break: break-word;
        }

        .icon-correct {
          color: #10b981;
          flex-shrink: 0;
        }

        .icon-wrong {
          color: #ef4444;
          flex-shrink: 0;
        }

        .row-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          font-size: 0.8rem;
          color: #475569;
        }
.q-text-cell,
.row-question-text,
.answer-badge,
.badge-wrong,
.badge-model {
  unicode-bidi: plaintext;
}
        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          padding: 4px 10px;
          border-radius: 8px;
          white-space: nowrap;
        }

        .badge-wrong,
.badge-model {
  padding: 6px 10px;
  border-radius: 8px;
  font-weight: 700;
  border: 1px solid;
  max-width: 100%;
  overflow: visible;
  text-overflow: unset;
  white-space: normal;
  word-break: break-word;
  line-height: 1.5;
  display: inline-block;
}

.badge-wrong {
  background: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}

.badge-model {
  background: #ecfdf5;
  color: #065f46;
  border-color: #a7f3d0;
}

        .row-divider {
          height: 1px;
          background: #edf2f7;
          margin: 14px 0;
        }

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

        @media (max-width: 768px) {
  .main-wrapper {
    padding: 24px 14px 80px;
  }

  .report-header {
    flex-direction: column;
    align-items: stretch;
    text-align: right;
    gap: 18px;
    padding: 18px;
    border-radius: 18px;
  }

  .title-section {
    gap: 12px;
    align-items: center;
  }

  .icon-wrap {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
  }

  .title-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: nowrap;
  }

  .title-content h1 {
    font-size: 0.95rem;
    margin: 0;
    white-space: nowrap;
  }

  .title-content p {
    font-size: 0.78rem;
    margin: 0;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .grade-card {
    border-right: none;
    border-top: 1px solid #edf2f7;
    padding: 18px 0 0;
    width: 100%;
    text-align: center;
  }

  .grade-value {
    justify-content: center;
  }

  .summary-bar {
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    border-radius: 16px;
  }

  .summary-item {
    font-size: 0.85rem;
  }

  .table-responsive {
    display: none;
  }

  .single-card-mobile {
    display: block;
  }

  .mobile-card {
    border-radius: 18px;
    padding: 18px 14px;
  }

  .row-meta {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .meta-item {
    width: 100%;
    justify-content: space-between;
    align-items: flex-start;
    white-space: normal;
  }

  .btn-dashboard {
    width: 100%;
    justify-content: center;
    padding: 16px;
    font-size: 0.9rem;
  }
}
      `}</style>
    </div>
  );
}