'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { vehicleService, fruitService, Vehicle, Fruit, simpleUserService, getRegions, ensureRegion, fastingService, FastingSchedule } from '@/lib/firestore';
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

export default function MyPage() {
  const { simpleUser, simpleLogin, simpleLogout, isLoading } = useSimpleAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const tabParam = searchParams.get('tab');

  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'vehicles' | 'prayer'>('vehicles');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [schedules, setSchedules] = useState<FastingSchedule[]>([]);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [existingRegistrationId, setExistingRegistrationId] = useState<string | null>(null);
  const [isSubmittingPrayer, setIsSubmittingPrayer] = useState(false);
  const [scheduleCounts, setScheduleCounts] = useState<Record<string, number>>({});
  const [maxCapacity, setMaxCapacity] = useState<number>(0);
  const [showRegionSelect, setShowRegionSelect] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [pendingProfile, setPendingProfile] = useState<{ name: string; phoneNumber: string } | null>(null);
  const [showMyRegionEdit, setShowMyRegionEdit] = useState(false);
  const [myNewRegion, setMyNewRegion] = useState('');
  const [isUpdatingRegion, setIsUpdatingRegion] = useState(false);

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingFruit, setEditingFruit] = useState<Fruit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [vehicleForm, setVehicleForm] = useState({
    ownerName: '',
    phoneNumber: '',
    secondaryPhoneNumber: '',
    carType: '',
    carNumber: '',
    notes: '',
  });

  const [fruitForm, setFruitForm] = useState({
    영접자: '',
    전도자: '',
    구분: '영접',
    만남날짜: '',
    만남장소: '',
    만남횟수: '',
    나이: '',
    연락처: '',
    영적상태: '',
  });

  const loadData = useCallback(async () => {
    if (!simpleUser) return;
    setDataLoading(true);
    try {
      const vq = query(
        collection(db, 'vehicles'),
        where('ownerName', '==', simpleUser.name),
        where('phoneNumber', '==', simpleUser.phoneNumber)
      );
      const vSnap = await getDocs(vq);
      const vList = vSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Vehicle))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
      setVehicles(vList);

      const fSnap = await getDocs(query(
        collection(db, 'fruits'),
        where('전도자', '==', simpleUser.name)
      ));
      const fList = fSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Fruit))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
      setFruits(fList);
    } catch (error) {
      console.error('[MyPage] data load error:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setDataLoading(false);
    }
  }, [simpleUser]);

  const loadPrayerData = useCallback(async () => {
    if (!simpleUser) return;
    setPrayerLoading(true);
    try {
      const [activeSchedules, settings, counts] = await Promise.all([
        fastingService.getActiveSchedules(),
        fastingService.getSettings(),
        fastingService.getScheduleCounts(),
      ]);
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
      setMaxCapacity(settings?.maxCapacity || 0);
      setScheduleCounts(counts);

      const reg = await fastingService.getRegistration(simpleUser.name, simpleUser.phoneNumber);
      if (reg) {
        setSelectedScheduleIds(reg.scheduleIds || []);
        setExistingRegistrationId(reg.id);
      } else {
        setSelectedScheduleIds([]);
        setExistingRegistrationId(null);
      }
    } catch (error) {
      console.error('[MyPage] prayer data load error:', error);
      toast.error('금식기도 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setPrayerLoading(false);
    }
  }, [simpleUser]);

  useEffect(() => {
    if (simpleUser && !isLoading) {
      loadData();
      loadPrayerData();
    }
  }, [simpleUser, isLoading, loadData, loadPrayerData]);

  useEffect(() => {
    if (tabParam === 'prayer') {
      setActiveTab('prayer');
    }
  }, [tabParam]);

  useEffect(() => {
    getRegions().then(setRegions);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim() || !loginPhone.trim()) {
      toast.error('이름과 연락처를 모두 입력해주세요.');
      return;
    }
    if (!/^\d{3}-\d{4}-\d{4}$/.test(loginPhone)) {
      toast.error('연락처 형식이 올바르지 않습니다. (000-0000-0000)');
      return;
    }
    setIsLoggingIn(true);
    try {
      const profile = await simpleUserService.getProfile(loginName.trim(), loginPhone);
      if (profile && profile.region) {
        simpleLogin(profile.name, profile.phoneNumber, profile.region, profile.id);
        toast.success('로그인되었습니다.');
        if (redirectPath) {
          router.push(redirectPath);
        }
      } else if (profile && !profile.region) {
        setPendingProfile({ name: profile.name, phoneNumber: profile.phoneNumber });
        setShowRegionSelect(true);
        toast('소속을 선택해주세요.', { icon: 'ℹ️' });
      } else {
        setPendingProfile({ name: loginName.trim(), phoneNumber: loginPhone });
        setShowRegionSelect(true);
        toast('소속을 선택해주세요.', { icon: 'ℹ️' });
      }
    } catch (error) {
      console.error('[MyPage] login error:', error);
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
    const loadingToast = toast.loading('소속을 저장하는 중...', { position: 'top-center' });
    try {
      const existing = await simpleUserService.getProfile(pendingProfile.name, pendingProfile.phoneNumber);
      let profileId: string;
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

      const fSnap = await getDocs(query(
        collection(db, 'fruits'),
        where('전도자', '==', pendingProfile.name)
      ));
      for (const d of fSnap.docs) {
        await updateDoc(doc(db, 'fruits', d.id), { region: selectedRegion });
      }

      simpleLogin(pendingProfile.name, pendingProfile.phoneNumber, selectedRegion, profileId);
      toast.success('소속이 저장되었습니다.', { id: loadingToast, position: 'top-center' });
      setShowRegionSelect(false);
      setPendingProfile(null);
      setSelectedRegion('');
      if (redirectPath) {
        router.push(redirectPath);
      }
    } catch (error) {
      console.error('[MyPage] region submit error:', error);
      toast.error('소속 저장 중 오류가 발생했습니다.', { id: loadingToast, position: 'top-center' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    simpleLogout();
    setVehicles([]);
    setFruits([]);
    setLoginName('');
    setLoginPhone('');
    setShowRegionSelect(false);
    setPendingProfile(null);
    setSelectedRegion('');
    setShowMyRegionEdit(false);
    setMyNewRegion('');
  };

  const handleUpdateMyRegion = async () => {
    if (!simpleUser || !myNewRegion) return;
    setIsUpdatingRegion(true);
    const loadingToast = toast.loading('소속을 변경하는 중...', { position: 'top-center' });
    try {
      const profile = await simpleUserService.getProfile(simpleUser.name, simpleUser.phoneNumber);
      if (profile) {
        await simpleUserService.updateProfile(profile.id, { region: myNewRegion });
      }
      await ensureRegion(myNewRegion);

      const vSnap = await getDocs(query(
        collection(db, 'vehicles'),
        where('ownerName', '==', simpleUser.name),
        where('phoneNumber', '==', simpleUser.phoneNumber)
      ));
      for (const d of vSnap.docs) {
        await updateDoc(doc(db, 'vehicles', d.id), { region: myNewRegion });
      }

      const fSnap = await getDocs(query(
        collection(db, 'fruits'),
        where('전도자', '==', simpleUser.name)
      ));
      for (const d of fSnap.docs) {
        await updateDoc(doc(db, 'fruits', d.id), { region: myNewRegion });
      }

      simpleLogin(simpleUser.name, simpleUser.phoneNumber, myNewRegion, simpleUser.profileId || '');
      toast.success('소속이 변경되었습니다.', { id: loadingToast, position: 'top-center' });
      setShowMyRegionEdit(false);
      setMyNewRegion('');
      loadData();
    } catch (error) {
      console.error('[MyPage] region update error:', error);
      toast.error('소속 변경 중 오류가 발생했습니다.', { id: loadingToast, position: 'top-center' });
    } finally {
      setIsUpdatingRegion(false);
    }
  };

  const startEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    setVehicleForm({
      ownerName: v.ownerName || '',
      phoneNumber: v.phoneNumber || '',
      secondaryPhoneNumber: v.secondaryPhoneNumber || '',
      carType: v.carType || '',
      carNumber: v.carNumber || '',
      notes: v.notes || '',
    });
  };

  const startEditFruit = (f: Fruit) => {
    setEditingFruit(f);
    setFruitForm({
      영접자: f.영접자 || '',
      전도자: f.전도자 || '',
      구분: f.구분 || '영접',
      만남날짜: f.만남날짜 || '',
      만남장소: f.만남장소 || '',
      만남횟수: f.만남횟수 || '',
      나이: f.나이 || '',
      연락처: f.연락처 || '',
      영적상태: f.영적상태 || '',
    });
  };

  const handleUpdateVehicle = async () => {
    if (!editingVehicle) return;
    setIsSubmitting(true);
    try {
      await vehicleService.updateVehicle(editingVehicle.id, {
        carType: vehicleForm.carType,
        carNumber: vehicleForm.carNumber,
        secondaryPhoneNumber: vehicleForm.secondaryPhoneNumber,
        notes: vehicleForm.notes,
      });
      toast.success('차량 정보가 수정되었습니다.');
      setEditingVehicle(null);
      loadData();
    } catch (error) {
      console.error('[MyPage] vehicle update error:', error);
      toast.error('수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('정말로 이 차량 정보를 삭제하시겠습니까?')) return;
    try {
      await vehicleService.deleteVehicle(id);
      toast.success('차량 정보가 삭제되었습니다.');
      loadData();
    } catch (error) {
      console.error('[MyPage] vehicle delete error:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateFruit = async () => {
    if (!editingFruit) return;
    setIsSubmitting(true);
    try {
      await fruitService.updateFruit(editingFruit.id, {
        구분: fruitForm.구분,
        만남날짜: fruitForm.만남날짜,
        만남장소: fruitForm.만남장소,
        만남횟수: fruitForm.만남횟수,
        나이: fruitForm.나이,
        영적상태: fruitForm.영적상태,
      });
      toast.success('열매 정보가 수정되었습니다.');
      setEditingFruit(null);
      loadData();
    } catch (error) {
      console.error('[MyPage] fruit update error:', error);
      toast.error('수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFruit = async (id: string) => {
    if (!confirm('정말로 이 열매 정보를 삭제하시겠습니까?')) return;
    try {
      await fruitService.deleteFruit(id);
      toast.success('열매 정보가 삭제되었습니다.');
      loadData();
    } catch (error) {
      console.error('[MyPage] fruit delete error:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleSchedule = (scheduleId: string) => {
    setSelectedScheduleIds(prev =>
      prev.includes(scheduleId)
        ? prev.filter(id => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const handleSubmitPrayer = async () => {
    if (!simpleUser) return;
    setIsSubmittingPrayer(true);
    const loadingToast = toast.loading('등록 중...', { position: 'top-center' });
    try {
      if (selectedScheduleIds.length === 0 && existingRegistrationId) {
        await fastingService.deleteRegistration(existingRegistrationId);
        setExistingRegistrationId(null);
        setSelectedScheduleIds([]);
        toast.success('금식기도 등록이 취소되었습니다.', { id: loadingToast, position: 'top-center' });
      } else if (selectedScheduleIds.length > 0) {
        // 인원 제한 체크: 이미 등록한 조는 제외하고 새로 추가하는 조만 검사
        const currentReg = existingRegistrationId
          ? await fastingService.getRegistration(simpleUser.name, simpleUser.phoneNumber)
          : null;
        const prevIds = new Set(currentReg?.scheduleIds || []);
        const newIds = selectedScheduleIds.filter(id => !prevIds.has(id));

        if (maxCapacity > 0) {
          const fullSchedules: string[] = [];
          for (const sid of newIds) {
            const schedule = schedules.find(s => s.id === sid);
            const currentCount = scheduleCounts[sid] || 0;
            if (currentCount >= maxCapacity) {
              fullSchedules.push(schedule ? `${schedule.group} ${schedule.day} ${schedule.meal}` : sid);
            }
          }
          if (fullSchedules.length > 0) {
            toast.error(
              `다음 조는 이미 인원이 가득 찼습니다:\n${fullSchedules.join(', ')}`,
              { id: loadingToast, position: 'top-center', duration: 5000 }
            );
            return;
          }
        }

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
        loadPrayerData();
      } else {
        toast.error('최소 하나 이상의 조를 선택해주세요.', { id: loadingToast, position: 'top-center' });
      }
    } catch (error) {
      console.error('[MyPage] prayer submit error:', error);
      toast.error('등록 중 오류가 발생했습니다.', { id: loadingToast, position: 'top-center' });
    } finally {
      setIsSubmittingPrayer(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" showVerse={true} />
      </div>
    );
  }

  if (!simpleUser) {
    return (
      <>
        <Toaster position="top-center" />
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-16 h-16 mb-4">
                <img src="/images/아이콘.png" alt="안디옥교회 아이콘" className="w-16 h-16 object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-blue-600 mb-2">안디옥교회</h1>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-8">내 정보 관리</h2>
            </div>
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              {showRegionSelect && pendingProfile ? (
                <>
                  <p className="text-center text-gray-600 mb-6">
                    {pendingProfile.name}님, 소속(지교회)을 선택해주세요.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">소속(지교회)</label>
                      <select
                        value={selectedRegion}
                        onChange={e => setSelectedRegion(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3"
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
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoggingIn ? '저장 중...' : '소속 저장'}
                    </button>
                    <button
                      onClick={() => { setShowRegionSelect(false); setPendingProfile(null); setSelectedRegion(''); }}
                      className="w-full flex justify-center py-2 px-4 text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← 뒤로
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-center text-gray-600 mb-6">
                    등록하신 이름과 연락처를 입력하시면<br />등록하신 정보를 조회·수정·삭제할 수 있습니다.
                  </p>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                      <input
                        type="text"
                        value={loginName}
                        onChange={e => setLoginName(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3"
                        placeholder="홍길동"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                      <input
                        type="tel"
                        value={loginPhone}
                        onChange={e => setLoginPhone(formatPhoneNumber(e.target.value))}
                        className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 sm:text-sm py-2 px-3"
                        placeholder="010-1234-5678"
                        maxLength={13}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoggingIn ? '확인 중...' : '내 정보 조회'}
                    </button>
                  </form>
                  <div className="mt-6">
                    <Link href="/" className="block text-center text-sm text-gray-500 hover:text-gray-700">
                      ← 홈으로
                    </Link>
                  </div>
                </>
              )}
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
                  <span className="text-lg font-bold text-gray-900">내 정보 관리</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {showMyRegionEdit ? (
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <select
                      value={myNewRegion}
                      onChange={e => setMyNewRegion(e.target.value)}
                      className="rounded-md border border-gray-300 text-sm py-1 px-2 whitespace-nowrap"
                    >
                      <option value="">소속 선택</option>
                      {regions.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleUpdateMyRegion}
                      disabled={isUpdatingRegion || !myNewRegion}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isUpdatingRegion ? '저장 중...' : '저장'}
                    </button>
                    <button
                      onClick={() => { setShowMyRegionEdit(false); setMyNewRegion(''); }}
                      className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-600 hidden sm:inline">
                    {simpleUser.name} · {simpleUser.phoneNumber} · <button onClick={() => { setShowMyRegionEdit(true); setMyNewRegion(simpleUser.region || ''); }} className="text-blue-600 hover:text-blue-800">{simpleUser.region || '소속선택'}</button>
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800"
                >
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

          {/* 탭 네비게이션 */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'vehicles'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              차량관리
            </button>
            <button
              onClick={() => setActiveTab('prayer')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'prayer'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              금식기도
            </button>
          </div>

          {/* 차량 관리 탭 */}
          {activeTab === 'vehicles' && (
            <>
              <div className="mb-6">
                <Link
                  href="/register/vehicle"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  차량등록
                </Link>
              </div>

              {dataLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="md" showVerse={false} />
                </div>
              ) : (
                <div className="space-y-4">
                  {vehicles.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                      <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 차량이 없습니다</h3>
                      <p className="mt-1 text-sm text-gray-500">차량을 등록해주세요.</p>
                    </div>
                  ) : (
                    vehicles.map(v => (
                      <div key={v.id} className="bg-white rounded-lg shadow-sm p-5">
                        {editingVehicle?.id === v.id ? (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">차량 정보 수정</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">차종</label>
                                <input type="text" value={vehicleForm.carType} onChange={e => setVehicleForm({ ...vehicleForm, carType: e.target.value })} className="block w-full rounded-md border border-gray-300 sm:text-sm py-2 px-3" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">차량번호</label>
                                <input type="text" value={vehicleForm.carNumber} onChange={e => setVehicleForm({ ...vehicleForm, carNumber: e.target.value })} className="block w-full rounded-md border border-gray-300 sm:text-sm py-2 px-3" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">예비 연락처</label>
                                <input type="tel" value={vehicleForm.secondaryPhoneNumber} onChange={e => setVehicleForm({ ...vehicleForm, secondaryPhoneNumber: formatPhoneNumber(e.target.value) })} className="block w-full rounded-md border border-gray-300 sm:text-sm py-2 px-3" maxLength={13} />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                                <textarea rows={3} value={vehicleForm.notes} onChange={e => setVehicleForm({ ...vehicleForm, notes: e.target.value })} className="block w-full rounded-md border border-gray-300 sm:text-sm py-2 px-3 resize-none" />
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <button onClick={handleUpdateVehicle} disabled={isSubmitting} className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50">
                                {isSubmitting ? '저장 중...' : '저장'}
                              </button>
                              <button onClick={() => setEditingVehicle(null)} className="text-sm text-gray-500 hover:text-gray-700">
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-semibold text-gray-900">{v.ownerName}</span>
                                <span className="text-sm text-gray-500">{v.phoneNumber}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                <span>차종: {v.carType}</span>
                                <span>차량번호: {v.carNumber}</span>
                                {v.region && <span>소속: {v.region}</span>}
                                {v.secondaryPhoneNumber && <span>예비연락처: {v.secondaryPhoneNumber}</span>}
                              </div>
                              {v.notes && <p className="text-sm text-gray-500 mt-1">비고: {v.notes}</p>}
                            </div>
                            <div className="flex items-center space-x-3 mt-3 sm:mt-0">
                              <button onClick={() => startEditVehicle(v)} className="text-sm text-blue-600 hover:text-blue-800">
                                편집
                              </button>
                              <button onClick={() => handleDeleteVehicle(v.id)} className="text-sm text-red-600 hover:text-red-800">
                                삭제
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* 금식기도 탭 */}
          {activeTab === 'prayer' && (
            <>
              {prayerLoading ? (
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
                      const count = scheduleCounts[schedule.id] || 0;
                      const isFull = maxCapacity > 0 && count >= maxCapacity;
                      return (
                        <button
                          key={schedule.id}
                          onClick={() => !isFull && handleToggleSchedule(schedule.id)}
                          disabled={isFull && !isSelected}
                          className={`relative rounded-xl p-4 text-center transition-all duration-200 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-lg scale-105'
                              : isFull
                              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                              : 'bg-blue-50 text-gray-700 border border-blue-200 hover:border-blue-400 hover:shadow-sm'
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
                          {maxCapacity > 0 && (
                            <div className={`text-xs mt-2 font-medium ${isSelected ? 'text-white/90' : isFull ? 'text-red-500' : 'text-blue-600'}`}>
                              {count}/{maxCapacity}명{isFull && !isSelected ? ' (마감)' : ''}
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
                        onClick={handleSubmitPrayer}
                        disabled={isSubmittingPrayer || (selectedScheduleIds.length === 0 && !existingRegistrationId)}
                        className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSubmittingPrayer ? '처리 중...' : existingRegistrationId ? (selectedScheduleIds.length === 0 ? '등록 취소' : '수정하기') : '등록하기'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← 홈으로
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
