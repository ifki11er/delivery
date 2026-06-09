'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function EmployeeOnlyGate({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    if (pathname === '/employee/dashboard') return;
    router.replace('/employee/dashboard');
  }, [enabled, pathname, router]);

  if (enabled && pathname !== '/employee/dashboard') {
    return <div className="p-8 text-center text-gray-500">출퇴근 페이지로 이동 중입니다.</div>;
  }

  return <>{children}</>;
}
