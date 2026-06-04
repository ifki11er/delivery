'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useI18n, useLocale } from '@/i18n/I18nProvider';
import { MapPin, Clock, LogIn, LogOut, CheckCircle2, ChevronLeft } from 'lucide-react';

type AttendanceRecord = {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workMinutes: number;
  status: 'NORMAL' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT';
};

type AttendanceResponse = {
  attendances: AttendanceRecord[];
  todayAttendance: AttendanceRecord | null;
};

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const t = useI18n();
  const locale = useLocale();
  const { data: session } = useSession();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);

  const fetchAttendances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/store/attendance?month=${month}&includeToday=true`);
      if (res.ok) {
        const data = (await res.json()) as AttendanceResponse;
        setAttendances(data.attendances);
        setTodayAttendance(data.todayAttendance);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    if (session) void fetchAttendances();
  }, [fetchAttendances, session]);

  const handleAttendance = async (action: 'CHECK_IN' | 'CHECK_OUT') => {
    try {
      const res = await fetch('/api/store/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const savedAttendance = (await res.json()) as AttendanceRecord;
        setTodayAttendance(savedAttendance);
        setAttendances((current) => {
          const exists = current.some((item) => item.id === savedAttendance.id);
          if (exists) return current.map((item) => item.id === savedAttendance.id ? savedAttendance : item);
          return [savedAttendance, ...current];
        });
        alert(action === 'CHECK_IN' ? t.emp_check_in_msg : t.emp_check_out_msg);
        await fetchAttendances();
        return;
      }

      const err = await res.json();
      alert(t.error_with_message.replace('{error}', err.error));
    } catch {
      alert(t.emp_error_msg);
    }
  };

  if (loading && attendances.length === 0) {
    return <div className="p-8 text-center text-gray-500">{t.mypage_loading}</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
      <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center space-x-2">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="font-bold text-lg text-gray-900">{t.mypage_emp_dash}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 mt-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center">
          <h2 className="text-gray-500 font-bold mb-4 flex items-center justify-center">
            <MapPin className="w-4 h-4 mr-1 text-indigo-500" />
            {t.emp_wifi_notice}
          </h2>

          <div className="flex space-x-3">
            <button
              onClick={() => handleAttendance('CHECK_IN')}
              disabled={!!todayAttendance?.checkInTime}
              className={`flex-1 py-5 rounded-2xl font-black text-lg flex flex-col items-center justify-center transition-all ${
                todayAttendance?.checkInTime
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
              }`}
            >
              <LogIn className="w-8 h-8 mb-2" />
              {t.emp_check_in}
            </button>
            <button
              onClick={() => handleAttendance('CHECK_OUT')}
              disabled={!todayAttendance?.checkInTime || !!todayAttendance?.checkOutTime}
              className={`flex-1 py-5 rounded-2xl font-black text-lg flex flex-col items-center justify-center transition-all ${
                !todayAttendance?.checkInTime || todayAttendance?.checkOutTime
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-rose-500 text-white hover:bg-rose-600 shadow-md hover:shadow-lg'
              }`}
            >
              <LogOut className="w-8 h-8 mb-2" />
              {t.emp_check_out}
            </button>
          </div>

          {todayAttendance?.checkInTime && (
            <div className="mt-5 p-3 bg-indigo-50 rounded-xl flex items-center justify-center text-sm font-bold text-indigo-700">
              <CheckCircle2 className="w-5 h-5 mr-2 text-indigo-500" />
              {t.emp_check_in_done} {new Date(todayAttendance.checkInTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">{t.emp_work_history}</h3>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            {attendances.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">{t.emp_no_history}</div>
            ) : (
              attendances.map((att) => (
                <div key={att.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-gray-500 text-xs block mb-1">{att.date}</span>
                    <div className="font-bold text-gray-900 flex items-center">
                      {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      <span className="mx-2 text-gray-300">~</span>
                      {att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                      att.status === 'NORMAL' ? 'bg-green-100 text-green-700' :
                      att.status === 'LATE' ? 'bg-red-100 text-red-700' :
                      att.status === 'EARLY_LEAVE' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {att.status === 'NORMAL' ? t.emp_status_normal : att.status === 'LATE' ? t.emp_status_late : att.status === 'EARLY_LEAVE' ? t.emp_status_early : t.emp_status_absent}
                    </span>
                    {att.checkOutTime && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center justify-end">
                        <Clock className="w-3 h-3 mr-1" />
                        {t.work_duration_short.replace('{h}', String(Math.floor(att.workMinutes / 60))).replace('{m}', String(att.workMinutes % 60))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
