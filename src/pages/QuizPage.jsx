import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Footer from './Footer';

export default function QuizPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();

  const [blocks, setBlocks] = useState([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(3600);
  const [submitting, setSubmitting] = useState(false);
  const [isEnglishSubject, setIsEnglishSubject] = useState(false);
  
  const hasAutoSubmitted = useRef(false);
  const timerRef = useRef(null);
  const blocksRef = useRef([]);
  const selectedAnswersRef = useRef({});
  const numericSubjectIdRef = useRef(parseInt(subjectId, 10));

  useEffect(() => {
    blocksRef.current = blocks;
    selectedAnswersRef.current = selectedAnswers;
  }, [blocks, selectedAnswers]);

  const numericSubjectId = parseInt(subjectId, 10);

  const performSubmit = useCallback(async (isAuto = false) => {
    if (hasAutoSubmitted.current || submitting) return false;
    
    hasAutoSubmitted.current = true;
    setSubmitting(true);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return false;
      }
      
      const currentBlocks = blocksRef.current;
      const currentAnswers = selectedAnswersRef.current;
      
      let allQuestions = [];
      currentBlocks.forEach(block => {
        if (block.type === 'passage') {
          allQuestions.push(...block.questions);
        } else {
          allQuestions.push(block.question);
        }
      });
      
      let finalScore = 0;
      allQuestions.forEach((q) => {
        const userAns = currentAnswers[q.id];
        if (userAns !== undefined && parseInt(userAns) === parseInt(q.correct_option)) {
          finalScore++;
        }
      });

      const { data: activeAttempt, error: attemptError } = await supabase
        .from('attempts')
        .select('id')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (attemptError || !activeAttempt) {
        throw new Error('لا توجد محاولة نشطة لهذا الطالب. يرجى التواصل مع الإدارة.');
      }

      const { error: resultError } = await supabase.from('results').insert([{
        student_id: user.id,
        subject_id: numericSubjectIdRef.current,
        score: finalScore,
        student_answers: currentAnswers,
        attempt_id: activeAttempt.id
      }]);

      if (resultError) throw resultError;

      const { error: updateError } = await supabase
        .from('attempts')
        .update({ status: 'completed' })
        .eq('id', activeAttempt.id);

      if (updateError) console.error('فشل تحديث حالة المحاولة:', updateError);

      navigate('/result', {
        state: { 
          score: finalScore, 
          total_questions: allQuestions.length, 
          questions: allQuestions, 
          selectedAnswers: currentAnswers 
        },
        replace: true
      });
      return true;
    } catch (err) {
      console.error('Submit error:', err);
      alert('حدث خطأ أثناء تسليم الاختبار: ' + err.message);
      hasAutoSubmitted.current = false;
      setSubmitting(false);
      return false;
    }
  }, [navigate, submitting]);

  const handleAutoSubmit = useCallback(() => {
    if (hasAutoSubmitted.current || submitting) return;
    performSubmit(true);
  }, [performSubmit, submitting]);

  useEffect(() => {
    if (!loading && blocks.length > 0 && !hasAutoSubmitted.current) {
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (!hasAutoSubmitted.current && !submitting) handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, blocks, handleAutoSubmit, submitting]);

  const fetchQuizData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data: attempts, error: attemptsError } = await supabase
        .from('attempts')
        .select('id')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (attemptsError || !attempts) {
        setError('no_active_attempt');
        setLoading(false);
        return;
      }

      const attemptId = attempts.id;
      const { data: aqData } = await supabase
        .from('attempt_questions')
        .select('question_id')
        .eq('attempt_id', attemptId)
        .eq('subject_id', numericSubjectId);

      if (!aqData || aqData.length === 0) {
        setError('no_questions');
        setLoading(false);
        return;
      }

      const questionIds = aqData.map(aq => aq.question_id);
      let { data: qData } = await supabase
        .from('questions')
        .select('*, image_option_a, image_option_b, image_option_c, image_option_d')
        .in('id', questionIds)
        .order('created_at', { ascending: true });

      if (!qData || qData.length === 0) {
        setError('no_questions');
        setLoading(false);
        return;
      }

      const { data: subjectInfo } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', numericSubjectId)
        .single();

      const isEnglish = subjectInfo?.name?.includes('إنجليزية') || false;
      setIsEnglishSubject(isEnglish);

      let finalBlocks = [];
      
      if (isEnglish) {
        const passageIds = [...new Set(qData.map(q => q.passage_id).filter(id => id))];
        let passages = [];
        if (passageIds.length) {
          const { data: pData } = await supabase.from('passages').select('*').in('id', passageIds);
          passages = pData || [];
        }

        const passageQuestionsMap = new Map();
        const standalone = [];
        qData.forEach(q => {
          if (q.passage_id) {
            if (!passageQuestionsMap.has(q.passage_id)) passageQuestionsMap.set(q.passage_id, []);
            passageQuestionsMap.get(q.passage_id).push(q);
          } else {
            standalone.push(q);
          }
        });

        const sortedPassages = passages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        for (const passage of sortedPassages) {
          const questionsOfPassage = passageQuestionsMap.get(passage.id) || [];
          questionsOfPassage.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          finalBlocks.push({
            type: 'passage',
            passage: passage,
            questions: questionsOfPassage
          });
        }
        standalone.forEach(q => {
          finalBlocks.push({
            type: 'single',
            question: q
          });
        });
      } else {
        finalBlocks = qData.map(q => ({ type: 'single', question: q }));
      }
      
      setBlocks(finalBlocks);
      setCurrentBlockIndex(0);
      hasAutoSubmitted.current = false;
      
    } catch (err) {
      console.error(err);
      setError('error');
    } finally {
      setLoading(false);
    }
  }, [navigate, numericSubjectId]);

  useEffect(() => {
    fetchQuizData();
    numericSubjectIdRef.current = numericSubjectId;
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [subjectId, fetchQuizData, numericSubjectId]);

  const handleSubmitQuiz = async () => {
    if (hasAutoSubmitted.current || submitting) return;
    let totalQuestions = 0;
    blocks.forEach(block => {
      if (block.type === 'passage') totalQuestions += block.questions.length;
      else totalQuestions += 1;
    });
    const answeredCount = Object.keys(selectedAnswers).length;
    const unansweredCount = totalQuestions - answeredCount;
    let confirmMsg = 'هل أنت متأكد من إنهاء وتسليم الاختبار؟';
    if (unansweredCount > 0) confirmMsg = `⚠️ لديك ${unansweredCount} سؤال بدون إجابة.\n\n${confirmMsg}`;
    if (!window.confirm(confirmMsg)) return;
    performSubmit(false);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId, answerIndex) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const currentBlock = blocks[currentBlockIndex];
  const totalBlocks = blocks.length;

  let totalQuestionsCount = 0;
  blocks.forEach(block => {
    if (block.type === 'passage') totalQuestionsCount += block.questions.length;
    else totalQuestionsCount += 1;
  });
  const answeredCount = Object.keys(selectedAnswers).length;
  const progress = totalQuestionsCount > 0 ? (answeredCount / totalQuestionsCount) * 100 : 0;

  const optionLabels = isEnglishSubject ? ['A', 'B', 'C', 'D'] : ['أ', 'ب', 'ج', 'د'];

  if (loading) return null;
  
  if (error) {
    return (
      <div className="quiz-page-wrapper" style={{ direction: isEnglishSubject ? 'ltr' : 'rtl' }}>
        <header className="quiz-header">
          <div className="timer-pill"><span>⏱️</span><span>00:00</span></div>
          <div className="center-brand"><img src="https://i.imgur.com/p1hg12H.png" alt="Logo" className="quiz-logo" /><span className="quiz-brand-name">مركز النخبة التعليمي</span></div>
          <button className="submit-quiz-btn" style={{ opacity: 0.5, cursor: 'default' }}>إنهاء الاختبار</button>
        </header>
        <div className="progress-container"><div className="progress-bar" style={{ width: '0%' }}></div></div>
        <main className="quiz-main-content">
          <div className="empty-state-card">
            <div className="empty-state-icon">{error === 'no_questions' ? '📚' : '⚠️'}</div>
            <h2 className="empty-state-title">{error === 'no_questions' ? 'لا توجد أسئلة' : 'لا توجد محاولة نشطة'}</h2>
            <p className="empty-state-description">
              {error === 'no_questions' ? 'عذراً، لم يتم العثور على أسئلة لهذه المادة حالياً.' : 'لا توجد محاولة نشطة حالياً. يرجى مراجعة الإدارة لتفعيل محاولة جديدة.'}
            </p>
            <button onClick={() => navigate('/dashboard')} className="back-to-dashboard-btn">العودة إلى المواد الدراسية</button>
          </div>
        </main>
        <Footer />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; }
          body { margin: 0; background-color: #f4f7fb; font-family: 'Cairo', sans-serif; direction: rtl; }
          .quiz-page-wrapper { min-height: 100vh; display: flex; flex-direction: column; background: #f4f7fb; }
          .quiz-header { background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); padding: 16px 40px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 20px rgba(0,0,0,0.03); position: sticky; top: 0; z-index: 100; border-bottom: 1px solid rgba(255,255,255,0.5); }
          .timer-pill { background: white; border: 1px solid #e2e8f0; padding: 8px 20px; border-radius: 50px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; }
          .center-brand { display: flex; align-items: center; gap: 12px; }
          .quiz-logo { height: 44px; width: auto; }
          .quiz-brand-name { font-weight: 800; color: #1e3a8a; font-size: 1.15rem; }
          .submit-quiz-btn { background: #ef4444; color: white; border: none; padding: 10px 28px; border-radius: 14px; font-weight: 700; cursor: pointer; font-family: 'Cairo'; }
          .progress-container { height: 6px; background: #e2e8f0; width: 100%; }
          .progress-bar { height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); transition: width 0.5s cubic-bezier(0.4,0,0.2,1); }
          .quiz-main-content { flex: 1; padding: 50px 20px; max-width: 900px; margin: 0 auto; width: 100%; display: flex; align-items: center; justify-content: center; }
          .empty-state-card { background: white; border-radius: 28px; padding: 60px 40px; text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,0.04); width: 100%; animation: fadeIn 0.5s ease-out; border: 1px solid #f1f5f9; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
          .empty-state-icon { font-size: 70px; margin-bottom: 20px; display: inline-block; }
          .empty-state-title { font-size: 26px; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
          .empty-state-description { font-size: 16px; color: #64748b; line-height: 1.6; margin-bottom: 32px; }
          .back-to-dashboard-btn { background: #3b82f6; color: white; border: none; padding: 14px 32px; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(59,130,246,0.2); }
          .back-to-dashboard-btn:hover { background: #2563eb; transform: translateY(-2px); }
          @media (max-width:768px){.quiz-header{padding:12px 20px}.quiz-brand-name{display:none}.empty-state-card{padding:40px 24px}}
        `}</style>
      </div>
    );
  }

  if (!currentBlock) return null;

  return (
    <div className="quiz-page-wrapper" style={{ direction: isEnglishSubject ? 'ltr' : 'rtl' }}>
      <header className="quiz-header">
        <div className="timer-pill">
          <span>⏱️</span>
          <span className={timeLeft < 60 ? 'time-critical' : timeLeft < 300 ? 'time-warning' : ''}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="center-brand">
          <img src="https://i.imgur.com/p1hg12H.png" alt="Logo" className="quiz-logo" />
          <span className="quiz-brand-name">مركز النخبة التعليمي</span>
        </div>
        <button onClick={handleSubmitQuiz} disabled={submitting || hasAutoSubmitted.current} className="submit-quiz-btn">
          {submitting ? 'جاري التسليم' : 'إنهاء الاختبار'}
        </button>
      </header>

      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>

      <main className="quiz-main-content">
        <div className="question-section">
          <div className="question-card">
            <div className="q-header">
              <span className="q-number">
                {isEnglishSubject && currentBlock.type === 'passage' 
                  ? `القطعة ${currentBlockIndex + 1} من ${totalBlocks} • تحتوي على ${currentBlock.questions.length} أسئلة`
                  : `السؤال ${currentBlockIndex + 1} من ${totalBlocks}`
                }
              </span>
            </div>

            {currentBlock.type === 'passage' && currentBlock.passage && (
              <div className="passage-box">
                <div className="passage-accent"></div>
                <h3>{currentBlock.passage.title}</h3>
                <p>{currentBlock.passage.passage_text}</p>
              </div>
            )}

            <div className="questions-container">
              {(currentBlock.type === 'passage' ? currentBlock.questions : [currentBlock.question]).map((q, qIdx) => (
                <div key={q.id} className="single-question-wrapper" style={{ marginBottom: qIdx < (currentBlock.type === 'passage' ? currentBlock.questions.length-1 : 0) ? '50px' : '0' }}>
                  
                  {currentBlock.type === 'passage' && (
                    <div className="question-header">
                      <span className="question-number">سؤال {qIdx + 1}</span>
                    </div>
                  )}

                  {q.image_url ? (
                    <div className="question-image-container">
                      <img src={q.image_url} alt="السؤال" className="question-image" />
                    </div>
                  ) : (
                    <h2 className="question-text">{q.question_text}</h2>
                  )}

                  <div className={`options-grid ${isEnglishSubject ? 'english-options' : ''}`}>
                    {q.options?.map((opt, idx) => {
                      const englishLetter = ['a', 'b', 'c', 'd'][idx];
                      const imageKey = `image_option_${englishLetter}`;
                      const optionImageUrl = q[imageKey];
                      return (
                        <div 
                          key={idx} 
                          className={`option-item ${selectedAnswers[q.id] === idx ? 'selected' : ''}`}
                          onClick={() => handleAnswerSelect(q.id, idx)}
                        >
                          <span className="option-label">{optionLabels[idx]}</span>
                          {optionImageUrl ? (
                            <div className="option-image-wrapper">
                              <img src={optionImageUrl} alt={`خيار ${optionLabels[idx]}`} className="option-image" />
                            </div>
                          ) : (
                            <span className="option-value">{opt}</span>
                          )}
                          <div className="check-circle"></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="quiz-nav-controls">
            <button 
              className="nav-btn prev" 
              disabled={currentBlockIndex === 0}
              onClick={() => setCurrentBlockIndex(prev => prev - 1)}
            >
              السابق
            </button>
            <div className="q-dots-nav">
              {blocks.map((block, idx) => {
                let label = '';
                let isCompleted = false;
                if (block.type === 'passage') {
                  const allAnswered = block.questions.every(q => selectedAnswers[q.id] !== undefined);
                  isCompleted = allAnswered;
                  label = `📄 ${idx+1}`;
                } else {
                  isCompleted = selectedAnswers[block.question.id] !== undefined;
                  label = `${idx+1}`;
                }
                return (
                  <div 
                    key={idx}
                    className={`dot ${currentBlockIndex === idx ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => setCurrentBlockIndex(idx)}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
            <button 
              className="nav-btn next" 
              disabled={currentBlockIndex === totalBlocks - 1}
              onClick={() => setCurrentBlockIndex(prev => prev + 1)}
            >
              التالي
            </button>
          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; }
        body { margin: 0; background-color: #f4f7fb; font-family: 'Cairo', sans-serif; direction: rtl; -webkit-font-smoothing: antialiased; }

        .quiz-page-wrapper { min-height: 100vh; display: flex; flex-direction: column; background: #f4f7fb; }
        
        .quiz-header { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); padding: 16px 40px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 20px rgba(0,0,0,0.03); position: sticky; top: 0; z-index: 100; border-bottom: 1px solid rgba(255,255,255,0.5); }
        .timer-pill { background: #ffffff; border: 1px solid #eef2f6; padding: 8px 20px; border-radius: 50px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
        .time-warning { color: #f59e0b; animation: pulse 1.5s infinite; }
        .time-critical { color: #ef4444; animation: pulse 0.5s infinite; font-weight: 800; }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(0.98); } 100% { opacity: 1; transform: scale(1); } }
        .center-brand { display: flex; align-items: center; gap: 12px; }
        .quiz-logo { height: 44px; width: auto; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05)); }
        .quiz-brand-name { font-weight: 800; color: #1e3a8a; font-size: 1.15rem; letter-spacing: -0.3px; }
        .submit-quiz-btn { background: #ef4444; color: white; border: none; padding: 12px 28px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s cubic-bezier(0.4,0,0.2,1); font-family: 'Cairo', sans-serif; box-shadow: 0 4px 12px rgba(239,68,68,0.2); }
        .submit-quiz-btn:hover:not(:disabled) { background: #dc2626; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(239,68,68,0.3); }
        .submit-quiz-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .progress-container { height: 6px; background: #eef2f6; width: 100%; overflow: hidden; }
        .progress-bar { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); transition: width 0.5s cubic-bezier(0.4,0,0.2,1); border-radius: 0 4px 4px 0; }
        .quiz-main-content { flex: 1; padding: 40px 20px; max-width: 960px; margin: 0 auto; width: 100%; }
        .question-card { background: #ffffff; border-radius: 28px; padding: 45px; box-shadow: 0 12px 40px -12px rgba(0,0,0,0.06); margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.8); }
        .q-header { margin-bottom: 24px; }
        .q-number { background: #f0fdf4; color: #16a34a; padding: 8px 18px; border-radius: 100px; font-weight: 700; font-size: 0.95rem; display: inline-block; border: 1px solid #dcfce7; }
        
        /* Passage box responsive to direction */
        .passage-box { 
          background: #f8fafc; 
          padding: 30px; 
          border-radius: 20px; 
          margin-bottom: 35px; 
          position: relative; 
          overflow: hidden; 
          border: 1px solid #f1f5f9; 
          text-align: start; 
        }
        .passage-accent { 
          position: absolute; 
          top: 0; 
          inset-inline-start: 0; 
          bottom: 0; 
          width: 4px; 
          background: #3b82f6; 
          border-radius: 4px; 
        }
        .passage-box h3 { margin: 0 0 16px 0; color: #0f172a; font-size: 1.35rem; font-weight: 800; }
        .passage-box p { line-height: 1.8; color: #334155; font-size: 1.05rem; }
        
        .questions-container { display: flex; flex-direction: column; gap: 45px; }
        .single-question-wrapper { border-top: 1px dashed #e2e8f0; padding-top: 35px; }
        .single-question-wrapper:first-child { border-top: none; padding-top: 0; }
        .question-header { margin-bottom: 20px; }
        .question-number { background: #f1f5f9; color: #475569; padding: 6px 14px; border-radius: 100px; font-size: 0.85rem; font-weight: 700; display: inline-block; }
        .question-text { color: #0f172a; line-height: 1.7; font-size: 1.45rem; font-weight: 700; margin-bottom: 32px; text-align: start; }
        .question-image-container { text-align: center; margin: 24px 0; }
        .question-image { max-width: 100%; max-height: 350px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #f1f5f9; }
        .options-grid { display: flex; flex-direction: column; gap: 14px; }

        /* Default option styling (Arabic: label on right, text middle, circle left) */
        .option-item {
          display: flex;
          align-items: center;
          padding: 20px 24px;
          background: #ffffff;
          border: 2px solid #eef2f6;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
          gap: 12px;
        }
        .option-item:hover { border-color: #bfdbfe; background: #fafcff; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(59,130,246,0.06); }
        .option-item.selected { border-color: #3b82f6; background: #eff6ff; box-shadow: 0 8px 24px rgba(59,130,246,0.12); transform: translateY(-2px); }

        .option-label {
          width: 40px;
          height: 40px;
          background: #f1f5f9;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.15rem;
          color: #64748b;
          flex-shrink: 0;
        }
        .selected .option-label { background: #3b82f6; color: white; box-shadow: 0 4px 10px rgba(59,130,246,0.3); }

        .option-value {
          flex: 1;
          font-size: 1.1rem;
          font-weight: 600;
          color: #334155;
          line-height: 1.5;
          text-align: right;
        }
        .selected .option-value { color: #1e3a8a; }
        
        .option-image-wrapper { max-width: 130px; flex-shrink: 0; }
        .option-image { max-width: 100%; max-height: 100px; border-radius: 14px; object-fit: contain; background: white; border: 1px solid #e2e8f0; padding: 4px; }
        
        .check-circle {
          width: 26px;
          height: 26px;
          border: 2.5px solid #cbd5e1;
          border-radius: 50%;
          flex-shrink: 0;
          margin-left: auto;
        }
        .selected .check-circle { border-color: #3b82f6; background: #3b82f6; position: relative; transform: scale(1.1); }
        .selected .check-circle::after {
          content: '✓';
          color: white;
          font-size: 14px;
          font-weight: bold;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        /* English specific layout: keep default order (label, value, circle) but adjust text alignment */
        .english-options .option-value {
          text-align: left;
        }
        /* No flex-direction change, just text alignment */

        .quiz-nav-controls { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eef2f6; }
        .nav-btn { padding: 14px 36px; border-radius: 16px; border: 1.5px solid #e2e8f0; background: white; font-family: 'Cairo'; font-weight: 700; cursor: pointer; transition: all 0.2s ease; color: #475569; font-size: 1.05rem; }
        .nav-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; color: #0f172a; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .q-dots-nav { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .dot { background: white; border: 1.5px solid #e2e8f0; border-radius: 14px; min-width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem; cursor: pointer; color: #64748b; padding: 0 10px; transition: all 0.2s; }
        .dot.active { border-color: #3b82f6; color: #3b82f6; border-width: 2px; background: #eff6ff; transform: scale(1.08); box-shadow: 0 4px 12px rgba(59,130,246,0.15); }
        .dot.completed { background: #ecfdf5; color: #10b981; border-color: #a7f3d0; }
        .dot:hover:not(.active) { border-color: #cbd5e1; transform: translateY(-2px); }

        @media (max-width: 768px) {
          .quiz-header { padding: 12px 20px; }
          .quiz-brand-name { display: none; }
          .question-card { padding: 30px 24px; border-radius: 24px; }
          .question-text { font-size: 1.25rem; }
          .q-dots-nav { display: none; }
          .option-item { padding: 16px; gap: 10px; }
          .option-label { width: 36px; height: 36px; font-size: 1rem; }
          .option-value { font-size: 1rem; }
          .option-image { max-height: 80px; }
          .option-image-wrapper { max-width: 100px; }
          .questions-container { gap: 35px; }
          .nav-btn { padding: 12px 24px; font-size: 1rem; }
        }
      `}</style>
    </div>
  );
}