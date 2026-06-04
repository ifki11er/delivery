'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UserStatus } from '@prisma/client';
import type { AdminUserRow } from '@/types/admin';

export default function UserListClient({ users: initialUsers, filterType }: { users: AdminUserRow[], filterType: string }) {
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    if (newStatus === 'WITHDRAWN') {
      if (!confirm('정말로 이 회원을 탈퇴(WITHDRAWN) 처리하시겠습니까? 이 작업은 되돌리기 어려울 수 있습니다.')) return;
    } else {
      if (!confirm(`회원 상태를 ${newStatus}(으)로 변경하시겠습니까?`)) return;
    }

    setLoadingId(userId);
    try {
      const res = await fetch('/api/admin/users/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus }),
      });

      if (res.ok) {
        alert('상태가 변경되었습니다.');
        setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus, deletedAt: newStatus === 'WITHDRAWN' ? new Date() : null } : u));
        router.refresh();
      } else {
        const error = await res.json();
        alert(`변경 실패: ${error.error}`);
      }
    } catch {
      alert('오류가 발생했습니다.');
    } finally {
      setLoadingId(null);
    }
  };

  const getFilterTitle = () => {
    switch (filterType) {
      case 'active': return '활성 가입자';
      case 'suspended': return '정지 가입자';
      case 'withdrawn': return '탈퇴 가입자';
      case 'owner': return '사장님 회원';
      case 'customer': return '일반 고객';
      case 'admin': return '관리자';
      case 'employee': return '직원(알바생)';
      default: return '전체 가입자';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-20">
      <div className="flex items-center space-x-4">
        <Link href="/admin" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">{getFilterTitle()} 명단</h1>
          <p className="text-gray-500 mt-1">총 {users.length}명의 회원이 조회되었습니다.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 font-semibold">이름</th>
                <th className="py-4 px-6 font-semibold">이메일</th>
                <th className="py-4 px-6 font-semibold">연락처</th>
                <th className="py-4 px-6 font-semibold">권한</th>
                <th className="py-4 px-6 font-semibold">가입일</th>
                <th className="py-4 px-6 font-semibold">현재 상태 및 관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    해당하는 회원이 없습니다.
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900">{user.name || '이름 없음'}</td>
                    <td className="py-4 px-6 text-gray-500">{user.email}</td>
                    <td className="py-4 px-6 text-gray-500">{user.phoneNumber || '-'}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${user.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : user.role === 'ADMIN' ? 'bg-gray-100 text-gray-700' : user.role === 'EMPLOYEE' ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {/* 상태 아이콘 표시 */}
                        {user.status === 'ACTIVE' && <UserCheck className="w-5 h-5 text-green-500" />}
                        {user.status === 'SUSPENDED' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                        {user.status === 'WITHDRAWN' && <UserX className="w-5 h-5 text-red-500" />}
                        
                        {/* 상태 변경 셀렉트박스 */}
                        <select 
                          value={user.status}
                          disabled={loadingId === user.id}
                          onChange={(e) => handleStatusChange(user.id, e.target.value as UserStatus)}
                          className={`text-sm rounded-lg border-gray-200 font-medium focus:ring-indigo-500 focus:border-indigo-500 p-1.5 ${
                            user.status === 'ACTIVE' ? 'text-green-700 bg-green-50' : 
                            user.status === 'SUSPENDED' ? 'text-yellow-700 bg-yellow-50' : 
                            'text-red-700 bg-red-50'
                          }`}
                        >
                          <option value="ACTIVE">정상 (ACTIVE)</option>
                          <option value="SUSPENDED">정지 (SUSPENDED)</option>
                          <option value="WITHDRAWN">탈퇴 (WITHDRAWN)</option>
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
