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
  const [isEnglishContent, setIsEnglishContent] = useState(false);

  useEffect(() => {
    if (state && state.questions) {
      setResult(state);
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [state, navigate]);

  // كشف إذا كان المحتوى الأساسي (أسئلة وإجابات) إنجليزياً
  useEffect(() => {
    if (!result?.questions) return;
    const allTexts = result.questions.flatMap(q => [
      q.question_text,
      ...(q.options || []),
      result.selectedAnswers?.[q.id] ? String(result.selectedAnswers[q.id]) : '',
      String(q.correct_option)
    ]).join(' ');
    const englishChars = (allTexts.match(/[a-zA-Z]/g) || []).length;
    const totalChars = allTexts.replace(/[\s\d]/g, '').length;
    const ratio = totalChars === 0 ? 0 : englishChars / totalChars;
    setIsEnglishContent(ratio > 0.6);
  }, [result]);

  if (!result) return null;

  const score = result.score || 0;
  const total = result.total_questions || 0;

  const getOptionLabel = (index) => {
    if (index === undefined || index === null) return "-";
    const labels = ['أ', 'ب', 'ج', 'د', 'هـ'];
    return labels[index] || index;
  };

  const getOptionText = (question, optionIndex) => {
    if (optionIndex === undefined || optionIndex === null) return "-";
    if (question?.options && Array.isArray(question.options)) {
      return question.options[optionIndex] || getOptionLabel(optionIndex);
    }
    return getOptionLabel(optionIndex);
  };

  return (
    <div className={`nokhba-institutional-v4 ${isEnglishContent ? 'english-answers-mode' : ''}`}>
      <Navbar userName={result.studentName} />

      <main className="main-wrapper">
        {/* رأس التقرير يبقى محاذاة يمين دائماً */}
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

        <section className="table-section">
          <div className="section-title">
            <ListChecks size={20} />
            <h2>تفاصيل ورقة الإجابة</h2>
          </div>

          {/* الجدول للشاشات الكبيرة - المحاذاة تتأثر بـ english-answers-mode */}
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
                      <td className="q-text-cell">{q.question_text}</td>
                      <td className="text-center">
                        <span className={`answer-badge ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                          {getOptionText(q, userAnswerId)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="answer-badge is-model">
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

          {/* الموبايل: بطاقة واحدة فقط تحتوي على جميع الأسئلة */}
          <div className="single-card-mobile">
            <div className="mobile-answers-card">
              <div className="card-inner-header">
                <span className="card-title">📋 قائمة الأسئلة</span>
                <span className="card-badge">{total} سؤال</span>
              </div>
              <div className="questions-list">
                {result.questions.map((q, idx) => {
                  const userAnswerId = result.selectedAnswers?.[q.id];
                  const isCorrect = parseInt(userAnswerId) === parseInt(q.correct_option);
                  return (
                    <div key={idx} className={`question-item ${isCorrect ? 'item-correct' : 'item-wrong'}`}>
                      <div className="item-header">
                        <span className="q-num">سؤال {idx + 1}</span>
                        {isCorrect ? <Check size={18} /> : <X size={18} />}
                      </div>
                      <div className="item-question">{q.question_text}</div>
                      <div className="item-details">
                        <div className="detail-row">
                          <span className="detail-label">إجابتك:</span>
                          <span className={`detail-answer user-ans ${isCorrect ? 'correct-ans' : 'wrong-ans'}`}>
                            {getOptionText(q, userAnswerId)}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">النموذجية:</span>
                          <span className="detail-answer model-ans">
                            {getOptionText(q, q.correct_option)}
                          </span>
                        </div>
                        <div className="detail-points">
                          <span>الدرجة: </span>
                          <strong>{isCorrect ? (q.points || "1.00") : "0.00"}</strong>
                          <span> / {q.points || "1.00"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
          font-family: 'Cairo', sans-serif;
          background-color: #fcfcfc;
          min-height: 100vh;
          color: #2d3748;
        }

        /* عند وجود محتوى إنجليزي، يتم تطبيق المحاذاة لليسار فقط على النصوص الإنجليزية (الأسئلة والإجابات) */
        .english-answers-mode .q-text-cell,
        .english-answers-mode .answer-badge,
        .english-answers-mode .question-item,
        .english-answers-mode .modern-table td,
        .english-answers-mode .modern-table th {
          direction: ltr;
          text-align: left;
        }
        /* نعيد الاتجاه الصحيح للأعمدة التي تحتوي على أرقام ونقاط */
        .english-answers-mode .id-col,
        .english-answers-mode .max-point-badge,
        .english-answers-mode .point-badge {
          direction: rtl;
          text-align: center;
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
          margin-bottom: 25px;
        }
        .title-section { display: flex; align-items: center; gap: 20px; }
        .icon-wrap { 
          width: 50px; height: 50px; background: #f1f5f9; color: #1e3a8a; 
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
        }
        .title-content h1 { font-size: 1.5rem; font-weight: 800; color: #1e3a8a; margin: 0; }
        .title-content p { color: #718096; font-size: 0.9rem; margin-top: 4px; font-weight: 500; }

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
        .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 700px; }
        .modern-table th {
          background: #f1f5f9; padding: 16px 20px; color: #475569; font-weight: 700;
          font-size: 0.8rem; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;
          text-align: center;
        }
        .modern-table td { padding: 20px 15px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; font-size: 0.95rem; }
        .modern-table tbody tr:hover td { background-color: #f8fafc; }
        .modern-table tbody tr:last-child td { border-bottom: none; }
        .id-col { background: #f8fafc; border-radius: 6px; text-align: center; font-weight: 700; color: #1e3a8a; }
        .q-text-cell { max-width: 320px; white-space: normal; word-break: break-word; font-weight: 600; color: #0f172a; line-height: 1.7; }
        .answer-badge { display: inline-block; padding: 6px 14px; border-radius: 14px; font-weight: 600; font-size: 0.85rem; word-break: break-word; white-space: normal; line-height: 1.6; }
        .answer-badge.is-correct { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
        .answer-badge.is-wrong { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .answer-badge.is-model { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
        .max-point-badge, .point-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; }
        .max-point-badge { background: #f1f5f9; color: #475569; }
        .point-badge.plus { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
        .point-badge.zero { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .text-center { text-align: center !important; }

        /* ===== بطاقة واحدة للموبايل ===== */
        .single-card-mobile {
          display: none;
          margin-top: 20px;
        }
        .mobile-answers-card {
          background: white;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }
        .card-inner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 700;
        }
        .card-title { font-size: 1rem; color: #1e3a8a; }
        .card-badge { background: #e2e8f0; padding: 4px 12px; border-radius: 30px; font-size: 0.75rem; color: #334155; }
        .questions-list { display: flex; flex-direction: column; }
        .question-item {
          padding: 18px 20px;
          border-bottom: 1px solid #edf2f7;
          transition: background 0.2s;
        }
        .question-item:last-child { border-bottom: none; }
        .item-correct { background: #fefefa; }
        .item-wrong { background: #fffbfb; }
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .q-num { font-weight: 800; color: #1e3a8a; background: #eff6ff; padding: 2px 12px; border-radius: 50px; font-size: 0.8rem; }
        .item-question { font-weight: 700; font-size: 0.95rem; color: #0f172a; margin-bottom: 14px; line-height: 1.6; word-break: break-word; }
        .item-details { background: #f9f9fc; border-radius: 16px; padding: 12px; }
        .detail-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; align-items: flex-start; }
        .detail-label { font-weight: 600; color: #475569; min-width: 85px; font-size: 0.8rem; }
        .detail-answer { flex: 1; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; word-break: break-word; background: white; border: 1px solid #e2e8f0; }
        .correct-ans { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
        .wrong-ans { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
        .model-ans { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
        .detail-points { margin-top: 10px; font-size: 0.8rem; color: #475569; text-align: left; padding-top: 8px; border-top: 1px solid #edf2f7; }
        .detail-points strong { color: #1e3a8a; font-size: 0.9rem; }

        /* أزرار */
        .footer-actions { margin-top: 50px; text-align: center; }
        .btn-dashboard {
          background: #4776ff; color: white; border: none; border-radius: 50px;
          padding: 14px 36px; font-weight: 700; font-size: 0.95rem; cursor: pointer;
          display: inline-flex; align-items: center; gap: 12px; transition: 0.25s;
          box-shadow: 0 4px 12px rgba(30,58,138,0.2);
        }
        .btn-dashboard:hover { background: #153072; transform: translateY(-2px); }

        /* استجابة الهواتف */
        @media (max-width: 768px) {
          .main-wrapper { padding: 24px 14px 80px; }
          .report-header { flex-direction: column; align-items: stretch; gap: 18px; padding: 18px; }
          .title-section { gap: 12px; }
          .icon-wrap { width: 42px; height: 42px; }
          .title-content { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
          .title-content h1 { font-size: 1rem; white-space: nowrap; }
          .title-content p { font-size: 0.75rem; margin: 0; white-space: nowrap; }
          .grade-card { border-right: none; border-top: 1px solid #edf2f7; padding: 18px 0 0; width: 100%; text-align: center; }
          .grade-value { justify-content: center; }
          .summary-bar { flex-direction: column; gap: 12px; padding: 18px; }
          .table-responsive { display: none; }
          .single-card-mobile { display: block; }
          .btn-dashboard { width: 100%; justify-content: center; padding: 16px; }
        }
      `}</style>
    </div>
  );
}