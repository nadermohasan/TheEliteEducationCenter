// TeacherDashboard.jsx
import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { toast } from "react-hot-toast";
import {
  PlusCircle, Trash2, BookOpen, Edit2, X, UploadCloud, CheckCircle2, FileText,
  Upload, Download, FileSpreadsheet, FileJson, AlertCircle, Search, Image as ImageIcon,
  Save, Power, PowerOff, Settings, Info, List, RotateCcw
} from "lucide-react";
import * as XLSX from "xlsx";
import Footer from "./Footer";
import Navbar from "./Navbar";
import ConfirmDialog from "./ConfirmDialog";

// دوال تحويل الإجابة الصحيحة للرفع الجماعي
const mapCorrectOption = (value, isEnglish = false) => {
  if (value === undefined || value === "") return null;
  if (!isNaN(value) && [0, 1, 2, 3].includes(Number(value))) return Number(value);
  const str = String(value).trim().toLowerCase();
  const englishMap = { a: 0, b: 1, c: 2, d: 3 };
  const arabicMap = { أ: 0, ا: 0, ب: 1, ج: 2, د: 3 };
  if (englishMap[str] !== undefined) return englishMap[str];
  if (arabicMap[str] !== undefined) return arabicMap[str];
  return null;
};

const getCorrectOptionLetter = (correctNumber, isEnglish) => {
  const englishLetters = ["A", "B", "C", "D"];
  const arabicLetters = ["أ", "ب", "ج", "د"];
  const letters = isEnglish ? englishLetters : arabicLetters;
  return letters[correctNumber] || "?";
};

const ALLOW_IMAGE_OPTIONS_KEYWORDS = [
  "رياضيات", "جغرافيا", "تكنولوجيا المعلومات", "تقنية معلومات",
  "أحياء", "كيمياء", "فيزياء"
];

const SHARED_SUBJECTS = ["الرياضيات", "اللغة الإنجليزية", "تكنولوجيا المعلومات", "اللغة العربية"];
const SCIENTIFIC_ONLY = ["كيمياء", "أحياء", "فيزياء"];
const LITERARY_ONLY = ["جغرافيا", "تاريخ", "الثقافة العلمية"];

export default function TeacherDashboard() {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]); // الأسئلة اليدوية فقط
  const [passages, setPassages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [passageSearch, setPassageSearch] = useState("");
  const [stats, setStats] = useState({ totalQuestions: 0, totalPassages: 0 });

  // Bulk upload states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [selectedBulkSubject, setSelectedBulkSubject] = useState("");
  const [isEnglishBulk, setIsEnglishBulk] = useState(false);
  const [showBulkPreview, setShowBulkPreview] = useState(false);

  const [showPassageModal, setShowPassageModal] = useState(false);
  const [editingPassage, setEditingPassage] = useState(null);
  const [passageForm, setPassageForm] = useState({
    title: "", passage_text: "", subject_id: ""
  });
  const [passageSubjects, setPassageSubjects] = useState([]);

  const [uploadBatches, setUploadBatches] = useState([]);
  const [editingDurations, setEditingDurations] = useState({});
  const [editingQuestionsCount, setEditingQuestionsCount] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // حالات توسيع الدفعة
  const [expandedBatchId, setExpandedBatchId] = useState(null);
  const [batchQuestions, setBatchQuestions] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // حالات تعديل الدرجة داخل الجداول
  const [editingCellId, setEditingCellId] = useState(null);
  const [editDegree, setEditDegree] = useState("");
  const [editingBatchCellId, setEditingBatchCellId] = useState(null);
  const [batchEditDegree, setBatchEditDegree] = useState("");

  const [confirmState, setConfirmState] = useState({
    isOpen: false, title: "", message: "", confirmText: "", cancelText: "", resolve: null
  });

  const [formData, setFormData] = useState({
    subject_id: "",
    question_text: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correct_option: 0,
    image_url: "",
    passage_id: "",
    imageA: "",
    imageB: "",
    imageC: "",
    imageD: "",
    unit_number: "",
    branch: "",
    degree: "1"
  });

  const getSelectedSubject = () => subjects.find(s => s.id == formData.subject_id);
  const isSharedSubject = () => {
    const subject = getSelectedSubject();
    if (!subject) return false;
    return SHARED_SUBJECTS.some(keyword => subject.name.includes(keyword));
  };
  const isScientificOnly = () => {
    const subject = getSelectedSubject();
    if (!subject) return false;
    return SCIENTIFIC_ONLY.some(keyword => subject.name.includes(keyword));
  };
  const isLiteraryOnly = () => {
    const subject = getSelectedSubject();
    if (!subject) return false;
    return LITERARY_ONLY.some(keyword => subject.name.includes(keyword));
  };

  const showConfirm = (options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || "تأكيد العملية",
        message: options.message,
        confirmText: options.confirmText || "تأكيد",
        cancelText: options.cancelText || "إلغاء",
        resolve
      });
    });
  };

  const handleConfirm = () => {
    if (confirmState.resolve) confirmState.resolve(true);
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (confirmState.resolve) confirmState.resolve(false);
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    loadUploadBatches();
    fetchTeacherProfile();
    fetchSubjects();
    fetchQuestions();
    fetchPassages();
  }, []);

  useEffect(() => {
    setStats({ totalQuestions: questions.length, totalPassages: passages.length });
  }, [questions, passages]);

  useEffect(() => {
    document.title = "إدارة بنك الاسئلة - مركز النخبة التعليمي";
  }, []);

  const loadUploadBatches = () => {
    const saved = localStorage.getItem("teacher_upload_batches");
    if (saved) setUploadBatches(JSON.parse(saved));
  };

  const saveUploadBatches = (batches) => {
    localStorage.setItem("teacher_upload_batches", JSON.stringify(batches));
    setUploadBatches(batches);
  };

  const fetchTeacherProfile = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: profile } = await supabase.from("profiles").select("name").eq("id", currentUser.id).single();
      setTeacherProfile(profile);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select('id, name, duration_minutes, questions_count, branch')
        .order("id");
      if (!error && data) {
        setSubjects(data);
        const durations = {};
        const counts = {};
        data.forEach(s => {
          durations[s.id] = s.duration_minutes || 60;
          counts[s.id] = s.questions_count || 40;
        });
        setEditingDurations(durations);
        setEditingQuestionsCount(counts);
        setPassageSubjects(data);
      }
    } catch (err) { console.error(err); }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { navigate("/login"); return; }

      // نجلب فقط الأسئلة اليدوية (ليست ضمن دفعة رفع جماعي)
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("teacher_id", user.id)
        .is("bulk_batch_id", null)
        .order("created_at", { ascending: false });

      if (questionsError) throw questionsError;
      if (!questionsData || questionsData.length === 0) { setQuestions([]); return; }

      const subjectIds = [...new Set(questionsData.map(q => q.subject_id).filter(id => id))];
      let subjectsMap = new Map();
      if (subjectIds.length > 0) {
        const { data: subjectsData } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
        if (subjectsData) subjectsData.forEach(subject => subjectsMap.set(subject.id, subject));
      }

      const formattedQuestions = questionsData.map(question => ({
        ...question,
        subjects: subjectsMap.get(question.subject_id) || { name: "غير محدد" }
      }));
      setQuestions(formattedQuestions);
    } catch (err) {
      setFetchError("حدث خطأ في جلب الأسئلة");
      setQuestions([]);
    } finally { setLoading(false); }
  };

  const fetchPassages = async () => {
    const { data, error } = await supabase.from("passages").select("*").order("created_at", { ascending: true });
    if (!error) setPassages(data || []);
  };

  // جلب أسئلة دفعة معينة عند توسيعها
  const fetchBatchQuestions = async (batchId) => {
    setBatchLoading(true);
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("bulk_batch_id", batchId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setBatchQuestions(data || []);
      setEditingBatchCellId(null); // إغلاق أي خلية تعديل مفتوحة
    } catch (error) {
      toast.error("فشل جلب أسئلة الدفعة");
      setBatchQuestions([]);
    } finally {
      setBatchLoading(false);
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const { error } = await supabase.storage.from("question-images").upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("question-images").getPublicUrl(fileName);
    return publicUrl;
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      let finalBranch = formData.branch;
      if (isScientificOnly()) finalBranch = "العلمي";
      else if (isLiteraryOnly()) finalBranch = "الأدبي";

      const newQuestion = {
        teacher_id: user.id,
        subject_id: formData.subject_id,
        question_text: formData.question_text,
        options: [formData.optionA, formData.optionB, formData.optionC, formData.optionD],
        correct_option: parseInt(formData.correct_option),
        image_url: formData.image_url || null,
        passage_id: formData.passage_id || null,
        created_at: new Date(),
        image_option_a: formData.imageA || null,
        image_option_b: formData.imageB || null,
        image_option_c: formData.imageC || null,
        image_option_d: formData.imageD || null,
        unit_number: formData.unit_number ? parseInt(formData.unit_number) : null,
        branch: finalBranch || null,
        degree: parseInt(formData.degree) || 1, // استخدام القيمة الافتراضية 1
        is_active: true
      };

      const { error } = await supabase.from("questions").insert([newQuestion]);
      if (error) throw error;
      toast.success("تم إضافة السؤال بنجاح!");

      const currentSubject = formData.subject_id;
      resetForm();
      setFormData(prev => ({ ...prev, subject_id: currentSubject }));

      await fetchQuestions();
    } catch (error) {
      toast.error("خطأ في الإضافة: " + error.message);
    } finally { setLoading(false); }
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalBranch = formData.branch;
      if (isScientificOnly()) finalBranch = "العلمي";
      else if (isLiteraryOnly()) finalBranch = "الأدبي";

      const updatedQuestion = {
        subject_id: formData.subject_id,
        question_text: formData.question_text,
        options: [formData.optionA, formData.optionB, formData.optionC, formData.optionD],
        correct_option: parseInt(formData.correct_option),
        image_url: formData.image_url || null,
        passage_id: formData.passage_id || null,
        image_option_a: formData.imageA || null,
        image_option_b: formData.imageB || null,
        image_option_c: formData.imageC || null,
        image_option_d: formData.imageD || null,
        unit_number: formData.unit_number ? parseInt(formData.unit_number) : null,
        branch: finalBranch || null
        // degree excluded - managed inline
      };
      const { error } = await supabase.from("questions").update(updatedQuestion).eq("id", editingId);
      if (error) throw error;
      toast.success("تم تعديل السؤال بنجاح!");
      resetForm();
      await fetchQuestions();
    } catch (error) {
      toast.error("خطأ في التعديل: " + error.message);
    } finally { setLoading(false); }
  };

  const deleteQuestion = async (id) => {
    const confirmed = await showConfirm({
      title: "حذف السؤال",
      message: "هل أنت متأكد من حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء.",
      confirmText: "حذف",
      cancelText: "إلغاء"
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
      if (editingId === id) resetForm();
      await fetchQuestions();
      toast.success("تم حذف السؤال بنجاح");
    } catch (error) {
      toast.error("خطأ أثناء الحذف: " + error.message);
    }
  };

  const loadQuestionForEdit = (question) => {
    const options = question.options || ["", "", "", ""];
    setFormData({
      subject_id: question.subject_id || "",
      question_text: question.question_text || "",
      optionA: options[0] || "",
      optionB: options[1] || "",
      optionC: options[2] || "",
      optionD: options[3] || "",
      correct_option: question.correct_option || 0,
      image_url: question.image_url || "",
      passage_id: question.passage_id || "",
      imageA: question.image_option_a || "",
      imageB: question.image_option_b || "",
      imageC: question.image_option_c || "",
      imageD: question.image_option_d || "",
      unit_number: question.unit_number || "",
      branch: question.branch || "",
      degree: question.degree || "1"
    });
    setIsEditing(true);
    setEditingId(question.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setFormData({
      subject_id: "", question_text: "", optionA: "", optionB: "", optionC: "", optionD: "", correct_option: 0,
      image_url: "", passage_id: "", imageA: "", imageB: "", imageC: "", imageD: "", unit_number: "", branch: "",
      degree: "1"
    });
    setIsEditing(false);
    setEditingId(null);
  };

  // Passage CRUD
  const handleAddPassage = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      title: passageForm.title,
      passage_text: passageForm.passage_text,
      subject_id: parseInt(passageForm.subject_id)
    };

    if (editingPassage) {
      await supabase.from("passages").update(payload).eq("id", editingPassage.id);
      toast.success("تم تحديث النص بنجاح");
    } else {
      await supabase.from("passages").insert([payload]);
      toast.success("تم إضافة النص بنجاح");
    }
    fetchPassages();
    setShowPassageModal(false);
    setEditingPassage(null);
    setPassageForm({ title: "", passage_text: "", subject_id: "" });
  };

  const deletePassage = async (id) => {
    const confirmed = await showConfirm({
      title: "حذف النص",
      message: "حذف النص سيؤدي إلى فصل الأسئلة المرتبطة به. هل أنت متأكد؟",
      confirmText: "حذف",
      cancelText: "إلغاء"
    });
    if (!confirmed) return;
    await supabase.from("passages").delete().eq("id", id);
    fetchPassages();
    toast.success("تم حذف النص بنجاح");
  };

  // Settings functions
  const handleSubjectDurationChange = (subjectId, value) => {
    setEditingDurations(prev => ({ ...prev, [subjectId]: parseInt(value) || 60 }));
  };

  const handleSubjectQuestionsCountChange = (subjectId, value) => {
    setEditingQuestionsCount(prev => ({ ...prev, [subjectId]: parseInt(value) || 40 }));
  };

  const handleSaveAllSettings = async () => {
    setSavingSettings(true);
    try {
      const updates = subjects.map(subject => ({
        id: subject.id,
        duration_minutes: editingDurations[subject.id],
        questions_count: editingQuestionsCount[subject.id]
      }));
      for (const update of updates) {
        const { error } = await supabase
          .from("subjects")
          .update({ duration_minutes: update.duration_minutes, questions_count: update.questions_count })
          .eq("id", update.id);
        if (error) throw error;
      }
      toast.success("تم حفظ جميع الإعدادات بنجاح");
      setShowSettingsModal(false);
    } catch (error) {
      toast.error("خطأ في الحفظ: " + error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // BULK UPLOAD IMPLEMENTATION
  const openBulkModal = () => {
    setShowBulkModal(true);
    resetBulkStates();
  };

  const resetBulkStates = () => {
    setBulkPreview([]);
    setBulkErrors([]);
    setBulkFileName("");
    setSelectedBulkSubject("");
    setIsEnglishBulk(false);
    setShowBulkPreview(false);
  };

  const handleSubjectSelectForBulk = (subjectId) => {
    setSelectedBulkSubject(subjectId);
    const subject = subjects.find(s => s.id == subjectId);
    setIsEnglishBulk(subject?.name?.includes("إنجليزية") || false);
  };

  const processBulkQuestions = (rawData, fileType) => {
    const errors = [];
    const validQuestions = [];
    const rows = rawData.map((row, index) => ({ ...row, _row: index + 1 }));

    rows.forEach((row, idx) => {
      const rowNum = row._row;
      let questionText = row.question_text || row["نص السؤال"] || row["السؤال"] || "";
      if (!questionText) {
        errors.push(`الصف ${rowNum}: لا يوجد نص للسؤال`);
        return;
      }

      const options = [];
      for (let i = 0; i < 4; i++) {
        const opt = row[`option${String.fromCharCode(65 + i)}`] || row[`option_${i}`] || row[`الخيار ${i+1}`] || row[`خيار${i+1}`] || "";
        options.push(opt);
      }
      const hasAllOptions = options.every(o => o !== undefined);
      if (!hasAllOptions) {
        errors.push(`الصف ${rowNum}: الخيارات غير مكتملة`);
        return;
      }

      let correctOption = mapCorrectOption(row.correct_option || row["الإجابة الصحيحة"] || row["correct"] || row["صحيح"], isEnglishBulk);
      if (correctOption === null || correctOption === undefined) {
        errors.push(`الصف ${rowNum}: الإجابة الصحيحة غير صالحة`);
        return;
      }

      const degree = parseInt(row.degree || row["الدرجة"] || 1) || 1;
      const unit = row.unit_number || row["الوحدة"] || row["unit"] || "";
      const branch = row.branch || row["الفرع"] || "";

      validQuestions.push({
        question_text: questionText.trim(),
        options,
        correct_option: correctOption,
        degree,
        unit_number: unit ? parseInt(unit) : null,
        branch: branch || null,
        image_url: row.image_url || row["الصورة"] || null,
        passage_id: row.passage_id || row["رقم النص"] || null
      });
    });

    setBulkErrors(errors);
    if (errors.length > 0) {
      toast.error(`يوجد ${errors.length} أخطاء في الملف`);
    }
    return validQuestions;
  };

  const handleBulkFileUpload = (file) => {
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        if (!jsonData || jsonData.length === 0) {
          toast.error("الملف لا يحتوي على بيانات");
          return;
        }
        const valid = processBulkQuestions(jsonData, 'excel');
        setBulkPreview(valid);
        if (valid.length > 0) setShowBulkPreview(true);
      } catch (error) {
        toast.error("فشل قراءة الملف: " + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkJsonUpload = (file) => {
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        if (!Array.isArray(jsonData)) {
          toast.error("ملف JSON يجب أن يحتوي على مصفوفة");
          return;
        }
        const valid = processBulkQuestions(jsonData, 'json');
        setBulkPreview(valid);
        if (valid.length > 0) setShowBulkPreview(true);
      } catch (error) {
        toast.error("فشل قراءة ملف JSON: " + error.message);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    if (!selectedBulkSubject) {
      toast.error("يرجى اختيار المادة أولاً");
      return;
    }
    if (bulkPreview.length === 0) {
      toast.error("لا توجد أسئلة صالحة للرفع");
      return;
    }

    setBulkUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("لم يتم العثور على المستخدم");

      const batchId = Date.now().toString();
      const questionsToInsert = bulkPreview.map(q => ({
        teacher_id: user.id,
        subject_id: selectedBulkSubject,
        question_text: q.question_text,
        options: q.options,
        correct_option: q.correct_option,
        degree: q.degree,
        unit_number: q.unit_number,
        branch: q.branch,
        image_url: q.image_url || null,
        passage_id: q.passage_id ? parseInt(q.passage_id) : null,
        is_active: true,
        created_at: new Date(),
        image_option_a: null,
        image_option_b: null,
        image_option_c: null,
        image_option_d: null,
        bulk_batch_id: batchId
      }));

      const { error } = await supabase.from("questions").insert(questionsToInsert);
      if (error) throw error;

      const subjectName = subjects.find(s => s.id == selectedBulkSubject)?.name || "غير معروف";
      const newBatch = {
        id: batchId,
        date: new Date().toISOString(),
        fileName: bulkFileName,
        count: questionsToInsert.length,
        subject: subjectName,
        isActive: true
      };
      const updatedBatches = [...uploadBatches, newBatch];
      saveUploadBatches(updatedBatches);

      toast.success(`تم رفع ${questionsToInsert.length} سؤال بنجاح`);
      setShowBulkModal(false);
      resetBulkStates();
    } catch (error) {
      toast.error("فشل الرفع الجماعي: " + error.message);
    } finally {
      setBulkUploading(false);
    }
  };

  // تفعيل / تعطيل دفعة بالكامل
  const toggleBatchActive = async (batchId, currentlyActive) => {
    const confirmed = await showConfirm({
      title: currentlyActive ? "تعطيل الدفعة" : "تفعيل الدفعة",
      message: `هل أنت متأكد من ${currentlyActive ? "تعطيل" : "تفعيل"} أسئلة هذه الدفعة؟`,
      confirmText: currentlyActive ? "تعطيل" : "تفعيل",
      cancelText: "إلغاء"
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("questions")
        .update({ is_active: !currentlyActive })
        .eq("bulk_batch_id", batchId);

      if (error) throw error;

      const updatedBatches = uploadBatches.map(b =>
        b.id === batchId ? { ...b, isActive: !currentlyActive } : b
      );
      saveUploadBatches(updatedBatches);

      if (expandedBatchId === batchId) {
        fetchBatchQuestions(batchId);
      }
      toast.success(`تم ${!currentlyActive ? "تفعيل" : "تعطيل"} الدفعة بنجاح`);
    } catch (error) {
      toast.error("حدث خطأ: " + error.message);
    }
  };

  // تفعيل / تعطيل سؤال منفرد (يدوي)
  const toggleQuestionActive = async (questionId, currentlyActive) => {
    try {
      const { error } = await supabase
        .from("questions")
        .update({ is_active: !currentlyActive })
        .eq("id", questionId);

      if (error) throw error;

      await fetchQuestions();
      toast.success(`تم ${!currentlyActive ? "تفعيل" : "تعطيل"} السؤال`);
    } catch (error) {
      toast.error("فشل تحديث السؤال: " + error.message);
    }
  };

  // تفعيل / تعطيل سؤال داخل دفعة
  const toggleBatchQuestionActive = async (questionId, currentlyActive, batchId) => {
    try {
      const { error } = await supabase
        .from("questions")
        .update({ is_active: !currentlyActive })
        .eq("id", questionId);

      if (error) throw error;
      fetchBatchQuestions(batchId);
      toast.success(`تم ${!currentlyActive ? "تفعيل" : "تعطيل"} السؤال`);
    } catch (error) {
      toast.error("فشل تحديث السؤال: " + error.message);
    }
  };

  // تفعيل / تعطيل جميع الأسئلة اليدوية المعروضة
  const toggleAllQuestions = async (activate) => {
    const action = activate ? "تفعيل" : "تعطيل";
    const confirmed = await showConfirm({
      title: `${action} جميع الأسئلة`,
      message: `هل أنت متأكد من ${action} جميع الأسئلة المعروضة حالياً؟`,
      confirmText: action,
      cancelText: "إلغاء"
    });
    if (!confirmed) return;

    try {
      const questionIds = filteredQuestions.map(q => q.id);
      if (questionIds.length === 0) {
        toast.error("لا توجد أسئلة لتحديثها");
        return;
      }

      const { error } = await supabase
        .from("questions")
        .update({ is_active: activate })
        .in("id", questionIds);

      if (error) throw error;

      await fetchQuestions();
      toast.success(`تم ${action} جميع الأسئلة بنجاح`);
    } catch (error) {
      toast.error("فشل تحديث الأسئلة: " + error.message);
    }
  };

  const deleteBatchQuestions = async (batchId, batchIndex) => {
    const confirmed = await showConfirm({
      title: "حذف الدفعة",
      message: `سيتم حذف جميع أسئلة الدفعة ${batchIndex + 1} (${uploadBatches[batchIndex].count} سؤال). هل أنت متأكد؟`,
      confirmText: "حذف",
      cancelText: "إلغاء"
    });
    if (!confirmed) return;

    const updatedBatches = uploadBatches.filter(b => b.id !== batchId);
    saveUploadBatches(updatedBatches);
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null);
      setBatchQuestions([]);
    }
    toast.success("تم حذف الدفعة من السجل (لا يمكن حذف الأسئلة المرتبطة من قاعدة البيانات حالياً)");
  };

  // توسيع/طي أسئلة الدفعة
  const handleBatchRowClick = (batch) => {
    if (expandedBatchId === batch.id) {
      setExpandedBatchId(null);
      setBatchQuestions([]);
      setEditingBatchCellId(null);
    } else {
      setExpandedBatchId(batch.id);
      fetchBatchQuestions(batch.id);
    }
  };

  // ========== تعديل الدرجة داخل الجداول ==========
  // للأسئلة اليدوية
  const startEditDegree = (question) => {
    setEditingCellId(question.id);
    setEditDegree(question.degree?.toString() || "1");
  };

  const saveDegreeEdit = async (questionId) => {
    const newDegree = parseInt(editDegree) || 1;
    try {
      await supabase.from("questions").update({ degree: newDegree }).eq("id", questionId);
      setEditingCellId(null);
      await fetchQuestions();
      toast.success("تم تحديث الدرجة");
    } catch (error) {
      toast.error("فشل تحديث الدرجة");
    }
  };

  // للأسئلة داخل الدفعات
  const startEditBatchDegree = (question) => {
    setEditingBatchCellId(question.id);
    setBatchEditDegree(question.degree?.toString() || "1");
  };

  const saveBatchDegreeEdit = async (questionId, batchId) => {
    const newDegree = parseInt(batchEditDegree) || 1;
    try {
      await supabase.from("questions").update({ degree: newDegree }).eq("id", questionId);
      setEditingBatchCellId(null);
      await fetchBatchQuestions(batchId);
      toast.success("تم تحديث الدرجة");
    } catch (error) {
      toast.error("فشل تحديث الدرجة");
    }
  };

  const downloadTemplate = () => {
    const sampleData = [
      {
        "نص السؤال": "مثال: ما عاصمة فلسطين؟",
        "الخيار 1": "القدس",
        "الخيار 2": "رام الله",
        "الخيار 3": "غزة",
        "الخيار 4": "نابلس",
        "الإجابة الصحيحة": "أ",
        "الدرجة": 1,
        "الوحدة": 1,
        "الفرع": "العلمي"
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "questions_template.xlsx");
    toast.success("تم تحميل قالب الإكسل");
  };

  const handleCancelBulk = () => {
    setShowBulkModal(false);
    resetBulkStates();
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question_text?.includes(searchTerm) || q.subjects?.name?.includes(searchTerm);
    const matchesSubject = subjectFilter === "" || q.subject_id == subjectFilter;
    return matchesSearch && matchesSubject;
  });

  const allActive = filteredQuestions.length > 0 && filteredQuestions.every(q => q.is_active);

  const isEnglishSubject = () => {
    if (!formData.subject_id) return false;
    const subject = subjects.find(s => s.id == formData.subject_id);
    return subject?.name?.includes("إنجليزية") || false;
  };
  const allowImageOptions = () => {
    const subject = getSelectedSubject();
    if (!subject) return false;
    return ALLOW_IMAGE_OPTIONS_KEYWORDS.some(keyword => subject.name?.includes(keyword));
  };
  const getOptionLabels = () => isEnglishSubject() ? ["A", "B", "C", "D"] : ["أ", "ب", "ج", "د"];
  const getQuestionOptionLabels = (question) => {
    const isEnglish = question.subjects?.name?.includes("إنجليزية");
    return isEnglish ? ["A", "B", "C", "D"] : ["أ", "ب", "ج", "د"];
  };
  const optionLabels = getOptionLabels();

  const ImageUploadField = ({ label, imageUrl, onImageChange, onRemove, inputId }) => (
    <div className="form-group" style={{ marginTop: "12px" }}>
      <label className="sub-label">{label}</label>
      <div className="upload-box compact-upload">
        <input type="file" accept="image/*" id={inputId} style={{ display: "none" }} onChange={onImageChange} />
        {!imageUrl ? (
          <label htmlFor={inputId} className="upload-btn-outline"><UploadCloud size={16} /> رفع صورة</label>
        ) : (
          <div className="image-preview">
            <img src={imageUrl} alt="preview" />
            <button type="button" onClick={onRemove} className="remove-img-btn"><X size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="teacher-container">
      <Navbar userName={teacherProfile?.name || "معلم"} />

      <main className="teacher-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">{isEditing ? "تعديل السؤال" : "إدارة بنك الأسئلة"}</h1>
            <p className="page-subtitle">أضف، عدل، وقم بإدارة أسئلة الاختبارات بكل سهولة.</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => setShowPassageModal(true)}><FileText size={18} /> النصوص</button>
            <button className="btn-secondary" onClick={() => setShowSettingsModal(true)}><Settings size={18} /> الإعدادات</button>
            <button className="btn-primary" onClick={openBulkModal}><Upload size={18} /> رفع جماعي</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper blue"><BookOpen size={24} /></div>
            <div className="stat-content"><span className="stat-label">إجمالي الأسئلة اليدوية</span><span className="stat-number">{stats.totalQuestions}</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper purple"><FileText size={24} /></div>
            <div className="stat-content"><span className="stat-label">نصوص القراءة</span><span className="stat-number">{stats.totalPassages}</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper green"><CheckCircle2 size={24} /></div>
            <div className="stat-content"><span className="stat-label">المواد الدراسية</span><span className="stat-number">{subjects.length}</span></div>
          </div>
        </div>

        {fetchError && <div className="error-banner"><X size={20} /> {fetchError}</div>}

        <section className="form-card main-form-section">
          <div className="card-header">
            <h2 className="card-title">
              {isEditing ? <Edit2 size={22} className="icon-accent" /> : <PlusCircle size={22} className="icon-accent" />}
              {isEditing ? "تحديث بيانات السؤال" : "إضافة سؤال جديد"}
            </h2>
            {isEditing && <button className="btn-text" onClick={resetForm}><X size={16} /> إلغاء التعديل</button>}
          </div>

          <form onSubmit={isEditing ? handleUpdateQuestion : handleAddQuestion} className="question-form">
            <div className="form-section">
              <h3 className="section-title"><Info size={18}/> المعلومات الأساسية</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>المادة الدراسية <span className="required">*</span></label>
                  <select required className="modern-input" value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}>
                    <option value="" disabled>اختر المادة من القائمة</option>
                    {subjects.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </div>

                <div className="form-group">
                  <label>رقم الوحدة</label>
                  <input type="number" className="modern-input" value={formData.unit_number} onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })} placeholder="مثال: 1" min="1" />
                </div>

  {isSharedSubject() && (
  <div className="form-group">
    <label>الفرع الدراسي <span className="required">*</span></label>
    <select
      required
      className="modern-input"
      value={formData.branch}
      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
    >
      <option value="" disabled>اختر الفرع الدراسي</option>
      <option value="العلمي">العلمي</option>
      <option value="الأدبي">الأدبي</option>
    </select>
  </div>
)}

                {isEnglishSubject() && (
                  <div className="form-group">
                    <label>القطعة المرتبطة (Passage)</label>
                    <select className="modern-input" value={formData.passage_id} onChange={(e) => setFormData({ ...formData, passage_id: e.target.value })}>
                      <option value="">بدون نص</option>
                      {passages.filter(p => p.subject_id == formData.subject_id).map(p => (<option key={p.id} value={p.id}>{p.title}</option>))}
                    </select>
                  </div>
                )}

                <div className="form-group full-width">
                  <label>نص السؤال <span className="required">*</span></label>
                  <textarea required className="modern-input textarea-input" value={formData.question_text} onChange={(e) => setFormData({ ...formData, question_text: e.target.value })} placeholder="اكتب السؤال بصيغة واضحة ومباشرة هنا..." />
                </div>

                <div className="form-group full-width">
                  <label>صورة توضيحية للسؤال <span className="hint-text">(اختياري)</span></label>
                  <div className="upload-box">
                    <input type="file" id="q-image" className="hidden-input" accept="image/*" onChange={async (e) => { const file = e.target.files[0]; if (file) { try { const url = await uploadImage(file); setFormData({ ...formData, image_url: url }); } catch { toast.error("فشل رفع الصورة"); } } }} />
                    {!formData.image_url ? (
                      <label htmlFor="q-image" className="upload-label-large">
                        <UploadCloud size={36} className="upload-icon" />
                        <span className="upload-text">اضغط هنا لرفع صورة</span>
                        <span className="upload-hint">PNG, JPG حتى 5MB</span>
                      </label>
                    ) : (
                      <div className="image-preview large-preview">
                        <img src={formData.image_url} alt="preview" />
                        <button type="button" className="remove-img-btn" onClick={() => setFormData({ ...formData, image_url: "" })}><X size={16} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section alt-bg">
              <h3 className="section-title"><List size={18}/> الخيارات والإجابة الصحيحة</h3>
              <div className="options-grid">
                {[0, 1, 2, 3].map(idx => {
                  const optKey = ["A", "B", "C", "D"][idx];
                  const valueKey = ["optionA", "optionB", "optionC", "optionD"][idx];
                  const imageKey = ["imageA", "imageB", "imageC", "imageD"][idx];
                  return (
                    <div className="option-card" key={idx}>
                      <div className="form-group">
                        <label className="option-label">الخيار ({optionLabels[idx]}) <span className="required">*</span></label>
                        <input required className="modern-input" type="text" value={formData[valueKey]} onChange={(e) => setFormData({ ...formData, [valueKey]: e.target.value })} placeholder={`محتوى الخيار...`} />
                        {allowImageOptions() && (
                          <ImageUploadField label={`صورة إضافية للخيار`} imageUrl={formData[imageKey]} inputId={`option${optKey}-upload`}
                            onImageChange={async (e) => { const file = e.target.files[0]; if (file) { try { const url = await uploadImage(file); setFormData({ ...formData, [imageKey]: url }); } catch { toast.error("فشل رفع الصورة"); } } }}
                            onRemove={() => setFormData({ ...formData, [imageKey]: "" })} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="form-group correct-answer-group">
                <label>الإجابة الصحيحة <span className="required">*</span></label>
                <div className="correct-answer-selector">
                  {[0, 1, 2, 3].map(idx => (
                    <label key={idx} className={`radio-label ${parseInt(formData.correct_option) === idx ? 'selected' : ''}`}>
                      <input type="radio" name="correct_option" value={idx} checked={parseInt(formData.correct_option) === idx} onChange={(e) => setFormData({ ...formData, correct_option: e.target.value })} className="hidden-radio" />
                      الخيار {optionLabels[idx]}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary large-btn" disabled={loading}>
                {isEditing ? <Edit2 size={20} /> : <CheckCircle2 size={20} />}
                {loading ? "جاري المعالجة..." : (isEditing ? "حفظ التعديلات" : "إضافة السؤال للبنك")}
              </button>
            </div>
          </form>
        </section>

        {/* قائمة الأسئلة اليدوية */}
        <section className="table-card">
          <div className="card-header">
            <h2 className="card-title"><BookOpen size={20} className="icon-accent" /> بنك الاسئلة</h2>
            <div className="card-header-actions">
              <span className="badge-count">{filteredQuestions.length} سؤال</span>
              <button className="btn-secondary" onClick={() => toggleAllQuestions(!allActive)} style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                title={allActive ? "تعطيل جميع الأسئلة المعروضة" : "تفعيل جميع الأسئلة المعروضة"}>
                {allActive ? <PowerOff size={16} color="#ef4444" /> : <Power size={16} color="#10b981" />}
                {allActive ? "تعطيل الكل" : "تفعيل الكل"}
              </button>
              <select className="modern-input" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} style={{ width: 'auto', padding: '10px 16px', borderRadius: '30px', fontSize: '0.9rem' }}>
                <option value="">جميع المواد</option>
                {subjects.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
          </div>

          <div className="table-responsive">
            {loading && questions.length === 0 ? (
              <div className="empty-state"><div className="loading-spinner"></div><p>جاري تحميل الأسئلة...</p></div>
            ) : filteredQuestions.length > 0 ? (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>المادة / التفاصيل</th>
                    <th>نص السؤال</th>
                    <th className="text-center">الدرجة</th>
                    <th className="text-center">الإجابة</th>
                    <th className="text-center" style={{ width: '100px' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((q) => {
                    const labels = getQuestionOptionLabels(q);
                    const hasImage = q.image_url ? true : false;
                    const imagesCount = [q.image_option_a, q.image_option_b, q.image_option_c, q.image_option_d].filter(Boolean).length;
                    return (
                      <tr key={q.id} className={q.is_active ? '' : 'inactive-row'}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                            {q.subjects?.name || "غير محدد"}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
                            <span className="badge bg-light" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                              {q.branch || 'عام'}
                            </span>
                            <span>الوحدة: {q.unit_number || '-'}</span>
                          </div>
                        </td>

                        <td className="q-text-cell" title={q.question_text} style={{ maxWidth: '400px' }}>
                          <span>{q.question_text}</span>
                          {hasImage && <ImageIcon size={12} style={{ marginRight: '6px', color: '#3b82f6', verticalAlign: 'middle' }} />}
                          {imagesCount > 0 && <List size={12} style={{ marginRight: '4px', color: '#8b5cf6', verticalAlign: 'middle' }} />}
                        </td>

                        <td className="text-center">
                          {editingCellId === q.id ? (
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={editDegree}
                              onChange={(e) => setEditDegree(e.target.value)}
                              onBlur={() => saveDegreeEdit(q.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveDegreeEdit(q.id); }}
                              autoFocus
                              className="modern-input"
                              style={{ width: '60px', padding: '4px 8px', textAlign: 'center', fontSize: '0.9rem' }}
                            />
                          ) : (
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }} onClick={() => startEditDegree(q)}>
                              {q.degree || 1}
                            </div>
                          )}
                        </td>

                        <td className="text-center"><span className="correct-badge">{labels[q.correct_option]}</span></td>

                        <td className="text-center">
                          <div className="action-buttons">
                            <button className="btn-icon" style={{ color: q.is_active ? '#f59e0b' : '#10b981', width: '32px', height: '32px' }}
                              onClick={() => toggleQuestionActive(q.id, q.is_active)}
                              title={q.is_active ? "تعطيل السؤال" : "تفعيل السؤال"}>
                              {q.is_active ? <PowerOff size={15} /> : <Power size={15} />}
                            </button>
                            <button className="btn-icon edit" onClick={() => loadQuestionForEdit(q)} title="تعديل" style={{ width: '32px', height: '32px' }}><Edit2 size={15} /></button>
                            <button className="btn-icon delete" onClick={() => deleteQuestion(q.id)} title="حذف" style={{ width: '32px', height: '32px' }}><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-illustration"><BookOpen size={48} strokeWidth={1} /></div>
                <h3>لا توجد أسئلة يدوية حالياً</h3>
                <p>{searchTerm || subjectFilter ? "لم نعثر على نتائج مطابقة لبحثك." : "أضف سؤالك الأول باستخدام النموذج أعلاه."}</p>
              </div>
            )}
          </div>
        </section>

        {/* سجل الدفعات الجماعية مع تفاصيل الأسئلة */}
        <section className="table-card">
          <div className="card-header">
            <h2 className="card-title"><Upload size={20} className="icon-accent" /> سجل الدفعات الجماعية (الاختبارات الرسمية)</h2>
          </div>
          <div className="table-responsive">
            {uploadBatches.length > 0 ? (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>اسم الملف</th>
                    <th>المادة</th>
                    <th>عدد الأسئلة</th>
                    <th>الحالة</th>
                    <th className="text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadBatches.map((batch, idx) => (
                    <Fragment key={batch.id}>
                      <tr onClick={() => handleBatchRowClick(batch)} style={{ cursor: 'pointer', background: expandedBatchId === batch.id ? '#f8fafc' : 'transparent' }}>
                        <td>{new Date(batch.date).toLocaleDateString('ar-SA')}</td>
                        <td><span className="badge bg-slate">{batch.fileName || "ملف غير معروف"}</span></td>
                        <td>{batch.subject}</td>
                        <td className="font-bold">{batch.count}</td>
                        <td>
                          <span className={`badge ${batch.isActive ? 'active-badge' : 'inactive-badge'}`}>
                            {batch.isActive ? "نشطة" : "معطلة"}
                          </span>
                        </td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="action-buttons">
                            <button className="btn-icon" style={{ color: batch.isActive ? '#f59e0b' : '#10b981' }}
                              onClick={() => toggleBatchActive(batch.id, batch.isActive)}
                              title={batch.isActive ? "تعطيل الدفعة" : "تفعيل الدفعة"}>
                              {batch.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>
                            <button className="btn-icon delete" onClick={() => deleteBatchQuestions(batch.id, idx)} title="حذف الدفعة">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedBatchId === batch.id && (
                        <tr>
                          <td colSpan="6" style={{ padding: '0' }}>
                            <div style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '16px 24px' }}>
                              {batchLoading ? (
                                <div style={{ textAlign: 'center', padding: '16px' }}>
                                  <div className="loading-spinner"></div>
                                  <p>جاري تحميل الأسئلة...</p>
                                </div>
                              ) : (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 700, color: '#475569' }}>
                                    <span>أسئلة الدفعة ({batchQuestions.length})</span>
                                    <span>{batchQuestions.filter(q => q.is_active).length} نشط | {batchQuestions.filter(q => !q.is_active).length} معطل</span>
                                  </div>
                                  {batchQuestions.length > 0 ? (
                                    <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                      <thead>
                                        <tr>
                                          <th>نص السؤال</th>
                                          <th className="text-center">الوسائط</th>
                                          <th className="text-center">الدرجة</th>
                                          <th className="text-center">الإجابة</th>
                                          <th className="text-center">الحالة</th>
                                          <th className="text-center">إجراء</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {batchQuestions.map(q => {
                                          const labels = getQuestionOptionLabels(q);
                                          const hasImage = q.image_url ? true : false;
                                          const imagesCount = [q.image_option_a, q.image_option_b, q.image_option_c, q.image_option_d].filter(Boolean).length;
                                          return (
                                            <tr key={q.id} className={q.is_active ? '' : 'inactive-row'}>
                                              <td className="q-text-cell" title={q.question_text}>
                                                {q.question_text}
                                                {hasImage && <ImageIcon size={12} style={{ marginRight: '6px', color: '#3b82f6', verticalAlign: 'middle' }} />}
                                                {imagesCount > 0 && <List size={12} style={{ marginRight: '4px', color: '#8b5cf6', verticalAlign: 'middle' }} />}
                                              </td>
                                              <td className="text-center">
                                                <div className="media-badges">
                                                  {hasImage && <span className="media-badge blue" title="يحتوي على صورة"><ImageIcon size={14}/></span>}
                                                  {imagesCount > 0 && <span className="media-badge purple" title="صور بالخيارات"><List size={14}/></span>}
                                                  {!hasImage && imagesCount === 0 && <span className="text-muted">-</span>}
                                                </div>
                                              </td>
                                              <td className="text-center">
                                                {editingBatchCellId === q.id ? (
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={batchEditDegree}
                                                    onChange={(e) => setBatchEditDegree(e.target.value)}
                                                    onBlur={() => saveBatchDegreeEdit(q.id, batch.id)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') saveBatchDegreeEdit(q.id, batch.id); }}
                                                    autoFocus
                                                    className="modern-input"
                                                    style={{ width: '60px', padding: '4px 8px', textAlign: 'center', fontSize: '0.9rem' }}
                                                  />
                                                ) : (
                                                  <div style={{ fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }} onClick={() => startEditBatchDegree(q)}>
                                                    {q.degree || 1}
                                                  </div>
                                                )}
                                              </td>
                                              <td className="text-center"><span className="correct-badge">{labels[q.correct_option]}</span></td>
                                              <td className="text-center">
                                                <span className={`badge ${q.is_active ? 'active-badge' : 'inactive-badge'}`}>
                                                  {q.is_active ? "نشط" : "معطل"}
                                                </span>
                                              </td>
                                              <td className="text-center">
                                                <button
                                                  className="btn-icon"
                                                  style={{ color: q.is_active ? '#f59e0b' : '#10b981', width: '32px', height: '32px' }}
                                                  onClick={() => toggleBatchQuestionActive(q.id, q.is_active, batch.id)}
                                                  title={q.is_active ? "تعطيل السؤال" : "تفعيل السؤال"}
                                                >
                                                  {q.is_active ? <PowerOff size={15} /> : <Power size={15} />}
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <div className="empty-state" style={{ padding: '20px' }}>
                                      <p>لا توجد أسئلة في هذه الدفعة</p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>لا توجد دفعات مرفوعة بعد</p>
              </div>
            )}
          </div>
        </section>

      </main>

      <Footer />

      {/* Passage Modal */}
      {showPassageModal && (
        <div className="modal-backdrop" onClick={() => { setShowPassageModal(false); setEditingPassage(null); setPassageForm({ title: "", passage_text: "", subject_id: "" }); }}>
          <div className="modal-container" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #fef3c7, #ffffff)' }}>
              <h3>
                <FileText size={20} style={{ color: '#d97706' }} />
                <span style={{ color: '#0f172a' }}>
                  {editingPassage ? 'تعديل النص' : 'إدارة النصوص القرائية'}
                </span>
              </h3>
              <button className="btn-close" onClick={() => { setShowPassageModal(false); setEditingPassage(null); setPassageForm({ title: "", passage_text: "", subject_id: "" }); }}><X size={20} /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px' }}>
              <div style={{
                background: '#ffffff', borderRadius: '16px', padding: '20px', marginBottom: '24px',
                border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                  {editingPassage ? <Edit2 size={18} style={{ color: '#d97706' }} /> : <PlusCircle size={18} style={{ color: '#059669' }} />}
                  {editingPassage ? 'تعديل النص' : 'إضافة نص جديد'}
                </h4>
                <form onSubmit={handleAddPassage}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label>عنوان النص <span className="required">*</span></label>
                      <input type="text" className="modern-input" required value={passageForm.title} onChange={e => setPassageForm({...passageForm, title: e.target.value})} placeholder="Daily Routine" />
                    </div>
                    <div className="form-group">
                      <label>المادة <span className="required">*</span></label>
                      <select className="modern-input" required value={passageForm.subject_id} onChange={e => setPassageForm({...passageForm, subject_id: e.target.value})}>
                        <option value="">اختر المادة</option>
                        {passageSubjects
                          .filter(s => s.name.includes('العربية') || s.name.includes('إنجليزية'))
                          .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                        }
                      </select>
                    </div>
                  </div>
                  <div className="form-group full-width" style={{ marginBottom: '16px' }}>
                    <label>نص القطعة <span className="required">*</span></label>
                    <textarea className="modern-input textarea-input" required rows="5" value={passageForm.passage_text} onChange={e => setPassageForm({...passageForm, passage_text: e.target.value})} placeholder="أدخل النص الكامل للقطعة..." style={{ minHeight: '120px', lineHeight: '1.8' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    {editingPassage ? (
                      <>
                        <button type="button" className="btn-secondary" onClick={() => { setEditingPassage(null); setPassageForm({ title: "", passage_text: "", subject_id: "" }); }}>إلغاء</button>
                        <button type="submit" className="btn-primary" style={{ background: '#d97706' }}><Save size={18} /> تحديث النص</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn-secondary" onClick={() => { setShowPassageModal(false); setPassageForm({ title: "", passage_text: "", subject_id: "" }); }}>إلغاء</button>
                        <button type="submit" className="btn-primary"><PlusCircle size={18} /> إضافة النص</button>
                      </>
                    )}
                  </div>
                </form>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} style={{ color: '#d97706' }} />
                  النصوص الحالية
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>{passages.length}</span>
                </h4>
                <div className="search-wrapper" style={{ width: '240px' }}>
                  <Search size={16} className="search-icon" />
                  <input type="text" placeholder="ابحث عن نص..." className="search-input" style={{ width: '100%', padding: '8px 35px 8px 12px' }} value={passageSearch} onChange={(e) => setPassageSearch(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {passages.length > 0 ? (
                  passages
                    .filter(p => {
                      if (!passageSearch.trim()) return true;
                      const subjectName = subjects.find(s => s.id === p.subject_id)?.name || '';
                      return p.title.includes(passageSearch) || subjectName.includes(passageSearch);
                    })
                    .map(p => {
                      const subject = subjects.find(s => s.id === p.subject_id);
                      return (
                        <div key={p.id} style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#fcd34d'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '4px' }}>{p.title}</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{subject?.name || 'غير محدد'}</span>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.passage_text.length > 60 ? p.passage_text.substring(0, 60) + '...' : p.passage_text}</span>
                            </div>
                          </div>
                          <div className="action-buttons" style={{ gap: '4px' }}>
                            <button className="btn-icon edit" onClick={() => { setEditingPassage(p); setPassageForm({ title: p.title, passage_text: p.passage_text, subject_id: p.subject_id.toString() }); }} title="تعديل" style={{ width: '32px', height: '32px' }}><Edit2 size={16} /></button>
                            <button className="btn-icon delete" onClick={() => deletePassage(p.id)} title="حذف" style={{ width: '32px', height: '32px' }}><Trash2 size={16} /></button>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <FileText size={32} strokeWidth={1} style={{ marginBottom: '12px' }} />
                    <p>لا توجد نصوص قرائية بعد</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Modal */}
      {showBulkModal && (
        <div className="modal-backdrop" onClick={handleCancelBulk}>
          <div className="modal-container bulk-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3><Upload size={20} className="icon-accent"/> رفع مجموعة أسئلة</h3>
              <button className="btn-close" onClick={handleCancelBulk}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-group" style={{ textAlign: 'center', marginBottom: '16px' }}>
                <label style={{ marginBottom: '8px' }}>اختر المادة المستهدفة <span className="required">*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginTop: '4px' }}>
                  {subjects.map(s => (
                    <button key={s.id} type="button" onClick={() => handleSubjectSelectForBulk(s.id)}
                      style={{
                        padding: '10px 15px', borderRadius: '24px',
                        border: selectedBulkSubject == s.id ? '2px solid var(--c-primary)' : '1px solid var(--c-border)',
                        background: selectedBulkSubject == s.id ? 'var(--c-primary)' : 'var(--c-surface)',
                        color: selectedBulkSubject == s.id ? '#fff' : 'var(--c-text-body)',
                        fontWeight: selectedBulkSubject == s.id ? 700 : 500,
                        fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                        fontFamily: "'Cairo', sans-serif", lineHeight: '1.3', textAlign: 'center'
                      }}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '12px', marginBottom: '12px' }}>
                <label style={{ marginBottom: '0' }}>رفع ملف الأسئلة (Excel أو JSON) <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px', marginRight:'28%'}}>
                  <label className="btn-secondary" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <FileSpreadsheet size={16} />
                    <input type="file" accept=".xlsx,.xls" style={{ display: 'none'}} onChange={(e) => e.target.files[0] && handleBulkFileUpload(e.target.files[0])} />
                    رفع إكسل
                  </label>
                  <label className="btn-secondary" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <FileJson size={16} />
                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && handleBulkJsonUpload(e.target.files[0])} />
                    رفع JSON
                  </label>
                  <label className="btn-secondary" onClick={downloadTemplate} style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={16} /> تحميل قالب
                  </label>
                </div>
                {bulkFileName && <p style={{ marginTop: '4px', color: 'var(--c-text-muted)', fontSize: '0.85rem' }}>الملف المحدد: {bulkFileName}</p>}
              </div>

              {bulkErrors.length > 0 && (
                <div className="error-banner" style={{ marginTop: '20px' }}>
                  <AlertCircle size={18} />
                  <div>
                    <strong>أخطاء في الملف:</strong>
                    <ul style={{ margin: '8px 0 0 20px' }}>
                      {bulkErrors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                      {bulkErrors.length > 5 && <li>... و {bulkErrors.length - 5} أخطاء أخرى</li>}
                    </ul>
                  </div>
                </div>
              )}

              {showBulkPreview && bulkPreview.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '0.95rem' }}>معاينة {bulkPreview.length} سؤال</h4>
                  <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'auto', scrollbarWidth: 'thin' }}>
                    <table className="modern-table" style={{ minWidth: '700px', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>النص</th>
                          <th>الخيارات</th>
                          <th>الإجابة</th>
                          <th>الوحدة</th>
                          <th>الفرع</th>
                          <th>الدرجة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.slice(0, 10).map((q, idx) => {
                          const optionLabels = isEnglishBulk ? ["A", "B", "C", "D"] : ["أ", "ب", "ج", "د"];
                          const optionsText = q.options.map((opt, i) => `${optionLabels[i]}) ${opt}`).join('، ');
                          return (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td className="q-text-cell" style={{ maxWidth: '180px' }}>{q.question_text}</td>
                              <td style={{ maxWidth: '220px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3' }}>{optionsText}</td>
                              <td style={{ fontWeight: 'bold' }}>{getCorrectOptionLetter(q.correct_option, isEnglishBulk)}</td>
                              <td>{q.unit_number || '—'}</td>
                              <td>{q.branch || 'عام'}</td>
                              <td>{q.degree}</td>
                            </tr>
                          );
                        })}
                        {bulkPreview.length > 10 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', fontStyle: 'italic' }}>
                              ... بالإضافة إلى {bulkPreview.length - 10} أسئلة أخرى
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="modal-footer" style={{ padding: '0', marginTop: '20px', border: 'none', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn-secondary" onClick={handleCancelBulk}>إلغاء</button>
                <button className="btn-primary" onClick={handleBulkSubmit} disabled={bulkUploading || bulkPreview.length === 0 || !selectedBulkSubject}>
                  <UploadCloud size={18} /> {bulkUploading ? "جاري الرفع..." : `رفع ${bulkPreview.length} سؤال`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)', padding: '20px' }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1e293b', fontWeight: 800 }}>إعدادات المواد</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>خصص الوقت وعدد الأسئلة لكل مادة دراسية</p>
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', cursor: 'pointer', color: '#94a3b8', padding: '10px', borderRadius: '12px', display: 'flex' }}><X size={20} /></button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '0 32px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', marginTop: '24px', marginBottom: '32px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: 'black', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>تطبيق سريع</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" id="all-duration" defaultValue="60" style={{ width: '75px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }} placeholder="دقيقة" />
                    <input type="number" id="all-questions" defaultValue="40" style={{ width: '75px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }} placeholder="سؤال" />
                  </div>
                  <button style={{ background: '#1e293b', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                    onClick={() => {
                      const dur = parseInt(document.getElementById('all-duration')?.value);
                      const que = parseInt(document.getElementById('all-questions')?.value);
                      if (isNaN(dur) || isNaN(que)) { toast.error('أدخل قيماً صحيحة'); return; }
                      const newDurations = {}, newCounts = {};
                      subjects.forEach(s => { newDurations[s.id] = dur; newCounts[s.id] = que; });
                      setEditingDurations(newDurations);
                      setEditingQuestionsCount(newCounts);
                      toast.success('تم التحديث للكل');
                    }}>تطبيق على الكل</button>
                </div>
                <button onClick={async () => {
                    const confirmed = await showConfirm({ title: 'إعادة ضبط', message: 'هل تريد إعادة تعيين الكل؟', confirmText: 'نعم', cancelText: 'إلغاء' });
                    if (!confirmed) return;
                    const defaultsDurations = {}, defaultsCounts = {};
                    subjects.forEach(s => { defaultsDurations[s.id] = 60; defaultsCounts[s.id] = 40; });
                    setEditingDurations(defaultsDurations);
                    setEditingQuestionsCount(defaultsCounts);
                  }} style={{ background: 'white', color: '#ef4444', border: '1px solid #fee2e2', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>إعادة تعيين</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '30px' }}>
                {subjects.map((subject) => {
                  const duration = editingDurations[subject.id] || 60;
                  const questions = editingQuestionsCount[subject.id] || 40;
                  return (
                    <div key={subject.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: '#ffffff', borderRadius: '14px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                      <div style={{ flex: '1', minWidth: '150px' }}>
                        <div style={{ fontWeight: 700, color: '#334155', fontSize: '1rem' }}>{subject.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{subject.branch || 'عام'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', width: '60px' }}>المدة</span>
                          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
                            <button onClick={() => handleSubjectDurationChange(subject.id, Math.max(1, duration - 1))} style={{ width: '28px', height: '28px', border: 'none', background: 'white', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>−</button>
                            <span style={{ width: '45px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{duration}</span>
                            <button onClick={() => handleSubjectDurationChange(subject.id, Math.min(180, duration + 1))} style={{ width: '28px', height: '28px', border: 'none', background: 'white', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>+</button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', width: '60px' }}>الأسئلة</span>
                          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
                            <button onClick={() => handleSubjectQuestionsCountChange(subject.id, Math.max(1, questions - 1))} style={{ width: '28px', height: '28px', border: 'none', background: 'white', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>−</button>
                            <span style={{ width: '45px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{questions}</span>
                            <button onClick={() => handleSubjectQuestionsCountChange(subject.id, Math.min(100, questions + 1))} style={{ width: '28px', height: '28px', border: 'none', background: 'white', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '24px 32px', borderTop: '1px solid #f1f5f9', background: '#ffffff', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowSettingsModal(false)} style={{ padding: '12px 24px', borderRadius: '12px', background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>تجاهل</button>
              <button onClick={handleSaveAllSettings} disabled={savingSettings} style={{ padding: '12px 32px', borderRadius: '12px', background: '#3b82f6', border: 'none', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}>
                <Save size={18} /> {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} confirmText={confirmState.confirmText} cancelText={confirmState.cancelText} onConfirm={handleConfirm} onCancel={handleCancel} />

      {/* ================= STYLES ================= */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        
        :root { 
          --c-primary: #3b82f6;
          --c-primary-hover: #2563eb;
          --c-primary-light: #eff6ff;
          --c-secondary: #f1f5f9;
          --c-secondary-hover: #e2e8f0;
          --c-danger: #ef4444;
          --c-danger-light: #fef2f2;
          --c-danger-hover: #fee2e2;
          --c-success: #10b981;
          --c-success-light: #dcfce7;
          --c-accent: #8b5cf6;
          --c-warning: #f59e0b;
          --c-warning-light: #fffbeb;
          
          --c-bg: #f4f7fe;
          --c-surface: #ffffff;
          --c-text-main: #0f172a;
          --c-text-body: #334155;
          --c-text-muted: #64748b;
          --c-border: #e2e8f0;
          --c-border-focus: #93c5fd;

          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05);
          --shadow-float: 0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05);
          
          --radius-md: 8px;
          --radius-lg: 12px;
          --radius-xl: 16px;
          --radius-2xl: 24px;
        }

        * { box-sizing: border-box; margin: 0; }
        body { margin: 0; background-color: var(--c-bg); font-family: 'Cairo', sans-serif; color: var(--c-text-body); -webkit-font-smoothing: antialiased; }
        .teacher-container { direction: rtl; min-height: 100vh; display: flex; flex-direction: column; }
        .teacher-main { flex: 1; width: 100%; max-width: 1280px; margin: 0 auto; padding: 32px 24px; }
        .page-title { font-size: 2.25rem; font-weight: 800; color: var(--c-text-main); line-height: 1.2; margin-bottom: 8px; letter-spacing: -0.02em; }
        .page-subtitle { font-size: 1.05rem; color: var(--c-text-muted); font-weight: 500; }
        .section-title { display: flex; align-items: center; gap: 8px; font-size: 1.15rem; color: var(--c-text-main); margin-bottom: 20px; font-weight: 700; border-bottom: 2px solid var(--c-secondary); padding-bottom: 12px; }
        .icon-accent { color: var(--c-primary); }
        .text-muted { color: var(--c-text-muted); }
        .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
        .header-actions { display: flex; gap: 12px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 40px; }
        .stat-card { background: var(--c-surface); border-radius: var(--radius-xl); padding: 24px; display: flex; align-items: center; gap: 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--c-border); transition: all 0.3s ease; }
        .stat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--c-primary-light); }
        .stat-icon-wrapper { width: 56px; height: 56px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .stat-icon-wrapper.blue { background: linear-gradient(135deg, #60a5fa, #2563eb); }
        .stat-icon-wrapper.purple { background: linear-gradient(135deg, #a78bfa, #7c3aed); }
        .stat-icon-wrapper.green { background: linear-gradient(135deg, #34d399, #059669); }
        .stat-label { font-size: 0.95rem; font-weight: 600; color: var(--c-text-muted); display: block; margin-bottom: 4px; }
        .stat-number { font-size: 2.25rem; font-weight: 800; color: var(--c-text-main); line-height: 1; }
        .form-card, .table-card { background: var(--c-surface); border-radius: var(--radius-2xl); box-shadow: var(--shadow-md); margin-bottom: 40px; overflow: hidden; border: 1px solid rgba(226, 232, 240, 0.8); }
        .card-header { padding: 24px 32px; border-bottom: 1px solid var(--c-border); display: flex; justify-content: space-between; align-items: center; background: #fafafa; }
        .card-title { margin: 0; font-size: 1.25rem; color: var(--c-text-main); display: flex; align-items: center; gap: 12px; font-weight: 700; }
        .question-form { padding: 0; }
        .form-section { padding: 32px; transition: background 0.2s; }
        .form-section.alt-bg { background-color: #f8fafc; border-top: 1px solid var(--c-border); }
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .options-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px; }
        .full-width { grid-column: 1 / -1; }
        .form-group label { display: block; font-weight: 600; color: var(--c-text-main); margin-bottom: 8px; font-size: 0.95rem; }
        .sub-label { font-size: 0.85rem !important; color: var(--c-text-muted) !important; font-weight: 500 !important; }
        .hint-text { font-weight: normal; color: var(--c-text-muted); font-size: 0.85em; }
        .required { color: var(--c-danger); }
        .modern-input { width: 100%; padding: 14px 16px; border: 1px solid var(--c-border); border-radius: var(--radius-lg); font-family: 'Cairo', sans-serif; font-size: 1rem; color: var(--c-text-main); background: var(--c-surface); transition: all 0.2s ease; }
        .modern-input::placeholder { color: #94a3b8; }
        .modern-input:hover { border-color: #cbd5e1; }
        .modern-input:focus { outline: none; border-color: var(--c-primary); box-shadow: 0 0 0 4px var(--c-primary-light); background: var(--c-surface); }
        .textarea-input { min-height: 120px; resize: vertical; line-height: 1.6; }
        .upload-label-large { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: var(--radius-lg); cursor: pointer; transition: all 0.2s ease; gap: 12px; }
        .upload-label-large:hover { background: var(--c-primary-light); border-color: var(--c-primary); }
        .upload-icon { color: #94a3b8; transition: color 0.2s; }
        .upload-label-large:hover .upload-icon { color: var(--c-primary); }
        .upload-text { font-weight: 700; color: var(--c-text-main); font-size: 1.1rem; }
        .upload-hint { font-size: 0.9rem; color: var(--c-text-muted); }
        .upload-btn-outline { display: inline-flex; align-items: center; gap: 8px; background: var(--c-surface); border: 1px dashed #cbd5e1; color: var(--c-text-muted); padding: 8px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 0.9rem; transition: 0.2s; font-weight: 600; }
        .upload-btn-outline:hover { background: #f8fafc; border-color: var(--c-primary); color: var(--c-primary); }
        .image-preview { position: relative; display: inline-block; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--c-border); background: #f1f5f9; }
        .image-preview img { display: block; max-width: 100%; height: auto; object-fit: contain; }
        .large-preview img { max-height: 200px; width: auto; }
        .remove-img-btn { position: absolute; top: 8px; right: 8px; background: var(--c-danger); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-md); transition: 0.2s; }
        .remove-img-btn:hover { background: #dc2626; transform: scale(1.1); }
        .correct-answer-selector { display: flex; gap: 16px; flex-wrap: wrap; }
        .radio-label { flex: 1; min-width: 120px; text-align: center; padding: 14px 16px; border: 2px solid var(--c-border); border-radius: var(--radius-lg); cursor: pointer; font-weight: 700; color: var(--c-text-muted); transition: all 0.2s ease; background: var(--c-surface); }
        .radio-label:hover { border-color: #cbd5e1; background: #f8fafc; }
        .radio-label.selected { border-color: var(--c-success); background: var(--c-success-light); color: #16a34a; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.15); }
        .hidden-radio { display: none; }
        .hidden-input { display: none; }
        .btn-primary, .btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border-radius: var(--radius-lg); font-family: 'Cairo', sans-serif; font-weight: 700; font-size: 1rem; cursor: pointer; border: none; transition: all 0.2s ease; }
        .btn-primary { background: var(--c-primary); color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .btn-primary:hover:not(:disabled) { background: var(--c-primary-hover); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4); }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { background: #94a3b8; cursor: not-allowed; box-shadow: none; opacity: 0.7; }
        .btn-secondary { background: var(--c-surface); color: var(--c-text-body); border: 1px solid var(--c-border); box-shadow: var(--shadow-sm); }
        .btn-secondary:hover { background: var(--c-secondary); border-color: #cbd5e1; color: var(--c-text-main); }
        .btn-text { background: none; border: none; color: var(--c-text-muted); display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-family: 'Cairo'; font-weight: 600; font-size: 0.95rem; padding: 8px 12px; border-radius: var(--radius-md); transition: 0.2s; }
        .btn-text:hover { color: var(--c-danger); background: var(--c-danger-light); }
        .form-actions { display: flex; padding: 24px 32px; background: var(--c-surface); border-top: 1px solid var(--c-border); }
        .large-btn { padding: 16px 32px; font-size: 1.1rem; width: 100%; max-width: 300px; margin: 0 auto; }
        .table-responsive { width: 100%; overflow-x: auto; }
        .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 800px; text-align: right; }
        .modern-table th { background: #f8fafc; padding: 16px 24px; color: var(--c-text-muted); font-weight: 700; font-size: 0.9rem; border-bottom: 2px solid var(--c-border); text-transform: uppercase; letter-spacing: 0.05em; text-align: center;}
        .modern-table td { padding: 16px 24px; border-bottom: 1px solid var(--c-secondary); color: var(--c-text-body); vertical-align: middle; transition: background 0.2s; font-size: 0.95rem; text-align: center;}
        .modern-table tbody tr:hover td { background: #f8fafc; }
        .modern-table tbody tr:last-child td { border-bottom: none; }
        .inactive-row { opacity: 0.6; filter: grayscale(1); }
        .q-text-cell { max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; color: var(--c-text-main); }
        .text-center { text-align: center !important; }
        .font-bold { font-weight: 700; }
        .badge { padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; display: inline-block; }
        .bg-slate { background: var(--c-secondary); color: var(--c-text-body); }
        .bg-light { background: #f8fafc; border: 1px solid var(--c-border); color: var(--c-text-muted); }
        .active-badge { color: #16a34a; }
        .inactive-badge { background: var(--c-danger-light); color: #991b1b; border: 1px solid #fecaca; }
        .correct-badge { display: inline-flex; align-items: center; justify-content: center; background: var(--c-success-light); color: #16a34a; width: 32px; height: 32px; border-radius: 10px; font-weight: 800; font-size: 1rem; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.1); }
        .media-badges { display: flex; gap: 8px; justify-content: center; }
        .media-badge { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; }
        .media-badge.blue { background: var(--c-primary-light); color: var(--c-primary); }
        .media-badge.purple { background: #f3e8ff; color: var(--c-accent); }
        .action-buttons { display: flex; gap: 8px; justify-content: center; }
        .btn-icon { width: 36px; height: 36px; border-radius: 10px; border: none; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; background: transparent; }
        .btn-icon.edit { color: var(--c-primary); }
        .btn-icon.edit:hover { background: var(--c-primary-light); }
        .btn-icon.delete { color: var(--c-danger); }
        .btn-icon.delete:hover { background: var(--c-danger-light); }
        .card-header-actions { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .badge-count { background: var(--c-primary-light); color: var(--c-primary); padding: 6px 16px; border-radius: 20px; font-size: 0.9rem; font-weight: 700; }
        .search-wrapper { position: relative; }
        .search-icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .search-input { padding: 10px 40px 10px 16px; border: 1px solid var(--c-border); border-radius: 30px; font-family: 'Cairo'; font-size: 0.95rem; background: #f8fafc; width: 260px; transition: all 0.2s ease; }
        .search-input:focus { outline: none; border-color: var(--c-primary); background: var(--c-surface); box-shadow: 0 0 0 3px var(--c-primary-light); width: 280px; }
        .empty-state { padding: 80px 20px; text-align: center; color: var(--c-text-muted); }
        .empty-illustration { display: inline-flex; align-items: center; justify-content: center; width: 100px; height: 100px; border-radius: 50%; background: var(--c-secondary); color: #cbd5e1; margin-bottom: 24px; }
        .empty-state h3 { color: var(--c-text-main); margin: 0 0 12px 0; font-size: 1.25rem; font-weight: 700; }
        .loading-spinner { width: 40px; height: 40px; border: 4px solid var(--c-secondary); border-top-color: var(--c-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-banner { background: var(--c-danger-light); border: 1px solid #fecaca; color: #dc2626; padding: 16px 24px; border-radius: var(--radius-lg); margin-bottom: 30px; display: flex; align-items: flex-start; gap: 12px; font-weight: 600; box-shadow: var(--shadow-sm); }
        .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; animation: fadeIn 0.2s ease; }
        .modal-container { background: var(--c-surface); border-radius: var(--radius-2xl); width: 100%; max-width: 700px; max-height: 95vh; display: flex; flex-direction: column; box-shadow: var(--shadow-float); overflow: visible; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .bulk-modal { max-width: 900px; max-height: 95vh; }
        .settings-modal { max-width: 800px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; border-bottom: 1px solid var(--c-border); background: #fafafa; overflow: hidden;}
        .modal-header h3 { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--c-text-main); }
        .btn-close { background: var(--c-secondary); border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--c-text-muted); transition: 0.2s; }
        .btn-close:hover { background: var(--c-danger-light); color: var(--c-danger); transform: rotate(90deg); }
        .modal-body {  padding: 20px; overflow-y: auto; flex: 1; max-height: 60vh;}
        .modal-body.no-padding { padding: 0; }
        .modal-footer { padding: 24px 32px; border-top: 1px solid var(--c-border); display: flex; justify-content: flex-end; gap: 16px; background: #fafafa; overflow: hidden;}
        .settings-table-wrapper { padding: 0; }
        .settings-table { min-width: 100%; border-collapse: collapse; }
        .settings-table th, .settings-table td { padding: 14px 24px; }
        .settings-table th { background: #f8fafc; font-weight: 700; color: var(--c-text-muted); border-bottom: 2px solid var(--c-border); text-transform: uppercase; }
        .settings-table td { border-bottom: 1px solid var(--c-secondary); }
        .settings-table tbody tr:last-child td { border-bottom: none; }
        .settings-input { width: 100px; padding: 10px 8px; border: 1px solid var(--c-border); border-radius: var(--radius-md); font-family: 'Cairo'; text-align: center; font-weight: 700; font-size: 1rem; color: var(--c-text-main); background: var(--c-surface); transition: 0.2s; }
        .settings-input:focus { outline: none; border-color: var(--c-primary); box-shadow: 0 0 0 3px var(--c-primary-light); }
        .settings-input:hover { border-color: #cbd5e1; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (max-width: 1024px) { .form-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px) {
          .teacher-main { padding: 20px 16px; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 20px; margin-bottom: 24px; }
          .header-actions { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .header-actions button { width: 100%; justify-content: center; font-size: 0.85rem; padding: 10px; }
          .card-header { flex-direction: column; align-items: flex-start; gap: 16px; padding: 20px; }
          .card-header-actions { width: 100%; flex-direction: column; align-items: stretch; gap: 12px; }
          .search-input { width: 100%; }
          .search-input:focus { width: 100%; }
          .options-grid { grid-template-columns: 1fr; }
          .correct-answer-selector { flex-direction: column; gap: 10px; }
          .form-section, .modal-body, .modal-header, .modal-footer { padding: 20px; }
          .settings-input { width: 80px; }
        }
      `}</style>
    </div>
  );
}