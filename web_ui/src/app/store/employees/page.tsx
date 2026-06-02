'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Trash2, Edit3, Save } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export default function EmployeesPage() {
  const t = useI18n();
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [searchEmail, setSearchEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const fetchStoresAndEmployees = async () => {
    try {
      const resStores = await fetch('/api/store');
      if (resStores.ok) {
        const storesData = await resStores.json();
        setStores(storesData);
        if (storesData.length > 0) {
          const storeId = storesData[0].id;
          setSelectedStoreId(storeId);
          await fetchEmployees(storeId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async (storeId: string) => {
    try {
      const res = await fetch(`/api/store/employees?storeId=${storeId}`);
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStoresAndEmployees();
  }, []);

  const handleAddEmployee = async () => {
    if (!searchEmail) return alert('이메일을 입력하세요.');
    
    try {
      const res = await fetch('/api/store/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          storeId: selectedStoreId, 
          email: searchEmail,
          wageType: 'HOURLY',
          wageAmount: 10000,
          workStartTime: '09:00',
          workEndTime: '18:00'
        })
      });
      if (res.ok) {
        alert('직원이 등록되었습니다.');
        setSearchEmail('');
        setShowAddForm(false);
        fetchEmployees(selectedStoreId);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm('정말로 이 직원을 해고/삭제하시겠습니까? (과거 통계는 남습니다)')) return;
    
    try {
      const res = await fetch(`/api/store/employees?employeeId=${employeeId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('삭제되었습니다.');
        fetchEmployees(selectedStoreId);
      }
    } catch (e) {
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
        alert('저장되었습니다.');
        setEditingId(null);
        fetchEmployees(selectedStoreId);
      }
    } catch (e) {
      alert('오류가 발생했습니다.');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">로딩 중...</div>;

  if (stores.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        상점이 없습니다. [상점 관리]에서 먼저 상점을 등록해주세요.
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="font-bold text-lg text-gray-900">{t.employee_management}</h1>
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-indigo-600 p-2">
            <UserPlus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-6">
        
        {/* Add Employee Form */}
        {showAddForm && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-3 text-sm">직원 등록 (이메일 검색)</h2>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input 
                  type="email" 
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="가입된 이메일 주소"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <button 
                onClick={handleAddEmployee}
                className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
              >
                검색 및 추가
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">* 직원은 반드시 미리 앱에 가입되어 있어야 합니다.</p>
          </div>
        )}

        {/* Employee List */}
        <div className="space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-indigo-500" /> 소속 직원 ({employees.length}명)
          </h2>

          {employees.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              등록된 직원이 없습니다. 상단 + 버튼을 눌러 직원을 추가하세요.
            </div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 flex justify-between items-center bg-gray-50/50 border-b border-gray-50">
                  <div>
                    <span className="font-bold text-gray-900 text-lg">{emp.user.name || emp.user.email?.split('@')[0]}</span>
                    <span className="ml-2 text-xs text-gray-500">{emp.user.email}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => {
                      setEditingId(emp.id);
                      setEditForm({
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
                  </div>
                </div>

                {editingId === emp.id ? (
                  <div className="p-4 space-y-4 bg-indigo-50/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">급여 형태</label>
                        <select 
                          value={editForm.wageType}
                          onChange={e => setEditForm({...editForm, wageType: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                        >
                          <option value="HOURLY">시급 (Hourly)</option>
                          <option value="DAILY">일당 (Daily)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">금액 (원)</label>
                        <input 
                          type="number" 
                          value={editForm.wageAmount}
                          onChange={e => setEditForm({...editForm, wageAmount: Number(e.target.value)})}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">출근 예정 시간</label>
                        <input 
                          type="time" 
                          value={editForm.workStartTime}
                          onChange={e => setEditForm({...editForm, workStartTime: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">퇴근 예정 시간</label>
                        <input 
                          type="time" 
                          value={editForm.workEndTime}
                          onChange={e => setEditForm({...editForm, workEndTime: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-2">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-gray-500 font-bold">취소</button>
                      <button onClick={handleSaveEdit} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg font-bold flex items-center">
                        <Save className="w-4 h-4 mr-1" /> 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs mb-0.5">급여 설정</span>
                      <span className="font-bold text-gray-900">
                        {emp.wageType === 'HOURLY' ? '시급' : '일당'} {emp.wageAmount.toLocaleString()}원
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs mb-0.5">근무 스케줄</span>
                      <span className="font-bold text-gray-900">
                        {emp.workStartTime} ~ {emp.workEndTime}
                      </span>
                    </div>
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
