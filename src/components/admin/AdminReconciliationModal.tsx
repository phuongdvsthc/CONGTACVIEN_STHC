import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Course } from '../../types';
import {
  X,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface AdminReconciliationModalProps {
  lead: any;
  courses: Course[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminReconciliationModal: React.FC<AdminReconciliationModalProps> = ({
  lead,
  courses,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Loading & Fresh Lead State
  const [loadingLead, setLoadingLead] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [freshLead, setFreshLead] = useState<any>(lead);
  const [activeEgovLink, setActiveEgovLink] = useState<any>(null);

  // Form State
  const [reconciliationStatus, setReconciliationStatus] = useState<'MATCHED_VALID' | 'EXISTING_IN_SCHOOL_SYSTEM' | 'MISMATCH_INVALID'>('MATCHED_VALID');
  const [admissionStatus, setAdmissionStatus] = useState<'ENROLLED' | 'NOT_ENROLLED'>('ENROLLED');
  const [egovCode, setEgovCode] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseTuitionFee, setCourseTuitionFee] = useState<string>('');
  const [tuitionFeeType, setTuitionFeeType] = useState<'ESTIMATE' | 'OFFICIAL'>('ESTIMATE');
  const [tuitionFeeCollected, setTuitionFeeCollected] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [tuitionPaidAt, setTuitionPaidAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [studentCode, setStudentCode] = useState<string>('');
  const [staffNote, setStaffNote] = useState<string>('');

  // Idempotency & Submitting State
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load fresh lead details when modal opens or lead.id changes
  useEffect(() => {
    if (isOpen && lead?.id) {
      loadFreshLeadDetail();
    }
  }, [isOpen, lead?.id]);

  const loadFreshLeadDetail = async () => {
    setLoadingLead(true);
    setLoadError(null);
    try {
      const res = await api.getAdminLeadDetail(lead.id);
      if (res.success && res.data) {
        const data: any = res.data;
        setFreshLead(data);
        const activeLink = data.current_egov_link || (data.egov_links || []).find((l: any) => l.link_status === 'ACTIVE') || null;
        setActiveEgovLink(activeLink);
        setEgovCode(activeLink?.external_admission_code || '');

        const initialCourse = data.reconciled_course_id || data.course_id || courses[0]?.id || '';
        setSelectedCourseId(initialCourse);
        setCourseTuitionFee(data.course_tuition_fee ? String(data.course_tuition_fee) : '');
        setTuitionFeeType(data.course_tuition_fee_type || 'ESTIMATE');
        setTuitionFeeCollected(data.tuition_fee_collected ? String(data.tuition_fee_collected) : '');
        setReceiptNumber(data.receipt_number || '');
        setTuitionPaidAt(data.tuition_paid_at ? data.tuition_paid_at.split('T')[0] : new Date().toISOString().split('T')[0]);
        setStudentCode(data.external_student_code || '');
        setStaffNote('');
        idempotencyKeyRef.current = crypto.randomUUID();
      } else {
        setLoadError(res.error || 'Không thể tải thông tin hồ sơ mới nhất.');
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Lỗi kết nối khi tải thông tin hồ sơ.');
    } finally {
      setLoadingLead(false);
    }
  };

  // Sync default course tuition fee when course changes
  useEffect(() => {
    if (selectedCourseId && courses.length > 0) {
      const found = courses.find((c) => c.id === selectedCourseId);
      if (found && found.tuition_fee_estimate !== undefined && found.tuition_fee_estimate !== null) {
        if (!courseTuitionFee || courseTuitionFee === '') {
          setCourseTuitionFee(String(found.tuition_fee_estimate));
        }
      }
    }
  }, [selectedCourseId, courses]);

  // Enforce business rules based on reconciliation status
  useEffect(() => {
    if (reconciliationStatus === 'MATCHED_VALID') {
      setAdmissionStatus('ENROLLED');
    } else if (reconciliationStatus === 'MISMATCH_INVALID') {
      setAdmissionStatus('NOT_ENROLLED');
    }
  }, [reconciliationStatus]);

  if (!isOpen) return null;

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCourseId = e.target.value;
    setSelectedCourseId(newCourseId);
    const found = courses.find((c) => c.id === newCourseId);
    if (found && found.tuition_fee_estimate !== undefined && found.tuition_fee_estimate !== null) {
      setCourseTuitionFee(String(found.tuition_fee_estimate));
      setTuitionFeeType('ESTIMATE');
    } else {
      setCourseTuitionFee('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEgov = egovCode.trim();
    if (reconciliationStatus === 'MATCHED_VALID') {
      if (!activeEgovLink || !cleanEgov) {
        setErrorMsg('Hồ sơ chưa có liên kết mã EGOV ACTIVE. Vui lòng cập nhật mã EGOV tại khối “Hồ sơ đăng ký EGOV” trước khi xác nhận Hồ sơ hợp lệ.');
        return;
      }
      if (!/^[0-9]{7}$/.test(cleanEgov)) {
        setErrorMsg(`Mã hồ sơ EGOV không hợp lệ: "${cleanEgov}". Phải gồm đúng 7 chữ số.`);
        return;
      }
      if (admissionStatus !== 'ENROLLED') {
        setErrorMsg('Hồ sơ hợp lệ (MATCHED_VALID) bắt buộc phải có tình trạng "Đã nhập học" trên EGOV.');
        return;
      }
    }

    if (reconciliationStatus === 'EXISTING_IN_SCHOOL_SYSTEM' && !staffNote.trim()) {
      setErrorMsg('Bắt buộc phải nhập căn cứ/ghi chú khi xác nhận khách đã đăng ký trước qua kênh khác.');
      return;
    }

    if (reconciliationStatus === 'MISMATCH_INVALID' && !staffNote.trim()) {
      setErrorMsg('Bắt buộc phải nhập ghi chú lý do thông tin không khớp.');
      return;
    }

    let parsedTuitionCollected: number | null = null;
    if (tuitionFeeCollected.trim() !== '') {
      const num = Number(tuitionFeeCollected);
      if (isNaN(num) || num < 0) {
        setErrorMsg('Số tiền học phí thực thu phải là số không âm (>= 0).');
        return;
      }
      parsedTuitionCollected = num;
    }

    let parsedCourseFee: number | null = null;
    if (courseTuitionFee.trim() !== '') {
      const num = Number(courseTuitionFee);
      if (isNaN(num) || num < 0) {
        setErrorMsg('Học phí khóa học phải là số không âm.');
        return;
      }
      parsedCourseFee = num;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        reconciliation_status: reconciliationStatus,
        admission_status: admissionStatus,
        external_admission_code: cleanEgov || undefined,
        external_student_code: studentCode.trim() || undefined,
        course_id: selectedCourseId || undefined,
        course_tuition_fee: parsedCourseFee,
        course_tuition_fee_type: tuitionFeeType,
        tuition_fee_collected: parsedTuitionCollected,
        receipt_number: receiptNumber.trim() || undefined,
        tuition_paid_at: tuitionPaidAt || undefined,
        staff_note: staffNote.trim() || undefined,
        client_updated_at: freshLead?.updated_at || lead?.updated_at,
      };

      const targetLeadId = freshLead?.id || lead?.id;
      const res = await api.reconcileLead(targetLeadId, payload, idempotencyKeyRef.current);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        if (res.status === 409) {
          setErrorMsg(res.error || 'Xung đột phiên bản hoặc Idempotency: Hồ sơ đã được cập nhật hoặc khóa gửi bị trùng lặp.');
        } else {
          setErrorMsg(res.error || 'Không thể thực hiện đối soát hồ sơ.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetLeadName = freshLead?.full_name || lead?.full_name;
  const targetLeadPhone = freshLead?.phone || lead?.phone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold">Xác nhận kết quả đối soát hồ sơ & học phí</h3>
              <p className="text-xs text-slate-300">Ứng viên: <strong className="text-white">{targetLeadName}</strong> ({targetLeadPhone})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* INSTRUCTION BANNER */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-blue-900 text-xs flex items-start gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <strong>Hướng dẫn nghiệp vụ:</strong> Tra cứu khách trên EGOV và đối chiếu thêm SĐT, khóa học trước khi xác nhận. Chỉ chọn ‘Đã nhập học’ khi EGOV đã tick trạng thái này.
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        {loadingLead ? (
          <div className="p-16 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Đang tải thông tin hồ sơ EGOV mới nhất...</p>
          </div>
        ) : loadError ? (
          <div className="p-12 text-center space-y-4 flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-xs text-rose-800 font-medium">{loadError}</p>
            <button
              type="button"
              onClick={loadFreshLeadDetail}
              className="px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 hover:bg-blue-950 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Kết quả đối soát */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 block">
                1. Kết quả đối soát hồ sơ: <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReconciliationStatus('MATCHED_VALID')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    reconciliationStatus === 'MATCHED_VALID'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold shadow-sm ring-2 ring-emerald-600/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">Hồ sơ hợp lệ</span>
                    {reconciliationStatus === 'MATCHED_VALID' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal">MATCHED_VALID (Khớp EGOV, tạo thưởng 500k)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReconciliationStatus('EXISTING_IN_SCHOOL_SYSTEM')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    reconciliationStatus === 'EXISTING_IN_SCHOOL_SYSTEM'
                      ? 'bg-purple-50 border-purple-600 text-purple-900 font-semibold shadow-sm ring-2 ring-purple-600/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">Đăng ký trước</span>
                    {reconciliationStatus === 'EXISTING_IN_SCHOOL_SYSTEM' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal">EXISTING (Đã đăng ký trước kênh khác, không thưởng)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReconciliationStatus('MISMATCH_INVALID')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    reconciliationStatus === 'MISMATCH_INVALID'
                      ? 'bg-rose-50 border-rose-600 text-rose-900 font-semibold shadow-sm ring-2 ring-rose-600/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">Không khớp</span>
                    {reconciliationStatus === 'MISMATCH_INVALID' && <CheckCircle2 className="w-4 h-4 text-rose-600" />}
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal">MISMATCH (Thông tin sai lệch/Không tìm thấy)</span>
                </button>
              </div>
            </div>

            {/* 2. Tình trạng nhập học */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 block">
                2. Tình trạng nhập học trên EGOV: <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  admissionStatus === 'ENROLLED' ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="admission_status"
                    value="ENROLLED"
                    checked={admissionStatus === 'ENROLLED'}
                    disabled={reconciliationStatus === 'MISMATCH_INVALID'}
                    onChange={() => setAdmissionStatus('ENROLLED')}
                    className="w-4 h-4 text-blue-900 focus:ring-blue-900"
                  />
                  <div>
                    <span>Đã nhập học (ENROLLED)</span>
                    {reconciliationStatus === 'MATCHED_VALID' && <span className="block text-[10px] text-emerald-700 font-normal">Bắt buộc cho Hồ sơ hợp lệ</span>}
                  </div>
                </label>

                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  reconciliationStatus === 'MATCHED_VALID' ? 'opacity-50 cursor-not-allowed bg-slate-100' : (
                    admissionStatus === 'NOT_ENROLLED' ? 'bg-slate-100 border-slate-400 text-slate-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                  )
                }`}>
                  <input
                    type="radio"
                    name="admission_status"
                    value="NOT_ENROLLED"
                    checked={admissionStatus === 'NOT_ENROLLED'}
                    disabled={reconciliationStatus === 'MATCHED_VALID'}
                    onChange={() => setAdmissionStatus('NOT_ENROLLED')}
                    className="w-4 h-4 text-slate-700 focus:ring-slate-700"
                  />
                  <div>
                    <span>Chưa nhập học (NOT_ENROLLED)</span>
                    {reconciliationStatus === 'MATCHED_VALID' && <span className="block text-[10px] text-rose-600 font-normal">Không áp dụng cho MATCHED_VALID</span>}
                  </div>
                </label>
              </div>
            </div>

            {/* 3. Mã hồ sơ EGOV (Chỉ đọc từ liên kết ACTIVE) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 block flex items-center justify-between">
                <span>3. Mã hồ sơ EGOV hiện hành: {reconciliationStatus === 'MATCHED_VALID' && <span className="text-rose-600">*</span>}</span>
                <span className="font-mono text-slate-400 text-[11px]">Định dạng: ^[0-9]{7}$</span>
              </label>

              {activeEgovLink && egovCode ? (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-950 text-sm">{egovCode}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-[11px] font-semibold">
                      Đã đăng ký hồ sơ EGOV (ACTIVE)
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 italic">
                    Mã lấy từ Hồ sơ đăng ký EGOV. Muốn sửa mã, hãy cập nhật tại khối này trước khi đối chiếu.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900">
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Chưa cập nhật mã EGOV</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Hồ sơ này chưa có liên kết mã EGOV ACTIVE. Không thể xác nhận "Hồ sơ hợp lệ" (MATCHED_VALID) khi chưa có mã. Vui lòng cập nhật mã tại khối “Hồ sơ đăng ký EGOV” trước khi đối chiếu.
                  </p>
                </div>
              )}
            </div>

            {/* 4. Khóa học thực tế đối chiếu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">
                  4. Khóa học đối chiếu: <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedCourseId}
                  onChange={handleCourseChange}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Học phí khóa học & loại nguồn */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block flex items-center justify-between">
                  <span>5. Học phí khóa học (Snapshot):</span>
                  <span className="text-[10px] text-slate-500 font-normal">Nguồn: {tuitionFeeType === 'ESTIMATE' ? 'Ước tính danh mục' : 'Chính thức'}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={courseTuitionFee}
                    onChange={(e) => setCourseTuitionFee(e.target.value)}
                    placeholder="VD: 14500000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                  <select
                    value={tuitionFeeType}
                    onChange={(e) => setTuitionFeeType(e.target.value as any)}
                    className="py-2.5 px-2 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700"
                  >
                    <option value="ESTIMATE">Ước tính</option>
                    <option value="OFFICIAL">Chính thức</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 6. Học phí thực thu, số biên lai, ngày đóng (Tùy chọn) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="font-medium text-slate-700 block">Học phí thực thu (VNĐ):</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={tuitionFeeCollected}
                  onChange={(e) => setTuitionFeeCollected(e.target.value)}
                  placeholder="VD: 14500000"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-slate-700 block">Số biên lai thu tiền:</label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="VD: BL-2026-0918"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-slate-700 block">Ngày đóng học phí:</label>
                <input
                  type="date"
                  value={tuitionPaidAt}
                  onChange={(e) => setTuitionPaidAt(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            {/* 7. Mã học viên ngoại bộ & Ghi chú/căn cứ */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="font-medium text-slate-700 block">Mã học viên trên EGOV (tùy chọn):</label>
                <input
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="VD: HV-2026-8810"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">
                  {reconciliationStatus === 'MATCHED_VALID' ? 'Ghi chú / Căn cứ đối soát (tùy chọn):' : (
                    <>Ghi chú / Lý do bắt buộc <span className="text-rose-600">*</span>:</>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={staffNote}
                  onChange={(e) => setStaffNote(e.target.value)}
                  placeholder={
                    reconciliationStatus === 'EXISTING_IN_SCHOOL_SYSTEM'
                      ? 'Nhập căn cứ chứng minh học viên đã đăng ký trước qua kênh khác...'
                      : reconciliationStatus === 'MISMATCH_INVALID'
                      ? 'Nhập lý do thông tin không khớp hoặc không tìm thấy hồ sơ...'
                      : 'Nhập ghi chú thêm cho đợt đối soát này...'
                  }
                  maxLength={2000}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (reconciliationStatus === 'MATCHED_VALID' && (!activeEgovLink || !egovCode))}
                className="px-5 py-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-sm inline-flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Xác nhận đối soát</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
