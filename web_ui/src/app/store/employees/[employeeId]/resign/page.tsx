'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';
import { StoreRequiredNotice } from '@/components/store/StoreRequiredNotice';
import { useStores } from '@/components/providers/StoreProvider';
import type { EmployeeRow } from '@/types/store-management';

const EMPLOYEE_REFRESH_KEY = 'store_employees_force_refresh_store_id';

const REASONS = ['개인사정', '무단결근', '근무태도', '급여조건', '계약종료', '기타'];

function displayName(employee?: EmployeeRow | null) {
  if (!employee) return '';
  return employee.user.name || employee.user.email?.split('@')[0] || employee.phoneNumber || '-';
}

export default function ResignEmployeePage() {
  const router = useRouter();
  const params = useParams<{ employeeId: string }>();
  const searchParams = useSearchParams();
  const { stores, loading: storesLoading } = useStores();
  const employeeId = params.employeeId;
  const [storeId, setStoreId] = useState(searchParams.get('storeId') || '');
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storesLoading && stores.length > 0 && !storeId) {
      setStoreId(stores[0].id);
    }
  }, [storeId, stores, storesLoading]);

  useEffect(() => {
    if (!storeId || !employeeId) return;
    const loadEmployee = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/store/employees?storeId=${storeId}`);
        if (!res.ok) return;
        const rows = await res.json() as EmployeeRow[];
        setEmployee(rows.find((row) => row.id === employeeId) ?? null);
      } finally {
        setLoading(false);
      }
    };
    void loadEmployee();
  }, [employeeId, storeId]);

  const submit = async () => {
    if (!employeeId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/store/employees?employeeId=${employeeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || null, note: note.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '퇴사 처리에 실패했습니다.');
        return;
      }
      alert('퇴사 처리가 완료되었습니다.');
      window.sessionStorage.setItem(EMPLOYEE_REFRESH_KEY, storeId);
      router.replace(`/store/employees?storeId=${encodeURIComponent(storeId)}`);
    } catch {
      alert('퇴사 처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!storesLoading && stores.length === 0) return <StoreRequiredNotice />;

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <PageHeader title="퇴사 처리" subtitle={loading ? '' : displayName(employee)} icon={<AlertTriangle className="w-5 h-5" />} />
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <section className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm space-y-5">
          <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            퇴사 처리하면 직원 로그인 이메일과 비밀번호는 삭제되고, 근태 히스토리는 보존됩니다.
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-600">퇴사 사유</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-bold"
            >
              <option value="">선택 안 함</option>
              {REASONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-600">한마디</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              placeholder="필요한 경우 의견을 남겨주세요."
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </label>

          <Button type="button" onClick={submit} disabled={saving || loading || !employee} className="w-full h-12 bg-red-600 hover:bg-red-700">
            {saving ? '처리 중...' : '퇴사 처리'}
          </Button>
        </section>
      </div>
    </div>
  );
}
