'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Calculator, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

type StoreSummary = {
  id: string;
};

type EmployeeStats = {
  employeeId: string;
  name: string | null;
  wageType: string;
  wageAmount: number;
  statistics: {
    totalHours: string;
    daysWorked: number;
    lateCount: number;
    earlyLeaveCount: number;
  };
  calculatedSalary: number;
};

type StatsResponse = {
  month: string;
  storeName: string;
  totalExpectedSalary: number;
  employees: EmployeeStats[];
};

export default function EmployeesStatsPage() {
  const t = useI18n();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!storeId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/store/statistics?storeId=${storeId}&month=${month}`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [month, storeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadStore() {
      try {
        const res = await fetch('/api/store');
        const data = (await res.json()) as StoreSummary[];
        if (cancelled) return;

        if (data.length > 0) {
          setStoreId(data[0].id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setLoading(false);
      }
    }

    void loadStore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  if (loading && !stats) {
    return <div className="p-8 text-center text-gray-500">{t.stats_loading}</div>;
  }

  if (!storeId) {
    return <div className="p-8 text-center text-gray-500">{t.manage_no_store}</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="font-bold text-lg text-gray-900">{t.stats_payroll_title}</h1>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-1.5 bg-gray-100 border-none rounded-lg text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer"
          />
        </div>
      </div>

      {stats && (
        <div className="max-w-2xl mx-auto px-4 space-y-4 mt-6">
          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-indigo-200 text-sm font-bold flex items-center mb-1">
              <Calculator className="w-4 h-4 mr-1" />
              {t.stats_total_labor_cost.replace('{month}', stats.month)}
            </p>
            <h2 className="text-3xl font-black">
              {stats.totalExpectedSalary.toLocaleString()} <span className="text-lg font-bold text-indigo-300">{t.currency_won}</span>
            </h2>
          </div>

          <h3 className="font-bold text-gray-900 pt-2">{t.stats_employee_details}</h3>

          {stats.employees.map((emp) => (
            <div key={emp.employeeId} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-between items-end border-b border-gray-50 pb-4 mb-4">
                <div>
                  <h4 className="font-bold text-lg text-gray-900">{emp.name || t.mypage_no_name}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {emp.wageType === 'HOURLY' ? t.emp_wage_hourly : t.emp_wage_daily} {emp.wageAmount.toLocaleString()}{t.currency_won}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-0.5">{t.emp_expected_salary}</p>
                  <p className="font-black text-xl text-indigo-600">
                    {emp.calculatedSalary.toLocaleString()}{t.currency_won}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-500 flex items-center justify-center mb-1">
                    <CalendarIcon className="w-3 h-3 mr-1" /> {t.stats_days_worked}
                  </p>
                  <p className="font-black text-gray-900">{emp.statistics.daysWorked}{t.count_days}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-500 flex items-center justify-center mb-1">
                    <Clock className="w-3 h-3 mr-1" /> {t.emp_stats_work_time}
                  </p>
                  <p className="font-black text-gray-900">{emp.statistics.totalHours}H</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-400 flex items-center justify-center mb-1">
                    <AlertCircle className="w-3 h-3 mr-1" /> {t.emp_status_late}
                  </p>
                  <p className="font-black text-red-600">{emp.statistics.lateCount}{t.count_times}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-orange-400 flex items-center justify-center mb-1">
                    <AlertCircle className="w-3 h-3 mr-1" /> {t.emp_status_early}
                  </p>
                  <p className="font-black text-orange-600">{emp.statistics.earlyLeaveCount}{t.count_times}</p>
                </div>
              </div>
            </div>
          ))}

          {stats.employees.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              {t.stats_no_employees}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
