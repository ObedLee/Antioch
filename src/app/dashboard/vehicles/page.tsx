'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { vehicleService, Vehicle } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import VehicleDetailModal from '@/components/vehicles/VehicleDetailModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function VehiclesPage() {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]); // 검색용 전체 데이터
  const [displayedVehicles, setDisplayedVehicles] = useState<Vehicle[]>([]); // 표시용 데이터
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleViewDetail = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setSelectedVehicle(null);
    setIsDetailModalOpen(false);
  };

  const handleEdit = (vehicleId: string) => {
    setIsDetailModalOpen(false);
    router.push(`/dashboard/vehicles/${vehicleId}/edit`);
  };

  const handleDelete = async (vehicleId: string) => {
    if (confirm('정말로 이 차량을 삭제하시겠습니까?')) {
      try {
        await vehicleService.deleteVehicle(vehicleId);
        // 표시된 데이터에서 제거
        setDisplayedVehicles(prev => prev.filter((v: Vehicle) => v.id !== vehicleId));
        // 전체 데이터에서도 제거 (검색용)
        setAllVehicles(prev => prev.filter((v: Vehicle) => v.id !== vehicleId));
        setIsDetailModalOpen(false);
        toast.success('차량이 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('차량 삭제 오류:', error);
        toast.error('차량 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleExcelDownload = async () => {
    try {
      // 엑셀 다운로드를 위해 전체 데이터 로드
      let dataToExport = allVehicles;
      if (allVehicles.length === 0) {
        // 전체 데이터가 로드되지 않았다면 로드
        dataToExport = await vehicleService.getVehicles();
        setAllVehicles(dataToExport);
      }
      
      // 검색어가 있으면 필터링된 데이터, 없으면 전체 데이터
      const finalData = searchTerm 
        ? dataToExport.filter((vehicle: Vehicle) =>
            vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.carNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (vehicle.phoneNumber && vehicle.phoneNumber.includes(searchTerm))
          )
        : dataToExport;
        
      const excelData = finalData.map((vehicle: Vehicle, index: number) => ({
        '순번': index + 1,
        '소유자': vehicle.ownerName,
        '연락처': vehicle.phoneNumber || '',
        '차종': vehicle.carType,
        '차량번호': vehicle.carNumber,
        '소속': vehicle.department || '',
        '예비연락처': vehicle.secondaryPhoneNumber || '',
        '비고': vehicle.notes || '',
        '등록일': vehicle.createdAt ? new Date(vehicle.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '',
        '수정일': vehicle.updatedAt ? new Date(vehicle.updatedAt.seconds * 1000).toLocaleDateString('ko-KR') : ''
      }));

      // 워크북 생성
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // 열 너비 자동 조정
      const colWidths = [
        { wch: 8 },  // 순번
        { wch: 15 }, // 소유자
        { wch: 15 }, // 연락처
        { wch: 12 }, // 차종
        { wch: 12 }, // 차량번호
        { wch: 12 }, // 소속
        { wch: 15 }, // 예비연락처
        { wch: 20 }, // 비고
        { wch: 12 }, // 등록일
        { wch: 12 }  // 수정일
      ];
      ws['!cols'] = colWidths;
      
      // 워크시트 추가
      XLSX.utils.book_append_sheet(wb, ws, '차량목록');
      
      // 파일명 생성 (날짜 + 시간 포함)
      const now = new Date();
      const today = now.toLocaleDateString('ko-KR').replace(/\./g, '').replace(/ /g, '');
      const time = now.toLocaleTimeString('ko-KR', { hour12: false }).replace(/:/g, '');
      const filename = `안디옥교회_차량목록_${today}_${time}.xlsx`;
      
      // 파일 다운로드
      XLSX.writeFile(wb, filename);
      
      toast.success(`엑셀 파일이 다운로드되었습니다. (총 ${finalData.length}건)`);
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      toast.error('엑셀 다운로드 중 오류가 발생했습니다.');
    }
  };

  // 초기 데이터 로드
  const loadInitialVehicles = async () => {
    try {
      setLoading(true);
      const result = await vehicleService.getVehiclesPaginated(30);
      setDisplayedVehicles(result.vehicles);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('차량 목록을 불러오는 중 오류 발생:', error);
      toast.error('차량 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 추가 데이터 로드 (무한 스크롤)
  const loadMoreVehicles = async () => {
    if (!hasMore || loadingMore || !lastDoc) return;
    
    try {
      setLoadingMore(true);
      const result = await vehicleService.getVehiclesPaginated(30, lastDoc);
      
      // 중복 데이터 방지 - 기존 데이터와 ID가 겹치지 않는 새로운 데이터만 추가
      setDisplayedVehicles(prev => {
        const existingIds = new Set(prev.map(v => v.id));
        const newVehicles = result.vehicles.filter(v => !existingIds.has(v.id));
        return [...prev, ...newVehicles];
      });
      
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('추가 차량 데이터 로드 오류:', error);
      toast.error('추가 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingMore(false);
    }
  };

  // 검색용 전체 데이터 로드
  const loadAllVehiclesForSearch = async () => {
    if (allVehicles.length > 0) return; // 이미 로드되었으면 스킵
    
    try {
      const data = await vehicleService.getVehicles();
      setAllVehicles(data);
    } catch (error) {
      console.error('전체 차량 데이터 로드 오류:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadInitialVehicles();
    }
  }, [user]);

  // 검색 기능 - 검색어가 있을 때만 전체 데이터에서 필터링
  const filteredVehicles = searchTerm 
    ? allVehicles.filter((vehicle: Vehicle) =>
        vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.carNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle.phoneNumber && vehicle.phoneNumber.includes(searchTerm))
      )
    : displayedVehicles;

  // 검색어 변경 시 전체 데이터 로드
  useEffect(() => {
    if (searchTerm && allVehicles.length === 0) {
      loadAllVehiclesForSearch();
    }
  }, [searchTerm]);

  // 무한 스크롤 이벤트 리스너
  useEffect(() => {
    const handleScroll = () => {
      if (searchTerm || !hasMore || loadingMore) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // 페이지 하단에서 200px 이내에 도달하면 더 로드
      if (scrollTop + windowHeight >= documentHeight - 200) {
        loadMoreVehicles();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchTerm, hasMore, loadingMore]);

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
          <h1 className="text-xl font-semibold text-gray-900">차량 목록</h1>
          <p className="mt-2 text-sm text-gray-700">
            차량 목록을 확인하고 관리하세요.
          </p>
        </div>
        {/* 데스크톱: 가로 배치 */}
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
          <Link
            href="/dashboard/vehicles/new"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            차량등록
          </Link>
        </div>
        
        {/* 모바일: 차량등록 버튼만 표시 */}
        <div className="ml-4 flex-shrink-0 sm:hidden">
          <Link
            href="/dashboard/vehicles/new"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            차량등록
          </Link>
        </div>
      </div>
      
      <div className="mt-8">
        <div className="mb-4">
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              className="block w-full rounded-md border-gray-300 pl-3 pr-12 py-2 border focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="이름, 차량번호, 연락처로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          {filteredVehicles.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 차량이 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">차량을 등록해주세요.</p>
              <div className="mt-6">
                <Link
                  href="/dashboard/vehicles/new"
                  className="group relative inline-flex items-center justify-center px-6 py-3 overflow-hidden text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <svg className="relative z-10 w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="relative z-10">차량 등록하기</span>
                  <div className="absolute top-0 left-0 w-full h-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-lg"></div>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="w-28 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      소유자 이름
                    </th>
                    <th scope="col" className="w-36 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      연락처
                    </th>
                    <th scope="col" className="w-28 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      차종
                    </th>
                    <th scope="col" className="w-32 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      차량번호
                    </th>
                    {/* 모바일에서 숨김 */}
                    <th scope="col" className="hidden md:table-cell w-28 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      소속
                    </th>
                    <th scope="col" className="hidden md:table-cell w-36 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      예비 연락처
                    </th>
                    <th scope="col" className="hidden lg:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      비고
                    </th>
                    <th scope="col" className="relative w-20 py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">액션</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredVehicles.map((vehicle: Vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {vehicle.ownerName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {vehicle.phoneNumber || ''}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {vehicle.carType}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {vehicle.carNumber}
                      </td>
                      {/* 모바일에서 숨김 */}
                      <td className="hidden md:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {vehicle.department || ''}
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {vehicle.secondaryPhoneNumber || ''}
                      </td>
                      <td className="hidden lg:table-cell px-3 py-4 text-sm text-gray-500">
                        <div className="truncate max-w-full" title={vehicle.notes || ''}>
                          {vehicle.notes || ''}
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewDetail(vehicle)}
                            className="text-blue-600 text-xs focus:outline-none focus:ring-0 focus:border-none focus:shadow-none bg-transparent border-none p-0 m-0 cursor-pointer hover:bg-transparent hover:text-blue-600 active:outline-none active:ring-0 active:border-none active:shadow-none"
                          >
                            상세
                          </button>
                          <button
                            onClick={() => handleEdit(vehicle.id)}
                            className="text-blue-600 text-xs focus:outline-none focus:ring-0 focus:border-none focus:shadow-none bg-transparent border-none p-0 m-0 cursor-pointer hover:bg-transparent hover:text-blue-600 active:outline-none active:ring-0 active:border-none active:shadow-none"
                          >
                            편집
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle.id)}
                            className="text-red-600 text-xs focus:outline-none focus:ring-0 focus:border-none focus:shadow-none bg-transparent border-none p-0 m-0 cursor-pointer hover:bg-transparent hover:text-red-600 active:outline-none active:ring-0 active:border-none active:shadow-none"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 무한 스크롤 - 더 보기 버튼 */}
          {!searchTerm && hasMore && filteredVehicles.length > 0 && (
            <div className="text-center py-6 border-t border-gray-200">
              <button
                onClick={loadMoreVehicles}
                disabled={loadingMore}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    로딩 중...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    더 보기 ({displayedVehicles.length}건 표시 중)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* 상세보기 모달 */}
      <VehicleDetailModal
        vehicle={selectedVehicle}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
