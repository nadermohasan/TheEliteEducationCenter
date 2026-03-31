import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";

export default function QuizResult() {
  const { state } = useLocation(); // سنمرر البيانات من صفحة الاختبار لهنا
  const navigate = useNavigate();
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (state) {
      setResult(state);
    } else {
      // لو دخل الصفحة مباشرة بدون بيانات نرجعه للرئيسية
      navigate('/dashboard');
    }
  }, [state, navigate]);

  if (!result) return null;

  const percentage = Math.round((result.score / result.total_questions) * 100);

  return (
    <div className="result-page-container">
      <div className="result-card">
        {/* الدائرة العلوية للنسبة المئوية */}
        <div className="percentage-circle">
          <svg viewBox="0 0 36 36" className="circular-chart">
            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path className="circle" strokeDasharray={`${percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <text x="18" y="20.35" className="percentage">{percentage}%</text>
          </svg>
        </div>

        <div className="score-summary">
          <div className="summary-item correct">الإجابات الصحيحة: {result.score}</div>
          <div className="summary-item wrong">الإجابات الخاطئة: {result.total_questions - result.score}</div>
        </div>

        <h2 className="congrats-text">
         درجتك النهائية: {result.score}/{result.total_questions}
          <br />
          <span>{percentage >= 50 ? 'نــــاجح' : 'راســـب'}</span>
        </h2>

        <h3 className="details-title">تفاصيل الإجابات</h3>
        
        <div className="answers-details-list">
          {result.questions.map((q, index) => {
            const isCorrect = result.selectedAnswers[q.id] === q.correct_option;
            return (
              <div key={index} className={`detail-item ${isCorrect ? 'correct-bg' : 'wrong-bg'}`}>
                <div className="detail-header">
                  <span className="q-num">{index + 1}. {q.question_text}</span>
                  {isCorrect ? <CheckCircle size={18} color="#27ae60"/> : <XCircle size={18} color="#e74c3c"/>}
                </div>
                <div className="answer-comparison">
                  <p>إجابتك: {q.options[result.selectedAnswers[q.id]] || 'لم يتم الإجابة'}</p>
                  {!isCorrect && (
                    <p className="correct-ans">الإجابة الصحيحة: {q.options[q.correct_option]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button className="retry-btn" onClick={() => navigate('/dashboard')}>
          <RotateCcw size={18} /> العودة للرئيسية
        </button>
      </div>

      <style>{`
        .result-page-container { background: #f0f7ff; min-height: 100vh; padding: 40px 20px; direction: rtl; font-family: 'Cairo', sans-serif; display: flex; justify-content: center; }
        .result-card { background: white; width: 100%; max-width: 500px; border-radius: 24px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; }
        
        .percentage-circle { width: 150px; margin: 0 auto 20px; }
        .circular-chart { display: block; margin: 10px auto; max-width: 100%; max-height: 250px; }
        .circle-bg { fill: none; stroke: #eee; stroke-width: 2.8; }
        .circle { fill: none; stroke: #27ae60; stroke-width: 2.8; stroke-linecap: round; transition: stroke-dasharray 1s ease 0s; }
        .percentage { fill: #2c3e50; font-weight: 700; font-size: 0.5em; text-anchor: middle; }

        .score-summary { display: flex; justify-content: center; gap: 15px; margin-bottom: 25px; }
        .summary-item { padding: 8px 15px; border-radius: 10px; font-size: 0.85rem; font-weight: 600; }
        .summary-item.correct { background: #e6f7ee; color: #27ae60; }
        .summary-item.wrong { background: #fdeaea; color: #e74c3c; }

        .congrats-text { font-size: 1.2rem; color: #2c3e50; margin-bottom: 30px; }
        .congrats-text span { font-size: 0.9rem; color: #7f8c8d; }

        .details-title { text-align: right; font-size: 1rem; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .answers-details-list { max-height: 300px; overflow-y: auto; margin-bottom: 25px; padding-left: 5px; }
        .detail-item { text-align: right; padding: 15px; border-radius: 12px; margin-bottom: 10px; border: 1px solid transparent; }
        .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; font-weight: 600; font-size: 0.9rem; }
        .correct-bg { background: #f0fff4; border-color: #c6f6d5; }
        .wrong-bg { background: #fff5f5; border-color: #fed7d7; }
        
        .answer-comparison { font-size: 0.8rem; color: #4a5568; }
        .correct-ans { color: #27ae60; font-weight: 700; margin-top: 4px; }

        .retry-btn { width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; transition: 0.3s; }
        .retry-btn:hover { background: #2563eb; }
      `}</style>
    </div>
  );
}