'use client';

import React, { useState } from 'react';
import { Users, Store, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminClient({ totalUsers, totalOwners, allApps: initialApps }: any) {
  const [apps, setApps] = useState(initialApps);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

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
        // 상태를 업데이트해서 다른 탭으로 이동하게 만듦
        setApps((prev: any) => 
          prev.map((app: any) => app.id === id ? { ...app, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : app)
        );
        if (expandedId === id) setExpandedId(null);
      } else {
        alert('처리에 실패했습니다.');
      }
    } catch (e) {
      alert('오류가 발생했습니다.');
    } finally {
      setLoadingId(null);
    }
  };

  const filteredApps = apps.filter((app: any) => app.status === filter);
  const pendingCount = apps.filter((app: any) => app.status === 'PENDING').length;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 pb-20">
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
          <div><p className="text-sm text-gray-500">승인 대기 건수</p><p className="text-2xl font-bold">{pendingCount}건</p></div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 flex overflow-x-auto">
          <button 
            onClick={() => setFilter('PENDING')}
            className={`flex-1 min-w-[120px] py-4 text-center font-bold text-sm transition-colors border-b-2 ${filter === 'PENDING' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
          >
            승인 대기 ({pendingCount})
          </button>
          <button 
            onClick={() => setFilter('APPROVED')}
            className={`flex-1 min-w-[120px] py-4 text-center font-bold text-sm transition-colors border-b-2 ${filter === 'APPROVED' ? 'border-green-600 text-green-600 bg-green-50/30' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
          >
            승인 완료
          </button>
          <button 
            onClick={() => setFilter('REJECTED')}
            className={`flex-1 min-w-[120px] py-4 text-center font-bold text-sm transition-colors border-b-2 ${filter === 'REJECTED' ? 'border-red-600 text-red-600 bg-red-50/30' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
          >
            반려 내역
          </button>
        </div>
        
        {filteredApps.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {filter === 'PENDING' ? '현재 대기 중인 신청건이 없습니다.' : filter === 'APPROVED' ? '승인된 내역이 없습니다.' : '반려된 내역이 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">신청자</th>
                  <th className="px-6 py-4">상호명</th>
                  <th className="px-6 py-4">사업자번호</th>
                  <th className="px-6 py-4 text-right">신청일자</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApps.map((app: any) => (
                  <React.Fragment key={app.id}>
                    <tr 
                      onClick={() => toggleExpand(app.id)}
                      className={`transition-colors cursor-pointer ${expandedId === app.id ? 'bg-indigo-50/50' : 'hover:bg-gray-50/50'}`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{app.user.name || '이름 없음'}</p>
                        <p className="text-xs text-gray-500">{app.user.email}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-indigo-600">{app.businessName}</td>
                      <td className="px-6 py-4 text-gray-600">{app.businessRegNo}</td>
                      <td className="px-6 py-4 text-right text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                    </tr>
                    
                    {/* 확장된 상세 정보 영역 */}
                    {expandedId === app.id && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan={4} className="px-6 py-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 상세 정보 */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-bold text-gray-900 border-b pb-2">신청 상세 정보</h3>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div className="text-gray-500">대표자명</div>
                                <div className="col-span-2 font-medium">{app.representativeName || '-'}</div>
                                
                                <div className="text-gray-500">연락처</div>
                                <div className="col-span-2 font-medium">{app.contact || '-'}</div>
                                
                                <div className="text-gray-500">상점 주소</div>
                                <div className="col-span-2 font-medium">{app.address || '-'}</div>
                              </div>

                              {filter === 'PENDING' ? (
                                <div className="pt-4 flex gap-3">
                                  <button
                                    onClick={() => handleAction(app.id, 'APPROVE')}
                                    disabled={loadingId === app.id}
                                    className="flex-1 flex justify-center items-center px-4 py-2.5 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 disabled:opacity-50 transition-colors shadow-sm"
                                  >
                                    <CheckCircle className="w-5 h-5 mr-2" /> 입점 승인하기
                                  </button>
                                  <button
                                    onClick={() => handleAction(app.id, 'REJECT')}
                                    disabled={loadingId === app.id}
                                    className="flex-1 flex justify-center items-center px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 disabled:opacity-50 transition-colors shadow-sm"
                                  >
                                    <XCircle className="w-5 h-5 mr-2" /> 반려
                                  </button>
                                </div>
                              ) : (
                                <div className="pt-4">
                                  <div className={`flex items-center justify-center py-3 rounded-lg font-bold ${filter === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {filter === 'APPROVED' ? (
                                      <><CheckCircle className="w-5 h-5 mr-2" /> 이미 승인된 항목입니다</>
                                    ) : (
                                      <><XCircle className="w-5 h-5 mr-2" /> 반려 처리된 항목입니다</>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* 첨부 서류 (사업자등록증) */}
                            <div>
                              <h3 className="text-sm font-bold text-gray-900 border-b pb-2 mb-4">사업자등록증 사본</h3>
                              {app.imageUrl ? (
                                <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm h-48 flex items-center justify-center">
                                  <img 
                                    src={app.imageUrl} 
                                    alt="사업자등록증" 
                                    className="max-h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(app.imageUrl, '_blank')}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      e.currentTarget.parentElement?.classList.add('flex-col');
                                    }}
                                  />
                                  <div className="text-center p-4">
                                    <p className="text-xs text-gray-500 mb-2">클릭하여 원본 보기</p>
                                    <button 
                                      onClick={() => window.open(app.imageUrl, '_blank')}
                                      className="text-indigo-600 font-medium text-sm hover:underline"
                                    >
                                      파일 열기
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-48 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm bg-gray-50">
                                  첨부된 파일이 없습니다.
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
