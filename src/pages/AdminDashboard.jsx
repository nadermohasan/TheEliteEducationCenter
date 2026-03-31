import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (!error) setUsers(data);
    setLoading(false);
  };

  // --- دالة تسجيل الخروج الجديدة ---
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/'); // العودة لصفحة تسجيل الدخول
    } else {
      alert("خطأ أثناء تسجيل الخروج");
    }
  };

  const handleActivateAttempt = async (studentId) => {
    setProcessingId(studentId);
    try {
      // 1. إنهاء أي محاولة نشطة سابقة للطالب
      await supabase
        .from('attempts')
        .update({ status: 'completed' })
        .eq('student_id', studentId)
        .eq('status', 'active');

      // 2. إنشاء محاولة جديدة
      const { data: newAttempt, error: attemptError } = await supabase
        .from('attempts')
        .insert([{ student_id: studentId, status: 'active' }])
        .select()
        .single();

      if (attemptError) throw attemptError;

      // 3. جلب جميع المواد
      const { data: subjects, error: subjectsError } = await supabase.from('subjects').select('id');
      if (subjectsError) throw subjectsError;

      if (subjects && subjects.length > 0) {
        for (const subject of subjects) {
          
          // 4. جلب جميع أسئلة المادة المحددة (استخدمنا * لتفادي مشكلة اسم العمود)
          const { data: allQuestions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('subject_id', subject.id);

          if (questionsError) throw questionsError;

          if (allQuestions && allQuestions.length > 0) {
            // 5. ترتيب عشوائي حقيقي للأسئلة باستخدام جافاسكربت واختيار 10
            const shuffledQuestions = allQuestions.sort(() => 0.5 - Math.random());
            const selectedQuestions = shuffledQuestions.slice(0, 10);

            // 6. تجهيز حزمة البيانات للإدخال مع التحقق من قيمة الآي دي
            const insertData = selectedQuestions
              .map(q => {
                // جلب رقم السؤال سواء كان مسجل في الداتابيز باسم id أو question_id
                const validQuestionId = q.id || q.question_id;

                if (!validQuestionId) {
                  console.warn('تحذير: سؤال بدون ID', q);
                  return null; 
                }

                return {
                  attempt_id: newAttempt.id,
                  subject_id: subject.id,
                  question_id: validQuestionId
                };
              })
              .filter(item => item !== null); // فلترة أي أسئلة لم يتم العثور على ID لها لتجنب الخطأ

            // 7. إدخال الأسئلة
            if (insertData.length > 0) {
              const { error: insertError } = await supabase
                  .from('attempt_questions')
                  .insert(insertData);
                  
              if (insertError) throw insertError;
            }
          }
        }
      }

      alert('تم تفعيل محاولة اختبار شاملة جديدة للطالب بنجاح!');
    } catch (error) {
      console.error('Error activating attempt:', error);
      alert(`حدث خطأ أثناء تفعيل المحاولة: ${error.message || 'يرجى مراجعة الكونسول'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.includes(searchTerm) || user.username?.includes(searchTerm)
  );

  return (
    <div className="admin-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="https://i.imgur.com/p1hg12H.png" alt="Logo" />
          <span>مركز النخبة التعليمي</span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>المستخدمين</span>
          </div>

          {/* زر تسجيل الخروج المضاف */}
          <div className="nav-item logout-item" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>تسجيل الخروج</span>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header className="admin-header">
          <div className="admin-profile">
            <div className="avatar">A</div>
            <span>المسؤول</span>
          </div>
          <h1 className="page-title">إدارة المستخدمين</h1>
        </header>

        <div className="data-card">
          <div className="card-header">
            <div className="search-box">
              <input 
                type="text" 
                placeholder="بحث عن مستخدم..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <button className="download-btn">تحميل القائمة ↓</button>
          </div>

          <table className="users-table">
            <thead>
              <tr>
                <th>اسم المستخدم</th>
                <th>تاريخ الانضمام</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" style={{ textAlign: 'center' }}>جاري التحميل...</td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">{user.name?.charAt(0)}</div>
                      {user.name}
                    </div>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString('en-GB')}</td>
                  <td>
                    <button 
                      className="action-btn" 
                      onClick={() => handleActivateAttempt(user.id)}
                      disabled={processingId === user.id}
                    >
                      {processingId === user.id ? 'جاري التفعيل...' : 'تفعيل محاولة اختبار'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <style>{`
        /* التنسيقات السابقة مع إضافة تنسيق زر الخروج */
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        .admin-container { display: flex; direction: rtl; min-height: 100vh; background: #f4f7fe; font-family: 'Cairo', sans-serif; }
        .sidebar { width: 300px; background: white; border-left: 1px solid #e2e8f0; padding: 25px 0; display: flex; flex-direction: column; }
        .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 0 25px 30px; border-bottom: 1px solid #f1f5f9; }
        .sidebar-logo img { width: 40px; }
        .sidebar-logo span { font-weight: 700; color: #1a4f8b; font-size: 1.2rem; }
        .sidebar-nav { padding: 20px 15px; flex: 1; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 15px; border-radius: 12px; cursor: pointer; color: #64748b; transition: 0.3s; margin-bottom: 8px; }
        .nav-item svg { width: 20px; height: 20px; }
        .nav-item.active { background: #4a8ada; color: white; box-shadow: 0 4px 12px rgba(74, 138, 218, 0.2); }
        
        /* تنسيق زر الخروج */
        .logout-item { margin-top: 20px; color: #e11d48; border: 1px solid transparent; }
        .logout-item:hover { background: #fff1f2; border-color: #fecdd3; }
        
        .main-content { flex: 1; padding: 30px 40px; }
        .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .admin-profile { display: flex; align-items: center; gap: 10px; }
        .avatar { width: 35px; height: 35px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #475569; }
        .page-title { font-size: 1.5rem; color: #1e293b; }
        .data-card { background: white; border-radius: 20px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .search-box { position: relative; width: 300px; }
        .search-box input { width: 100%; padding: 10px 40px 10px 15px; border: 1px solid #e2e8f0; border-radius: 10px; font-family: 'Cairo'; }
        .search-icon { position: absolute; right: 12px; top: 12px; width: 18px; color: #94a3b8; }
        .download-btn { background: #f1f5f9; border: none; padding: 8px 15px; border-radius: 8px; font-weight: 600; color: #475569; cursor: pointer; }
        .users-table { width: 100%; border-collapse: collapse; text-align: right; }
        .users-table th { color: #94a3b8; font-weight: 600; padding: 15px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
        .users-table td { padding: 15px; border-bottom: 1px solid #f8fafc; color: #334155; font-size: 0.95rem; }
        .user-info { display: flex; align-items: center; gap: 10px; font-weight: 600; }
        .user-avatar { width: 30px; height: 30px; background: #eef5ff; color: #4a8ada; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; }
        .action-btn { background: #27ae60; color: white; border: none; padding: 8px 15px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.3s; }
        .action-btn:hover { background: #219653; }
        .action-btn:disabled { background: #95a5a6; cursor: not-allowed; }
        @media (max-width: 992px) { .sidebar { width: 80px; } .sidebar-logo span, .nav-item span { display: none; } .main-content { padding: 20px; } }
      `}</style>
    </div>
  );
}
