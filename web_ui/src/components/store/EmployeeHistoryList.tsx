import { Clock } from "lucide-react";
import type { EmployeeHistory } from "@/types/store-management";
import type { Dictionary } from "@/i18n/dictionaries";

export function EmployeeHistoryList({ histories, t }: { histories: EmployeeHistory[]; t: Dictionary }) {
  if (histories.length === 0) return null;

  return (
    <div className="p-4 bg-white border-t border-gray-50">
      <span className="text-gray-500 block text-xs mb-2 font-bold flex items-center">
        <Clock className="w-3 h-3 mr-1" /> {t.emp_history_title}
      </span>
      <ul className="space-y-1.5 pl-1 border-l-2 border-indigo-100 ml-1">
        {histories.map((history, index) => (
          <li key={history.id} className="relative text-xs text-gray-700 pl-3">
            <span className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full border-2 border-white ${history.resignedAt ? "bg-gray-400" : "bg-green-500"}`} />
            <span className="font-bold text-gray-900 mr-1.5">
              [{histories.length - index}
              {t.emp_history_nth_join}]
            </span>
            <span>
              {new Date(history.joinedAt).toLocaleDateString()} ~{" "}
              {history.resignedAt ? (
                <span className="text-gray-500">
                  {new Date(history.resignedAt).toLocaleDateString()} {t.emp_history_resigned}
                </span>
              ) : (
                <span className="text-green-600 font-bold bg-green-50 px-1 py-0.5 rounded">{t.emp_history_working}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
