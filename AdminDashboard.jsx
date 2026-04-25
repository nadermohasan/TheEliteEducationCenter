import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Footer from "./Footer";
import Navbar from "./Navbar";
import {
  Users, CheckCircle, Search, TrendingUp, RefreshCw,
  Award, ChevronDown, Download, Trash2, Filter, Play
} from "lucide-react";
import * as XLSX from "xlsx";

// المواد حسب الفرع (للكشوف فقط)
const scientificSubjects = ["اللغة الإنجليزية", "اللغة العربية", "الرياضيات", "تكنولوجيا المعلومات", "التربية الإسلامية", "الفيزياء", "الكيمياء", "الأحياء"];
const literarySubjects = ["اللغة الإنجليزية", "اللغة العربية", "الرياضيات", "تكنولوجيا المعلومات", "التربية الإسلامية", "الجغرافيا", "التاريخ", "الثقافة العلمية"];

const getBranchSubjects = (allSubjects, branch) => {
  const branchList = branch === "العلمي" ? scientificSubjects : literarySubjects;
  return branchList.filter(subj => allSubjects.includes(subj));
};

// توليد أسئلة محاولة جديدة بناءً على الفرع
const generateAttemptQuestions = async (attemptId, studentBranch) => {
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, questions_count");
  if (!subjects?.length) throw new Error("لا توجد مواد");

  let allInsertData = [];
  for (const subject of subjects) {
    const targetCount = subject.questions_count || 40;
    let query = supabase
      .from("questions")
      .select("id, passage_id, unit_number")
      .eq("subject_id", subject.id)
      .eq("is_active", true);

    if (studentBranch) {
      query = query.or(`branch.is.null,branch.eq.${studentBranch}`);
    }
    const { data: questions } = await query;
    if (!questions?.length) continue;

    const isEnglish = subject.name.includes("إنجليزية");

    if (isEnglish) {
      const passageMap = new Map();
      const standaloneQuestions = [];
      questions.forEach((q) => {
        if (q.passage_id) {
          if (!passageMap.has(q.passage_id)) passageMap.set(q.passage_id, []);
          passageMap.get(q.passage_id).push(q);
        } else standaloneQuestions.push(q);
      });

      const passages = Array.from(passageMap.entries()).map(([passageId, qs]) => ({
        passageId,
        questions: qs,
        count: qs.length,
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
        const selectedIds = new Set(selectedQuestions.map((q) => q.id));
        const allRemaining = questions.filter((q) => !selectedIds.has(q.id));
        const shuffled = [...allRemaining].sort(() => 0.5 - Math.random());
        selectedQuestions.push(...shuffled.slice(0, remaining));
      }

      allInsertData.push(...selectedQuestions.map(q => ({
        attempt_id: attemptId,
        subject_id: subject.id,
        question_id: q.id,
      })));
    } else {
      const unitMap = new Map();
      questions.forEach((q) => {
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
        const selectedIds = new Set(selectedQuestions.map((q) => q.id));
        const allRemaining = questions.filter((q) => !selectedIds.has(q.id));
        const shuffled = [...allRemaining].sort(() => 0.5 - Math.random());
        selectedQuestions.push(...shuffled.slice(0, remaining));
      }

      allInsertData.push(...selectedQuestions.map(q => ({
        attempt_id: attemptId,
        subject_id: subject.id,
        question_id: q.id,
      })));
    }
  }

  if (allInsertData.length === 0) throw new Error("لا توجد أسئلة نشطة مناسبة");
  await supabase.from("attempt_questions").insert(allInsertData);
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [activatingAll, setActivatingAll] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [stats, setStats] = useState({ totalStudents: 0, activeAttempts: 0 });
  const [activeAttemptsMap, setActiveAttemptsMap] = useState({});
// حالة التحكم في مودال التأكيد
const [confirmState, setConfirmState] = useState({
  isOpen: false,
  message: "",
  students: [] // لتخزين الطلاب المراد تفعيلهم مؤقتاً
});
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [scientificResults, setScientificResults] = useState({ subjects: [], students: [] });
  const [literaryResults, setLiteraryResults] = useState({ subjects: [], students: [] });
  const [resultsLoading, setResultsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [studentFilter, setStudentFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [deletingBatch, setDeletingBatch] = useState(null);

  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      const { count: totalStudents, error: studentsError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student");
      if (studentsError) throw studentsError;

      const { count: activeAttempts, error: attemptsError } = await supabase
        .from("attempts")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      if (attemptsError) throw attemptsError;

      setStats({ totalStudents: totalStudents || 0, activeAttempts: activeAttempts || 0 });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchAdminProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: profile } = await supabase.from("profiles").select("name").eq("id", currentUser.id).single();
      setAdminProfile(profile);
    }
  }, []);

  const fetchActiveAttempts = useCallback(async () => {
    const { data, error } = await supabase.from("attempts").select("student_id, status").eq("status", "active");
    if (!error && data) {
      const map = {};
      data.forEach((a) => { map[a.student_id] = true; });
      setActiveAttemptsMap(map);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("created_at", { ascending: false });
    if (!error) setUsers(data);
    else console.error("fetchUsers error:", error);
    setLoading(false);
  }, []);

  const refreshAllData = useCallback(() => {
    fetchUsers();
    fetchStats();
    fetchActiveAttempts();
  }, [fetchUsers, fetchStats, fetchActiveAttempts]);

  // جلب الحزم (تجميع حسب batch_id)
  const fetchBatches = useCallback(async () => {
    setResultsLoading(true);
    try {
      const { data: attempts } = await supabase
        .from("attempts")
        .select("id, batch_id, created_at")
        .not("batch_id", "is", null);

      const batchIds = [...new Set(attempts?.map(a => a.batch_id))];
      const batchesData = await Promise.all(batchIds.map(async (batchId) => {
        const relatedAttempts = attempts.filter(a => a.batch_id === batchId);
        const attemptIds = relatedAttempts.map(a => a.id);
const { data: results } = await supabase
  .from("results")
  .select("student_id, subject_id, profiles!inner(id)")
  .in("attempt_id", attemptIds);
const uniqueStudents = new Set(results?.map(r => r.student_id));
        const uniqueSubjects = new Set(results?.map(r => r.subject_id));
        const created = relatedAttempts[0]?.created_at || new Date();
        return {
          id: batchId,
          createdAt: created,
          studentCount: uniqueStudents.size,
          subjectCount: uniqueSubjects.size,
        };
      }));
      batchesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBatches(batchesData);
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("فشل جلب الحزم");
    } finally {
      setResultsLoading(false);
    }
  }, []);

  // جلب نتائج حزمة محددة
const fetchBatchResults = useCallback(async (batchId) => {
  setResultsLoading(true);
  try {
    const { data: attempts } = await supabase
      .from("attempts")
      .select("id")
      .eq("batch_id", batchId);
    if (!attempts?.length) throw new Error("لا توجد محاولات");

    const attemptIds = attempts.map(a => a.id);
    const { data, error } = await supabase
  .from("results")
  .select(`
    id, score, created_at, student_id, subject_id, attempt_id,
    profiles!inner ( name, branch ),
    subjects ( name, questions_count )
  `)
  .in("attempt_id", attemptIds)
  .order("created_at", { ascending: true });

    if (error) throw error;

    const studentMap = new Map();
    const allSubjects = new Set();
    data?.forEach((result) => {
      const studentId = result.student_id;
      const studentName = result.profiles?.name || "غير معروف";
      const branch = result.profiles?.branch || "";
      const subjectName = result.subjects?.name || "غير معروف";
      allSubjects.add(subjectName);

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, { studentId, studentName, branch, subjects: {} });
      }
      const studentRecord = studentMap.get(studentId);

      // تسجيل أول نتيجة فقط لكل مادة
      if (!studentRecord.subjects[subjectName]) {
        studentRecord.subjects[subjectName] = {
          score: result.score,
          questionsCount: result.subjects?.questions_count || 40,
        };
      }
    });
      const subjectsList = Array.from(allSubjects).sort();
      const scientific = [], literary = [];
      studentMap.forEach((student) => {
        const row = { studentName: student.studentName, subjects: student.subjects };
        if (student.branch === "العلمي") scientific.push(row);
        else if (student.branch === "الأدبي") literary.push(row);
      });
      scientific.sort((a, b) => a.studentName.localeCompare(b.studentName));
      literary.sort((a, b) => a.studentName.localeCompare(b.studentName));

      setScientificResults({
        subjects: getBranchSubjects(subjectsList, "العلمي"),
        students: scientific
      });
      setLiteraryResults({
        subjects: getBranchSubjects(subjectsList, "الأدبي"),
        students: literary
      });
      setStudentFilter("");
      setSubjectFilter("");
      setSelectedBatch(batchId);
    } catch (error) {
      console.error("Error fetching batch results:", error);
      toast.error("فشل جلب نتائج الحزمة");
    } finally {
      setResultsLoading(false);
    }
  }, []);

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الحزمة وجميع نتائجها؟ لا يمكن التراجع.")) return;
    setDeletingBatch(batchId);
    try {
      const { data: attempts } = await supabase.from("attempts").select("id").eq("batch_id", batchId);
      const attemptIds = attempts?.map(a => a.id) || [];
      if (attemptIds.length) {
        await supabase.from("results").delete().in("attempt_id", attemptIds);
        await supabase.from("attempt_questions").delete().in("attempt_id", attemptIds);
        await supabase.from("attempts").delete().in("id", attemptIds);
      }
      toast.success("تم حذف الحزمة بنجاح");
      setBatches(prev => prev.filter(b => b.id !== batchId));
      if (selectedBatch === batchId) setSelectedBatch(null);
    } catch (error) {
      toast.error("فشل حذف الحزمة: " + error.message);
    } finally {
      setDeletingBatch(null);
    }
  };

  // تصدير Excel
  const exportBatchToExcel = (batchId) => {
    const displaySciSubjects = subjectFilter ? scientificResults.subjects.filter(s => s === subjectFilter) : scientificResults.subjects;
    const displayLitSubjects = subjectFilter ? literaryResults.subjects.filter(s => s === subjectFilter) : literaryResults.subjects;
    const displaySciStudents = scientificResults.students.filter(s =>
      s.studentName.includes(studentFilter) && (!subjectFilter || s.subjects[subjectFilter])
    );
    const displayLitStudents = literaryResults.students.filter(s =>
      s.studentName.includes(studentFilter) && (!subjectFilter || s.subjects[subjectFilter])
    );

    const wb = XLSX.utils.book_new();
    let hasData = false;

    // إنشاء ورقة الفرع العلمي
    if (displaySciStudents.length > 0) {
      hasData = true;
      const header = ["اسم الطالب", ...displaySciSubjects];
      const dataRows = displaySciStudents.map((s, idx) => [
        `${idx + 1}. ${s.studentName}`,
        ...displaySciSubjects.map(subj => s.subjects[subj] ? `${s.subjects[subj].score}/${s.subjects[subj].questionsCount}` : "—")
      ]);
      const sheetData = [
        header,
        ...dataRows
      ];
      const sciSheet = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, sciSheet, "العلمي");
    }

    // إنشاء ورقة الفرع الأدبي
    if (displayLitStudents.length > 0) {
      hasData = true;
      const header = ["اسم الطالب", ...displayLitSubjects];
      const dataRows = displayLitStudents.map((s, idx) => [
        `${idx + 1}. ${s.studentName}`,
        ...displayLitSubjects.map(subj => s.subjects[subj] ? `${s.subjects[subj].score}/${s.subjects[subj].questionsCount}` : "—")
      ]);
      const sheetData = [
        header,
        ...dataRows
      ];
      const litSheet = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, litSheet, "الأدبي");
    }

    if (!hasData) {
      toast.error("لا توجد بيانات لتصديرها وفقاً للفلاتر الحالية");
      return;
    }

    XLSX.writeFile(wb, `نتائج_الحزمة_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

  // تفعيل محاولة لطالب واحد (دون تجميع حسب الفرع، ولكن بنفس batch_id إن وجد)
  const handleActivateAttempt = async (studentId) => {
    setProcessingId(studentId);
    try {
      // 1. جلب فرع الطالب
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("branch")
        .eq("id", studentId)
        .single();
      const studentBranch = studentProfile?.branch?.trim() || null;

      // 2. إنهاء أي محاولة نشطة سابقة للطالب
      await supabase
        .from("attempts")
        .update({ status: "completed" })
        .eq("student_id", studentId)
        .eq("status", "active");

      // 3. البحث عن دفعة نشطة (أي فرع) لاستخدام batch_id موحد
      const { data: activeBatchAttempt } = await supabase
        .from("attempts")
        .select("id, batch_id")
        .eq("status", "active")
        .not("batch_id", "is", null)
        .maybeSingle();

      let batchId;
      let newAttempt;

      if (activeBatchAttempt?.batch_id) {
        // توجد دفعة نشطة موحدة
        batchId = activeBatchAttempt.batch_id;
        const { data: attempt, error: attemptError } = await supabase
          .from("attempts")
          .insert([{ student_id: studentId, status: "active", batch_id: batchId }])
          .select()
          .single();
        if (attemptError) throw attemptError;
        newAttempt = attempt;

        // توليد أسئلة جديدة حسب فرع الطالب (لا ننسخ من دفعة سابقة)
        await generateAttemptQuestions(newAttempt.id, studentBranch);
      } else {
        // لا توجد دفعة نشطة → إنشاء دفعة جديدة
        batchId = crypto.randomUUID();
        const { data: attempt, error: attemptError } = await supabase
          .from("attempts")
          .insert([{ student_id: studentId, status: "active", batch_id: batchId }])
          .select()
          .single();
        if (attemptError) throw attemptError;
        newAttempt = attempt;

        await generateAttemptQuestions(newAttempt.id, studentBranch);
      }

      toast.success("تم تفعيل المحاولة بنجاح!");
      await fetchStats();
      await fetchActiveAttempts();
    } catch (e) {
      toast.error("خطأ: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  // تفعيل جميع الطلاب الذين ليس لديهم محاولة نشطة
  const handleActivateAll = async () => {
  const studentsToActivate = users.filter(u => !activeAttemptsMap[u.id]);

  if (studentsToActivate.length === 0) {
    toast("لا يوجد طلاب بحاجة إلى تفعيل", { icon: "ℹ️" });
    return;
  }

  setActivatingAll(true);

  let success = 0;
  let failed = 0;

  for (const student of studentsToActivate) {
    try {
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("branch")
        .eq("id", student.id)
        .single();

      const studentBranch = studentProfile?.branch?.trim() || null;

      await supabase
        .from("attempts")
        .update({ status: "completed" })
        .eq("student_id", student.id)
        .eq("status", "active");

      const { data: activeBatchAttempt } = await supabase
        .from("attempts")
        .select("id, batch_id")
        .eq("status", "active")
        .not("batch_id", "is", null)
        .maybeSingle();

      let batchId;
      let newAttempt;

      if (activeBatchAttempt?.batch_id) {
        batchId = activeBatchAttempt.batch_id;

        const { data: attempt, error } = await supabase
          .from("attempts")
          .insert([{ student_id: student.id, status: "active", batch_id: batchId }])
          .select()
          .single();

        if (error) throw error;

        newAttempt = attempt;
        await generateAttemptQuestions(newAttempt.id, studentBranch);
      } else {
        batchId = crypto.randomUUID();

        const { data: attempt, error } = await supabase
          .from("attempts")
          .insert([{ student_id: student.id, status: "active", batch_id: batchId }])
          .select()
          .single();

        if (error) throw error;

        newAttempt = attempt;
        await generateAttemptQuestions(newAttempt.id, studentBranch);
      }

      success++;
    } catch (e) {
      failed++;
      console.error("فشل تفعيل الطالب", student.name, e);
    }
  }

  await fetchStats();
  await fetchActiveAttempts();

  setActivatingAll(false);

  toast.success(`تم تفعيل ${success} طالب بنجاح${failed > 0 ? `، فشل ${failed}` : ""}`);
};

  const filteredUsers = users.filter(
    (u) => u.name?.includes(searchTerm) || u.username?.includes(searchTerm)
  );
  const todayNewStudents = users.filter((u) => {
    const createdDate = new Date(u.created_at);
    const today = new Date();
    return createdDate.toDateString() === today.toDateString();
  }).length;

  const displaySciSubjects = subjectFilter ? scientificResults.subjects.filter(s => s === subjectFilter) : scientificResults.subjects;
  const displayLitSubjects = subjectFilter ? literaryResults.subjects.filter(s => s === subjectFilter) : literaryResults.subjects;
  const displaySciStudents = scientificResults.students.filter(s =>
    s.studentName.includes(studentFilter) && (!subjectFilter || s.subjects[subjectFilter])
  );
  const displayLitStudents = literaryResults.students.filter(s =>
    s.studentName.includes(studentFilter) && (!subjectFilter || s.subjects[subjectFilter])
  );

  useEffect(() => {
    fetchUsers();
    fetchAdminProfile();
    fetchStats();
    fetchActiveAttempts();
  }, [fetchUsers, fetchAdminProfile, fetchStats, fetchActiveAttempts]);

  return (
    <div className="dashboard-container">
      <Navbar userName={adminProfile?.name || "مدير النظام"} />
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

        <div className="actions-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div className="search-wrapper" style={{ flex: 1, marginBottom: 0 }}>
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="بحث عن اسم الطالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button
            className="btn-primary activate-all-btn"
            onClick={handleActivateAll}
            disabled={activatingAll || users.length === 0}
            style={{ marginRight: '16px', height: 'fit-content', padding: '16px 28px', whiteSpace: 'nowrap' }}
          >
            <Play size={18} /> {activatingAll ? "جاري التفعيل..." : "تفعيل الكل"}
          </button>
        </div>

        {/* جدول الطلاب */}
        <div className="table-card">
          <div className="card-header">
            <h2 className="card-title"><Users size={20} className="icon-blue" /> قائمة الطلاب</h2>
            <div className="card-header-actions">
              <span className="badge-count">{filteredUsers.length} طالب</span>
              <button className="refresh-btn-table" onClick={refreshAllData}>
                <RefreshCw size={16} /> <span>تحديث</span>
              </button>
            </div>
          </div>
          <div className="table-responsive">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner"></div><p>جاري تحميل الطلاب...</p></div>
            ) : filteredUsers.length > 0 ? (
              <table className="modern-table">
                <thead>
                  <tr><th className="nameColumn">الاسم</th><th>الفرع</th><th>تاريخ التسجيل</th><th className="text-center">الإجراءات</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const hasActiveAttempt = activeAttemptsMap[user.id];
                    return (
                      <tr key={user.id}>
                        <td><div className="user-cell"><div className="user-avatar-small">{user.name?.charAt(0) || "ط"}</div><span className="user-name-cell">{user.name || "غير محدد"}</span></div></td>
                        <td><span className="subject-badge" style={{ color: "#475569" }}>{user.branch || "—"}</span></td>
                        <td>{new Date(user.created_at).toLocaleDateString("ar-EG")}</td>
                        <td className="text-center">
                          {hasActiveAttempt ? (
                            <button className="activate-btn-table active-attempt" disabled style={{ background: "#10b981", cursor: "default" }}>✔ محاولة مفعلة</button>
                          ) : (
                            <button className="activate-btn-table" onClick={() => handleActivateAttempt(user.id)} disabled={processingId === user.id}>
                              {processingId === user.id ? (<><span className="spinner-small"></span>جاري...</>) : ("✚ تفعيل محاولـة")}
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

        {/* قسم نتائج الطلاب – نظام الحزم */}
        <div className="table-card" style={{ marginTop: "20px" }}>
          <div className="card-header" style={{ cursor: "pointer" }}
            onClick={() => {
              if (!showResults && batches.length === 0) fetchBatches();
              setShowResults(!showResults);
              setSelectedBatch(null);
            }}>
            <h2 className="card-title"><Award size={20} className="icon-blue" /> كشوف نتائج الطلاب</h2>
            <div className="card-header-actions">
              <span className="badge-count">{batches.length} حزمة</span>
              <ChevronDown size={20} style={{ transform: showResults ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>
          </div>
          {showResults && (
            <div className="table-responsive">
              {resultsLoading ? (
                <div className="empty-state"><div className="loading-spinner"></div><p>جاري التحميل...</p></div>
              ) : selectedBatch ? (
                <div style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                    <button className="btn-secondary" onClick={() => setSelectedBatch(null)}>← العودة للحزم</button>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn-primary" onClick={() => exportBatchToExcel(selectedBatch)} style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                        <Download size={16} /> تصدير Excel
                      </button>
                      <button className="btn-primary" onClick={() => handleDeleteBatch(selectedBatch)} disabled={deletingBatch === selectedBatch}
                        style={{ padding: "8px 16px", fontSize: "0.85rem", background: "#ef4444" }}>
                        <Trash2 size={16} /> حذف الحزمة
                      </button>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="filters-container" style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", color: "#475569", minWidth: "100px" }}>
                      <Filter size={18} /> الفرز والبحث:
                    </div>
                    <div className="filter-input-wrapper" style={{ flex: "1", minWidth: "200px", position: "relative" }}>
                      <Search size={16} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                      <input type="text" placeholder="اسم الطالب..." value={studentFilter}
                        onChange={(e) => setStudentFilter(e.target.value)}
                        style={{ width: "100%", padding: "10px 36px 10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontFamily: "inherit" }}
                      />
                    </div>
                    <div className="filter-input-wrapper" style={{ flex: "1", minWidth: "200px", position: "relative" }}>
                      <select value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontFamily: "inherit", appearance: "none", background: "white", color: "#1e293b", cursor: "pointer" }}>
                        <option value="">جميع المواد (تحديد مادة)</option>
                        {Array.from(new Set([...(scientificResults.subjects || []), ...(literaryResults.subjects || [])])).map(subj => (
                          <option key={subj} value={subj}>{subj}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                    </div>
                  </div>

                  {/* Scientific Table */}
                  {displaySciSubjects.length > 0 && displaySciStudents.length > 0 && (
                    <div style={{ marginBottom: "32px" }}>
                      <h3 style={{ textAlign: "center", marginBottom: "12px", color: "#1e293b" }}>كشف نتائج الطلاب – الفرع العلمي</h3>
                      <div style={{ overflowX: "auto" }}>
                        <table className="modern-table" style={{ textAlign: "center"}}>
                          <thead>
                            <tr>
                              <th style={{ position: "sticky", right: 0, background: "#f8fafc", zIndex: 1 }}>#</th>
                              <th style={{ position: "sticky", right: "40px", background: "#f8fafc", zIndex: 1 }}>اسم الطالب</th>
                              {displaySciSubjects.map(subj => (<th key={subj}>{subj}</th>))}
                            </tr>
                          </thead>
                          <tbody>
                            {displaySciStudents.map((student, idx) => (
                              <tr key={idx}>
                                <td style={{ position: "sticky", right: 0, background: "white" }}>{idx + 1}</td>
                                <td style={{ fontWeight: 600, position: "sticky", right: "40px", background: "white", whiteSpace: "nowrap" }}>{student.studentName}</td>
                                {displaySciSubjects.map(subj => {
                                  const subjData = student.subjects[subj];
                                  return (<td key={subj}>{subjData ? `${subjData.score}/${subjData.questionsCount}` : "—"}</td>);
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Literary Table */}
                  {displayLitSubjects.length > 0 && displayLitStudents.length > 0 && (
                    <div>
                      <h3 style={{ textAlign: "center", marginBottom: "12px", color: "#1e293b" }}>كشف نتائج الطلاب – الفرع الأدبي</h3>
                      <div style={{ overflowX: "auto" }}>
                        <table className="modern-table" style={{ textAlign: "center" }}>
                          <thead>
                            <tr>
                              <th style={{ position: "sticky", right: 0, background: "#f8fafc", zIndex: 1 }}>#</th>
                              <th style={{ position: "sticky", right: "40px", background: "#f8fafc", zIndex: 1 }}>اسم الطالب</th>
                              {displayLitSubjects.map(subj => (<th key={subj}>{subj}</th>))}
                            </tr>
                          </thead>
                          <tbody>
                            {displayLitStudents.map((student, idx) => (
                              <tr key={idx}>
                                <td style={{ position: "sticky", right: 0, background: "white" }}>{idx + 1}</td>
                                <td style={{ fontWeight: 600, position: "sticky", right: "40px", background: "white", whiteSpace: "nowrap" }}>{student.studentName}</td>
                                {displayLitSubjects.map(subj => {
                                  const subjData = student.subjects[subj];
                                  return (<td key={subj}>{subjData ? `${subjData.score}/${subjData.questionsCount}` : "—"}</td>);
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {displaySciStudents.length === 0 && displayLitStudents.length === 0 && (
                    <div className="empty-state" style={{ marginTop: "20px" }}>
                      <div className="empty-icon">🔍</div>
                      <h3>لم يتم العثور على نتائج</h3>
                      <p>لا يوجد طلاب يطابقون الفلاتر المحددة حالياً</p>
                    </div>
                  )}
                </div>
              ) : batches.length > 0 ? (
                <div style={{ padding: "20px" }}>
                  <table className="modern-table">
                    <thead><tr><th>الحزمة</th><th>عدد الطلاب</th><th>عدد المواد</th><th>تاريخ الإنشاء</th></tr></thead>
                    <tbody>
                      {batches.map((batch, idx) => (
                        <tr key={batch.id} style={{ cursor: "pointer" }} onClick={() => fetchBatchResults(batch.id)}>
                          <td>حزمة {batches.length - idx}</td>
                          <td>{batch.studentCount} طالب</td>
                          <td>{batch.subjectCount} مادة</td>
                          <td>{new Date(batch.createdAt).toLocaleDateString("ar-EG")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state"><div className="empty-icon">📊</div><h3>لا توجد حزم</h3><p>لم يتم إنشاء أي حزم بعد</p></div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; }
        .dashboard-container { direction: rtl; font-family: 'Cairo', sans-serif; background: linear-gradient(180deg, #f4f7fc 0%, #e9f0f9 100%); min-height: 100vh; display: flex; flex-direction: column; }
        .dashboard-main { flex: 1; width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 24px 32px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-right: 43%;}
        .page-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-align: right; width: 100%; }
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
        .search-wrapper { position: relative; }
        .search-icon { position: absolute; right: 18px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .search-input { width: 100%; padding: 16px 52px 16px 20px; border: 1px solid #e2e8f0; border-radius: 60px; font-family: 'Cairo'; font-size: 1rem; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.02); transition: all 0.2s; }
        .search-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
        .btn-primary.activate-all-btn { background: #2563eb; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .btn-primary.activate-all-btn:hover:not(:disabled) { background: #1d4ed8; }
        .table-card { background: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden; margin-bottom: 30px; }
        .card-header { padding: 20px 25px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .card-header-actions { display: flex; align-items: center; gap: 12px; }
        .card-title { margin: 0; font-size: 1.1rem; color: #1e293b; display: flex; align-items: center; gap: 10px; }
        .icon-blue { color: #3b82f6; }
        .badge-count { background: #eff6ff; color: #3b82f6; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; }
        .refresh-btn-table { display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #475569; font-family: inherit; font-size: 0.9rem; cursor: pointer; transition: 0.2s; }
        .refresh-btn-table:hover { background: #e2e8f0; color: #1e293b; }
        .table-responsive { width: 100%; overflow-x: auto; }
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th, .modern-table td { padding: 12px 15px; text-align: center; vertical-align: middle; border-bottom: 1px solid #f1f5f9; font-size: 0.7rem; }
        .modern-table th { background: #f8fafc; color: #64748b; font-weight: 700; }
        .modern-table tbody tr:hover { background: #f8fafc; }
        .user-cell { display: flex; align-items: center; gap: 12px; justify-content: flex-start; padding-right: 24px; }
        .user-avatar-small { width: 34px; height: 34px; background: #e0f2fe; color: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; }
        .user-name-cell { font-weight: 600; color: #1e293b; }
        .subject-badge { background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; }
        .activate-btn-table { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 14px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-family: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: 0.2s; min-width: 120px; height: 32px; white-space: nowrap; }
        .activate-btn-table:hover:not(:disabled) { background: #2563eb; }
        .activate-btn-table:disabled { opacity: 0.6; cursor: not-allowed; }
        .activate-btn-table.active-attempt { background: #10b981 !important; color: white; }
        .btn-primary { display: flex; align-items: center; gap: 6px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-family: inherit; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-primary:hover:not(:disabled) { opacity: 0.9; }
        .btn-secondary { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: white; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: 0.2s; }
        .btn-secondary:hover { background: #f8fafc; color: #1e293b; }
        .empty-state { padding: 40px 20px; text-align: center; color: #64748b; }
        .empty-icon { font-size: 3rem; margin-bottom: 10px; }
        .empty-state h3 { color: #1e293b; margin-bottom: 4px; }
        .loading-spinner { border: 3px solid #f3f3f3; border-top: 3px solid #3b82f6; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 10px; }
        .spinner-small { border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; width: 14px; height: 14px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}
</style>
    </div>
  );
}