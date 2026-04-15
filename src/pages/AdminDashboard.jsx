import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import { Users, CheckCircle, Search, TrendingUp, RefreshCw } from 'lucide-react';

// أيقونة الخروج
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [stats, setStats] = useState({ totalStudents: 0, activeAttempts: 0 });
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

      setStats({
        totalStudents: totalStudents || 0,
        activeAttempts: activeAttempts || 0
      });
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

  useEffect(() => {
    fetchUsers();
    fetchAdminProfile();
    fetchStats();
  }, [fetchUsers, fetchAdminProfile, fetchStats]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleActivateAttempt = async (studentId) => {
    setProcessingId(studentId);
    try {
      // إنهاء المحاولات النشطة السابقة
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

      // جلب جميع المواد
      const { data: subjects } = await supabase.from('subjects').select('id');
      if (!subjects || subjects.length === 0) {
        throw new Error('لا توجد مواد مسجلة في النظام');
      }

      // جلب أسئلة جميع المواد بالتوازي
      const questionsPromises = subjects.map(subject =>
        supabase
          .from('questions')
          .select('*')
          .eq('subject_id', subject.id)
      );
      const questionsResults = await Promise.all(questionsPromises);

      // تجهيز بيانات الإدراج
      let allInsertData = [];
      for (let i = 0; i < subjects.length; i++) {
        const qs = questionsResults[i].data;
        if (qs && qs.length > 0) {
          const selected = qs.sort(() => 0.5 - Math.random()).slice(0, 40);
          const insertData = selected.map(q => ({
            attempt_id: newAttempt.id,
            subject_id: subjects[i].id,
            question_id: q.id
          }));
          allInsertData.push(...insertData);
        }
      }

      if (allInsertData.length === 0) {
        throw new Error('لا توجد أسئلة في أي مادة. يرجى إضافة أسئلة أولاً.');
      }

      const { error: insertError } = await supabase
        .from('attempt_questions')
        .insert(allInsertData);

      if (insertError) throw insertError;

      alert('تم تفعيل محاولة جديدة بنجاح!');
      await fetchStats();
    } catch (e) {
      alert('خطأ: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.includes(searchTerm) || u.username?.includes(searchTerm)
  );
  const displayName = adminProfile?.name || 'مدير النظام';
  const todayNewStudents = users.filter(u => {
    const createdDate = new Date(u.created_at);
    const today = new Date();
    return createdDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="dashboard-container">
      {/* الهيدر العلوي */}
      <header className="dashboard-header">
        <button onClick={handleLogout} className="logout-button">
          <span>خروج</span>
          <span className="logout-icon"><LogoutIcon/></span>
        </button>

        <div className="logo-section">
          <div className="logo-wrapper-dash">
            <img src="https://i.imgur.com/p1hg12H.png" alt="شعار المركز" className="logo-img-dash"/>
          </div>
          <span className="logo-text-dash">مركز النخبة التعليمي</span>
        </div>

        <div className="user-section">
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <img
              src={`https://api.dicebear.com/7.x/avataaars-neutral/svg?seed=${displayName}`}
              alt="Avatar"
              className="user-avatar"
            />
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="dashboard-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">إدارة الطلاب</h1>
            <p className="page-subtitle">تفعيل محاولات الاختبار للطلاب المسجلين</p>
          </div>
          <button className="refresh-btn" onClick={() => { fetchUsers(); fetchStats(); }}>
            <RefreshCw size={18} /> تحديث
          </button>
        </div>

        {/* بطاقات إحصائية سريعة */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper blue">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">إجمالي الطلاب</span>
              <span className="stat-number">{stats.totalStudents}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper green">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">محاولات نشطة</span>
              <span className="stat-number">{stats.activeAttempts}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper purple">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">طلاب مسجلين اليوم</span>
              <span className="stat-number">{todayNewStudents}</span>
            </div>
          </div>
        </div>

        {/* حقل البحث */}
        <div className="search-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="بحث عن اسم الطالب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* جدول الطلاب */}
        <div className="table-card">
          <div className="card-header">
            <h2 className="card-title">
              <Users size={20} className="icon-blue" /> قائمة الطلاب
            </h2>
            <span className="badge-count">{filteredUsers.length} طالب</span>
          </div>
          <div className="table-responsive">
            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner"></div>
                <p>جاري تحميل الطلاب...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>اسم المستخدم</th>
                    <th>تاريخ التسجيل</th>
                    <th className="text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-small">
                            {user.name?.charAt(0) || 'ط'}
                          </div>
                          <span className="user-name-cell">{user.name || 'غير محدد'}</span>
                        </div>
                      </td>
                      <td>{user.username || '—'}</td>
                      <td>{new Date(user.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="text-center">
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
                            'تفعيل محاولة'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>لا يوجد طلاب</h3>
                <p>لم يتم العثور على أي طالب مطابق لبحثك</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        
        * { box-sizing: border-box; margin: 0; }
        
        .dashboard-container {
          direction: rtl;
          font-family: 'Cairo', sans-serif;
          background: linear-gradient(180deg, #f4f7fc 0%, #e9f0f9 100%);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* --- الهيدر --- */
        .dashboard-header {
          background-color: #ffffff;
          padding: 12px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 0 0 24px 24px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.04);
          margin-bottom: 28px;
          position: sticky;
          top: 0;
          z-index: 1000;
          background: rgba(255,255,255,0.95);
        }

        .logo-section { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
        }
        .logo-wrapper-dash {
          background-color: white;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
        }
        .logo-img-dash { max-width: 90%; max-height: 90%; object-fit: contain; }
        .logo-text-dash { 
          font-weight: 800; 
          font-size: 1.2rem; 
          color: #1e3a8a; 
          letter-spacing: -0.3px;
        }

        .user-section { display: flex; align-items: center; gap: 20px; }
        .user-info { display: flex; align-items: center; gap: 12px; }
        .user-name { font-weight: 600; color: #334155; font-size: 1rem; }
        .user-avatar { 
          width: 44px; 
          height: 44px; 
          border-radius: 50%; 
          background-color: #f1f5f9; 
          border: 2px solid #e2e8f0; 
        }

        .logout-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 8px 18px;
          border-radius: 30px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
        }
        .logout-button:hover { 
          background-color: #fef2f2; 
          color: #dc2626; 
          border-color: #fecaca; 
        }
        .logout-icon { width: 18px; height: 18px; display: flex; }

        /* --- المحتوى الرئيسي --- */
        .dashboard-main {
          flex: 1;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px 32px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .page-title {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .page-subtitle {
          font-size: 1rem;
          color: #64748b;
        }
        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 10px 20px;
          border-radius: 12px;
          font-family: 'Cairo';
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: 0.2s;
        }
        .refresh-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        /* بطاقات الإحصائيات */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        .stat-card {
          background: white;
          border-radius: 20px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 18px;
          box-shadow: 0 6px 14px rgba(0,0,0,0.02);
          border: 1px solid #edf2f7;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 20px rgba(0,0,0,0.04);
        }
        .stat-icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .stat-icon-wrapper.blue { background: linear-gradient(145deg, #3b82f6, #2563eb); }
        .stat-icon-wrapper.green { background: linear-gradient(145deg, #10b981, #059669); }
        .stat-icon-wrapper.purple { background: linear-gradient(145deg, #8b5cf6, #7c3aed); }
        .stat-content {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #64748b;
        }
        .stat-number {
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
          line-height: 1.2;
        }

        /* حقل البحث */
        .search-wrapper {
          position: relative;
          margin-bottom: 32px;
        }
        .search-icon {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .search-input {
          width: 100%;
          padding: 16px 52px 16px 20px;
          border: 1px solid #e2e8f0;
          border-radius: 60px;
          font-family: 'Cairo';
          font-size: 1rem;
          background: white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
          transition: all 0.2s;
        }
        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
        }

        /* بطاقة الجدول (مثل TeacherDashboard) */
        .table-card {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          overflow: hidden;
          margin-bottom: 30px;
        }
        .card-header {
          padding: 25px 30px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-title {
          margin: 0;
          font-size: 1.2rem;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .icon-blue { color: #3b82f6; }
        .badge-count {
          background: #eff6ff;
          color: #3b82f6;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.9rem;
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
          padding: 16px 20px;
          color: #475569;
          font-weight: 700;
          font-size: 0.95rem;
          border-bottom: 2px solid #e2e8f0;
        }
        .modern-table td {
          padding: 16px 20px;
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

        /* خلية المستخدم */
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

        /* زر التفعيل في الجدول */
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
        .spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* حالات فارغة وتحميل */
        .empty-state {
          padding: 60px 20px;
          text-align: center;
          color: #64748b;
        }
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 16px;
          opacity: 0.6;
        }
        .empty-state h3 {
          color: #1e293b;
          margin-bottom: 8px;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        /* تجاوب */
        @media (max-width: 768px) {
          .dashboard-header {
            padding: 10px 16px;
          }
          .logo-text-dash {
            display: none;
          }
          .page-header {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }
          .page-title {
            font-size: 1.6rem;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .card-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
          .modern-table th,
          .modern-table td {
            padding: 12px 15px;
          }
          .user-avatar-small {
            width: 28px;
            height: 28px;
            font-size: 0.8rem;
          }
          .activate-btn-table {
            padding: 6px 12px;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}