import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PlusCircle, Trash2, BookOpen, Edit2, X, UploadCloud, CheckCircle2, FileText, Upload, Download, FileSpreadsheet, FileJson, AlertCircle, Search, Image as ImageIcon } from "lucide-react";
import * as XLSX from 'xlsx';
import Footer from './Footer';

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// دوال تحويل الإجابة الصحيحة للرفع الجماعي
const mapCorrectOption = (value, isEnglish = false) => {
  if (value === undefined || value === '') return null;
  if (!isNaN(value) && [0,1,2,3].includes(Number(value))) return Number(value);
  const str = String(value).trim().toLowerCase();
  const englishMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
  const arabicMap = { 'أ': 0, 'ا': 0, 'ب': 1, 'ج': 2, 'د': 3 };
  if (englishMap[str] !== undefined) return englishMap[str];
  if (arabicMap[str] !== undefined) return arabicMap[str];
  return null;
};

const getCorrectOptionLetter = (correctNumber, isEnglish) => {
  const englishLetters = ['A', 'B', 'C', 'D'];
  const arabicLetters = ['أ', 'ب', 'ج', 'د'];
  const letters = isEnglish ? englishLetters : arabicLetters;
  return letters[correctNumber] || '?';
};

// الكلمات المفتاحية للمواد المسموح لها برفع صور للخيارات
const ALLOW_IMAGE_OPTIONS_KEYWORDS = ['رياضيات', 'جغرافيا', 'تكنولوجيا المعلومات', 'تقنية معلومات'];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [passages, setPassages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ totalQuestions: 0, totalPassages: 0 });

  // Bulk upload states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkFileName, setBulkFileName] = useState('');
  
  // Passage modal states
  const [showPassageModal, setShowPassageModal] = useState(false);
  const [editingPassage, setEditingPassage] = useState(null);
  const [passageForm, setPassageForm] = useState({ title: '', passage_text: '', subject_id: '' });

  // Upload batches management (localStorage)
  const [uploadBatches, setUploadBatches] = useState([]);

  const [formData, setFormData] = useState({
    subject_id: '',
    question_text: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correct_option: 0,
    image_url: '',
    passage_id: '',
    imageA: '',
    imageB: '',
    imageC: '',
    imageD: ''
  });

  useEffect(() => {
    loadUploadBatches();
    fetchTeacherProfile();
    fetchSubjects();
    fetchQuestions();
    fetchPassages();
  }, []);

  useEffect(() => {
    setStats({
      totalQuestions: questions.length,
      totalPassages: passages.length
    });
  }, [questions, passages]);

  const loadUploadBatches = () => {
    const saved = localStorage.getItem('teacher_upload_batches');
    if (saved) setUploadBatches(JSON.parse(saved));
  };

  const saveUploadBatches = (batches) => {
    localStorage.setItem('teacher_upload_batches', JSON.stringify(batches));
    setUploadBatches(batches);
  };

  const fetchTeacherProfile = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', currentUser.id).single();
      setTeacherProfile(profile);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase.from('subjects').select('id, name').order('name');
      if (!error) setSubjects(data || []);
    } catch (err) { console.error(err); }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { navigate('/login'); return; }
      
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      
      if (questionsError) throw questionsError;
      if (!questionsData || questionsData.length === 0) { setQuestions([]); return; }
      
      const subjectIds = [...new Set(questionsData.map(q => q.subject_id).filter(id => id))];
      let subjectsMap = new Map();
      if (subjectIds.length > 0) {
        const { data: subjectsData } = await supabase.from('subjects').select('id, name').in('id', subjectIds);
        if (subjectsData) subjectsData.forEach(subject => subjectsMap.set(subject.id, subject));
      }
      
      const formattedQuestions = questionsData.map(question => ({
        ...question,
        subjects: subjectsMap.get(question.subject_id) || { name: 'غير محدد' }
      }));
      setQuestions(formattedQuestions);
    } catch (err) {
      setFetchError('حدث خطأ في جلب الأسئلة');
      setQuestions([]);
    } finally { setLoading(false); }
  };

  const fetchPassages = async () => {
    const { data, error } = await supabase.from('passages').select('*').order('created_at', { ascending: true });
    if (!error) setPassages(data || []);
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const { error } = await supabase.storage.from('question-images').upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('question-images').getPublicUrl(fileName);
    return publicUrl;
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      
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
      };
      
      const { error } = await supabase.from('questions').insert([newQuestion]);
      if (error) throw error;
      alert('تم إضافة السؤال بنجاح!');
      resetForm();
      await fetchQuestions();
    } catch (error) {
      alert('خطأ في الإضافة: ' + error.message);
    } finally { setLoading(false); }
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
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
      };
      const { error } = await supabase.from('questions').update(updatedQuestion).eq('id', editingId);
      if (error) throw error;
      alert('تم تعديل السؤال بنجاح!');
      resetForm();
      await fetchQuestions();
    } catch (error) {
      alert('خطأ في التعديل: ' + error.message);
    } finally { setLoading(false); }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      if (editingId === id) resetForm();
      await fetchQuestions();
    } catch (error) { alert("خطأ أثناء الحذف: " + error.message); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const loadQuestionForEdit = (question) => {
    const options = question.options || ['', '', '', ''];
    setFormData({
      subject_id: question.subject_id || '',
      question_text: question.question_text || '',
      optionA: options[0] || '',
      optionB: options[1] || '',
      optionC: options[2] || '',
      optionD: options[3] || '',
      correct_option: question.correct_option || 0,
      image_url: question.image_url || '',
      passage_id: question.passage_id || '',
      imageA: question.image_option_a || '',
      imageB: question.image_option_b || '',
      imageC: question.image_option_c || '',
      imageD: question.image_option_d || '',
    });
    setIsEditing(true);
    setEditingId(question.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({ 
      subject_id: '', question_text: '', optionA: '', optionB: '', optionC: '', optionD: '', correct_option: 0,
      image_url: '', passage_id: '', imageA: '', imageB: '', imageC: '', imageD: ''
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleAddPassage = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newPassage = { ...passageForm, subject_id: parseInt(passageForm.subject_id) };
    if (editingPassage) {
      await supabase.from('passages').update(newPassage).eq('id', editingPassage.id);
    } else {
      await supabase.from('passages').insert([newPassage]);
    }
    fetchPassages();
    setShowPassageModal(false);
    setEditingPassage(null);
    setPassageForm({ title: '', passage_text: '', subject_id: '' });
  };

  const deletePassage = async (id) => {
    if (confirm('حذف النص سيؤدي إلى فصل الأسئلة المرتبطة به. هل أنت متأكد؟')) {
      await supabase.from('passages').delete().eq('id', id);
      fetchPassages();
    }
  };

  // رفع جماعي
  const handleBulkFileUpload = (file) => {
  setBulkFileName(file.name);
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const mappedRows = rows.map(row => ({
      question_text: row['السؤال'] || row['Question'] || row['question_text'] || '',
      optionA: row['الخيار أ'] || row['Option A'] || row['optionA'] || '',
      optionB: row['الخيار ب'] || row['Option B'] || row['optionB'] || '',
      optionC: row['الخيار ج'] || row['Option C'] || row['optionC'] || '',
      optionD: row['الخيار د'] || row['Option D'] || row['optionD'] || '',
      correct_option: row['الإجابة الصحيحة'] || row['Correct Answer'] || row['correct_option'] || '',
      'المادة': row['المادة'] || row['Subject'] || row['اسم المادة'] || row['subject_id'] || '',
    }));
    setBulkData(mappedRows);
    await validateBulkData(mappedRows);
  };
  reader.readAsArrayBuffer(file);
};

  const handleBulkJsonUpload = (file) => {
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = JSON.parse(e.target.result);
        setBulkData(rows);
        validateBulkData(rows);
      } catch (err) { setBulkErrors(['الملف JSON غير صالح']); }
    };
    reader.readAsText(file);
  };

  // ✅ الدالة المعدلة لتدعم المادة بـ contains والإجابة الصحيحة كنص كامل
const validateBulkData = async (rows) => {
  const errors = [];
  const validRows = [];
  const { data: subjectsData } = await supabase.from('subjects').select('id, name');
  const subjectsMap = new Map();
  const subjectsIdMap = new Map();

  const subjectAliases = {
    'لغة إنجليزية': ['english', 'إنجليزية', 'انجليزي', 'english language', 'لغة انجليزية'],
    'رياضيات': ['math', 'mathematics', 'رياضة', 'رياضيات'],
    'جغرافيا': ['geography', 'جغرافية', 'geographia'],
    'تكنولوجيا المعلومات': ['it', 'information technology', 'تقنية معلومات', 'ict']
  };

  subjectsData?.forEach(s => {
    subjectsMap.set(s.name, s.id);
    subjectsIdMap.set(s.id, s.name);
  });

  const findSubjectId = (inputValue) => {
    if (!inputValue) return null;
    const normalized = inputValue.trim().toLowerCase();
    for (let [name, id] of subjectsMap.entries()) {
      if (name === inputValue || name.toLowerCase() === normalized) return id;
    }
    for (let [subjectName, aliases] of Object.entries(subjectAliases)) {
      if (aliases.some(alias => normalized === alias || normalized.includes(alias) || alias.includes(normalized))) {
        return subjectsMap.get(subjectName);
      }
    }
    const matchedSubject = subjectsData?.find(s => 
      s.name.toLowerCase().includes(normalized) || normalized.includes(s.name.toLowerCase())
    );
    return matchedSubject ? matchedSubject.id : null;
  };

  for (const [idx, row] of rows.entries()) {
    const rowErrors = [];
    let subjectId = null, subjectName = null;

    if (!row.question_text?.trim()) rowErrors.push(`السؤال ${idx+1}: نص السؤال مطلوب`);
    if (!row.optionA?.trim()) rowErrors.push(`السؤال ${idx+1}: الخيار أ مطلوب`);
    if (!row.optionB?.trim()) rowErrors.push(`السؤال ${idx+1}: الخيار ب مطلوب`);
    if (!row.optionC?.trim()) rowErrors.push(`السؤال ${idx+1}: الخيار ج مطلوب`);
    if (!row.optionD?.trim()) rowErrors.push(`السؤال ${idx+1}: الخيار د مطلوب`);

    let subjectValue = row['المادة'] || '';
    if (!subjectValue) {
      rowErrors.push(`السؤال ${idx+1}: المادة مطلوبة`);
    } else {
      subjectId = findSubjectId(subjectValue);
      if (!subjectId) {
        rowErrors.push(`السؤال ${idx+1}: المادة "${subjectValue}" غير موجودة. تأكد من كتابة الاسم بشكل صحيح (مثال: لغة إنجليزية، رياضيات، ...)`);
      } else {
        subjectName = subjectsIdMap.get(subjectId);
      }
    }

    let correctNumber = null;
    const correctValue = row.correct_option?.toString().trim();
    if (!correctValue) {
      rowErrors.push(`السؤال ${idx+1}: الإجابة الصحيحة مطلوبة`);
    } else {
      const isEnglish = subjectName?.includes('إنجليزية') || false;
      let num = mapCorrectOption(correctValue, isEnglish);
      if (num !== null) {
        correctNumber = num;
      } else {
        const options = [row.optionA, row.optionB, row.optionC, row.optionD];
        const matchedIndex = options.findIndex(opt => opt?.trim().toLowerCase() === correctValue.toLowerCase());
        if (matchedIndex !== -1) {
          correctNumber = matchedIndex;
        } else {
          rowErrors.push(`السؤال ${idx+1}: قيمة الإجابة الصحيحة غير صالحة ("${correctValue}"). استخدم الحرف (A,B,C,D أو أ,ب,ج,د) أو الرقم (0-3) أو اكتب النص مطابقاً لأحد الخيارات.`);
        }
      }
    }

    if (rowErrors.length === 0) {
      const isEnglish = subjectName?.includes('إنجليزية') || false;
      validRows.push({
        question_text: row.question_text,
        optionA: row.optionA,
        optionB: row.optionB,
        optionC: row.optionC,
        optionD: row.optionD,
        correct_option: correctNumber,
        correct_option_letter: getCorrectOptionLetter(correctNumber, isEnglish),
        subject_id: subjectId,
        subject_name: subjectName
      });
    } else {
      errors.push(...rowErrors);
    }
  }

  setBulkErrors(errors);
  setBulkPreview(validRows);
};  // ← هنا تنتهي الدالة، لا يوجد شيء بعدها

  const handleBulkSubmit = async () => {
    if (bulkPreview.length === 0) { alert('لا توجد بيانات صالحة للرفع'); return; }
    setBulkUploading(true);
    let success = 0, fail = 0;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }
    const batchId = Date.now().toString();
    for (const q of bulkPreview) {
      try {
        const newQuestion = {
          teacher_id: user.id, subject_id: q.subject_id, question_text: q.question_text,
          options: [q.optionA, q.optionB, q.optionC, q.optionD], correct_option: q.correct_option,
          image_url: null, passage_id: null, created_at: new Date(), bulk_batch_id: batchId,
          image_option_a: null, image_option_b: null, image_option_c: null, image_option_d: null,
        };
        const { error } = await supabase.from('questions').insert([newQuestion]);
        if (error) throw error;
        success++;
      } catch (err) { fail++; console.error(err); }
    }
    if (fail > 0) setBulkErrors([`تم رفع ${success} سؤال، فشل رفع ${fail} سؤالاً`]);
    else {
      const newBatch = { batchId, date: new Date().toLocaleString(), count: success, fileName: bulkFileName || 'رفع يدوي' };
      saveUploadBatches([newBatch, ...uploadBatches]);
      setShowBulkModal(false);
      resetBulkState();
      await fetchQuestions();
      alert(`✅ تم رفع ${success} سؤالاً بنجاح!`);
    }
    setBulkUploading(false);
  };

  const resetBulkState = () => {
    setBulkData([]); setBulkPreview([]); setBulkErrors([]); setBulkFileName('');
  };

  const deleteBatchQuestions = async (batchId, batchIndex) => {
    if (!window.confirm(`⚠️ هل أنت متأكد من حذف جميع أسئلة الدفعة التي تم رفعها في ${uploadBatches[batchIndex].date}؟`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('questions').delete().eq('bulk_batch_id', batchId);
      if (error) throw error;
      const newBatches = uploadBatches.filter((_, idx) => idx !== batchIndex);
      saveUploadBatches(newBatches);
      alert('✅ تم حذف جميع أسئلة هذه الدفعة بنجاح');
      await fetchQuestions();
    } catch (error) { alert('❌ خطأ أثناء الحذف: ' + error.message); }
    finally { setLoading(false); }
  };

  const downloadTemplate = () => {
    const template = [{
      'السؤال': 'مثال: ما هي عاصمة مصر؟',
      'الخيار أ': 'القاهرة', 'الخيار ب': 'الإسكندرية', 'الخيار ج': 'الجيزة', 'الخيار د': 'شرم الشيخ',
      'الإجابة الصحيحة': 'A', 'المادة': 'الرياضيات'
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الأسئلة');
    XLSX.writeFile(wb, 'نموذج_رفع_الأسئلة.xlsx');
  };

  const displayName = teacherProfile?.name || 'معلم';
  const filteredQuestions = questions.filter(q => q.question_text?.includes(searchTerm) || q.subjects?.name?.includes(searchTerm));

  const isEnglishSubject = () => {
    if (!formData.subject_id) return false;
    const subject = subjects.find(s => s.id == formData.subject_id);
    return subject?.name?.includes('إنجليزية') || false;
  };

  const allowImageOptions = () => {
    if (!formData.subject_id) return false;
    const subject = subjects.find(s => s.id == formData.subject_id);
    if (!subject) return false;
    const subjectName = subject.name;
    return ALLOW_IMAGE_OPTIONS_KEYWORDS.some(keyword => subjectName.includes(keyword));
  };

  const getOptionLabels = () => isEnglishSubject() ? ['A', 'B', 'C', 'D'] : ['أ', 'ب', 'ج', 'د'];
  const getQuestionOptionLabels = (question) => {
    const subject = subjects.find(s => s.id === question.subject_id);
    const isEnglish = subject?.name?.includes('إنجليزية') || false;
    return isEnglish ? ['A', 'B', 'C', 'D'] : ['أ', 'ب', 'ج', 'د'];
  };
  const optionLabels = getOptionLabels();

  const ImageUploadField = ({ label, imageUrl, onImageChange, onRemove, inputId }) => (
    <div className="form-group" style={{ marginTop: '8px' }}>
      <label style={{ fontSize: '0.85rem', color: '#64748b' }}>{label} (اختياري)</label>
      <div className="upload-box">
        <input type="file" accept="image/*" id={inputId} style={{ display: 'none' }} onChange={onImageChange} />
        <label htmlFor={inputId} className="upload-label-small">
          <UploadCloud size={18} /> رفع صورة
        </label>
        {imageUrl && (
          <div className="image-preview">
            <img src={imageUrl} alt="preview" />
            <button type="button" onClick={onRemove}>✖</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="teacher-container">
      <header className="dashboard-header">
        <button onClick={handleLogout} className="logout-button"><span>خروج</span><span className="logout-icon"><LogoutIcon/></span></button>
        <div className="logo-section">
          <div className="logo-wrapper-dash"><img src="https://i.imgur.com/p1hg12H.png" alt="شعار المركز" className="logo-img-dash"/></div>
          <span className="logo-text-dash">مركز النخبة التعليمي</span>
        </div>
        <div className="user-section">
          <div className="user-info"><span className="user-name">{displayName}</span><img src={`https://api.dicebear.com/7.x/avataaars-neutral/svg?seed=${displayName}`} alt="Avatar" className="user-avatar"/></div>
        </div>
      </header>

      <main className="teacher-main">
        <div className="page-header">
          <div><h1 className="page-title">{isEditing ? 'تعديل السؤال' : 'إدارة بنك الأسئلة'}</h1><p className="page-subtitle">أضف، عدل، وقم بإدارة أسئلة الاختبارات بكل سهولة.</p></div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => setShowPassageModal(true)}><FileText size={18} /> إدارة النصوص</button>
            <button className="btn-primary" onClick={() => setShowBulkModal(true)}><Upload size={18} /> رفع مجموعة أسئلة</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon-wrapper blue"><BookOpen size={24} /></div><div className="stat-content"><span className="stat-label">إجمالي الأسئلة</span><span className="stat-number">{stats.totalQuestions}</span></div></div>
          <div className="stat-card"><div className="stat-icon-wrapper purple"><FileText size={24} /></div><div className="stat-content"><span className="stat-label">نصوص القراءة</span><span className="stat-number">{stats.totalPassages}</span></div></div>
          <div className="stat-card"><div className="stat-icon-wrapper green"><CheckCircle2 size={24} /></div><div className="stat-content"><span className="stat-label">المواد الدراسية</span><span className="stat-number">{subjects.length}</span></div></div>
        </div>

        {fetchError && <div className="error-banner"><X size={20} /> {fetchError}</div>}

        <section className="form-card">
          <div className="card-header">
            <h2 className="card-title">{isEditing ? <Edit2 size={20} className="icon-blue" /> : <PlusCircle size={20} className="icon-blue" />}{isEditing ? 'تحديث بيانات السؤال' : 'إضافة سؤال جديد'}</h2>
            {isEditing && <button className="btn-text" onClick={resetForm}><X size={16} /> إلغاء</button>}
          </div>

          <form onSubmit={isEditing ? handleUpdateQuestion : handleAddQuestion} className="question-form">
            <div className="form-grid">
              <div className="form-group full-width"><label>نص السؤال <span className="required">*</span></label><textarea required className="modern-input textarea-input" value={formData.question_text} onChange={(e) => setFormData({...formData, question_text: e.target.value})} placeholder="اكتب السؤال بصيغة واضحة ومباشرة هنا..." /></div>
              <div className="form-group full-width"><label>صورة توضيحية للسؤال (اختياري)</label><div className="upload-box"><input type="file" id="q-image" className="hidden-input" accept="image/*" onChange={async (e) => { const file = e.target.files[0]; if (file) { try { const url = await uploadImage(file); setFormData({...formData, image_url: url}); } catch { alert('فشل رفع الصورة'); } } }} /><label htmlFor="q-image" className="upload-label"><UploadCloud size={32} className="upload-icon" /><span className="upload-text">اضغط هنا لرفع صورة</span><span className="upload-hint">PNG, JPG حتى 5MB</span></label>{formData.image_url && (<div className="image-preview"><img src={formData.image_url} alt="preview" /><button type="button" onClick={() => setFormData({...formData, image_url: ''})}><X size={16} /></button></div>)}</div></div>
              <div className="form-group"><label>المادة الدراسية <span className="required">*</span></label><select required className="modern-input" value={formData.subject_id} onChange={(e) => setFormData({...formData, subject_id: e.target.value})}><option value="" disabled>اختر المادة من القائمة</option>{subjects.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div>
              <div className="form-group"><label>الإجابة الصحيحة <span className="required">*</span></label><select className="modern-input" value={formData.correct_option} onChange={(e) => setFormData({...formData, correct_option: e.target.value})}><option value="0">{optionLabels[0]}</option><option value="1">{optionLabels[1]}</option><option value="2">{optionLabels[2]}</option><option value="3">{optionLabels[3]}</option></select></div>
              {isEnglishSubject() && (<div className="form-group full-width"><label>القطعة المرتبطة</label><select className="modern-input" value={formData.passage_id} onChange={(e) => setFormData({...formData, passage_id: e.target.value})}><option value="">بدون نص</option>{passages.filter(p => p.subject_id == formData.subject_id).map(p => (<option key={p.id} value={p.id}>{p.title}</option>))}</select></div>)}

              {/* الخيار أ */}
              <div className="form-group"><label>الخيار ({optionLabels[0]}) <span className="required">*</span></label><input required className="modern-input" type="text" value={formData.optionA} onChange={(e) => setFormData({...formData, optionA: e.target.value})} placeholder={`محتوى الخيار ${optionLabels[0]}`} />
                {allowImageOptions() && <ImageUploadField label={`صورة الخيار ${optionLabels[0]}`} imageUrl={formData.imageA} inputId="optionA-upload" onImageChange={async (e) => { const file = e.target.files[0]; if (file) { try { const url = await uploadImage(file); setFormData({...formData, imageA: url}); } catch { alert('فشل رفع الصورة'); } } }} onRemove={() => setFormData({...formData, imageA: ''})} />}
              </div>
              {/* الخيار ب */}
              <div className="form-group"><label>الخيار ({optionLabels[1]}) <span className="required">*</span></label><input required className="modern-input" type="text" value={formData.optionB} onChange={(e) => setFormData({...formData, optionB: e.target.value})} placeholder={`محتوى الخيار ${optionLabels[1]}`} />
                {allowImageOptions() && <ImageUploadField label={`صورة الخيار ${optionLabels[1]}`} imageUrl={formData.imageB} inputId="optionB-upload" onImageChange={async (e) => { const file = e.target.files[0]; if (file) { try { const url = await uploadImage(file); setFormData({...formData, imageB: url}); } catch { alert('فشل رفع الصورة'); } } }} onRemove={() => setFormData({...formData, imageB: ''})} />}
              </div>
              {/* الخيار ج */}
              <div className="form-group"><label>الخيار ({optionLabels[2]}) <span className="required">*</span></label><input required className="modern-input" type="text" value={formData.optionC} onChange={(e) => setFormData({...formData, optionC: e.target.value})} placeholder={`محتوى الخيار ${optionLabels[2]}`} />
                {allowImageOptions() && <ImageUploadField label={`صورة الخيار ${optionLabels[2]}`} imageUrl={formData.imageC} inputId="optionC-upload" onImageChange={async (e) => { const file = e.target.files[0]; if (file) { try { const url = await uploadImage(file); setFormData({...formData, imageC: url}); } catch { alert('فشل رفع الصورة'); } } }} onRemove={() => setFormData({...formData, imageC: ''})} />}
              </div>
              {/* الخيار د */}
              <div className="form-group"><label>الخيار ({optionLabels[3]}) <span className="required">*</span></label><input required className="modern-input" type="text" value={formData.optionD} onChange={(e) => setFormData({...formData, optionD: e.target.value})} placeholder={`محتوى الخيار ${optionLabels[3]}`} />
                {allowImageOptions() && <ImageUploadField label={`صورة الخيار ${optionLabels[3]}`} imageUrl={formData.imageD} inputId="optionD-upload" onImageChange={async (e) => { const file = e.target.files[0]; if (file) { try { const url = await uploadImage(file); setFormData({...formData, imageD: url}); } catch { alert('فشل رفع الصورة'); } } }} onRemove={() => setFormData({...formData, imageD: ''})} />}
              </div>
            </div>
            <div className="form-actions"><button type="submit" className="btn-primary" disabled={loading}>{isEditing ? <Edit2 size={18} /> : <CheckCircle2 size={18} />}{loading ? 'جاري المعالجة...' : (isEditing ? 'حفظ التعديلات' : 'نشر السؤال في البنك')}</button></div>
          </form>
        </section>

        <section className="table-card">
          <div className="card-header"><h2 className="card-title"><BookOpen size={20} className="icon-blue" /> الأسئلة المتوفرة في البنك</h2><div className="card-header-actions"><span className="badge-count">{filteredQuestions.length} سؤال</span><div className="search-wrapper-small"><Search size={16} className="search-icon-small" /><input type="text" placeholder="بحث عن سؤال أو مادة..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input-small" /></div></div></div>
          <div className="table-responsive">
            {loading && questions.length === 0 ? (
              <div className="empty-state"><div className="loading-spinner"></div><p>جاري تحميل الأسئلة...</p></div>
            ) : filteredQuestions.length > 0 ? (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>المادة</th><th>نص السؤال</th><th>صورة السؤال</th><th>صور الخيارات</th><th className="text-center">الإجابة</th><th className="text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((q) => {
                    const labels = getQuestionOptionLabels(q);
                    const imagesCount = [q.image_option_a, q.image_option_b, q.image_option_c, q.image_option_d].filter(Boolean).length;
                    return (
                      <tr key={q.id}>
                        <td><span className="subject-badge">{q.subjects?.name || 'غير محدد'}</span></td>
                        <td className="q-text-cell" title={q.question_text}>{q.question_text}</td>
                        <td className="text-center">{q.image_url ? <CheckCircle2 size={16} color="#10b981" /> : '-'}</td>
                        <td className="text-center">{imagesCount > 0 ? <span title={`${imagesCount} صورة`}><ImageIcon size={16} color="#3b82f6" /> {imagesCount}</span> : '-'}</td>
                        <td className="text-center"><span className="correct-badge">{labels[q.correct_option]}</span></td>
                        <td><div className="action-buttons"><button className="icon-btn edit" onClick={() => loadQuestionForEdit(q)}><Edit2 size={16} /></button><button className="icon-btn delete" onClick={() => deleteQuestion(q.id)}><Trash2 size={16} /></button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state"><div className="empty-icon"><BookOpen size={48} /></div><h3>لا توجد أسئلة</h3><p>{searchTerm ? 'لا توجد نتائج مطابقة لبحثك' : 'ابدأ بإضافة أول سؤال لبنك الأسئلة الخاص بك.'}</p></div>
            )}
          </div>
        </section>

        {uploadBatches.length > 0 && (
          <section className="table-card" style={{ marginTop: '30px' }}>
            <div className="card-header"><h2 className="card-title"><Upload size={20} className="icon-blue" /> الدفعات المرفوعة</h2><span className="badge-count">{uploadBatches.length} دفعة</span></div>
            <div className="table-responsive">
              <table className="modern-table">
                <thead><tr><th>تاريخ الرفع</th><th>اسم الملف</th><th>عدد الأسئلة</th><th className="text-center">الإجراءات</th></tr></thead>
                <tbody>
                  {uploadBatches.map((batch, idx) => (
                    <tr key={batch.batchId}>
                      <td>{batch.date}</td>
                      <td>{batch.fileName}</td>
                      <td className="text-center">{batch.count}</td>
                      <td className="text-center"><button className="icon-btn delete" onClick={() => deleteBatchQuestions(batch.batchId, idx)}><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* مودال النصوص */}
      {showPassageModal && (
        <div className="modal-overlay" onClick={() => setShowPassageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3><FileText size={20} /> إدارة النصوص القرائية</h3><button className="close-modal" onClick={() => setShowPassageModal(false)}><X size={20} /></button></div>
            <div className="modal-body">
              <form onSubmit={handleAddPassage}>
                <div className="form-group"><label>المادة</label><select required className="modern-input" value={passageForm.subject_id} onChange={(e) => setPassageForm({...passageForm, subject_id: e.target.value})}><option value="">اختر المادة</option>{subjects.filter(s => s.name?.includes('إنجليزية')).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div className="form-group"><label>عنوان النص</label><input required className="modern-input" value={passageForm.title} onChange={(e) => setPassageForm({...passageForm, title: e.target.value})} placeholder="مثال: أهمية القراءة" /></div>
                <div className="form-group"><label>نص القراءة</label><textarea required className="modern-input textarea-input" rows="6" value={passageForm.passage_text} onChange={(e) => setPassageForm({...passageForm, passage_text: e.target.value})} placeholder="اكتب النص الكامل هنا..." /></div>
                <div className="form-actions"><button type="submit" className="btn-primary">{editingPassage ? 'تحديث' : 'إضافة'}</button><button type="button" className="btn-secondary" onClick={() => { setShowPassageModal(false); setEditingPassage(null); setPassageForm({ title: '', passage_text: '', subject_id: '' }); }}>إلغاء</button></div>
              </form>
              <hr /><h4>النصوص الموجودة</h4>
              {passages.length === 0 ? <p style={{ color: '#64748b' }}>لا توجد نصوص</p> : (
                <div className="passages-list">
                  {passages.map(p => (
                    <div key={p.id} className="passage-item">
                      <div><strong>{p.title}</strong> - {subjects.find(s => s.id == p.subject_id)?.name}</div>
                      <div className="action-buttons"><button className="icon-btn edit" onClick={() => { setEditingPassage(p); setPassageForm(p); }}><Edit2 size={16} /></button><button className="icon-btn delete" onClick={() => deletePassage(p.id)}><Trash2 size={16} /></button></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* مودال الرفع الجماعي */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3><Upload size={20} /> رفع مجموعة أسئلة</h3><button className="close-modal" onClick={() => setShowBulkModal(false)}><X size={20} /></button></div>
            <div className="modal-body">
              <div className="upload-options">
                <label className="upload-option"><FileSpreadsheet size={24} /><span>رفع ملف Excel</span><input type="file" accept=".xlsx, .xls" onChange={(e) => handleBulkFileUpload(e.target.files[0])} /></label>
                <label className="upload-option"><FileJson size={24} /><span>رفع ملف JSON</span><input type="file" accept=".json" onChange={(e) => handleBulkJsonUpload(e.target.files[0])} /></label>
                <button className="download-template" onClick={downloadTemplate}><Download size={18} /> تحميل النموذج</button>
              </div>
              {bulkErrors.length > 0 && (<div className="bulk-errors"><AlertCircle size={18} /><ul>{bulkErrors.map((err, i) => <li key={i}>{err}</li>)}</ul></div>)}
              {bulkPreview.length > 0 && (
                <div className="bulk-preview">
                  <h4>معاينة البيانات الصالحة ({bulkPreview.length} سؤالاً)</h4>
                  <div className="preview-table-wrapper">
                    <table className="preview-table">
                      <thead><tr><th>السؤال</th><th>الخيار أ</th><th>الخيار ب</th><th>الخيار ج</th><th>الخيار د</th><th>الإجابة</th></tr></thead>
                      <tbody>
                        {bulkPreview.slice(0, 5).map((q, i) => (
                          <tr key={i}>
                            <td>{q.question_text?.substring(0, 50)}</td>
                            <td>{q.optionA}</td>
                            <td>{q.optionB}</td>
                            <td>{q.optionC}</td>
                            <td>{q.optionD}</td>
                            <td className="correct-badge" style={{background:'#dcfce7',color:'#16a34a',fontWeight:'bold',textAlign:'center'}}>{q.correct_option_letter}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkPreview.length > 5 && <p>...و {bulkPreview.length - 5} أسئلة أخرى</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowBulkModal(false)}>إلغاء</button><button className="btn-primary" onClick={handleBulkSubmit} disabled={bulkUploading || bulkPreview.length === 0}>{bulkUploading ? 'جاري الرفع...' : `رفع ${bulkPreview.length} سؤال`}</button></div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; }
        body { margin: 0; background-color: #f4f7fe; font-family: 'Cairo', sans-serif; }
        .teacher-container { direction: rtl; min-height: 100vh; display: flex; flex-direction: column; background: linear-gradient(180deg, #f4f7fc 0%, #e9f0f9 100%); }
        .dashboard-header { background-color: #ffffff; padding: 12px 30px; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 24px 24px; box-shadow: 0 6px 18px rgba(0,0,0,0.04); position: sticky; top: 0; z-index: 1000; backdrop-filter: blur(10px); background: rgba(255,255,255,0.95); }
        .logo-section { display: flex; align-items: center; gap: 12px; }
        .logo-wrapper-dash { background-color: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .logo-img-dash { max-width: 90%; max-height: 90%; object-fit: contain; }
        .logo-text-dash { font-weight: 800; font-size: 1.2rem; color: #1e3a8a; letter-spacing: -0.3px; }
        .user-section { display: flex; align-items: center; gap: 20px; }
        .user-info { display: flex; align-items: center; gap: 12px; }
        .user-name { font-weight: 600; color: #334155; font-size: 1rem; }
        .user-avatar { width: 44px; height: 44px; border-radius: 50%; background-color: #f1f5f9; border: 2px solid #e2e8f0; }
        .logout-button { display: flex; align-items: center; gap: 8px; background-color: #ffffff; border: 1px solid #e2e8f0; color: #475569; padding: 8px 18px; border-radius: 30px; font-family: 'Cairo', sans-serif; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.25s; }
        .logout-button:hover { background-color: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .logout-icon { width: 18px; height: 18px; display: flex; }
        .teacher-main { flex: 1; width: 100%; max-width: 1280px; margin: 0 auto; padding: 32px 24px; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .page-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
        .page-subtitle { font-size: 1rem; color: #64748b; }
        .header-actions { display: flex; gap: 12px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px; }
        .stat-card { background: white; border-radius: 20px; padding: 20px 24px; display: flex; align-items: center; gap: 18px; box-shadow: 0 6px 14px rgba(0,0,0,0.02); border: 1px solid #edf2f7; transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 20px rgba(0,0,0,0.04); }
        .stat-icon-wrapper { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; }
        .stat-icon-wrapper.blue { background: linear-gradient(145deg, #3b82f6, #2563eb); }
        .stat-icon-wrapper.purple { background: linear-gradient(145deg, #8b5cf6, #7c3aed); }
        .stat-icon-wrapper.green { background: linear-gradient(145deg, #10b981, #059669); }
        .stat-content { display: flex; flex-direction: column; }
        .stat-label { font-size: 0.9rem; font-weight: 500; color: #64748b; }
        .stat-number { font-size: 2rem; font-weight: 800; color: #1e293b; line-height: 1.2; }
        .error-banner { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 15px 20px; border-radius: 12px; margin-bottom: 25px; display: flex; align-items: center; gap: 10px; font-weight: 600; }
        .form-card, .table-card { background: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); margin-bottom: 30px; overflow: hidden; }
        .card-header { padding: 25px 30px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .card-title { margin: 0; font-size: 1.2rem; color: #1e293b; display: flex; align-items: center; gap: 10px; }
        .icon-blue { color: #3b82f6; }
        .btn-text { background: none; border: none; color: #64748b; display: flex; align-items: center; gap: 6px; cursor: pointer; font-family: 'Cairo'; font-weight: 600; }
        .btn-text:hover { color: #dc2626; }
        .question-form { padding: 30px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .full-width { grid-column: 1 / -1; }
        .form-group label { display: block; font-weight: 700; color: #334155; margin-bottom: 8px; font-size: 0.95rem; }
        .required { color: #ef4444; }
        .modern-input { width: 100%; padding: 14px 18px; border: 1px solid #cbd5e1; border-radius: 12px; font-family: 'Cairo'; font-size: 16px; color: #1e293b; background: #f8fafc; transition: all 0.2s ease; }
        .modern-input:focus { outline: none; border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .textarea-input { height: 120px; resize: vertical; }
        .upload-box { width: 100%; }
        .hidden-input { display: none; }
        .upload-label { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; cursor: pointer; transition: all 0.2s ease; gap: 10px; }
        .upload-label:hover { background: #eff6ff; border-color: #3b82f6; }
        .upload-icon { color: #94a3b8; }
        .upload-label:hover .upload-icon { color: #3b82f6; }
        .upload-text { font-weight: 700; color: #475569; }
        .upload-hint { font-size: 0.85rem; color: #94a3b8; }
        .upload-label-small { display: inline-flex; align-items: center; gap: 8px; background: #f1f5f9; padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 0.8rem; margin-top: 8px; width: fit-content; transition: 0.2s; }
        .upload-label-small:hover { background: #e2e8f0; }
        .image-preview { margin-top: 15px; position: relative; display: inline-block; }
        .image-preview img { max-width: 150px; max-height: 100px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .image-preview button { position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .form-actions { display: flex; gap: 15px; margin-top: 35px; border-top: 1px solid #f1f5f9; padding-top: 25px; }
        .btn-primary, .btn-secondary { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 28px; border-radius: 12px; font-family: 'Cairo'; font-weight: 700; font-size: 1rem; cursor: pointer; border: none; transition: all 0.2s ease; }
        .btn-primary { background: #3b82f6; color: white; flex: 1; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25); }
        .btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-2px); }
        .btn-primary:disabled { background: #94a3b8; cursor: not-allowed; box-shadow: none; }
        .btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .btn-secondary:hover { background: #e2e8f0; color: #1e293b; }
        .card-header-actions { display: flex; align-items: center; gap: 16px; }
        .badge-count { background: #eff6ff; color: #3b82f6; padding: 6px 14px; border-radius: 20px; font-size: 0.9rem; font-weight: 700; }
        .search-wrapper-small { position: relative; }
        .search-icon-small { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .search-input-small { padding: 8px 36px 8px 12px; border: 1px solid #e2e8f0; border-radius: 30px; font-family: 'Cairo'; font-size: 0.9rem; background: white; width: 220px; }
        .table-responsive { width: 100%; overflow-x: auto; }
        .modern-table { width: 100%; border-collapse: collapse; min-width: 600px; text-align: right; }
        .modern-table th { background: #f8fafc; padding: 16px 20px; color: #475569; font-weight: 700; font-size: 0.95rem; border-bottom: 2px solid #e2e8f0; }
        .modern-table td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
        .modern-table tbody tr:hover { background: #fbfcfd; }
        .q-text-cell { max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
        .text-center { text-align: center !important; }
        .subject-badge { background: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; }
        .correct-badge { display: inline-block; background: #dcfce7; color: #16a34a; width: 30px; height: 30px; line-height: 30px; text-align: center; border-radius: 8px; font-weight: 800; }
        .action-buttons { display: flex; gap: 10px; justify-content: center; }
        .icon-btn { width: 36px; height: 36px; border-radius: 10px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
        .icon-btn.edit { background: #eff6ff; color: #3b82f6; }
        .icon-btn.edit:hover { background: #dbeafe; }
        .icon-btn.delete { background: #fef2f2; color: #ef4444; }
        .icon-btn.delete:hover { background: #fee2e2; }
        .empty-state { padding: 60px 20px; text-align: center; color: #64748b; }
        .empty-icon { color: #cbd5e1; margin-bottom: 15px; }
        .empty-state h3 { color: #1e293b; margin: 0 0 8px 0; }
        .loading-spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .modal-content { background: white; border-radius: 24px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; direction: rtl; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; border-bottom: 1px solid #f1f5f9; }
        .close-modal { background: none; border: none; cursor: pointer; color: #94a3b8; }
        .modal-body { padding: 25px; }
        .modal-footer { padding: 20px 25px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; }
        .upload-options { display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 25px; }
        .upload-option { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; border: 2px dashed #cbd5e1; border-radius: 16px; cursor: pointer; transition: 0.2s; flex: 1; text-align: center; }
        .upload-option:hover { border-color: #3b82f6; background: #f8fafc; }
        .upload-option input { display: none; }
        .download-template { background: #f1f5f9; border: none; padding: 10px 20px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .bulk-errors { background: #fef2f2; color: #dc2626; padding: 15px; border-radius: 12px; margin-bottom: 20px; }
        .bulk-preview { background: #f8fafc; padding: 15px; border-radius: 12px; }
        .preview-table-wrapper { overflow-x: auto; }
        .preview-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .preview-table th, .preview-table td { padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; }
        .passages-list { display: flex; flex-direction: column; gap: 10px; }
        .passage-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 12px; }
        @media (max-width: 768px) { .dashboard-header { padding: 10px 16px; } .logo-text-dash { display: none; } .page-header { flex-direction: column; gap: 16px; } .header-actions { width: 100%; } .header-actions button { flex: 1; } .form-grid { grid-template-columns: 1fr; } .card-header-actions { flex-direction: column; align-items: flex-end; } .search-input-small { width: 100%; } }
      `}</style>
    </div>
  );
}