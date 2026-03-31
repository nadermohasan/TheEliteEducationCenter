// QuizPage.jsx - النسخة النهائية المعدلة
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function QuizPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(3650);
  const [submitting, setSubmitting] = useState(false);

  const numericSubjectId = parseInt(subjectId, 10);

  useEffect(() => {
    fetchQuizData();

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [subjectId]);

  const fetchQuizData = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { navigate('/login'); return; }

      // 1. جلب المحاولة النشطة
      const { data: attempts, error: attemptError } = await supabase
        .from('attempts')
        .select('id')
        .eq('student_id', user.id)
        .eq('status', 'active');

      if (attemptError || !attempts || attempts.length === 0) {
        setError('لا توجد محاولة نشطة حالياً. يرجى مراجعة الإدارة لتفعيل الاختبار.');
        setLoading(false);
        return;
      }

      const attemptId = attempts[0].id;

      // 2. جلب الأسئلة المخصصة لهذه المحاولة والمادة
      const { data: aqData, error: aqError } = await supabase
        .from('attempt_questions')
        .select('question_id')
        .eq('attempt_id', attemptId)
        .eq('subject_id', numericSubjectId);

      if (aqError || !aqData || aqData.length === 0) {
        setError('لم يتم العثور على أسئلة مخصصة لهذه المادة في محاولتك.');
        setLoading(false);
        return;
      }

      const questionIds = aqData.map(aq => aq.question_id);

      // 3. جلب تفاصيل الأسئلة من جدول الأسئلة الرئيسي
      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (qError) throw qError;

      // ترتيب الأسئلة لضمان الثبات
      const ordered = questionIds.map(id => qData.find(q => q.id === id)).filter(q => q);
      setQuestions(ordered);

    } catch (err) {
      console.error('Fetch Error:', err);
      setError('حدث خطأ أثناء تحميل البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    const unansweredCount = questions.length - Object.keys(selectedAnswers).length;
    let confirmMsg = 'هل أنت متأكد من إنهاء وتسليم الاختبار؟';
    if (unansweredCount > 0) {
      confirmMsg = `⚠️ لديك ${unansweredCount} سؤال بدون إجابة.\n\n${confirmMsg}`;
    }

    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. حساب الدرجة النهائية
      let finalScore = 0;
      questions.forEach((q) => {
        const userAns = selectedAnswers[q.id];
        if (userAns !== undefined && parseInt(userAns) === parseInt(q.correct_option)) {
          finalScore++;
        }
      });
      // 2. الحصول على ID المحاولة النشطة لإغلاقها
      const { data: activeAttempt } = await supabase
        .from('attempts')
        .select('id')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single();

      // 3. حفظ النتيجة في جدول results
      const { error: resError } = await supabase.from('results').insert([{
        student_id: user.id,
        subject_id: numericSubjectId,
        score: finalScore,
        student_answers: selectedAnswers,
        attempt_id: activeAttempt?.id
      }]);

      if (resError) throw resError;

      /*
      // 4. تحديث حالة المحاولة إلى مكتملة
      if (activeAttempt) {
        await supabase
          .from('attempts')
          .update({ status: 'completed' })
          .eq('id', activeAttempt.id);
      }
      */
      // 5. الانتقال لصفحة النتائج مع البيانات
      navigate('/result', {
        state: {
          score: finalScore,
          total_questions: questions.length,
          questions: questions,
          selectedAnswers: selectedAnswers
        },
        replace: true
      });

    } catch (err) {
      console.error('Submit Error:', err);
      alert('فشل تسليم الاختبار: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <div style={styles.center}>جاري تحميل الأسئلة...</div>;
  if (error) return <div style={styles.center}><p>{error}</p><button onClick={() => navigate('/dashboard')}>عودة</button></div>;

  const currentQ = questions[currentIndex];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>⏱️ {formatTime(timeLeft)}</div>
        <div style={{fontWeight: 'bold'}}>السؤال {currentIndex + 1} / {questions.length}</div>
        <button onClick={handleSubmitQuiz} disabled={submitting} style={styles.finishBtn}>
          {submitting ? 'جاري الحفظ...' : 'إنهاء الاختبار'}
        </button>
      </div>

      {/* Question Card */}
      <div style={styles.card}>
        <h2 style={styles.qText}>{currentQ?.question_text}</h2>
        <div style={styles.optionsList}>
          {currentQ?.options?.map((opt, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedAnswers({...selectedAnswers, [currentQ.id]: idx})}
              style={{
                ...styles.option,
                ...(selectedAnswers[currentQ.id] === idx ? styles.selectedOption : {})
              }}
            >
              <span style={styles.optionChar}>{String.fromCharCode(65 + idx)}</span>
              {opt}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Footer */}
      <div style={styles.footer}>
        <button 
          disabled={currentIndex === 0} 
          onClick={() => setCurrentIndex(currentIndex - 1)}
          style={styles.navBtn}
        >السابق</button>
        
        <div style={styles.grid}>
          {questions.map((_, i) => (
            <div 
              key={i} 
              onClick={() => setCurrentIndex(i)}
              style={{
                ...styles.gridDot,
                ...(currentIndex === i ? styles.activeDot : {}),
                ...(selectedAnswers[questions[i].id] !== undefined ? styles.answeredDot : {})
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <button 
          disabled={currentIndex === questions.length - 1} 
          onClick={() => setCurrentIndex(currentIndex + 1)}
          style={styles.navBtn}
        >التالي</button>
      </div>
    </div>
  );
}

const styles = {
  container: { direction: 'rtl', fontFamily: 'Cairo', padding: '20px', backgroundColor: '#f9f9f9', minHeight: '100vh' },
  center: { textAlign: 'center', marginTop: '50px', fontFamily: 'Cairo' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '12px' },
  card: { background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  qText: { fontSize: '1.2rem', marginBottom: '20px', color: '#2c3e50' },
  optionsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  option: { padding: '15px', border: '1px solid #eee', borderRadius: '10px', cursor: 'pointer', display: 'flex', gap: '10px', transition: '0.2s' },
  selectedOption: { borderColor: '#3b82f6', backgroundColor: '#eff6ff', fontWeight: 'bold' },
  optionChar: { background: '#f1f5f9', padding: '2px 8px', borderRadius: '5px' },
  footer: { marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#334155', color: 'white' },
  finishBtn: { background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' },
  grid: { display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' },
  gridDot: { width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #ddd', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' },
  activeDot: { borderColor: '#3b82f6', color: '#3b82f6', borderWidth: '2px' },
  answeredDot: { background: '#dcfce7', borderColor: '#22c55e' }
};