'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { simpleUserService, getRegions, ensureRegion, SimpleUserProfile } from '@/lib/firestore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import UserDetailModal from '@/components/users/UserDetailModal';
import * as XLSX from 'xlsx';

export default function UsersPage() {
  const [users, setUsers] = useState<SimpleUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<SimpleUserProfile | null>(null);
  const [editRegion, setEditRegion] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [detailUser, setDetailUser] = useState<SimpleUserProfile | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'simpleUsers'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SimpleUserProfile));
      list.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setUsers(list);
    } catch (error) {
      console.error('사용자 목록 로드 오류:', error);
      toast.error('사용자 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    getRegions().then(setRegions);
  }, [loadUsers]);

  const filteredUsers = searchTerm
    ? users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phoneNumber.includes(searchTerm) ||
        (u.region && u.region.includes(searchTerm))
      )
    : users;

  const handleEdit = (user: SimpleUserProfile) => {
    setEditingUser(user);
    setEditRegion(user.region || '');
  };

  const handleUpdateRegion = async () => {
    if (!editingUser) return;
    setIsUpdating(true);
    try {
      await simpleUserService.updateProfile(editingUser.id, { region: editRegion });
      if (editRegion) await ensureRegion(editRegion);
      toast.success('사용자 정보가 수정되었습니다.');
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error('사용자 수정 오류:', error);
      toast.error('수정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExcelDownload = () => {
    const excelData = filteredUsers.map((u, i) => ({
      '순번': i + 1,
      '이름': u.name,
      '연락처': u.phoneNumber,
      '소속': u.region || '',
      '등록일': u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, '사용자목록');
    const now = new Date();
    const today = now.toLocaleDateString('ko-KR').replace(/\./g, '').replace(/ /g, '');
    XLSX.writeFile(wb, `안디옥교회_사용자목록_${today}.xlsx`);
    toast.success(`엑셀 파일이 다운로드되었습니다. (총 ${filteredUsers.length}건)`);
  };

  const handleViewDetail = (user: SimpleUserProfile) => {
    setDetailUser(user);
  };

  const handleDeleteUser = async (user: SimpleUserProfile) => {
    if (!confirm(`${user.name} 사용자를 삭제하시겠습니까?\n(차량 데이터는 유지됩니다.)`)) return;
    const loadingToast = toast.loading('삭제 중...', { position: 'top-center' });
    try {
      await deleteDoc(doc(db, 'simpleUsers', user.id));
      toast.success('사용자가 삭제되었습니다.', { id: loadingToast, position: 'top-center' });
      setDetailUser(null);
      loadUsers();
    } catch (error) {
      console.error('사용자 삭제 오류:', error);
      toast.error('삭제 중 오류가 발생했습니다.', { id: loadingToast, position: 'top-center' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="md" showVerse={true} />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between">
        <div className="flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">사용자 목록</h1>
          <p className="mt-2 text-sm text-gray-700">
            등록된 사용자 정보를 확인하고 관리하세요. (총 {users.length}명)
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 hidden sm:flex space-x-3">
          <button
            onClick={handleExcelDownload}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-md shadow-sm hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            다운로드
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4">
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              className="block w-full rounded-md border-gray-300 pl-3 pr-12 py-2 border focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="이름, 연락처, 소속으로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 사용자가 없습니다</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="w-28 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      이름
                    </th>
                    <th scope="col" className="w-36 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      연락처
                    </th>
                    <th scope="col" className="w-28 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      소속
                    </th>
                    <th scope="col" className="hidden md:table-cell w-32 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      등록일
                    </th>
                    <th scope="col" className="relative w-20 py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">액션</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {user.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {user.phoneNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {editingUser?.id === user.id ? (
                          <select
                            value={editRegion}
                            onChange={(e) => setEditRegion(e.target.value)}
                            className="block w-full rounded-md border border-gray-300 sm:text-sm py-1 px-2"
                          >
                            <option value="">소속 없음</option>
                            {regions.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          user.region || '-'
                        )}
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        {editingUser?.id === user.id ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={handleUpdateRegion}
                              disabled={isUpdating}
                              className="text-blue-600 text-xs hover:text-blue-800 disabled:opacity-50"
                            >
                              {isUpdating ? '저장 중...' : '저장'}
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="text-gray-500 text-xs hover:text-gray-700"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewDetail(user)}
                              className="text-blue-600 text-xs hover:text-blue-800"
                            >
                              상세
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-blue-600 text-xs hover:text-blue-800"
                            >
                              편집
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 text-xs hover:text-red-800"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <UserDetailModal
        ownerName={detailUser?.name || ''}
        phoneNumber={detailUser?.phoneNumber || ''}
        isOpen={!!detailUser}
        onClose={() => setDetailUser(null)}
      />
    </div>
  );
}
