'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Vehicle, simpleUserService, SimpleUserProfile } from '@/lib/firestore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface UserDetailModalProps {
  ownerName: string;
  phoneNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onEditVehicle?: (vehicleId: string) => void;
}

export default function UserDetailModal({
  ownerName,
  phoneNumber,
  isOpen,
  onClose,
  onEditVehicle,
}: UserDetailModalProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [userInfo, setUserInfo] = useState<SimpleUserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !ownerName) return;
    setLoading(true);
    setVehicles([]);
    setUserInfo(null);
    (async () => {
      try {
        const vSnap = await getDocs(query(
          collection(db, 'vehicles'),
          where('ownerName', '==', ownerName),
          where('phoneNumber', '==', phoneNumber)
        ));
        setVehicles(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));

        const profile = await simpleUserService.getProfile(ownerName, phoneNumber);
        setUserInfo(profile);
      } catch (error) {
        console.error('사용자 상세 로드 오류:', error);
        toast.error('상세 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, ownerName, phoneNumber]);

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('이 차량을 삭제하시겠습니까?')) return;
    const loadingToast = toast.loading('삭제 중...', { position: 'top-center' });
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      toast.success('차량이 삭제되었습니다.', { id: loadingToast, position: 'top-center' });
    } catch (error) {
      console.error('차량 삭제 오류:', error);
      toast.error('삭제 중 오류가 발생했습니다.', { id: loadingToast, position: 'top-center' });
    }
  };

  const handleDeleteUser = async () => {
    if (!userInfo) {
      toast.error('사용자 프로필을 찾을 수 없습니다.');
      return;
    }
    if (!confirm(`${ownerName} 사용자를 삭제하시겠습니까?\n(차량 데이터는 유지됩니다.)`)) return;
    const loadingToast = toast.loading('삭제 중...', { position: 'top-center' });
    try {
      await deleteDoc(doc(db, 'simpleUsers', userInfo.id));
      toast.success('사용자가 삭제되었습니다.', { id: loadingToast, position: 'top-center' });
      onClose();
    } catch (error) {
      console.error('사용자 삭제 오류:', error);
      toast.error('삭제 중 오류가 발생했습니다.', { id: loadingToast, position: 'top-center' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{ownerName}</h3>
              <p className="text-sm text-gray-500">
                {phoneNumber}
                {userInfo?.region && ` · ${userInfo.region}`}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {userInfo && (
                <button
                  onClick={handleDeleteUser}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  사용자 삭제
                </button>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" showVerse={false} />
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  차량 정보 ({vehicles.length})
                </h4>
                {vehicles.length === 0 ? (
                  <p className="text-sm text-gray-500">등록된 차량이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {vehicles.map(v => (
                      <div
                        key={v.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2"
                      >
                        <span>차종: {v.carType}</span>
                        <span>차량번호: {v.carNumber}</span>
                        {v.region && <span>소속: {v.region}</span>}
                        {v.secondaryPhoneNumber && <span>예비연락처: {v.secondaryPhoneNumber}</span>}
                        {v.notes && <span>비고: {v.notes}</span>}
                        <div className="flex items-center space-x-2 ml-auto">
                          {onEditVehicle && (
                            <button
                              onClick={() => onEditVehicle(v.id)}
                              className="text-blue-600 text-xs hover:text-blue-800"
                            >
                              편집
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteVehicle(v.id)}
                            className="text-red-600 text-xs hover:text-red-800"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
