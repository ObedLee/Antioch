'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { fastingService, FastingSchedule, simpleUserService, getRegions, ensureRegion } from '@/lib/firestore';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast, { Toaster } from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  const truncated = numbers.slice(0, 11);
  if (truncated.length <= 3) return truncated;
  if (truncated.length <= 7) return `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
  return `${truncated.slice(0, 3)}-${truncated.slice(3, 7)}-${truncated.slice(7)}`;
};

export default function PrayerPage() {
  const { simpleUser, simpleLogin, simpleLogout, isLoading } = useSimpleAuth();
  const router = useRouter();

  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showRegionSelect, setShowRegionSelect] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [pendingProfile, setPendingProfile] = useState<{ name: string; phoneNumber: string } | null>(null);

  const [schedules, setSchedules] = useState<FastingSchedule[]>([]);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [existingRegistrationId, setExistingRegistrationId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getRegions().then(setRegions);
  }, []);

  const loadData = useCallback(async () => {
    if (!simpleUser) return;
    setDataLoading(true);
    try {
      const activeSchedules = await fastingService.getActiveSchedules();
      activeSchedules.sort((a, b) => {
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
      setSchedules(activeSchedules);

      const reg = await fastingService.getRegistration(simpleUser.name, simpleUser.phoneNumber);
      if (reg) {
        setSelectedScheduleIds(reg.scheduleIds || []);
        setExistingRegistrationId(reg.id);
      } else {
        setSelectedScheduleIds([]);
        setExistingRegistrationId(null);
      }
    } catch (error) {
      console.error('[Prayer] data load error:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setDataLoading(false);
    }
  }, [simpleUser]);

  useEffect(() => {
    if (simpleUser) loadData();
  }, [simpleUser, loadData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim() || !loginPhone.trim()) {
      toast.error('이름과 연락처를 입력해주세요.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const profile = await simpleUserService.getProfile(loginName.trim(), loginPhone.trim());
      if (profile && profile.region) {
        simpleLogin(profile.name, profile.phoneNumber, profile.region, profile.id);
        setLoginName('');
        setLoginPhone('');
      } else {
        setPendingProfile({ name: loginName.trim(), phoneNumber: loginPhone.trim() });
        setShowRegionSelect(true);
      }
    } catch (error) {
      console.error('[Prayer] login error:', error);
      toast.error('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegionSubmit = async () => {
    if (!pendingProfile || !selectedRegion) {
      toast.error('소속을 선택해주세요.');
      return;
    }
    setIsLoggingIn(true);
    const loadingToast = toast.loading('처리 중...', { position: 'top-center' });
    try {
      let profileId = '';
      const existing = await simpleUserService.getProfile(pendingProfile.name, pendingProfile.phoneNumber);
      if (existing) {
        await simpleUserService.updateProfile(existing.id, { region: selectedRegion });
        profileId = existing.id;
      } else {
        const newProfile = await simpleUserService.createProfile({
          name: pendingProfile.name,
          phoneNumber: pendingProfile.phoneNumber,
          region: selectedRegion,
        });
        profileId = newProfile?.id || '';
      }
      await ensureRegion(selectedRegion);

      const vSnap = await getDocs(query(
        collection(db, 'vehicles'),
        where('ownerName', '==', pendingProfile.name),
        where('phoneNumber', '==', pendingProfile.phoneNumber)
      ));
      for (const d of vSnap.docs) {
        await updateDoc(doc(db, 'vehicles', d.id), { region: selectedRegion });
      }

      simpleLogin(pendingProfile.name, pendingProfile.phoneNumber, selectedRegion, profileId);
      toast.success('로그인되었습니다.', { id: loadingToast, position: 'top-center' });
      setShowRegionSelect(false);
      setPendingProfile(null);
      setSelectedRegion('');
      setLoginName('');
      setLoginPhone('');
    } catch (error) {
      console.error('[Prayer] region submit error:', error);
      toast.error('소속 저장 중 오류가 발생했습니다.', { id: loadingToast, position: 'top-center' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleToggleSchedule = (scheduleId: string) => {
    setSelectedScheduleIds(prev =>
      prev.includes(scheduleId)
        ? prev.filter(id => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const handleSubmit = async () => {
    if (!simpleUser) return;
    if (selectedScheduleIds.length === 0) {
      toast.error('최소 하나 이상의 조를 선택해주세요.');
      return;
    }
    setIsSubmitting(true);
    const loadingToast = toast.loading('등록 중...', { position: 'top-center' });
    try {
      await fastingService.upsertRegistration({
        userName: simpleUser.name,
        phoneNumber: simpleUser.phoneNumber,
        region: simpleUser.region,
        scheduleIds: selectedScheduleIds,
      });
      toast.success(
        existingRegistrationId ? '금식기도 등록이 수정되었습니다.' : '금식기도 등록이 완료되었습니다.',
        { id: loadingToast, position: 'top-center' }
      );
      loadData();
    } catch (error) {
      console.error('[Prayer] submit error:', error);
      toast.error('등록 중 오류가 발생했습니다.', { id: loadingToast, position: 'top-center' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    simpleLogout();
    setSelectedScheduleIds([]);
    setExistingRegistrationId(null);
    setSchedules([]);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="md" showVerse={false} />
      </div>
    );
  }

  if (!simpleUser) {
    return (
      <>
        <Toaster position="top-center" />
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex flex-col items-center">
              <img src="/images/아이콘.png" alt="안디옥교회" className="w-16 h-16 mb-4 object-contain" />
              <h2 className="text-center text-3xl font-extrabold text-gray-900">안디옥교회</h2>
              <p className="mt-2 text-center text-sm text-gray-600">금식기도 등록</p>
            </div>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              {showRegionSelect ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">소속을 선택해주세요</label>
                    <select
                      value={selectedRegion}
                      onChange={e => setSelectedRegion(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 py-2 px-3 sm:text-sm"
                    >
                      <option value="">소속 선택</option>
                      {regions.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleRegionSubmit}
                    disabled={isLoggingIn || !selectedRegion}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoggingIn ? '처리 중...' : '확인'}
                  </button>
                  <button
                    onClick={() => { setShowRegionSelect(false); setPendingProfile(null); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    뒤로
                  </button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleLogin}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                    <input
                      type="text"
                      value={loginName}
                      onChange={e => setLoginName(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 py-2 px-3 sm:text-sm"
                      placeholder="이름 입력"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                    <input
                      type="tel"
                      value={loginPhone}
                      onChange={e => setLoginPhone(formatPhoneNumber(e.target.value))}
                      className="block w-full rounded-md border border-gray-300 py-2 px-3 sm:text-sm"
                      placeholder="010-0000-0000"
                      maxLength={13}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoggingIn ? '로그인 중...' : '로그인'}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 홈으로</Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <img src="/images/아이콘.png" alt="안디옥교회" className="w-10 h-10 mr-3 object-contain" />
                <div className="flex flex-col leading-none">
                  <span className="text-sm font-semibold text-blue-600">안디옥교회</span>
                  <span className="text-lg font-bold text-gray-900">금식기도 등록</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {simpleUser.name} · {simpleUser.phoneNumber} · {simpleUser.region || '소속미설정'}
                </span>
                <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800">
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="sm:hidden mb-4 text-sm text-gray-600 bg-white rounded-lg px-4 py-2 shadow-sm">
            {simpleUser.name} · {simpleUser.phoneNumber} · {simpleUser.region || '소속미설정'}
          </div>

          {dataLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" showVerse={false} />
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-900">현재 등록 가능한 금식기도 조가 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">관리자가 조를 추가하면 등록할 수 있습니다.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">참여할 조를 선택하세요</h2>
                <p className="text-sm text-gray-600">
                  여러 조를 선택할 수 있습니다. {existingRegistrationId && '기존 등록을 수정합니다.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {schedules.map(schedule => {
                  const isSelected = selectedScheduleIds.includes(schedule.id);
                  const mealColor = schedule.meal === '아침'
                    ? 'bg-amber-400'
                    : schedule.meal === '점심'
                    ? 'bg-orange-400'
                    : 'bg-indigo-400';
                  return (
                    <button
                      key={schedule.id}
                      onClick={() => handleToggleSchedule(schedule.id)}
                      className={`relative rounded-xl p-4 text-center transition-all duration-200 ${
                        isSelected
                          ? `${mealColor} text-white shadow-lg scale-105`
                          : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {schedule.group}
                      </div>
                      <div className={`text-sm mt-1 ${isSelected ? 'text-white/90' : 'text-gray-600'}`}>
                        {schedule.day}
                      </div>
                      <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                        {schedule.meal}
                      </div>
                      {schedule.description && (
                        <div className={`text-xs mt-1 ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                          {schedule.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 py-4 px-4 -mx-4 sm:mx-0 sm:rounded-lg sm:shadow-md mt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedScheduleIds.length}개 조 선택됨
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || selectedScheduleIds.length === 0}
                    className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? '등록 중...' : existingRegistrationId ? '수정하기' : '등록하기'}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 홈으로</Link>
          </div>
        </div>
      </div>
    </>
  );
}
