'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Store, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StoreListClient({ stores: initialStores, filterType }: { stores: any[], filterType: string }) {
  const [stores, setStores] = useState(initialStores);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleStatusChange = async (storeId: string, newStatus: string) => {
    if (newStatus === 'CLOSED') {
      if (!confirm('정말로 이 가게를 폐업(CLOSED) 처리하시겠습니까? 관련 데이터가 노출되지 않을 수 있습니다.')) return;
    } else {
      if (!confirm(`가게 상태를 ${newStatus}(으)로 변경하시겠습니까?`)) return;
    }

    setLoadingId(storeId);
    try {
      const res = await fetch('/api/admin/stores/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, status: newStatus }),
      });

      if (res.ok) {
        alert('가게 상태가 성공적으로 변경되었습니다.');
        setStores(stores.map(s => s.id === storeId ? { ...s, status: newStatus } : s));
        router.refresh();
      } else {
        const error = await res.json();
        alert(`변경 실패: ${error.error}`);
      }
    } catch (e) {
      alert('오류가 발생했습니다.');
    } finally {
      setLoadingId(null);
    }
  };

  const getFilterTitle = () => {
    switch (filterType) {
      case 'active': return '운영 중인 가게';
      case 'suspended': return '일시 중지된 가게';
      case 'closed': return '폐업한 가게';
      default: return '전체 가게';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-20">
      <div className="flex items-center space-x-4">
        <Link href="/admin" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <Store className="w-8 h-8 text-indigo-600" />
            {getFilterTitle()} 명단
          </h1>
          <p className="text-gray-500 mt-1">총 {stores.length}개의 가게가 조회되었습니다.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 font-semibold">가게명</th>
                <th className="py-4 px-6 font-semibold">사장님 (소유자)</th>
                <th className="py-4 px-6 font-semibold">사업자 번호</th>
                <th className="py-4 px-6 font-semibold">가게 연락처</th>
                <th className="py-4 px-6 font-semibold">알바생 수</th>
                <th className="py-4 px-6 font-semibold">등록일</th>
                <th className="py-4 px-6 font-semibold">현재 상태 및 관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    해당하는 가게가 없습니다.
                  </td>
                </tr>
              ) : (
                stores.map(store => (
                  <tr key={store.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-900">{store.name}</td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-gray-900">{store.ownerName || '이름 없음'}</p>
                      <p className="text-xs text-gray-500">{store.ownerEmail}</p>
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      {store.businessRegNo || '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      {store.phoneNumber || '-'}
                    </td>
                    <td className="py-4 px-6 font-medium text-gray-600">
                      {store.employeeCount}명
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      {new Date(store.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {/* 상태 아이콘 표시 */}
                        {store.status === 'ACTIVE' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {store.status === 'SUSPENDED' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                        {store.status === 'CLOSED' && <XCircle className="w-5 h-5 text-gray-400" />}
                        
                        {/* 상태 변경 셀렉트박스 */}
                        <select 
                          value={store.status}
                          disabled={loadingId === store.id}
                          onChange={(e) => handleStatusChange(store.id, e.target.value)}
                          className={`text-sm rounded-lg border-gray-200 font-medium focus:ring-indigo-500 focus:border-indigo-500 p-1.5 ${
                            store.status === 'ACTIVE' ? 'text-green-700 bg-green-50' : 
                            store.status === 'SUSPENDED' ? 'text-yellow-700 bg-yellow-50' : 
                            'text-gray-700 bg-gray-100'
                          }`}
                        >
                          <option value="ACTIVE">운영 중 (ACTIVE)</option>
                          <option value="SUSPENDED">일시 중지 (SUSPENDED)</option>
                          <option value="CLOSED">폐업 (CLOSED)</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
