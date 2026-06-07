'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: string;
};

export default function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  maxWidth = 'max-w-2xl',
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
      <div className={`${maxWidth} mx-auto px-4 py-4 flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          {icon ? <div className="text-gray-700 shrink-0">{icon}</div> : null}
          <div className="min-w-0">
            <h1 className="font-bold text-lg text-gray-900 truncate">{title}</h1>
            {subtitle ? <p className="text-xs text-gray-500 truncate">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
