import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RotateCcw, Award, TrendingDown, Users } from "lucide-react";
import Footer from './Footer';
import Navbar from './Navbar';

export default function QuizResult() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (state && state.questions && state.total_questions) {
      setResult(state);
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [state, navigate]);

  if (!result) return null;

  const score = result.score || 0;
  const total = result.total_questions || 0;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const isPass = percentage >= 50;
  
  // ✅ استخراج الاسم الأول من الاسم الكامل
  const fullName = result.studentName || 'طالب';
  const firstName = fullName.split(' ')[0];

  const getCircleColor = () => {
    if (percentage >= 70) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="result-page">
      <Navbar userName={firstName} />

      <main className="result-main">
        <div className="result-card">
          {/* الدائرة والنسبة والملخص */}
          <div className="stats-summary">
            <div className="percentage-wrapper">
              <div className="percentage-circle">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path 
                    className="circle" 
                    strokeDasharray={`${percentage}, 100`} 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    style={{ stroke: getCircleColor() }}
                  />
                  <text x="18" y="20.35" className="percentage-text">{percentage}%</text>
                </svg>
              </div>
              <div className={`grade-badge ${isPass ? 'pass' : 'fail'}`}>
                {isPass ? <Award size={18} /> : <TrendingDown size={18} />}
                <span>{isPass ? 'ناجح' : 'راسب'}</span>
              </div>
            </div>

            <div className="score-stats">
              <div className="stat-box correct">
                <CheckCircle size={20} />
                <div>
                  <span>الإجابات الصحيحة</span>
                  <strong>{score}</strong>
                </div>
              </div>
              <div className="stat-box wrong">
                <XCircle size={20} />
                <div>
                  <span>الإجابات الخاطئة</span>
                  <strong>{total - score}</strong>
                </div>
              </div>
              <div className="stat-box total">
                <Users size={20} />
                <div>
                  <span>إجمالي الأسئلة</span>
                  <strong>{total}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* الجدول */}
          <div className="table-card">
            <div className="card-header">
              <h2 className="card-title">
                <CheckCircle size={20} className="icon-blue" /> تفاصيل الإجابات
              </h2>
              <span className="badge-count">{total} سؤال</span>
            </div>
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>نص السؤال</th>
                    <th>إجابة الطالب</th>
                    <th>الإجابة الصحيحة</th>
                    <th className="text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {result.questions && result.questions.length > 0 ? (
                    result.questions.map((q, index) => {
                      const userAnswer = result.selectedAnswers?.[q.id];
                      const isCorrect = userAnswer !== undefined && parseInt(userAnswer) === parseInt(q.correct_option);
                      const userAnswerText = (userAnswer !== undefined && q.options[userAnswer]) ? q.options[userAnswer] : '—';
                      
                      return (
                        <tr key={index}>
                          <td className="text-center">{index + 1}</td>
                          <td className="question-cell">{q.question_text}</td>
                          <td className={isCorrect ? 'correct-answer-cell' : 'wrong-answer-cell'}>
                            {userAnswerText}
                          </td>
                          <td className="correct-answer-cell">{q.options[q.correct_option]}</td>
                          <td className="text-center">
                            <span className={`status-badge ${isCorrect ? 'success' : 'error'}`}>
                              {isCorrect ? '✓ صحيح' : '✗ خطأ'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-table">لا توجد أسئلة لعرضها</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button className="retry-btn" onClick={() => navigate('/dashboard')}>
            <RotateCcw size={18} /> العودة إلى المواد الدراسية
          </button>
        </div>
      </main>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #f4f7fc; font-family: 'Cairo', sans-serif; }

        .result-page {
          direction: rtl;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #f4f7fc 0%, #e9f0f9 100%);
        }

        /* المحتوى الرئيسي */
        .result-main {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 20px;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }
        .result-card {
          background: white;
          border-radius: 32px;
          padding: 40px;
          width: 100%;
          box-shadow: 0 20px 35px -12px rgba(0,0,0,0.08);
          transition: transform 0.2s;
        }

        /* قسم الإحصائيات العلوي */
        .stats-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 40px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .percentage-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .percentage-circle {
          width: 130px;
        }
        .circular-chart {
          display: block;
          width: 100%;
        }
        .circle-bg {
          fill: none;
          stroke: #e2e8f0;
          stroke-width: 2.8;
        }
        .circle {
          fill: none;
          stroke-width: 2.8;
          stroke-linecap: round;
          transition: stroke-dasharray 1s ease;
        }
        .percentage-text {
          fill: #1e293b;
          font-weight: 800;
          font-size: 0.5em;
          text-anchor: middle;
          dominant-baseline: middle;
        }
        .grade-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 18px;
          border-radius: 40px;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .grade-badge.pass {
          background: #e6f7ee;
          color: #10b981;
        }
        .grade-badge.fail {
          background: #fef2f2;
          color: #ef4444;
        }

        .score-stats {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .stat-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
          padding: 12px 20px;
          border-radius: 20px;
          min-width: 140px;
        }
        .stat-box.correct { background: #f0fdf4; border: 1px solid #bbf7d0; }
        .stat-box.wrong { background: #fef2f2; border: 1px solid #fecaca; }
        .stat-box.total { background: #eff6ff; border: 1px solid #bfdbfe; }
        .stat-box div {
          display: flex;
          flex-direction: column;
        }
        .stat-box span {
          font-size: 0.75rem;
          color: #64748b;
        }
        .stat-box strong {
          font-size: 1.4rem;
          font-weight: 800;
          color: #1e293b;
        }
        .stat-box.correct strong { color: #10b981; }
        .stat-box.wrong strong { color: #ef4444; }
        .stat-box.total strong { color: #3b82f6; }

        /* الجدول */
        .table-card {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          overflow: hidden;
          margin: 30px 0;
        }
        .card-header {
          padding: 20px 25px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-title {
          margin: 0;
          font-size: 1.1rem;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .icon-blue { color: #3b82f6; }
        .badge-count {
          background: #eff6ff;
          color: #3b82f6;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }
        .modern-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
          text-align: right;
        }
        .modern-table th {
          background: #f8fafc;
          padding: 14px 18px;
          color: #475569;
          font-weight: 700;
          font-size: 0.9rem;
          border-bottom: 2px solid #e2e8f0;
        }
        .modern-table td {
          padding: 14px 18px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          vertical-align: middle;
        }
        .modern-table tbody tr:hover {
          background: #fbfcfd;
        }
        .text-center {
          text-align: center !important;
        }
        .question-cell {
          font-weight: 600;
          max-width: 300px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .correct-answer-cell {
          color: #10b981;
          font-weight: 600;
        }
        .wrong-answer-cell {
          color: #ef4444;
          font-weight: 500;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 30px;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .status-badge.success {
          background: #e6f7ee;
          color: #10b981;
        }
        .status-badge.error {
          background: #fef2f2;
          color: #ef4444;
        }
        .empty-table {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }

        /* زر العودة */
        .retry-btn {
          width: 100%;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 14px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Cairo', sans-serif;
          box-shadow: 0 4px 12px rgba(59,130,246,0.25);
          margin-top: 20px;
        }
        .retry-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59,130,246,0.3);
        }

        /* استجابة الموبايل */
        @media (max-width: 768px) {
          .result-card { padding: 25px; }
          .stats-summary { flex-direction: column; align-items: stretch; gap: 20px; }
          .score-stats { justify-content: center; }
          .stat-box { justify-content: center; }
          .card-header { flex-direction: column; align-items: flex-start; gap: 10px; }
          .modern-table th, .modern-table td { padding: 10px 12px; font-size: 0.85rem; }
          .question-cell { max-width: 180px; }
        }
      `}</style>
    </div>
  );
}