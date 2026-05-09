// QuizResult.jsx
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

  // دالة لاكتشاف اللغة الإنجليزية في النصوص لضبط المحاذاة
  const isEnglish = (text) => {
    return /[a-zA-Z]/.test(text);
  };

  const getQuestionOrdinal = (index) => {
    const ordinals = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];
    return ordinals[index] || (index + 1);
  };

  return (
    <div className="quiz-result-wrapper">
      <div className="main-content-container">
        
        {/* زر العودة العلوي */}
        <div className="top-nav-area">
          <button className="back-btn-pill" onClick={() => navigate("/dashboard")}>
            العودة للمواد الدراسية
          </button>
        </div>

 {/* العنوان الرئيسي */}
        <div className="page-header">
          <h1 className="main-heading">ملخص محاولة الاختبار</h1>
          <p className="sub-heading">قم بمراجعة أجاباتك وتصحيح الأخطاء</p>
        </div>


        {/* بطاقة الطالب والدرجة */}
        <div className="custom-card summary-card shadow-lg">
          <div className="doc-illustration">
            {/* الأيقونة المخصصة من الرابط الذي أرفقته */}
            <img 
              src="https://i.imgur.com/N9qktIS.png" 
              alt="Score Logo" 
              width="92" 
              height="90" 
              style={{ objectFit: 'contain' }}
            />
          </div>

          <div className="info-row">
            <span className="info-label">إسم الطالـــــــب</span>
            <span className="info-value student-name-text">{studentName}</span>
          </div>

          <div className="horizontal-separator"></div>

          <div className="info-row">
            <span className="info-label">الدرجة النهائية</span>
            <div className="score-box">
<span className="total-val">{totalPossible}</span>
<span className="score-slash">/</span>
              <span className="score-val-blue">{score}</span>
	
              
            </div>
          </div>
        </div>

        {/* بطاقة تفاصيل الإجابات */}
        <div className="custom-card details-card shadow-lg">
          <div className="details-header-row">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2 className="details-card-title">تفاصيل الإجابات</h2>
          </div>

          <div className="horizontal-separator no-margin"></div>

          <div className="questions-feed">
            {questions.map((q, idx) => {
              const userAnswerIndex = selectedAnswers[q.id];
              const isCorrect = userAnswerIndex !== undefined && parseInt(userAnswerIndex) === parseInt(q.correct_option);
              const userAnswer = userAnswerIndex !== undefined ? q.options[userAnswerIndex] : "لم تتم الإجابة";
              const correctAnswer = q.options[parseInt(q.correct_option)];
              const degree = q.degree || 1;

              return (
                <div key={q.id} className="q-wrapper">
                  <div className="q-top-info">
                    <span className="q-ordinal-text">السؤال {getQuestionOrdinal(idx)}</span>
                    <span className={`q-points ${isCorrect ? 'positive' : 'negative'}`}>
                      {isCorrect ? `+${degree}` : `-${degree}`}
                    </span>
                  </div>

                  <p className={`q-body-text ${isEnglish(q.question_text) ? 'align-left ltr' : ''}`}>
                    {q.question_text}
                  </p>

                  <div className="answer-status-container">
                    {/* سطر الإجابة الخاصة بالطالب */}
                    <div className={`status-line ${isCorrect ? 'correct-clr' : 'incorrect-clr'}`}>
                      {/* الأيقونة على يمين الكلمة */}
                      <span className="status-icon-right">{isCorrect ? '✔' : '✘'}</span>
                      <span className="label-static">إجابتك:</span>
                      <span className={`value-dynamic ${isEnglish(userAnswer) ? 'align-left ltr' : ''}`}>
                        {userAnswer}
                      </span>
                    </div>

                    {/* سطر الإجابة الصحيحة (يظهر عند الخطأ فقط) */}
                    {!isCorrect && (
                      <div className="status-line correct-clr">
                        <span className="status-icon-right">✔</span>
                        <span className="label-static">الإجابة الصحيحة:</span>
                        <span className={`value-dynamic ${isEnglish(correctAnswer) ? 'align-left ltr' : ''}`}>
                          {correctAnswer}
                        </span>
                      </div>
                    )}
                  </div>
                  {idx < questions.length - 1 && <div className="inner-divider"></div>}
                </div>
              );
            })}
          </div>
        </div>

        <Footer />
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        .quiz-result-wrapper {
          background-color: #f4f8ff;
          min-height: 100vh;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
          padding: 0px 15px;
        }

        .main-content-container {
          max-width: 480px;
          margin: 0 auto;
        }

        .top-nav-area {
          text-align: center;
          margin-bottom: 25px;
        }

        .back-btn-pill {
          background-color: #4a72ff;
          color: white;
          border: none;
          padding: 13px 25px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          box-shadow: -4px 0 39px #7795F8;   /* x: -4, y: 0, blur: 39, color: #7795F8 */
          font-family: 'Cairo', sans-serif;
          margin-top: 15%;
          transition: all 0.3s ease;
        }
.back-btn-pill:hover {
  background-color: #3a5ce5;         /* slightly darker hover state */
  /* Optional: add a scale or a different shadow, e.g.:
     transform: scale(1.05);
     box-shadow: -4px 0 45px #7795F8; */
}
        .page-header {
          text-align: center;
          margin-bottom: 35px;
        }

        .main-heading {
          font-size: 1.9rem;
          font-weight: 700;
          color: #111;
          margin: 0;
        }

        .sub-heading {
          color: #888;
          font-size: 1rem;
          font-weight: 600;
          margin-top: 10px;
        }

        .custom-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 25px;
        }

        .shadow-lg {
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.04);
        }

        .summary-card {
          padding: 40px 0px;
          text-align: center;
        }

        .doc-illustration {
          margin-bottom: 15px;
          display: flex;
          justify-content: center;
        }

        .info-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .info-label {
          color: #bbb;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .student-name-text {
          font-size: 1.55rem;
          font-weight: 700;
          color: #1a1a1a;
        }

        .horizontal-separator {
          height: 3px;
          background-color: #f1f1f1;
          margin: 25px 0;
        }

        .horizontal-separator.no-margin {
          margin: 0;
        }

        .score-box {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1px;
        }

        .total-val {
          font-size: 35px;
          font-weight: 400;
          color: #222;
        }

        .score-slash {
          font-size: 35px;
          color: #000000;
          font-weight: 400;
        }

        .score-val-blue {
          font-size: 35px;
          font-weight: 800;
          color: #3b82f6;
        }

        .details-card-title {
          font-size: 1.2rem;
          color: #3b82f6;
          font-weight: 800;
          margin: 0;
        }

        .details-header-row {
          display: flex;
          align-items: center;
          padding: 24px 31px;
          gap: 12px;
        }

        .questions-feed {
          padding: 25px;
        }

        .q-wrapper {
          margin-bottom: 25px;
          padding: 7px;
        }

        .q-top-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .q-ordinal-text {
          color: #4a72ff;
          font-weight: 600;
          font-size: 1.15rem;
        }

        .q-points {
          font-weight: 600;
          font-size: 1.2rem;
        }

        .positive { color: #0F8C08; }
        .negative { color: #BF0303; }

        .q-body-text {
          color: #4a72ff;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.6;
          margin: 0 0 15px 0;
        }

        .answer-status-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .status-line {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 1.05rem;
        }

        .status-icon-right {
          font-size: 1.1rem;
          margin-left: 4px; /* لضمان وجود مسافة بين الأيقونة والكلمة */
        }

        .label-static {
          white-space: nowrap;
          margin-left: 4px;
        }

        .value-dynamic {
          flex-grow: 1;
        }

        .correct-clr { color: #0F8C08; }
        .incorrect-clr { color: #BF0303; }

        .inner-divider {
          height: 3px;
          background-color: #f1f1f1;
          margin-top: 25px;
          margin-left: -32px;   /* لتعويض padding الأسئلة + padding الغلاف */
  margin-right: -32px
        }

        /* تنسيقات اللغة الإنجليزية والمحاذاة */
        .ltr {
          direction: ltr !important;
        }

        .align-left {
          text-align: left !important;
        }

        @media (max-width: 480px) {
          .score-val-blue { font-size: px; }
          .total-val { font-size: 35px; }
          .student-name-text { font-size: 1.4rem; }
        }
      `}</style>
    </div>
  );
}
