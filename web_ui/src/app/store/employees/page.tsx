'use client';

import { useState, useEffect, useRef } from 'react';
import { UserPlus, Search, Users, Save, Trash2, Edit3, ChevronDown, ChevronRight, ClipboardCheck } from 'lucide-react';
import { useI18n, useLocale } from '@/i18n/I18nProvider';
import { EmployeeHistoryList } from '@/components/store/EmployeeHistoryList';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import { useStores } from '@/components/providers/StoreProvider';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PageHeader from '@/components/layout/PageHeader';
import type {
  AttendanceStat,
  EmployeeEditForm,
  EmployeeRow,
  UserSearchResult,
} from '@/types/store-management';

const DEFAULT_TIME_ZONE =
  typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC';
const employeesMemoryCache = new Map<string, EmployeeRow[]>();

function getLocalDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function resolveStoreTimeZone(timeZone?: string | null) {
  return timeZone && timeZone !== 'UTC' ? timeZone : DEFAULT_TIME_ZONE;
}

export default function StoreEmployeesPage() {
  const t = useI18n();
  const locale = useLocale();
  const { stores, loading: storesLoading } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const lastLoadedStoreId = useRef('');

  // Add form
  const [searchPhone, setSearchPhone] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSearchUser, setSelectedSearchUser] = useState<UserSearchResult | null>(null);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EmployeeEditForm>({
    role: 'STAFF',
    wageType: 'HOURLY',
    wageAmount: 0,
    workStartTime: '09:00',
    workEndTime: '18:00'
  });

  // Stats view
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
  const [statsEmployeeId, setStatsEmployeeId] = useState<string | null>(null);
  const [statsMonth, setStatsMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [manualRecord, setManualRecord] = useState({
    date: getLocalDateKey(new Date()),
    checkIn: '',
    checkOut: '',
    status: 'NORMAL'
  });
  const [employeeStats, setEmployeeStats] = useState<AttendanceStat[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const selectedStoreTimeZone = resolveStoreTimeZone(
    stores.find((store) => store.id === selectedStoreId)?.timeZone,
  );

  const fetchEmployees = async (storeId: string, force = false) => {
    if (!force && employeesMemoryCache.has(storeId)) {
      setEmployees(employeesMemoryCache.get(storeId) ?? []);
      return;
    }

    try {
      const res = await fetch(`/api/store/employees?storeId=${storeId}`);
      if (res.ok) {
        const data = (await res.json()) as EmployeeRow[];
        employeesMemoryCache.set(storeId, data);
        setEmployees(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (storesLoading) return;
    if (stores.length === 0) {
      setLoading(false);
      return;
    }

    const storeId = stores.some((store) => store.id === selectedStoreId)
      ? selectedStoreId
      : stores[0].id;
    setSelectedStoreId(storeId);
    if (lastLoadedStoreId.current === storeId) return;
    lastLoadedStoreId.current = storeId;
    const hasCachedEmployees = employeesMemoryCache.has(storeId);
    setLoading(!hasCachedEmployees);
    void fetchEmployees(storeId).finally(() => setLoading(false));
  }, [selectedStoreId, stores, storesLoading]);

  const { refreshing } = usePullToRefresh({
    disabled: storesLoading || stores.length === 0 || !selectedStoreId,
    onRefresh: async () => {
      if (!selectedStoreId) return;
      await fetchEmployees(selectedStoreId, true);
    },
  });

  const fetchEmployeeStats = async (empId: string, month: string) => {
    setIsStatsLoading(true);
    try {
      const res = await fetch(`/api/store/attendance?storeId=${selectedStoreId}&employeeId=${empId}&month=${month}`);
      if (res.ok) {
        setEmployeeStats((await res.json()) as AttendanceStat[]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const toggleEmployeeDetails = (employeeId: string) => {
    setDetailEmployeeId((current) => {
      if (current === employeeId) {
        setStatsEmployeeId(null);
        if (editingId === employeeId) setEditingId(null);
        return null;
      }
      setStatsEmployeeId(null);
      if (editingId && editingId !== employeeId) setEditingId(null);
      return employeeId;
    });
  };

  useEffect(() => {
    if (statsEmployeeId) {
      fetchEmployeeStats(statsEmployeeId, statsMonth);
    }
  }, [statsMonth]);

  const handleAddEmployee = async () => {
    if (!searchPhone) return alert(t.emp_phone_required);
    
    try {
      const res = await fetch('/api/store/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          storeId: selectedStoreId, 
          phoneNumber: searchPhone,
          wageType: 'HOURLY',
          wageAmount: 10000,
          workStartTime: '09:00',
          workEndTime: '18:00'
        })
      });
      if (res.ok) {
        alert(t.emp_add_success);
        setSearchPhone('');
        setSelectedSearchUser(null);
        setShowAddForm(false);
        fetchEmployees(selectedStoreId, true);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch {
      alert(t.emp_add_error);
    }
  };

  const handleSearchUser = async () => {
    if (!searchPhone) return alert(t.emp_phone_required);
    try {
      const res = await fetch(`/api/user/search?phone=${searchPhone}`);
      if (res.ok) {
        setSelectedSearchUser((await res.json()) as UserSearchResult);
      } else {
        const err = await res.json();
        alert(err.error || t.emp_user_not_found);
        setSelectedSearchUser(null);
      }
    } catch {
      alert(t.emp_search_error);
      setSelectedSearchUser(null);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm(t.emp_resign_confirm)) return;
    
    try {
      const res = await fetch(`/api/store/employees?employeeId=${employeeId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert(t.emp_resign_success);
        fetchEmployees(selectedStoreId, true);
      }
    } catch {
      alert(t.emp_generic_error);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch('/api/store/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: editingId, ...editForm })
      });
      if (res.ok) {
        alert(t.emp_update_success);
        setEditingId(null);
        fetchEmployees(selectedStoreId, true);
      }
    } catch {
      alert(t.emp_error_msg);
    }
  };

  const handleSaveManual = async (employeeId: string) => {
    if (!manualRecord.date) return;

    try {
      const res = await fetch('/api/store/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId, 
          date: manualRecord.date,
          checkInTimeStr: manualRecord.checkIn,
          checkOutTimeStr: manualRecord.checkOut,
          status: manualRecord.status,
          timeZone: selectedStoreTimeZone
        })
      });
      if (res.ok) {
        alert(t.emp_manual_success);
        fetchEmployeeStats(employeeId, statsMonth); // Refresh table
        // Optionally reset form
        setManualRecord({ ...manualRecord, checkIn: '', checkOut: '', status: 'NORMAL' });
      } else {
        const data = await res.json();
        alert(data.error || t.emp_generic_error);
      }
    } catch {
      alert(t.emp_error_msg);
    }
  };

  if (!storesLoading && stores.length === 0) {
    return <StoreRequiredNotice />;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <PageHeader
        title={t.employee_management}
        icon={<ClipboardCheck className="w-5 h-5" />}
        actions={(
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors">
            <UserPlus className="w-6 h-6" />
          </button>
        )}
      />

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-6">
        {refreshing && (
          <div className="rounded-xl bg-indigo-50 px-4 py-2 text-center text-xs font-bold text-indigo-600">
            새로고침 중...
          </div>
        )}
        
        
        {/* Store Selection Tabs */}
        {stores.length > 1 && (
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {stores.map(store => (
              <button 
                key={store.id}
                onClick={() => {
                  setSelectedStoreId(store.id);
                  setDetailEmployeeId(null);
                  setStatsEmployeeId(null);
                  setEditingId(null);
                  fetchEmployees(store.id);
                }}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                  selectedStoreId === store.id ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {store.name}
              </button>
            ))}
          </div>
        )}

        {/* Add Employee Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
            <h2 className="font-bold text-gray-900 mb-3 text-sm">{t.emp_register_title}</h2>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input 
                  type="tel" 
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  placeholder={t.emp_phone_placeholder}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <button 
                onClick={handleSearchUser}
                className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center"
              >
                <Search className="w-4 h-4 mr-2" /> {t.emp_search_btn}
              </button>
            </div>
            {selectedSearchUser && (
              <div className="mt-4 p-3 bg-indigo-50 rounded-lg flex justify-between items-center">
                <span className="font-bold text-indigo-900">{selectedSearchUser.name}</span>
                <button onClick={handleAddEmployee} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-bold">{t.emp_add_btn}</button>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">{t.emp_search_hint}</p>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="font-bold text-lg text-gray-900 flex items-center mb-4">
            <Users className="w-5 h-5 mr-2 text-indigo-500" /> {t.emp_list_title} ({employees.length})
          </h2>

          {storesLoading || loading ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
              {t.mypage_loading}
            </div>
          ) : employees.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
              {t.emp_empty_list}
            </div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div
                  onClick={() => toggleEmployeeDetails(emp.id)}
                  className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${emp.status === 'INACTIVE' ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {detailEmployeeId === emp.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold text-lg ${emp.status === 'INACTIVE' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {emp.user.name || emp.user.email?.split('@')[0]}
                      </span>
                      {emp.status === 'INACTIVE' && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded">
                          {t.emp_badge_resigned}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {emp.status !== 'INACTIVE' && detailEmployeeId === emp.id && (
                      <>
                        <button onClick={(event) => {
                          event.stopPropagation();
                          setDetailEmployeeId(emp.id);
                          setEditingId(emp.id);
                          setStatsEmployeeId(null);
                          setEditForm({
                            role: emp.role,
                            wageType: emp.wageType,
                            wageAmount: emp.wageAmount,
                            workStartTime: emp.workStartTime,
                            workEndTime: emp.workEndTime
                          });
                        }} className="p-2 text-gray-400 hover:text-indigo-600" onMouseDown={(e) => e.stopPropagation()}>
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(emp.id);
                        }} className="p-2 text-gray-400 hover:text-red-600" onMouseDown={(e) => e.stopPropagation()}>
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {detailEmployeeId === emp.id && (
                  <>
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-600">
                      {emp.user.phoneNumber || emp.user.email}
                    </div>

                {editingId === emp.id && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">{t.emp_form_role}</label>
                        <select 
                          value={editForm.role}
                          onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="STAFF">{t.emp_role_staff}</option>
                          <option value="MANAGER">{t.emp_role_manager}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">{t.emp_form_wage_type}</label>
                        <select 
                          value={editForm.wageType}
                          onChange={(e) => setEditForm({...editForm, wageType: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="HOURLY">{t.emp_wage_hourly}</option>
                          <option value="DAILY">{t.emp_wage_daily}</option>
                          <option value="MONTHLY">{t.emp_wage_monthly}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">{t.emp_form_wage_amount} ({emp.store?.currency || '원'})</label>
                        <input 
                          type="number" 
                          value={editForm.wageAmount}
                          onChange={(e) => setEditForm({...editForm, wageAmount: Number(e.target.value)})}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">{t.emp_form_start_time}</label>
                        <input 
                          type="time" 
                          value={editForm.workStartTime}
                          onChange={(e) => setEditForm({...editForm, workStartTime: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">{t.emp_form_end_time}</label>
                        <input 
                          type="time" 
                          value={editForm.workEndTime}
                          onChange={(e) => setEditForm({...editForm, workEndTime: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50"
                      >
                        {t.emp_form_cancel}
                      </button>
                      <button 
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 flex items-center"
                      >
                        <Save className="w-4 h-4 mr-1" /> {t.emp_form_update}
                      </button>
                    </div>
                  </div>
                )}

                {!editingId && (
                  <div className="p-4 bg-white border-t border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      <div>
                        <span className="text-gray-500 block text-xs mb-0.5">{t.emp_wage_setting}</span>
                        <span className="font-bold text-gray-900">
                          {emp.wageType === 'HOURLY' ? t.emp_wage_hourly : emp.wageType === 'DAILY' ? t.emp_wage_daily : t.emp_wage_monthly} {emp.wageAmount.toLocaleString()}{emp.store?.currency || '원'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs mb-0.5">{t.emp_form_role}</span>
                        <span className="font-bold text-gray-900">
                          {emp.role === 'MANAGER' ? t.emp_role_manager : t.emp_role_staff}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs mb-0.5">{t.emp_work_time}</span>
                        <span className="font-bold text-gray-900">
                          {emp.workStartTime} ~ {emp.workEndTime}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {!editingId && <EmployeeHistoryList histories={emp.histories ?? []} t={t} />}
                
                {/* Stats Toggle Button */}
                {!editingId && (
                  <div className="border-t border-gray-100 p-3 bg-white text-center">
                    <button 
                      onClick={() => {
                        if (statsEmployeeId === emp.id) {
                          setStatsEmployeeId(null);
                        } else {
                          setStatsEmployeeId(emp.id);
                          fetchEmployeeStats(emp.id, statsMonth);
                        }
                      }}
                      className="text-indigo-600 text-sm font-bold hover:text-indigo-800 transition-colors"
                    >
                      {statsEmployeeId === emp.id ? `${t.emp_stats_hide} ▲` : `${t.emp_stats_view} ▼`}
                    </button>
                  </div>
                )}

                {/* Stats View Area */}
                {statsEmployeeId === emp.id && (
                  <div className="p-4 bg-gray-50/80 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 text-sm">{t.emp_stats_monthly_title}</h3>
                      <input 
                        type="month" 
                        value={statsMonth}
                        onChange={(e) => setStatsMonth(e.target.value)}
                        className="px-2 py-1 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none"
                      />
                    </div>

                    {/* Manual Attendance Entry Form */}
                    <div className="bg-white p-4 rounded-xl mb-4 border border-gray-200 shadow-sm">
                      <h4 className="font-bold text-sm text-gray-800 mb-3">{t.emp_manual_title}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.emp_date_select}</label>
                          <input 
                            type="date"
                            value={manualRecord.date}
                            onChange={(e) => setManualRecord({...manualRecord, date: e.target.value})}
                            className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.emp_manual_status}</label>
                          <select 
                            value={manualRecord.status}
                            onChange={(e) => setManualRecord({...manualRecord, status: e.target.value})}
                            className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="NORMAL">{t.emp_status_normal}</option>
                            <option value="LATE">{t.emp_status_late}</option>
                            <option value="EARLY_LEAVE">{t.emp_status_early}</option>
                            <option value="ABSENT">{t.emp_status_absent}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.emp_manual_check_in}</label>
                          <input 
                            type="time"
                            value={manualRecord.checkIn}
                            onChange={(e) => setManualRecord({...manualRecord, checkIn: e.target.value})}
                            disabled={manualRecord.status === 'ABSENT'}
                            className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.emp_manual_check_out}</label>
                          <input 
                            type="time"
                            value={manualRecord.checkOut}
                            onChange={(e) => setManualRecord({...manualRecord, checkOut: e.target.value})}
                            disabled={manualRecord.status === 'ABSENT'}
                            className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button 
                          onClick={() => handleSaveManual(emp.id)}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          {t.emp_manual_save}
                        </button>
                      </div>
                    </div>
                    
                    {isStatsLoading ? (
                      <div className="py-8 text-center text-gray-500 text-sm">{t.mypage_loading}</div>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm mb-4">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-100 text-gray-600">
                              <tr>
                                <th className="px-4 py-2 font-semibold">{t.emp_stats_date}</th>
                                <th className="px-4 py-2 font-semibold">{t.emp_stats_check_in}</th>
                                <th className="px-4 py-2 font-semibold">{t.emp_stats_check_out}</th>
                                <th className="px-4 py-2 font-semibold">{t.emp_stats_status}</th>
                                <th className="px-4 py-2 font-semibold text-right">{t.emp_stats_work_time}</th>
                                <th className="px-4 py-2 font-semibold text-right">{t.emp_stats_daily_wage}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {employeeStats.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">{t.emp_no_history}</td>
                                </tr>
                              ) : (
                                employeeStats.map((att) => (
                                  <tr key={att.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-gray-900 font-medium">{att.date.split('-').slice(1).join('/')}</td>
                                    <td className="px-4 py-3 text-gray-600">{att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit', timeZone: selectedStoreTimeZone}) : '-'}</td>
                                    <td className="px-4 py-3 text-gray-600">{att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit', timeZone: selectedStoreTimeZone}) : '-'}</td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                                        att.status === 'NORMAL' ? 'bg-green-100 text-green-700' :
                                        att.status === 'LATE' ? 'bg-red-100 text-red-700' :
                                        att.status === 'EARLY_LEAVE' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {att.status === 'NORMAL' ? t.emp_status_normal : att.status === 'LATE' ? t.emp_status_late : att.status === 'EARLY_LEAVE' ? t.emp_status_early : t.emp_status_absent}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                      {att.checkOutTime ? `${Math.floor(att.workMinutes / 60)}h ${att.workMinutes % 60}m` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-indigo-600">
                                      {att.wageType !== 'MONTHLY' && att.calculatedWage != null 
                                        ? att.calculatedWage.toLocaleString() + (emp.store?.currency || '원')
                                        : '-'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Summary Block */}
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                          <span className="text-sm font-bold text-indigo-800">{t.emp_stats_salary_summary}</span>
                          <div className="text-right">
                            {(() => {
                              const totalMins = employeeStats.reduce((acc, curr) => acc + (curr.workMinutes || 0), 0);
                              const totalHours = totalMins / 60;
                              let estimatedWage = 0;
                              if (emp.wageType === 'MONTHLY') {
                                // For MONTHLY, we take the latest monthly snapshot amount, or fallback to current Employee amount
                                const monthlyStats = employeeStats.filter(s => s.wageType === 'MONTHLY' && s.wageAmount > 0);
                                if (monthlyStats.length > 0) {
                                  estimatedWage = monthlyStats[monthlyStats.length - 1].wageAmount;
                                } else {
                                  estimatedWage = emp.wageAmount;
                                }
                              } else {
                                // For HOURLY and DAILY, sum up the calculatedWage from the snapshots
                                estimatedWage = employeeStats.reduce((acc, curr) => acc + (curr.calculatedWage || 0), 0);
                              }
                              return (
                                <>
                                  <div className="text-xs text-indigo-600 mb-1">
                                    {t.emp_total_work_time.replace('{h}', String(Math.floor(totalHours))).replace('{m}', String(totalMins % 60))}
                                  </div>
                                  <div className="text-lg font-black text-indigo-900">
                                    {t.emp_expected_salary} {Math.floor(estimatedWage).toLocaleString()}{emp.store?.currency || '원'}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
