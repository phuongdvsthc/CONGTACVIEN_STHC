import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Lock,
  Check,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

interface AdminPermissionsViewProps {
  currentUser?: {
    id?: string;
    email?: string;
    full_name?: string;
    role?: string;
  } | null;
}

export const AdminPermissionsView: React.FC<AdminPermissionsViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'staff'>('groups');
  const [permissionsCatalog, setPermissionsCatalog] = useState<any[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [apiFeedback, setApiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, groupsRes, staffRes] = await Promise.all([
        api.getPermissionCatalog(),
        api.getPermissionGroups(),
        api.getStaffPermissionsList(),
      ]);

      if (catRes.success) setPermissionsCatalog(catRes.data || []);
      if (groupsRes.success) setPermissionGroups(groupsRes.data || []);
      if (staffRes.success) setStaffList(staffRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu phân quyền.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setApiFeedback({ type, message });
    setTimeout(() => setApiFeedback(null), 5000);
  };

  const handleAssignGroup = async (staffId: string, groupCode: string) => {
    try {
      const res = await api.assignStaffPermissionGroup({ staff_id: staffId, group_code: groupCode });
      if (res.success) {
        showFeedback('success', res.message || 'Gán nhóm quyền thành công!');
        loadData();
      } else {
        showFeedback('error', res.error || 'Lỗi gán nhóm quyền.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Lỗi kết nối.');
    }
  };

  const handleRevokeGroup = async (staffId: string, groupCode: string) => {
    try {
      const res = await api.revokeStaffPermissionGroup({ staff_id: staffId, group_code: groupCode });
      if (res.success) {
        showFeedback('success', res.message || 'Thu hồi nhóm quyền thành công!');
        loadData();
      } else {
        showFeedback('error', res.error || 'Lỗi thu hồi nhóm quyền.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Lỗi kết nối.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 mt-12 space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold">Truy cập bị từ chối</h2>
        <p className="text-xs">Chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập trang Quản lý Phân quyền.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-900 mb-1">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">Quản Lý Phân Quyền & Nhóm Quyền A5</h1>
          </div>
          <p className="text-xs text-slate-500">
            Cấu hình nhóm quyền thù lao và phân quyền cho đội ngũ cán bộ tuyển sinh (Staff) theo chuẩn bảo mật A5.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK NOTIFICATION */}
      {apiFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs ${
            apiFeedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {apiFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{apiFeedback.message}</span>
          </div>
          <button onClick={() => setApiFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>PQ.4: Nhóm Quyền & Danh Mục Quyền ({permissionGroups.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'staff'
              ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>PQ.5: Gán Quyền cho Nhân Viên ({staffList.length} staff)</span>
        </button>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-6 text-center bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* LOADING STATE */}
      {loading && !error && (
        <div className="p-16 text-center text-slate-500 text-xs">
          Đang tải dữ liệu phân quyền hệ thống...
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 1: NHÓM QUYỀN & DANH MỤC QUYỀN (PQ.4) */}
      {/* ---------------------------------------------------------------------- */}
      {!loading && activeTab === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Permission Groups List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Các Nhóm Quyền (Permission Groups)</span>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-mono">
                {permissionGroups.length} nhóm
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permissionGroups.map((group: any) => (
                <div key={group.code} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        {group.code}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {(group.permissions || []).length} quyền
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">{group.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{group.description || 'Không có mô tả'}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-700">Quyền thành viên:</div>
                    <div className="flex flex-wrap gap-1">
                      {(group.permissions || []).map((pCode: string) => (
                        <span key={pCode} className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded border border-slate-200">
                          {pCode}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions Catalog */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Danh Mục 7 Quyền A5</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-mono">
                {permissionsCatalog.length}
              </span>
            </h2>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              {permissionsCatalog.map((perm: any) => (
                <div key={perm.code} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between font-mono font-bold text-xs text-blue-900">
                    <span>{perm.code}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{perm.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{perm.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 2: GÁN QUYỀN CHO NHÂN VIÊN (PQ.5) */}
      {/* ---------------------------------------------------------------------- */}
      {!loading && activeTab === 'staff' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Phân Quyền & Gán Nhóm cho Nhân Viên Tuyển Sinh (Staff)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin có thể gán hoặc thu hồi nhóm quyền <code>reward_manager</code> (toàn quyền) hoặc <code>reward_viewer</code> (chỉ xem) cho các cán bộ.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Cán bộ (Staff)</th>
                  <th className="py-3 px-4">Email / ID</th>
                  <th className="py-3 px-4">Nhóm quyền hiện tại</th>
                  <th className="py-3 px-4">Quyền hiệu lực thực tế</th>
                  <th className="py-3 px-4 text-right">Thao tác gán / thu hồi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Không tìm thấy tài khoản nhân viên (Staff) nào trong hệ thống.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff: any) => {
                    const assignedGroups = staff.assigned_groups || [];
                    const activeManager = assignedGroups.find((g: any) => g.group_code === 'reward_manager' && g.is_active);
                    const activeViewer = assignedGroups.find((g: any) => g.group_code === 'reward_viewer' && g.is_active);
                    const effPerms = staff.effective_permissions || [];

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs">
                              {(staff.full_name || 'S')[0].toUpperCase()}
                            </div>
                            <div>
                              <div>{staff.full_name || 'Chưa cập nhật tên'}</div>
                              <div className="text-[10px] text-slate-400 font-normal">Trạng thái: {staff.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                          <div>{staff.email}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{staff.id}</div>
                        </td>
                        <td className="py-3.5 px-4 space-y-1">
                          {activeManager ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-lg font-bold text-[11px] border border-indigo-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              reward_manager (Toàn quyền)
                            </span>
                          ) : activeViewer ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg font-bold text-[11px] border border-amber-200">
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              reward_viewer (Chỉ xem)
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa gán nhóm quyền A5</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {effPerms.length > 0 ? (
                              effPerms.map((p: string) => (
                                <span key={p} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-mono text-[10px] border border-emerald-200">
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Không có quyền A5</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {activeManager ? (
                            <button
                              onClick={() => handleRevokeGroup(staff.id, 'reward_manager')}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold transition-colors text-xs"
                            >
                              Thu hồi Quản lý
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAssignGroup(staff.id, 'reward_manager')}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors shadow-xs text-xs"
                            >
                              Gán Quản lý
                            </button>
                          )}

                          {activeViewer ? (
                            <button
                              onClick={() => handleRevokeGroup(staff.id, 'reward_viewer')}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold transition-colors text-xs"
                            >
                              Thu hồi Xem
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAssignGroup(staff.id, 'reward_viewer')}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors text-xs"
                            >
                              Gán Xem
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
