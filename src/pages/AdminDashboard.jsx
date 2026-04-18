import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Footer from './Footer';
import Navbar from './Navbar';
import { Users, CheckCircle, Search, TrendingUp, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [stats, setStats] = useState({ totalStudents: 0, activeAttempts: 0 });
<<<<<<< HEAD
  const [activeAttemptsMap, setActiveAttemptsMap] = useState({}); // لتخزين حالة المحاولة لكل طالب
=======
  const [activeAttemptsMap, setActiveAttemptsMap] = useState({});
>>>>>>> bd51822 (update project)
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      const { count: totalStudents, error: studentsError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
      if (studentsError) throw studentsError;

      const { count: activeAttempts, error: attemptsError } = await supabase
        .from('attempts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      if (attemptsError) throw attemptsError;

      setStats({ totalStudents: totalStudents || 0, activeAttempts: activeAttempts || 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchAdminProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', currentUser.id)
        .single();
      setAdminProfile(profile);
    }
  }, []);

<<<<<<< HEAD
  // جلب المحاولات النشطة لكل الطلاب
=======
>>>>>>> bd51822 (update project)
  const fetchActiveAttempts = useCallback(async () => {
    const { data, error } = await supabase
      .from('attempts')
      .select('student_id, status')
      .eq('status', 'active');
<<<<<<< HEAD

    if (!error && data) {
      const map = {};
      data.forEach(attempt => {
        map[attempt.student_id] = true;
      });
=======
    if (!error && data) {
      const map = {};
      data.forEach(attempt => { map[attempt.student_id] = true; });
>>>>>>> bd51822 (update project)
      setActiveAttemptsMap(map);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });
    if (!error) setUsers(data);
    setLoading(false);
  }, []);

  const refreshAllData = useCallback(() => {
    fetchUsers();
    fetchStats();
    fetchActiveAttempts();
  }, [fetchUsers, fetchStats, fetchActiveAttempts]);

  useEffect(() => {
    fetchUsers();
    fetchAdminProfile();
    fetchStats();
    fetchActiveAttempts();
  }, [fetchUsers, fetchAdminProfile, fetchStats, fetchActiveAttempts]);

  const handleActivateAttempt = async (studentId) => {
    setProcessingId(studentId);
    try {
      // إنهاء أي محاولة نشطة حالية
      await supabase
        .from('attempts')
        .update({ status: 'completed' })
        .eq('student_id', studentId)
        .eq('status', 'active');

      // إنشاء محاولة جديدة
      const { data: newAttempt, error: attemptError } = await supabase
        .from('attempts')
        .insert([{ student_id: studentId, status: 'active' }])
        .select()
        .single();
      if (attemptError) throw attemptError;

      const { data: subjects } = await supabase.from('subjects').select('id, name, questions_count');
      if (!subjects || subjects.length === 0) throw new Error('لا توجد مواد مسجلة في النظام');

      let allInsertData = [];

      for (const subject of subjects) {
        const targetCount = subject.questions_count || 40;

        const { data: questions, error: qError } = await supabase
          .from('questions')
          .select('id, passage_id, unit_number')
          .eq('subject_id', subject.id)
          .eq('is_active', true);
        if (qError) throw qError;
        if (!questions || questions.length === 0) continue;

        const isEnglish = subject.name.includes('إنجليزية');

        if (isEnglish) {
          const passageMap = new Map();
          const standaloneQuestions = [];
          questions.forEach(q => {
            if (q.passage_id) {
              if (!passageMap.has(q.passage_id)) passageMap.set(q.passage_id, []);
              passageMap.get(q.passage_id).push(q);
            } else {
              standaloneQuestions.push(q);
            }
          });

          const passages = Array.from(passageMap.entries()).map(([passageId, qs]) => ({
            passageId,
            questions: qs,
            count: qs.length
          }));
          passages.sort((a, b) => b.count - a.count);

          let selectedQuestions = [];
          let remaining = targetCount;

          for (const passage of passages) {
            if (remaining <= 0) break;
            if (passage.count <= remaining) {
              selectedQuestions.push(...passage.questions);
              remaining -= passage.count;
            } else {
              const shuffled = [...passage.questions].sort(() => 0.5 - Math.random());
              selectedQuestions.push(...shuffled.slice(0, remaining));
              remaining = 0;
              break;
            }
          }

          if (remaining > 0 && standaloneQuestions.length > 0) {
            const shuffledStandalone = [...standaloneQuestions].sort(() => 0.5 - Math.random());
            const take = Math.min(remaining, shuffledStandalone.length);
            selectedQuestions.push(...shuffledStandalone.slice(0, take));
            remaining -= take;
          }

          if (remaining > 0) {
            const selectedIds = new Set(selectedQuestions.map(q => q.id));
            const allRemaining = questions.filter(q => !selectedIds.has(q.id));
            const shuffled = [...allRemaining].sort(() => 0.5 - Math.random());
            selectedQuestions.push(...shuffled.slice(0, remaining));
          }

          const insertData = selectedQuestions.map(q => ({
            attempt_id: newAttempt.id,
            subject_id: subject.id,
            question_id: q.id
          }));
          allInsertData.push(...insertData);

        } else {
          const unitMap = new Map();
          questions.forEach(q => {
            const unit = q.unit_number || 0;
            if (!unitMap.has(unit)) unitMap.set(unit, []);
            unitMap.get(unit).push(q);
          });

          const units = Array.from(unitMap.keys());
          if (units.length === 0) continue;

          let selectedQuestions = [];
          const targetPerUnit = Math.floor(targetCount / units.length);
          let remaining = targetCount;

          for (const unit of units) {
            const unitQuestions = unitMap.get(unit);
            const take = Math.min(targetPerUnit, unitQuestions.length, remaining);
            const shuffled = [...unitQuestions].sort(() => 0.5 - Math.random());
            selectedQuestions.push(...shuffled.slice(0, take));
            remaining -= take;
          }

          if (remaining > 0) {
            const selectedIds = new Set(selectedQuestions.map(q => q.id));
            const allRemaining = questions.filter(q => !selectedIds.has(q.id));
            const shuffled = [...allRemaining].sort(() => 0.5 - Math.random());
            selectedQuestions.push(...shuffled.slice(0, remaining));
          }

          const insertData = selectedQuestions.map(q => ({
            attempt_id: newAttempt.id,
            subject_id: subject.id,
            question_id: q.id
          }));
          allInsertData.push(...insertData);
        }
      }

      if (allInsertData.length === 0) throw new Error('لا توجد أسئلة نشطة في أي مادة. يرجى إضافة أسئلة أولاً');

      const { error: insertError } = await supabase.from('attempt_questions').insert(allInsertData);
      if (insertError) throw insertError;

<<<<<<< HEAD
      alert('تم تفعيل محاولة جديدة بنجاح!');
      
      // تحديث البيانات
      await fetchStats();
      await fetchActiveAttempts(); // تحديث حالة المحاولات النشطة
      
=======
      toast.success('! تم تفعيل محاولة جديدة بنجاح');
      await fetchStats();
      await fetchActiveAttempts();

>>>>>>> bd51822 (update project)
    } catch (e) {
      toast.error('خطأ: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u => u.name?.includes(searchTerm) || u.username?.includes(searchTerm));
  const todayNewStudents = users.filter(u => {
    const createdDate = new Date(u.created_at);
    const today = new Date();
    return createdDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="dashboard-container">
      <Navbar userName={adminProfile?.name || 'مدير النظام'} />

      <main className="dashboard-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">إدارة الطلاب</h1>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper blue"><Users size={24} /></div>
            <div className="stat-content"><span className="stat-label">إجمالي الطلاب</span><span className="stat-number">{stats.totalStudents}</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper green"><CheckCircle size={24} /></div>
            <div className="stat-content"><span className="stat-label">محاولات نشطة</span><span className="stat-number">{stats.activeAttempts}</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper purple"><TrendingUp size={24} /></div>
            <div className="stat-content"><span className="stat-label">طلاب مسجلين اليوم</span><span className="stat-number">{todayNewStudents}</span></div>
          </div>
        </div>

        <div className="search-wrapper">
          <Search className="search-icon" size={20} />
          <input type="text" placeholder="بحث عن اسم الطالب..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
        </div>

        <div className="table-card">
          <div className="card-header">
            <h2 className="card-title"><Users size={20} className="icon-blue" /> قائمة الطلاب</h2>
            <div className="card-header-actions">
<<<<<<< HEAD
                <span className="badge-count">{filteredUsers.length} طالب</span>
                <button className="refresh-btn-table" onClick={refreshAllData}>
                    <RefreshCw size={16} /> <span>تحديث</span>
                </button>
=======
              <span className="badge-count">{filteredUsers.length} طالب</span>
              <button className="refresh-btn-table" onClick={refreshAllData}><RefreshCw size={16} /> <span>تحديث</span></button>
>>>>>>> bd51822 (update project)
            </div>
          </div>
          <div className="table-responsive">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner"></div><p>جاري تحميل الطلاب...</p></div>
            ) : filteredUsers.length > 0 ? (
              <table className="modern-table">
                <thead>
                  <tr><th>الاسم</th><th>اسم المستخدم</th><th>تاريخ التسجيل</th><th className="text-center">الإجراءات</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const hasActiveAttempt = activeAttemptsMap[user.id];
                    return (
                      <tr key={user.id}>
<<<<<<< HEAD
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-small">
                              {user.name?.charAt(0) || 'ط'}
                            </div>
                            <span className="user-name-cell">{user.name || 'غير محدد'}</span>
                          </div>
                        </td>
=======
                        <td><div className="user-cell"><div className="user-avatar-small">{user.name?.charAt(0) || 'ط'}</div><span className="user-name-cell">{user.name || 'غير محدد'}</span></div></td>
>>>>>>> bd51822 (update project)
                        <td>{user.username || '—'}</td>
                        <td>{new Date(user.created_at).toLocaleDateString('ar-EG')}</td>
                        <td className="text-center">
                          {hasActiveAttempt ? (
<<<<<<< HEAD
                            <button
                              className="activate-btn-table active-attempt"
                              disabled
                              style={{ background: '#10b981', cursor: 'default' }}
                            >
                              ✔ محاولة مفعلة
                            </button>
                          ) : (
                            <button
                              className="activate-btn-table"
                              onClick={() => handleActivateAttempt(user.id)}
                              disabled={processingId === user.id}
                            >
                              {processingId === user.id ? (
                                <>
                                  <span className="spinner-small"></span>
                                  جاري...
                                </>
                              ) : (
                                '✚ تفعيل محاولـة'
                              )}
=======
                            <button className="activate-btn-table active-attempt" disabled style={{ background: '#10b981', cursor: 'default' }}>✔ محاولة مفعلة</button>
                          ) : (
                            <button className="activate-btn-table" onClick={() => handleActivateAttempt(user.id)} disabled={processingId === user.id}>
                              {processingId === user.id ? (<><span className="spinner-small"></span> جاري...</>) : '✚ تفعيل محاولـة'}
>>>>>>> bd51822 (update project)
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state"><div className="empty-icon">📭</div><h3>لا يوجد طلاب</h3><p>لم يتم العثور على أي طالب مطابق لبحثك</p></div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; }
        .dashboard-container { direction: rtl; font-family: 'Cairo', sans-serif; background: linear-gradient(180deg, #f4f7fc 0%, #e9f0f9 100%); min-height: 100vh; display: flex; flex-direction: column; }
        .dashboard-main { flex: 1; width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 24px 32px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-right: 42%; }
        .page-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-align: right; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 32px; }
        .stat-card { background: white; border-radius: 20px; padding: 20px 24px; display: flex; align-items: center; gap: 18px; box-shadow: 0 6px 14px rgba(0,0,0,0.02); border: 1px solid #edf2f7; transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 20px rgba(0,0,0,0.04); }
        .stat-icon-wrapper { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .stat-icon-wrapper.blue { background: linear-gradient(145deg, #3b82f6, #2563eb); }
        .stat-icon-wrapper.green { background: linear-gradient(145deg, #10b981, #059669); }
        .stat-icon-wrapper.purple { background: linear-gradient(145deg, #8b5cf6, #7c3aed); }
        .stat-content { display: flex; flex-direction: column; align-items: center; flex: 1; text-align: center; }
        .stat-label { font-size: 0.9rem; font-weight: 600; color: #64748b; margin-bottom: 4px; }
        .stat-number { font-size: 2rem; font-weight: 800; color: #1e293b; line-height: 1; }
        .search-wrapper { position: relative; margin-bottom: 32px; }
        .search-icon { position: absolute; right: 18px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .search-input { width: 100%; padding: 16px 52px 16px 20px; border: 1px solid #e2e8f0; border-radius: 60px; font-family: 'Cairo'; font-size: 1rem; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.02); transition: all 0.2s; }
        .search-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
        .table-card { background: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden; margin-bottom: 30px; }
        .card-header { padding: 20px 25px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .card-header-actions { display: flex; align-items: center; gap: 12px; }
        .card-title { margin: 0; font-size: 1.1rem; color: #1e293b; display: flex; align-items: center; gap: 10px; }
        .icon-blue { color: #3b82f6; }
        .badge-count { background: #eff6ff; color: #3b82f6; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; }
        .refresh-btn-table { display: flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 10px; font-family: 'Cairo'; font-weight: 600; font-size: 0.85rem; color: #475569; cursor: pointer; transition: 0.2s; }
        .refresh-btn-table:hover { background: #eff6ff; color: #3b82f6; border-color: #3b82f6; }
        .table-responsive { width: 100%; overflow-x: auto; }
        .modern-table { width: 100%; border-collapse: collapse; min-width: 700px; text-align: right; }
        .modern-table th { background: #f8fafc; padding: 16px 20px; color: #475569; font-weight: 700; font-size: 0.95rem; border-bottom: 2px solid #e2e8f0; }
        .modern-table td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
        .modern-table tbody tr:hover { background: #fbfcfd; }
        .text-center { text-align: center !important; }
<<<<<<< HEAD

        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-avatar-small {
          width: 36px;
          height: 36px;
          background: #eff6ff;
          color: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1rem;
        }
        .user-name-cell {
          font-weight: 600;
          color: #1e293b;
        }

        .activate-btn-table {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 30px;
          font-family: 'Cairo';
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .activate-btn-table:hover:not(:disabled) {
          background: #2563eb;
          transform: scale(1.02);
        }
        .activate-btn-table:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }
        .activate-btn-table.active-attempt {
          background: #10b981 !important;
          color: white;
          cursor: default;
        }
        .spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }
=======
        .user-cell { display: flex; align-items: center; gap: 12px; }
        .user-avatar-small { width: 36px; height: 36px; background: #eff6ff; color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem; }
        .user-name-cell { font-weight: 600; color: #1e293b; }
        .activate-btn-table { background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 30px; font-family: 'Cairo'; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
        .activate-btn-table:hover:not(:disabled) { background: #2563eb; transform: scale(1.02); }
        .activate-btn-table:disabled { background: #cbd5e1; cursor: not-allowed; }
        .activate-btn-table.active-attempt { background: #10b981 !important; color: white; cursor: default; }
        .spinner-small { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
>>>>>>> bd51822 (update project)
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-state { padding: 60px 20px; text-align: center; color: #64748b; }
        .loading-spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @media (max-width: 768px) {
<<<<<<< HEAD
          .dashboard-main {
            padding: 0 16px 24px;
          }
          .page-header {
            flex-direction: column;
            align-items: center;     /* توسيط العنوان أفقياً */
            padding-right: 0;
            margin-bottom: 20px;
          }
          .page-title {
            font-size: 1.6rem;
            text-align: center;     /* توسيط النص */
            width: 100%;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .stat-card {
            justify-content: flex-start;
          }
          .stat-content {
            align-items: flex-start;
            text-align: right;
          }
          
          .card-header {
            padding: 15px;
          }
          .card-header-actions {
            gap: 8px;
          }
          .refresh-btn-table span {
            display: none;  /* إخفاء نص "تحديث" في الموبايل */
          }
          
          .modern-table th,
          .modern-table td {
            padding: 12px;
          }
=======
          .dashboard-main { padding: 0 16px 24px; }
          .page-header { flex-direction: column; align-items: center; padding-right: 0; margin-bottom: 20px; }
          .page-title { font-size: 1.6rem; text-align: center; width: 100%; }
          .stats-grid { grid-template-columns: 1fr; }
          .stat-card { justify-content: flex-start; }
          .stat-content { align-items: flex-start; text-align: right; }
          .card-header { padding: 15px; }
          .refresh-btn-table span { display: none; }
          .modern-table th, .modern-table td { padding: 12px; }
>>>>>>> bd51822 (update project)
        }
      `}</style>
    </div>
  );
}
