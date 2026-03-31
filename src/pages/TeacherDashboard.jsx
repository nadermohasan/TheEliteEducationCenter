import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogOut, PlusCircle, Trash2, BookOpen, Edit2, X } from "lucide-react";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // State للفورم
  const [formData, setFormData] = useState({
    subject_id: '',
    question_text: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correct_option: 0
  });

  useEffect(() => {
    fetchSubjects();
    fetchQuestions();
  }, []);

  // دالة جلب المواد
  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('خطأ في جلب المواد:', error);
        return;
      }
      
      console.log('المواد التي تم جلبها:', data);
      setSubjects(data || []);
    } catch (err) {
      console.error('خطأ في جلب المواد:', err);
    }
  };

  // دالة جلب الأسئلة - الطريقة المضمونة
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      
      // التحقق من وجود مستخدم
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log("لا يوجد مستخدم مسجل");
        navigate('/login');
        return;
      }
      
      console.log('جاري جلب الأسئلة للمعلم:', user.id);
      
      // جلب الأسئلة أولاً
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      
      if (questionsError) {
        console.error('خطأ في جلب الأسئلة:', questionsError);
        setFetchError('حدث خطأ في جلب الأسئلة');
        setQuestions([]);
        return;
      }
      
      console.log('الأسئلة التي تم جلبها:', questionsData);
      
      if (!questionsData || questionsData.length === 0) {
        console.log('لا توجد أسئلة');
        setQuestions([]);
        return;
      }
      
      // جلب المواد لجميع الـ subject_ids الموجودة
      const subjectIds = [...new Set(questionsData.map(q => q.subject_id).filter(id => id))];
      
      let subjectsMap = new Map();
      
      if (subjectIds.length > 0) {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name')
          .in('id', subjectIds);
        
        if (!subjectsError && subjectsData) {
          subjectsData.forEach(subject => {
            subjectsMap.set(subject.id, subject);
          });
        }
      }
      
      // دمج البيانات
      const formattedQuestions = questionsData.map(question => ({
        ...question,
        subjects: subjectsMap.get(question.subject_id) || { name: 'غير محدد' }
      }));
      
      console.log('الأسئلة بعد التنسيق:', formattedQuestions);
      setQuestions(formattedQuestions);
      
    } catch (err) {
      console.error('خطأ عام في جلب الأسئلة:', err);
      setFetchError('حدث خطأ غير متوقع');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // دالة إضافة سؤال
  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('يجب تسجيل الدخول أولاً');
        navigate('/login');
        return;
      }
      
      const newQuestion = {
        teacher_id: user.id,
        subject_id: formData.subject_id,
        question_text: formData.question_text,
        options: [formData.optionA, formData.optionB, formData.optionC, formData.optionD],
        correct_option: parseInt(formData.correct_option),
        created_at: new Date()
      };
      
      console.log('جاري إضافة السؤال:', newQuestion);
      
      const { error } = await supabase
        .from('questions')
        .insert([newQuestion]);
      
      if (error) throw error;
      
      alert('تم إضافة السؤال بنجاح!');
      resetForm();
      await fetchQuestions(); // إعادة تحميل الأسئلة
      
    } catch (error) {
      console.error('خطأ في الإضافة:', error);
      alert('خطأ في الإضافة: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // دالة تعديل السؤال
  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updatedQuestion = {
        subject_id: formData.subject_id,
        question_text: formData.question_text,
        options: [formData.optionA, formData.optionB, formData.optionC, formData.optionD],
        correct_option: parseInt(formData.correct_option),
        updated_at: new Date()
      };
      
      console.log('جاري تحديث السؤال:', editingId, updatedQuestion);
      
      const { error } = await supabase
        .from('questions')
        .update(updatedQuestion)
        .eq('id', editingId);
      
      if (error) throw error;
      
      alert('تم تعديل السؤال بنجاح!');
      resetForm();
      await fetchQuestions(); // إعادة تحميل الأسئلة
      
    } catch (error) {
      console.error('خطأ في التعديل:', error);
      alert('خطأ في التعديل: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // دالة حذف السؤال
  const deleteQuestion = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;
    
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      if (editingId === id) {
        resetForm();
      }
      
      alert('تم حذف السؤال بنجاح!');
      await fetchQuestions(); // إعادة تحميل الأسئلة
      
    } catch (error) {
      console.error('خطأ في الحذف:', error);
      alert("خطأ أثناء الحذف: " + error.message);
    }
  };

  // دالة تسجيل الخروج
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      alert('حدث خطأ أثناء تسجيل الخروج: ' + error.message);
    }
  };

  // دالة تحميل بيانات السؤال للتعديل
  const loadQuestionForEdit = (question) => {
    const options = question.options || ['', '', '', ''];
    setFormData({
      subject_id: question.subject_id || '',
      question_text: question.question_text || '',
      optionA: options[0] || '',
      optionB: options[1] || '',
      optionC: options[2] || '',
      optionD: options[3] || '',
      correct_option: question.correct_option || 0
    });
    setIsEditing(true);
    setEditingId(question.id);
    document.querySelector('.form-card')?.scrollIntoView({ behavior: 'smooth' });
  };

  // دالة إعادة تعيين الفورم
  const resetForm = () => {
    setFormData({
      subject_id: '',
      question_text: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correct_option: 0
    });
    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <div className="teacher-container">
      <aside className="teacher-sidebar">
        <div className="sidebar-brand">
          <img src="https://i.imgur.com/p1hg12H.png" alt="Logo" />
          <span>لوحة المعلم</span>
        </div>
        <nav>
          <div className="nav-link active">
            <BookOpen size={20}/> إدارة بنك الأسئلة
          </div>
          <div className="nav-link" onClick={handleLogout}>
            <LogOut size={20}/> تسجيل الخروج
          </div>
        </nav>
      </aside>
      
      <main className="teacher-content">
        <header className="content-header">
          <h2>{isEditing ? 'تعديل السؤال' : 'إضافة سؤال جديد إلى بنك الأسئلة'}</h2>
        </header>
        
        {/* عرض رسالة الخطأ إن وجدت */}
        {fetchError && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {fetchError}
          </div>
        )}
        
        {/* فورم إضافة/تعديل السؤال */}
        <div className="form-card">
          <form onSubmit={isEditing ? handleUpdateQuestion : handleAddQuestion}>
            <div className="form-grid">
              <div className="full-width">
                <label>نص السؤال</label>
                <textarea 
                  required 
                  value={formData.question_text} 
                  onChange={(e) => setFormData({...formData, question_text: e.target.value})}
                  placeholder="اكتب السؤال هنا..." 
                />
                <label>إضافة سؤال مصور </label>
                <input type ="file"></input>
              </div>
              
              <div className="input-group">
                <label>المادة</label>
                <select 
                  required 
                  value={formData.subject_id} 
                  onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                >
                  <option value="">اختر المادة</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="input-group">
                <label>الإجابة الصحيحة</label>
                <select 
                  value={formData.correct_option} 
                  onChange={(e) => setFormData({...formData, correct_option: e.target.value})}
                >
                  <option value="0">الخيار الأول (أ)</option>
                  <option value="1">الخيار الثاني (ب)</option>
                  <option value="2">الخيار الثالث (ج)</option>
                  <option value="3">الخيار الرابع (د)</option>
                </select>
              </div>
              
              <div className="input-group">
                <label>الخيار أ</label>
                <input required type="text" value={formData.optionA} 
                  onChange={(e) => setFormData({...formData, optionA: e.target.value})} 
                />
              </div>
              
              <div className="input-group">
                <label>الخيار ب</label>
                <input required type="text" value={formData.optionB} 
                  onChange={(e) => setFormData({...formData, optionB: e.target.value})} 
                />
              </div>
              
              <div className="input-group">
                <label>الخيار ج</label>
                <input required type="text" value={formData.optionC} 
                  onChange={(e) => setFormData({...formData, optionC: e.target.value})} 
                />
              </div>
              
              <div className="input-group">
                <label>الخيار د</label>
                <input required type="text" value={formData.optionD} 
                  onChange={(e) => setFormData({...formData, optionD: e.target.value})} 
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
                {isEditing ? (
                  <>
                    <Edit2 size={20}/> 
                    {loading ? 'جاري التحديث...' : 'تحديث السؤال'}
                  </>
                ) : (
                  <>
                    <PlusCircle size={20}/> 
                    {loading ? 'جاري الحفظ...' : 'إضافة سؤال جديد'}
                  </>
                )}
              </button>
              
              {isEditing && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  style={{
                    background: '#f1f5f9',
                    color: '#64748b',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: '700'
                  }}
                >
                  <X size={20}/>
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>
        </div>
        
        {/* جدول الأسئلة الحالية */}
        <div className="table-card">
          <h3>الأسئلة المضافة مؤخراً</h3>
          
          {loading && questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>جاري تحميل الأسئلة...</div>
          ) : (
            <table className="q-table">
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>نص السؤال</th>
                  <th>الإجابة الصحيحة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {questions.length > 0 ? (
                  questions.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <span className="badge">{q.subjects?.name || 'غير محدد'}</span>
                      </td>
                      <td className="text-truncate">{q.question_text}</td>
                      <td>{['أ', 'ب', 'ج', 'د'][q.correct_option]}</td>
                      <td className="actions">
                        <button 
                          className="edit-btn" 
                          onClick={() => loadQuestionForEdit(q)}
                          style={{
                            background: '#eff6ff',
                            color: '#3b82f6',
                            border: 'none',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginRight: '8px'
                          }}
                        >
                          <Edit2 size={16}/>
                        </button>
                        <button 
                          className="del-btn" 
                          onClick={() => deleteQuestion(q.id)}
                          style={{
                            background: '#fff1f2',
                            color: '#e11d48',
                            border: 'none',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                      {fetchError ? 'حدث خطأ في تحميل الأسئلة' : 'لا توجد أسئلة مضافة بعد'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
      
      <style>{`
        .teacher-container {
          display: flex;
          direction: rtl;
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Cairo', sans-serif;
        }
        .teacher-sidebar {
          width: 260px;
          background: #fff;
          border-left: 1px solid #e2e8f0;
          padding: 20px;
        }
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          color: #1e3a8a;
          margin-bottom: 40px;
        }
        .sidebar-brand img {
          width: 40px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          color: #64748b;
          margin-bottom: 5px;
        }
        .nav-link:hover{
        background: #b23b3b;
          color: white;
}
        .nav-link.active {
          background: #eff6ff;
          color: #3b82f6;
        }
        .teacher-content {
          flex: 1;
          padding: 13px;
        }
        .form-card, .table-card {
          background: #fff;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
          margin-bottom: 30px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .full-width {
          grid-column: span 2;
        }
        .input-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #475569;
        }
        .input-group input, .input-group select, textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-family: 'Cairo';
        }
        textarea {
          height: 80px;
          resize: none;
        }
        .submit-btn {
          background: #3b82f6;
          color: #fff;
          border: none;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 700;
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .q-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .q-table th {
          text-align: right;
          padding: 12px;
          color: #94a3b8;
          border-bottom: 2px solid #f1f5f9;
        }
        .q-table td {
          padding: 15px 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .badge {
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          color: #475569;
        }
        .text-truncate {
          max-width: 300px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .actions {
          display: flex;
          gap: 8px;
        }
        .edit-btn:hover {
          background: #dbeafe !important;
        }
        .del-btn:hover {
          background: #ffe4e8 !important;
        }
      `}</style>
    </div>
  );
}