'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { fastingService, FastingSchedule, FastingRegistration, FastingSettings } from '@/lib/firestore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function PrayerAdminPage() {
  const [schedules, setSchedules] = useState<FastingSchedule[]>([]);
  const [registrations, setRegistrations] = useState<FastingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScheduleId, setFilterScheduleId] = useState<string | null>(null);
  const [maxCapacity, setMaxCapacity] = useState<number>(0);
  const [capacityInput, setCapacityInput] = useState<string>('');
  const [savingCapacity, setSavingCapacity] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allSchedules, allRegs, settings] = await Promise.all([
        fastingService.getAllSchedules(),
        fastingService.getAllRegistrations(),
        fastingService.getSettings(),
      ]);
      allSchedules.sort((a, b) => {
        const ga = parseInt(a.group) || 0;
        const gb = parseInt(b.group) || 0;
        if (ga !== gb) return ga - gb;
        const dayOrder = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
        const da = dayOrder.indexOf(a.day);
        const db = dayOrder.indexOf(b.day);
        if (da !== db) return da - db;
        const mealOrder = ['아침', '점심', '저녁'];
        return mealOrder.indexOf(a.meal) - mealOrder.indexOf(b.meal);
      });
      setSchedules(allSchedules);

      allRegs.sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || 0;
        const bt = b.createdAt?.toMillis?.() || 0;
        return bt - at;
      });
      setRegistrations(allRegs);
      setMaxCapacity(settings?.maxCapacity || 0);
      setCapacityInput(settings?.maxCapacity ? String(settings.maxCapacity) : '');
    } catch (error) {
      console.error('[Prayer Admin] data load error:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const scheduleMap = new Map(schedules.map(s => [s.id, s]));

  const getScheduleLabel = (id: string) => {
    const s = scheduleMap.get(id);
    if (!s) return '알 수 없음';
    return `${s.group} · ${s.day} · ${s.meal}`;
  };

  const filteredRegistrations = registrations.filter(r => {
    if (filterScheduleId && !r.scheduleIds.includes(filterScheduleId)) return false;
    const term = searchTerm.toLowerCase();
    return (
      r.userName.toLowerCase().includes(term) ||
      r.phoneNumber.includes(term) ||
      (r.region || '').toLowerCase().includes(term)
    );
  });

  const handleDeleteRegistration = async (id: string) => {
    if (!confirm('이 등록을 삭제하시겠습니까?')) return;
    const loadingToast = toast.loading('삭제 중...', { position: 'top-center' });
    try {
      await fastingService.deleteRegistration(id);
      setRegistrations(prev => prev.filter(r => r.id !== id));
      toast.success('삭제되었습니다.', { id: loadingToast, position: 'top-center' });
    } catch (error) {
      console.error('[Prayer Admin] delete error:', error);
      toast.error('삭제 중 오류가 발생했습니다.', { id: loadingToast, position: 'top-center' });
    }
  };

  const handleExportExcel = () => {
    const excelData = filteredRegistrations.map(r => ({
      이름: r.userName,
      연락처: r.phoneNumber,
      소속: r.region || '',
      선택조: r.scheduleIds.map(id => getScheduleLabel(id)).join(', '),
      선택수: r.scheduleIds.length,
      등록일: r.createdAt?.toDate?.()?.toLocaleString('ko-KR') || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 50 }, { wch: 8 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, '금식기도 등록현황');
    const now = new Date();
    const today = now.toLocaleDateString('ko-KR').replace(/\./g, '').replace(/ /g, '');
    XLSX.writeFile(wb, `안디옥교회_금식기도등록현황_${today}.xlsx`);
    toast.success(`엑셀 파일이 다운로드되었습니다. (총 ${filteredRegistrations.length}건)`);
  };

  const handleSaveCapacity = async () => {
    const val = parseInt(capacityInput) || 0;
    if (val <= 0) {
      toast.error('1 이상의 숫자를 입력해주세요.');
      return;
    }
    setSavingCapacity(true);
    const loadingToast = toast.loading('저장 중...', { position: 'top-center' });
    try {
      await fastingService.saveSettings(val);
      setMaxCapacity(val);
      toast.success('조별 최대 인원이 설정되었습니다.', { id: loadingToast, position: 'top-center' });
    } catch (error) {
      console.error('[Prayer Admin] save capacity error:', error);
      toast.error('저장 중 오류가 발생했습니다.', { id: loadingToast, position: 'top-center' });
    } finally {
      setSavingCapacity(false);
    }
  };

  const totalSelections = registrations.reduce((sum, r) => sum + r.scheduleIds.length, 0);

  const scheduleCountMap = new Map<string, number>();
  registrations.forEach(r => {
    r.scheduleIds.forEach(id => {
      scheduleCountMap.set(id, (scheduleCountMap.get(id) || 0) + 1);
    });
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="md" showVerse={false} />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">금식기도 관리</h2>
        <p className="text-sm text-gray-600 mt-1">
          총 {registrations.length}명 등록 · {totalSelections}개 조 선택
        </p>
      </div>

      {/* 조별 최대 인원 설정 */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">조별 최대 인원 설정</h3>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            value={capacityInput}
            onChange={e => setCapacityInput(e.target.value)}
            placeholder="예: 5"
            className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">명</span>
          <button
            onClick={handleSaveCapacity}
            disabled={savingCapacity}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {savingCapacity ? '저장 중...' : '저장'}
          </button>
          {maxCapacity > 0 && (
            <span className="text-sm text-gray-500 ml-2">
              현재: 조당 {maxCapacity}명
            </span>
          )}
        </div>
      </div>

      {/* 조별 현황 */}
      {schedules.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">조별 참여 현황</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {schedules.map(s => {
              const count = scheduleCountMap.get(s.id) || 0;
              const isActive = s.active;
              const isFiltered = filterScheduleId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setFilterScheduleId(isFiltered ? null : s.id)}
                  className={`rounded-lg p-3 text-center transition-all ${
                    isFiltered
                      ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-md scale-105'
                      : isActive
                      ? 'bg-blue-50 border border-blue-200 hover:border-blue-400 hover:shadow-sm'
                      : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`text-sm font-semibold ${isFiltered ? 'text-white' : 'text-gray-900'}`}>{s.group}</div>
                  <div className={`text-xs ${isFiltered ? 'text-white/80' : 'text-gray-600'}`}>{s.day} · {s.meal}</div>
                  <div className={`text-lg font-bold mt-1 ${isFiltered ? 'text-white' : count >= maxCapacity && maxCapacity > 0 ? 'text-red-600' : 'text-blue-600'}`}>{count}명{maxCapacity > 0 && <span className={`text-xs font-normal ${isFiltered ? 'text-white/70' : 'text-gray-400'}`}> / {maxCapacity}명</span>}</div>
                  {!isActive && <div className={`text-xs mt-1 ${isFiltered ? 'text-white/60' : 'text-gray-400'}`}>비활성</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 검색 + 엑셀 */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="이름, 연락처, 소속 검색"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {filterScheduleId && (
            <button
              onClick={() => setFilterScheduleId(null)}
              className="inline-flex items-center px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 whitespace-nowrap"
            >
              {getScheduleLabel(filterScheduleId)} ✕
            </button>
          )}
        </div>
        <button
          onClick={handleExportExcel}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 whitespace-nowrap"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          엑셀 다운로드
        </button>
      </div>

      {/* 등록 목록 */}
      {filteredRegistrations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">등록된 사용자가 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">이름</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">연락처</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">소속</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">선택 조</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">관리</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRegistrations.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{r.userName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.phoneNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.region || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {r.scheduleIds.map(id => {
                          const label = getScheduleLabel(id);
                          const s = scheduleMap.get(id);
                          const color = s?.meal === '아침'
                            ? 'bg-amber-100 text-amber-700'
                            : s?.meal === '점심'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-indigo-100 text-indigo-700';
                          return (
                            <span key={id} className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {r.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteRegistration(r.id)}
                        className="text-red-600 text-xs hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
