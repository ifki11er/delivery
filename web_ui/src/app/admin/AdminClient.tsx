'use client';

import { useState } from 'react';
import { Users, Store, FileText, CheckCircle, XCircle } from 'lucide-react';

export default function AdminClient({ totalUsers, totalOwners, pendingApps: initialApps }: any) {
  const [apps, setApps] = useState(initialApps);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    if (!confirm(action === 'APPROVE' ? '승인하시겠습니까?' : '반려하시겠습니까?')) return;
    
    setLoadingId(id);
    try {
      const res = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });

      if (res.ok) {
        alert('처리되었습니다.');
        // 목록에서 제거
        setApps((prev: any) => prev.filter((app: any) => app.id !== id));
      } else {
        alert('처리에 실패했습니다.');
      }
    } catch (e) {
      alert('오류가 발생했습니다.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">본사 관리자 대시보드</h1>
        <p className="text-gray-500 mt-2">플랫폼 전체의 사업자 입점 승인 및 통계를 관리합니다.</p>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Users className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500">전체 가입자 수</p><p className="text-2xl font-bold">{totalUsers}명</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl"><Store className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500">입점 완료 사장님 수</p><p className="text-2xl font-bold">{totalOwners}명</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><FileText className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500">승인 대기 건수</p><p className="text-2xl font-bold">{apps.length}건</p></div>
        </div>
      </div>

      {/* 승인 대기 목록 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">사업자 입점 승인 대기 ({apps.length})</h2>
        </div>
        
        {apps.length === 0 ? (
          <div className="p-12 text-center text-gray-500">현재 대기 중인 신청건이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">신청자</th>
                  <th className="px-6 py-4">상호명</th>
                  <th className="px-6 py-4">사업자번호</th>
                  <th className="px-6 py-4">신청일자</th>
                  <th className="px-6 py-4 text-right">관리(승인/반려)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {apps.map((app: any) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{app.user.name || '이름 없음'}</p>
                      <p className="text-xs text-gray-500">{app.user.email}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-600">{app.businessName}</td>
                    <td className="px-6 py-4 text-gray-600">{app.businessRegNo}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleAction(app.id, 'APPROVE')}
                          disabled={loadingId === app.id}
                          className="flex items-center px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> 승인
                        </button>
                        <button
                          onClick={() => handleAction(app.id, 'REJECT')}
                          disabled={loadingId === app.id}
                          className="flex items-center px-3 py-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200 disabled:opacity-50 transition-colors"
                        >
                          <XCircle className="w-4 h-4 mr-1" /> 반려
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
