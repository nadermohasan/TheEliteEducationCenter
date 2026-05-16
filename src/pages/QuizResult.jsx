import { useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import Footer from "./Footer";

export default function QuizResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  useEffect(() => {
    if (!state) {
      navigate("/dashboard", { replace: true });
    }
  }, [state, navigate]);

  if (!state) return null;

  const {
    score,
    totalPossible,
    questions,
    selectedAnswers,
    studentName,
  } = state;

  const isEnglish = (text) => /[a-zA-Z]/.test(text);

  const getQuestionOrdinal = (index) => {
    const ordinals = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];
    return ordinals[index] || (index + 1);
  };

  // دالة مساعدة لاستخراج عرض الخيار (نص أو صورة)
  const renderOptionContent = (q, optionIndex) => {
    const englishLetter = ['a', 'b', 'c', 'd'][optionIndex];
    const imageKey = `image_option_${englishLetter}`;
    const imageUrl = q[imageKey];
    
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={`الخيار ${optionIndex + 1}`}
          className="option-img"
        />
      );
    }
    return <span>{q.options[optionIndex]}</span>;
  };

  return (
    <div className="quiz-result-wrapper">
      <div className="main-content-container">
        
        <div className="top-nav-area">
          <button className="back-btn-pill" onClick={() => navigate("/dashboard")}>
            العودة للمواد الدراسية
          </button>
        </div>

        <div className="page-header">
          <h1 className="main-heading">ملخص محاولة الاختبار</h1>
          <p className="sub-heading">قم بمراجعة إجاباتك وتصحيح الأخطاء</p>
        </div>

        {/* بطاقة النتيجة */}
        <div className="custom-card summary-card shadow-sm">
          <div className="doc-illustration">
            <img
              src="https://i.imgur.com/N9qktIS.png" 
              alt="Score Logo" 
              width="150" 
              height="148" 
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.05))' }}
            />
          </div>

          <div className="student-info">
            <span className="label-text">إسم الطالـــــــب</span>
            <h2 className="student-name-text">{studentName}</h2>
          </div>

          <div className="divider-line"></div>

          <div className="score-section">
            <span className="label-text">الدرجة النهائية</span>
            <div className="score-display">
               <span className="score-achieved">{score}</span>
               <span className="score-separator">/</span>
               <span className="score-total">{totalPossible}</span>
            </div>
          </div>
        </div>

        {/* بطاقة تفاصيل الإجابات */}
        <div className="custom-card details-card shadow-sm">
          <div className="details-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <h2 className="details-title">تفاصيل الإجابات</h2>
          </div>

          <div className="questions-list">
            {questions.map((q, idx) => {
              const userAnswerIndex = selectedAnswers[q.id];
              const isCorrect = userAnswerIndex !== undefined && parseInt(userAnswerIndex) === parseInt(q.correct_option);
              const correctAnswerIndex = parseInt(q.correct_option);
              const degree = q.degree || 1;

              // الحصول على محتوى الإجابة الصحيحة (نص أو صورة)
              const correctAnswerContent = renderOptionContent(q, correctAnswerIndex);

              return (
                <div key={q.id} className="question-item">
                  <div className="q-meta">
                    <span className="q-number">السؤال {getQuestionOrdinal(idx)}</span>
                    <span className={`q-mark ${isCorrect ? 'pass' : 'fail'}`}>
                      {isCorrect ? `+${degree}` : `-${degree}`}
                    </span>
                  </div>

                  {/* عرض صورة السؤال إن وجدت */}
                  {q.image_url ? (
                    <div className="question-image-container">
                      <img
                        src={q.image_url}
                        alt="صورة السؤال"
                        className="question-image"
                      />
                    </div>
                  ) : (
                    <p className={`q-text ${isEnglish(q.question_text) ? 'ltr' : ''}`}>
                      {q.question_text}
                    </p>
                  )}

                  <div className="answers-review">
                    <div className={`answer-row ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                      <span className="indicator">{isCorrect ? '✔' : '✘'}</span>
                      <span className="answer-label">إجابتك:</span>
                      {userAnswerIndex !== undefined ? (
                        <span className={`answer-val ${isEnglish(q.options[userAnswerIndex] || '') ? 'ltr' : ''}`}>
                          {renderOptionContent(q, userAnswerIndex)}
                        </span>
                      ) : (
                        <span className="answer-val">لم تتم الإجابة</span>
                      )}
                    </div>

                    {!isCorrect && (
                      <div className="answer-row is-correct-hint">
                        <span className="indicator">✔</span>
                        <span className="answer-label">الصحيحة:</span>
                        <span className="answer-val">
                          {correctAnswerContent}
                        </span>
                      </div>
                    )}
                  </div>
                  {idx < questions.length - 1 && <div className="item-spacer"></div>}
                </div>
              );
            })}
          </div>
        </div>

        <Footer />
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');

        .quiz-result-wrapper {
          background-color: #f9fbff;
          min-height: 100vh;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
          padding: 20px 15px;
        }

        .main-content-container {
          max-width: 480px;
          margin: 0 auto;
        }

        .top-nav-area { text-align: center; margin: 40px 0 30px; }
        .back-btn-pill {
          background-color: #4a72ff;
          color: #fff;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.3s ease;
          box-shadow: 0 8px 20px rgba(74, 114, 255, 0.2);
        }
        .back-btn-pill:hover { transform: translateY(-2px); opacity: 0.9; }

        .page-header { text-align: center; margin-bottom: 30px; }
        .main-heading { font-size: 1.7rem; font-weight: 800; color: #1e293b; margin: 0; }
        .sub-heading { color: #64748b; font-size: 0.95rem; margin-top: 5px; }

        .custom-card {
          background: #fff;
          border-radius: 20px;
          margin-bottom: 20px;
          border: 1px solid #edf2f7;
        }
        .shadow-sm { box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03); }

        /* بطاقة الدرجة */
        .summary-card { padding: 40px 20px; text-align: center; }
        .label-text { color: #94a3b8; font-size: 0.85rem; font-weight: 700; display: block; margin-bottom: 5px; }
        .student-name-text { font-size: 1.5rem; font-weight: 800; color: #1e293b; margin: 0; }
        .divider-line { height: 3px; background: #f1f5f9; margin: 25px -20px; }
        
        .score-display { display: flex; align-items: center; justify-content: center; gap: 3px; }
        .score-achieved { font-size: 35px; font-weight: 700; color: #3b82f6; line-height: 1; }
        .score-separator { font-size: 2rem; color: #000; }
        .score-total { font-size: 35px; font-weight: 400; color: #475569; }

        /* مراجعة الأسئلة */
        .details-header { display: flex; align-items: center; gap: 10px; padding: 20px 25px; border-bottom: 3px solid #f1f5f9; }
        .details-title { font-size: 1.1rem; font-weight: 800; color: #3b82f6; margin: 0; }
        
        .questions-list { padding: 20px; }
        .question-item { margin-bottom: 25px; }
        .q-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .q-number { color: #4a72ff; font-weight: 700; font-size: 0.95rem; }
        .q-mark { padding: 3px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; }
        .q-mark.pass { background: #f0fdf4; color: #16a34a; }
        .q-mark.fail { background-color: #fef2f2; color: #e11d48; }

        /* صورة السؤال */
        .question-image-container {
          text-align: center;
          margin-bottom: 15px;
        }
        .question-image {
          max-width: 100%;
          max-height: 300px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
        }

        /* نص السؤال */
        .q-text { font-size: 1.05rem; font-weight: 700; color: #334155; line-height: 1.6; margin-bottom: 15px; }

        .answers-review { display: flex; flex-direction: column; gap: 8px; }
        .answer-row { display: flex; align-items: center; gap: 8px; padding: 12px; border-radius: 12px; font-weight: 600; font-size: 0.9rem; }
        .answer-label { color: inherit; opacity: 0.8; white-space: nowrap; }
        .answer-val { flex: 1; display: flex; align-items: center; gap: 8px; }
        
        .is-correct { background-color: #f0fdf4; color: #16a34a; }
        .is-wrong { background-color: #fef2f2; color: #e11d48; }
        .is-correct-hint { background-color: #f0fdf4; color: #0F8C08; }

        /* صورة الخيار */
        .option-img {
          max-width: 130px;
          max-height: 90px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          padding: 2px;
          background: #fff;
        }

        .item-spacer { height: 3px; background: #f1f5f9; margin-top: 25px; margin-left: -20px; margin-right: -20px }

        .ltr { direction: ltr; text-align: left; }

        @media (max-width: 480px) {
          .score-achieved { font-size: 35px; }
          .score-total { font-size: 35px; }
          .main-heading { font-size: 1.5rem; }
          .option-img { max-width: 100px; }
        }
      `}</style>
    </div>
  );
}