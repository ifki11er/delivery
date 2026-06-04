'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Search, Clock, Users, Save, ChevronLeft, Trash2, Edit3 } from 'lucide-react';
import { useI18n, useLocale } from '@/i18n/I18nProvider';
import type {
  AttendanceStat,
  EmployeeEditForm,
  EmployeeRow,
  StoreSummary,
  UserSearchResult,
} from '@/types/store-management';

export default function StoreEmployeesPage() {
  const router = useRouter();
  const t = useI18n();
  const locale = useLocale();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [statsEmployeeId, setStatsEmployeeId] = useState<string | null>(null);
  const [statsMonth, setStatsMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [manualRecord, setManualRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    checkIn: '',
    checkOut: '',
    status: 'NORMAL'
  });
  const [employeeStats, setEmployeeStats] = useState<AttendanceStat[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const fetchStoresAndEmployees = async () => {
    try {
      const resStores = await fetch('/api/store');
      if (resStores.ok) {
        const storesData = (await resStores.json()) as StoreSummary[];
        setStores(storesData);
        if (storesData.length > 0) {
          const storeId = storesData[0].id;
          setSelectedStoreId(storeId);
          await fetchEmployees(storeId);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async (storeId: string) => {
    try {
      const res = await fetch(`/api/store/employees?storeId=${storeId}`);
      if (res.ok) {
        setEmployees((await res.json()) as EmployeeRow[]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStoresAndEmployees();
  }, []);

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

  useEffect(() => {
    if (statsEmployeeId) {
      fetchEmployeeStats(statsEmployeeId, statsMonth);
    }
  }, [statsMonth]);

  const handleAddEmployee = async () => {
    if (!searchPhone) return alert('전화번호를 입력하세요.');
    
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
        alert('직원이 등록되었습니다.');
        setSearchPhone('');
        setSelectedSearchUser(null);
        setShowAddForm(false);
        fetchEmployees(selectedStoreId);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch {
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const handleSearchUser = async () => {
    if (!searchPhone) return alert('전화번호를 입력하세요.');
    try {
      const res = await fetch(`/api/user/search?phone=${searchPhone}`);
      if (res.ok) {
        setSelectedSearchUser((await res.json()) as UserSearchResult);
      } else {
        const err = await res.json();
        alert(err.error || '사용자를 찾을 수 없습니다.');
        setSelectedSearchUser(null);
      }
    } catch {
      alert('검색 중 오류가 발생했습니다.');
      setSelectedSearchUser(null);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm('해당 직원을 퇴사 처리하시겠습니까? (과거 통계는 남습니다)')) return;
    
    try {
      const res = await fetch(`/api/store/employees?employeeId=${employeeId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('퇴사 처리되었습니다.');
        fetchEmployees(selectedStoreId);
      }
    } catch {
      alert('오류가 발생했습니다.');
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
        alert(t.emp_form_update || '저장되었습니다.');
        setEditingId(null);
        fetchEmployees(selectedStoreId);
      }
    } catch {
      alert(t.emp_error_msg || '오류가 발생했습니다.');
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
          status: manualRecord.status
        })
      });
      if (res.ok) {
        alert(t.emp_manual_success || '수동 근태 기록이 저장되었습니다.');
        fetchEmployeeStats(employeeId, statsMonth); // Refresh table
        // Optionally reset form
        setManualRecord({ ...manualRecord, checkIn: '', checkOut: '', status: 'NORMAL' });
      } else {
        const data = await res.json();
        alert(data.error || '오류가 발생했습니다.');
      }
    } catch {
      alert(t.emp_error_msg || '오류가 발생했습니다.');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">로딩 중...</div>;

  if (stores.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        {t.manage_no_store}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="font-bold text-lg text-gray-900">{t.employee_management}</h1>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-indigo-600 p-2">
            <UserPlus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-6">
        
        {/* Store Selection Tabs */}
        {stores.length > 1 && (
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {stores.map(store => (
              <button 
                key={store.id}
                onClick={() => {
                  setSelectedStoreId(store.id);
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

          {employees.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
              {t.emp_empty_list}
            </div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`p-4 flex justify-between items-center border-b border-gray-50 ${emp.status === 'INACTIVE' ? 'bg-gray-100' : 'bg-gray-50/50'}`}>
                  <div>
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
                    <span className="text-xs text-gray-500">{emp.user.phoneNumber || emp.user.email}</span>
                  </div>
                  <div className="flex space-x-2">
                    {emp.status !== 'INACTIVE' && (
                      <>
                        <button onClick={() => {
                          setEditingId(emp.id);
                          setStatsEmployeeId(null);
                          setEditForm({
                            role: emp.role,
                            wageType: emp.wageType,
                            wageAmount: emp.wageAmount,
                            workStartTime: emp.workStartTime,
                            workEndTime: emp.workEndTime
                          });
                        }} className="p-2 text-gray-400 hover:text-indigo-600">
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(emp.id)} className="p-2 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
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
                          <option value="MONTHLY">{t.emp_wage_monthly || '월급'}</option>
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
                          {emp.wageType === 'HOURLY' ? t.emp_wage_hourly : emp.wageType === 'DAILY' ? t.emp_wage_daily : (t.emp_wage_monthly || '월급')} {emp.wageAmount.toLocaleString()}{emp.store?.currency || '원'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs mb-0.5">{t.emp_form_role}</span>
                        <span className="font-bold text-gray-900">
                          {emp.role === 'MANAGER' ? (t.emp_role_manager || '매니저') : (t.emp_role_staff || '스태프')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs mb-0.5">{t.emp_work_time || '근무 시간'}</span>
                        <span className="font-bold text-gray-900">
                          {emp.workStartTime} ~ {emp.workEndTime}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {!editingId && (emp.histories?.length ?? 0) > 0 && (
                  <div className="p-4 bg-white border-t border-gray-50">
                    <span className="text-gray-500 block text-xs mb-2 font-bold flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {t.emp_history_title}
                    </span>
                    <ul className="space-y-1.5 pl-1 border-l-2 border-indigo-100 ml-1">
                      {(emp.histories ?? []).map((hist, index) => (
                        <li key={hist.id} className="relative text-xs text-gray-700 pl-3">
                          <span className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full border-2 border-white ${hist.resignedAt ? 'bg-gray-400' : 'bg-green-500'}`}></span>
                          <span className="font-bold text-gray-900 mr-1.5">[{(emp.histories?.length ?? 0) - index}{t.emp_history_nth_join}]</span>
                          <span>
                            {new Date(hist.joinedAt).toLocaleDateString()} ~{' '}
                            {hist.resignedAt ? (
                              <span className="text-gray-500">{new Date(hist.resignedAt).toLocaleDateString()} {t.emp_history_resigned}</span>
                            ) : (
                              <span className="text-green-600 font-bold bg-green-50 px-1 py-0.5 rounded">{t.emp_history_working}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
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
                      {statsEmployeeId === emp.id ? '통계 접기 ▲' : '출결/급여 통계 보기 ▼'}
                    </button>
                  </div>
                )}

                {/* Stats View Area */}
                {statsEmployeeId === emp.id && (
                  <div className="p-4 bg-gray-50/80 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 text-sm">월별 출퇴근 기록</h3>
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
                      <div className="py-8 text-center text-gray-500 text-sm">불러오는 중...</div>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm mb-4">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-100 text-gray-600">
                              <tr>
                                <th className="px-4 py-2 font-semibold">날짜</th>
                                <th className="px-4 py-2 font-semibold">출근</th>
                                <th className="px-4 py-2 font-semibold">퇴근</th>
                                <th className="px-4 py-2 font-semibold">상태</th>
                                <th className="px-4 py-2 font-semibold text-right">근무 시간</th>
                                <th className="px-4 py-2 font-semibold text-right">당일 급여</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {employeeStats.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">기록이 없습니다.</td>
                                </tr>
                              ) : (
                                employeeStats.map((att) => (
                                  <tr key={att.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-gray-900 font-medium">{att.date.split('-').slice(1).join('/')}</td>
                                    <td className="px-4 py-3 text-gray-600">{att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                                    <td className="px-4 py-3 text-gray-600">{att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                                        att.status === 'NORMAL' ? 'bg-green-100 text-green-700' :
                                        att.status === 'LATE' ? 'bg-red-100 text-red-700' :
                                        att.status === 'EARLY_LEAVE' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {att.status === 'NORMAL' ? '정상' : att.status === 'LATE' ? '지각' : att.status === 'EARLY_LEAVE' ? '조퇴' : '결근'}
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
                          <span className="text-sm font-bold text-indigo-800">예상 급여 요약 (해당 월)</span>
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
