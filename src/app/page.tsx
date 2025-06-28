'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { motion, useInView, AnimatePresence, useAnimation } from 'framer-motion';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, doc, DocumentData } from 'firebase/firestore';
import firebasedb from '../../firebase/firebasedb';

const db = getFirestore(firebasedb);
import styles from './page.module.css';
import images from './images';

interface FormData {
  name: string;
  phone: string;
  birthYear: string;
  church: string;
  id?: string; // 기존 사용자 ID 저장용
  isExistingUser?: boolean; // 기존 사용자 여부
  [key: string]: any; // 인덱스 서명 추가
}

export default function Home() {
  // 캐시 키 상수
  const CACHE_KEY = 'antioch_user_cache';

  // 세션 스토리지에서 캐시 로드
  const loadCache = () => {
    if (typeof window === 'undefined') return {};
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  };

  // 세션 스토리지에 캐시 저장
  const saveCache = (cache: any) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  };

  // 캐시에서 사용자 조회
  const getUserFromCache = (phone: string) => {
    const cache = loadCache();
    return cache[phone];
  };

  // 캐시에 사용자 저장
  const saveUserToCache = (phone: string, userData: any) => {
    const cache = loadCache();
    cache[phone] = userData;
    saveCache(cache);
  };

  // 캐시에서 사용자 제거
  const removeUserFromCache = (phone: string) => {
    const cache = loadCache();
    if (cache[phone] !== undefined) {
      delete cache[phone];
      saveCache(cache);
    }
  };

  const [showTitle, setShowTitle] = useState(false);
  
  useEffect(() => {
    // Show title with a small delay
    const timer = setTimeout(() => {
      setShowTitle(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Add cache state
  //const [userCache, setUserCache] = useState<{[key: string]: any}>({});

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    birthYear: '',
    church: '',
  });
  const [originalData, setOriginalData] = useState<FormData | null>(null); // 원본 데이터 저장
  const [hasChanges, setHasChanges] = useState(false); // 변경사항 여부
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

  useEffect(() => {
    if (showConfirmation) {
      console.log('Confirmation modal shown with data:', submittedData);
    }
  }, [showConfirmation, submittedData]);

  // 타입 안전한 객체 비교 함수
  const hasObjectChanged = (obj1: any, obj2: any, excludeKeys: string[] = []): boolean => {
    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    return Array.from(keys).some(key => {
      if (excludeKeys.includes(key)) return false;
      return obj1[key] !== obj2[key];
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // 기존 사용자인 경우에만 변경사항 감지
      if (originalData) {
        const changesDetected = hasObjectChanged(newData, originalData, ['id']);
        setHasChanges(changesDetected);
      }
      
      return newData;
    });
    
    if (name === 'phone') {
      setIsEditMode(false);
      setOriginalData(null);
      setHasChanges(false);
    }
    
    // Clear status when user starts typing
    setSubmitStatus(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      // 필수 필드 검증
      if (!formData.name || !formData.phone || !formData.birthYear || !formData.church) {
        setSubmitStatus({
          success: false,
          message: '모든 필수 항목을 입력해주세요.'
        });
        return;
      }
      
      // 휴대폰 번호 유효성 검사
      const phoneRegex = /^[0-9]{10,11}$/;
      const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
      
      if (!phoneRegex.test(cleanPhone)) {
        setSubmitStatus({
          success: false,
          message: '올바른 전화번호를 입력해주세요. (10-11자리 숫자)'
        });
        return;
      }
      
      // 휴대폰 번호로 기존 사용자 확인
      setIsChecking(true);
      setSubmitStatus({ success: false, message: '기존 신청내역을 확인 중입니다...' });
      
      try {
        const existingUser = await checkPhoneInSheet(cleanPhone);
        
        if (existingUser) {
          // 기존 사용자인 경우
          const changesDetected = hasObjectChanged(formData, existingUser, ['id', 'isExistingUser']);
          
          if (!changesDetected) {
            // 변경사항이 없는 경우
            setSubmitStatus({
              success: true,
              message: '변경된 내용이 없습니다.'
            });
            return;
          }
          
          // 변경사항이 있는 경우 확인 모달 표시
          setSubmittedData({
            ...formData,
            phone: cleanPhone,
            id: existingUser.id,
            isExistingUser: true
          });
          setOriginalData(existingUser);
          setHasChanges(true);
          setShowConfirmation(true);
        } else {
          // 새 사용자인 경우
          setSubmittedData({
            ...formData,
            phone: cleanPhone,
            isExistingUser: false
          });
          setOriginalData(null);
          setHasChanges(true);
          setShowConfirmation(true);
        }
      } catch (error) {
        console.error('사용자 확인 오류:', error);
        setSubmitStatus({
          success: false,
          message: '사용자 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        });
        return;
      } finally {
        setIsChecking(false);
      }
    } catch (error) {
      const errorMsg = '폼 처리 중 오류가 발생했습니다.';
      console.error('Error in form submission:', error);
      setSubmitStatus({
        success: false,
        message: errorMsg
      });
    }
  };
  
  const confirmSubmission = async () => {
    if (!submittedData) return;
    
    setIsSubmitting(true);
    setShowConfirmation(false);
    
    try {
      const cleanPhone = submittedData.phone.replace(/[^0-9]/g, '');
      const baseUserData = {
        name: submittedData.name,
        phone: cleanPhone,
        birthYear: submittedData.birthYear,
        church: submittedData.church,
      };
      
      const userDataWithTimestamp = {
        ...baseUserData,
        updatedAt: new Date().toISOString()
      };
  
      let message = '';
      
      if (originalData?.id) {
        // 기존 문서 업데이트
        await updateDoc(doc(db, 'users', originalData.id), userDataWithTimestamp);
        console.log('Document updated with ID: ', originalData.id);
        message = '성공적으로 수정되었습니다!';
        
        // 캐시 업데이트
        const updatedUser: FormData = { 
          ...baseUserData,
          id: originalData.id,
          isExistingUser: true 
        };
        saveUserToCache(cleanPhone, updatedUser);
        setOriginalData(updatedUser);
      } else {
        // 새 문서 추가
        const docRef = await addDoc(collection(db, 'users'), {
          ...userDataWithTimestamp,
          createdAt: new Date().toISOString()
        });
        console.log('New document written with ID: ', docRef.id);
        message = '신청이 완료되었습니다. 감사합니다!';
        
        // 캐시에 저장
        const newUser: FormData = { 
          ...baseUserData,
          id: docRef.id,
          isExistingUser: true 
        };
        saveUserToCache(cleanPhone, newUser);
      }
      
      // 성공 메시지 표시
      setSubmitStatus({
        success: true,
        message: message
      });
      
      // 폼 초기화
      setFormData({
        name: '',
        phone: '',
        birthYear: '',
        church: ''
      });
      setOriginalData(null);
      setIsEditMode(false);
      setHasChanges(false);
      
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      setSubmitStatus({
        success: false,
        message: '제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkPhoneInSheet = async (phone: string) => {
    try {
      console.log('=== checkPhoneInSheet 시작 ===');
      console.log('입력된 전화번호:', phone);
      
      if (!phone) {
        console.error('에러: 전화번호가 비어있습니다.');
        throw new Error('전화번호를 입력해주세요.');
      }
  
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      console.log('정제된 전화번호:', cleanPhone);
      
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        throw new Error('올바른 전화번호를 입력해주세요.');
      }
      
      // 캐시 확인
      const cachedUser = getUserFromCache(cleanPhone);
      if (cachedUser !== undefined) {
        console.log('세션 캐시에서 사용자 데이터 불러옴');
        
        if (cachedUser) {
          // 캐시에 데이터가 있는 경우
          const userData = {
            name: cachedUser.name || '',
            phone: cleanPhone,
            birthYear: cachedUser.birthYear || '',
            church: cachedUser.church || '',
            id: cachedUser.id,
            isExistingUser: true
          };
          
          setFormData(userData);
          setOriginalData(userData);
          setIsEditMode(true);
          setHasChanges(false);
          
          setSubmitStatus({
            success: true,
            message: '기존 신청 정보를 불러왔습니다. 수정 후 제출해주세요.'
          });
          return userData;
        } else {
          // 캐시에 null이 저장된 경우 (사용자 없음)
          setFormData(prev => ({
            ...prev,
            phone: cleanPhone,
            isExistingUser: false
          }));
          setOriginalData(null);
          setIsEditMode(false);
          setHasChanges(true);
          
          setSubmitStatus({
            success: true,
            message: '새로운 신청자입니다. 정보를 입력해주세요.'
          });
          return null;
        }
      }
  
      // Firestore에서 사용자 조회
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', cleanPhone), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const userData = {
          ...doc.data(),
          id: doc.id,
          isExistingUser: true
        } as FormData;
        
        // 캐시에 저장
        saveUserToCache(cleanPhone, userData);
        
        // 폼에 데이터 설정
        setFormData(userData);
        setOriginalData(userData);
        setIsEditMode(true);
        setHasChanges(false);
        
        setSubmitStatus({
          success: true,
          message: '기존 신청 정보를 불러왔습니다. 수정 후 제출해주세요.'
        });
        
        return userData;
      } else {
        // 사용자가 없는 경우
        saveUserToCache(cleanPhone, null);
        
        setFormData(prev => ({
          ...prev,
          phone: cleanPhone,
          isExistingUser: false
        }));
        setOriginalData(null);
        setIsEditMode(false);
        setHasChanges(true);
        
        setSubmitStatus({
          success: true,
          message: '새로운 신청자입니다. 정보를 입력해주세요.'
        });
        
        return null;
      }
    } catch (error) {
      console.error('전화번호 확인 오류:', error);
      setSubmitStatus({
        success: false,
        message: '조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      });
      throw error;
    }
  };

  const handleCheckPhone = async () => {
    if (!formData.phone) {
      setSubmitStatus({
        success: false,
        message: '휴대폰 번호를 입력해주세요.'
      });
      return;
    }

    setIsChecking(true);
    setSubmitStatus({ success: false, message: '조회 중입니다...' });

    try {
      await checkPhoneInSheet(formData.phone);
      // checkPhoneInSheet 내에서 이미 상태 업데이트 및 폼 채우기 처리됨
    } catch (error) {
      console.error('전화번호 확인 오류:', error);
      setSubmitStatus({
        success: false,
        message: '조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <Image 
          src={images.background}
          alt="Background" 
          fill
          priority
          quality={100}
          className={styles.backgroundImage}
        />
      </div>
      
      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          <motion.header 
            className={styles.header}
            initial={{ opacity: 1 }}
          >
            {/* Watercolor Splash Background */}

            
            {/* Title */}
            <div className={styles.titleImage}>
              <div className={styles.imageWrapper}>
                <Image 
                  src={images.mainTitle}
                  alt="부모교사세미나" 
                  priority
                  width={1200} 
                  height={1200}
                />
              </div>
            </div>
          </motion.header>

          {/* Date & Time Section */}
          <motion.section 
            className={`${styles.section} ${styles.compact}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.6,
                ease: "easeOut"
              }
            }}
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div 
              className={styles.sectionHeader}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.1, duration: 0.5 }
              }}
              viewport={{ once: true }}
            >
              <div className={styles.subTitleBackground}>
                <Image 
                  src={images.subTitleBg} 
                  alt=""
                  fill
                  className={styles.subTitleImage}
                  priority
                />
                <span className={styles.subTitleText}>일시</span>
              </div>
            </motion.div>
            <motion.p 
              className={styles.subContents}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.2, duration: 0.5 }
              }}
              viewport={{ once: true }}
            >
              2025. 07. 05 (토) <br />
              <span className={styles.timeText}>09:30 ~ 14:20</span>
            </motion.p>
          </motion.section>

          {/* Location Section */}
          <motion.section 
            className={`${styles.section} ${styles.compact}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.6,
                ease: "easeOut"
              }
            }}
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div 
              className={styles.sectionHeader}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.1, duration: 0.5 }
              }}
              viewport={{ once: true }}
            >
              <div className={styles.subTitleBackground}>
                <Image 
                  src={images.subTitleBg}
                  alt="" 
                  fill
                  className={styles.subTitleImage}
                />
                <span className={styles.subTitleText}>장소</span>
              </div>
            </motion.div>
            <motion.p 
              className={styles.subContents}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.2, duration: 0.5 }
              }}
              viewport={{ once: true }}
            >
              안디옥교회
            </motion.p>
          </motion.section>

          {/* 강사 소개 섹션 */}
          <section className={styles.section} id="speaker-section">
            <motion.div 
              className={styles.sectionHeader}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { duration: 0.6, ease: "easeOut" }
              }}
              viewport={{ once: true, margin: "-50px" }}
            >
              <div className={styles.subTitleBackground}>
                <Image src={images.subTitleBg} alt="" fill className={styles.subTitleImage} />
                <span className={styles.subTitleText}>강사</span>
              </div>
            </motion.div>
          
            <div className={styles.speakerContainer}>
              <motion.div 
                className={styles.speakerRow}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    duration: 0.6,
                    ease: "easeOut"
                  }
                }}
                viewport={{ once: true, amount: 0.3 }}
              >
                <motion.div 
                  className={styles.speakerItem}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ 
                    opacity: 1, 
                    x: 0,
                    transition: {
                      delay: 0.1,
                      duration: 0.5
                    }
                  }}
                  viewport={{ once: true }}
                >
                  <div className={styles.speakerImageWrapper}>
                    <Image 
                      src={images.speakers[0].image}
                      alt="김정원 목사"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className={styles.speakerImage}
                    />
                  </div>
                  <div className={styles.speakerInfo}>
                    <h3 className={styles.speakerName}>
                      <span className={styles.name}>김정원</span>
                      <span className={styles.title}>목사</span>
                    </h3>
                    <ul className={styles.speakerDetails}>
                      <li className={styles.speakerInfoText}>안디옥교회 담임</li>
                      <li className={styles.speakerInfoText}>(사) 글로벌 플랜터스 대표</li>
                    </ul>
                  </div>
                </motion.div>

                <motion.div 
                  className={styles.speakerItem}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ 
                    opacity: 1, 
                    y: 0,
                    transition: {
                      delay: 0.2,
                      duration: 0.5
                    }
                  }}
                  viewport={{ once: true }}
                >
                  <div className={styles.speakerImageWrapper}>
                    <Image 
                      src={images.speakers[1].image}
                      alt="정우성 이사"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className={styles.speakerImage}
                    />
                  </div>
                  <div className={styles.speakerInfo}>
                    <h3 className={styles.speakerName}>
                      <span className={styles.name}>정우성</span>
                      <span className={styles.title}>이사</span>
                    </h3>
                    <ul className={styles.speakerDetails}>
                      <li className={styles.speakerInfoText}>한국창조과학회 이사</li>
                      <li className={styles.speakerInfoText}>삼성전자 수석연구원</li>
                    </ul>
                  </div>
                </motion.div>

                <motion.div 
                  className={styles.speakerItem}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ 
                    opacity: 1, 
                    x: 0,
                    transition: {
                      delay: 0.3,
                      duration: 0.5
                    }
                  }}
                  viewport={{ once: true }}
                >
                  <div className={styles.speakerImageWrapper}>
                    <Image 
                      src={images.speakers[2].image}
                      alt="이지은 교수"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className={styles.speakerImage}
                    />
                  </div>
                  <div className={styles.speakerInfo}>
                    <h3 className={styles.speakerName}>
                      <span className={styles.name}>육진경</span>
                      <span className={styles.title}>대표</span>
                    </h3>
                    <ul className={styles.speakerDetails}>
                      <li className={styles.speakerInfoText}>전국교육회복교사연합 대표</li>
                      <li className={styles.speakerInfoText}>새하늘교회 사모</li>
                      <li className={styles.speakerInfoText}>전) 서울상도중학교 교사</li>
                    </ul>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </section>
          
          {/* 일정 섹션 */}
          <motion.section 
            className={`${styles.section} ${styles.scheduleSection}`}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.7,
                ease: "easeOut"
              }
            }}
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div 
              className={styles.sectionHeader}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.1, duration: 0.5 }
              }}
              viewport={{ once: true }}
            >
              <div className={styles.subTitleBackground}>
                <Image 
                  src={images.subTitleBg}
                  alt="" 
                  fill
                  className={styles.subTitleImage}
                />
                <span className={styles.subTitleText}>일정</span>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ 
                opacity: 1, 
                scale: 1,
                transition: { 
                  delay: 0.2, 
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1]
                }
              }}
              viewport={{ once: true }}
            >
              <div className={styles.scheduleImageWrapper}>
                <Image 
                  src={images.schedule}
                  alt="세미나 일정"
                  width={1000}
                  height={500}
                  className={styles.scheduleImage}
                />
              </div>
            </motion.div>
          </motion.section>
          
          {/* 위치 섹션 */}
          <motion.section 
            className={styles.section}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.7,
                ease: "easeOut"
              }
            }}
            viewport={{ once: true, amount: 0.1 }}
          >
            <motion.div 
              className={styles.sectionHeader}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.1, duration: 0.5 }
              }}
              viewport={{ once: true }}
            >
              <div className={styles.subTitleBackground}>
                <Image 
                  src={images.subTitleBg} 
                  alt="" 
                  fill
                  className={styles.subTitleImage}
                />
                <span className={styles.subTitleText}>위치</span>
              </div>
            </motion.div>
          
          {/* 구미 안디옥교회 위치 섹션 */}
            <motion.div 
              className={styles.locationContent}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.2, duration: 0.6 }
              }}
              viewport={{ once: true }}
            >
              <div className={styles.addressContainer}>
                <motion.div 
                  className={styles.addressRow}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { 
                      delay: 0.3,
                      duration: 0.5 
                    }
                  }}
                  viewport={{ once: true }}
                >
                  <span className={styles.placeName}>구미안디옥교회</span>
                  <div className={styles.addressDetailRow}>
                    <span className={styles.addressDetail}>경북 구미시 오태길 51</span>
                    <motion.button 
                      onClick={() => {
                        navigator.clipboard.writeText('경북 구미시 오태길 51');
                        alert('주소가 클립보드에 복사되었습니다.');
                      }}
                      className={styles.copyButton}
                      aria-label="주소 복사"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
              </div>
              <motion.div 
                className={styles.mapContainer}
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ 
                  opacity: 1, 
                  scale: 1,
                  transition: { 
                    delay: 0.4, 
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1]
                  }
                }}
                viewport={{ once: true }}
              >
                <div className={styles.mapImageWrapper}>
                  <Image 
                    src={images.gmap}
                    alt="안디옥교회 위치"
                    fill
                    className={styles.mapImage}
                  />  
                </div>
              </motion.div>
            </motion.div>
  
            {/* 구미 안디옥교회 위치 섹션 */}
            <motion.div 
              className={styles.locationContent}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.2, duration: 0.6 }
              }}
              viewport={{ once: true }}
            >
              <div className={styles.addressContainer}>
                <motion.div 
                  className={styles.addressRow}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { 
                      delay: 0.3,
                      duration: 0.5 
                    }
                  }}
                  viewport={{ once: true }}
                >
                  <span className={styles.placeName}>서울안디옥교회</span>
                  <div className={styles.addressDetailRow}>
                    <span className={styles.addressDetail}>서울 강동구 천중로44길 28</span>
                    <motion.button 
                      onClick={() => {
                        navigator.clipboard.writeText('서울 강동구 천중로44길 28');
                        alert('주소가 클립보드에 복사되었습니다.');
                      }}
                      className={styles.copyButton}
                      aria-label="주소 복사"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
              </div>
              <motion.div 
                className={styles.mapContainer}
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ 
                  opacity: 1, 
                  scale: 1,
                  transition: { 
                    delay: 0.4, 
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1]
                  }
                }}
                viewport={{ once: true }}
              >
                <div className={styles.mapImageWrapper}>
                  <Image 
                    src={images.smap} 
                    alt="안디옥교회 위치"
                    fill
                    className={styles.mapImage}
                    priority
                  />
                </div>
              </motion.div>
            </motion.div>
          </motion.section>

          {/* 신청/문의 섹션 */}
          <motion.section 
            className={styles.section}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.7,
                ease: "easeOut"
              }
            }}
            viewport={{ once: true, amount: 0.1 }}
          >
            <motion.div 
              className={styles.sectionHeader}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.1, duration: 0.5 }
              }}
              viewport={{ once: true }}
            >
              <div className={styles.subTitleBackground}>
                <Image 
                  src={images.subTitleBg2}
                  alt="" 
                  fill
                  className={styles.subTitleImage}
                />
                <span className={styles.subTitleText}>신청/접수</span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { 
                  delay: 0.2, 
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1]
                }
              }}
              viewport={{ once: true }}
              className={styles.formContainer}
            >
              <table className={styles.infoTable}>
                <tbody>
                  <tr>
                    <th className={styles.tableHeader}>회비</th>
                    <td><span className={styles.feeText}>3만원(초·중·고 2만원)</span></td>
                  </tr>
                  <tr>
                    <th rowSpan={3} className={styles.tableHeader}>등록계좌</th>
                    <td className={styles.accountCell}>
                      <div className={styles.bankLocation}>구미</div>
                      <div className={styles.accountRow}>
                        <span className={styles.accountNumber}>3333-26-3472535</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText('3333263472535');
                            alert('계좌번호가 복사되었습니다.');
                          }} 
                          className={styles.copyButton}
                          aria-label="계좌번호 복사"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                      </div>
                      <div className={styles.bankName}>카카오뱅크 (신정민)</div>
                    </td>
                  </tr>
                  <tr>
                    <td className={styles.accountCell}>
                      <div className={styles.bankLocation}>서울</div>
                      <div className={styles.accountRow}>
                        <span className={styles.accountNumber}>352-1376-8331-93</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText('3521376833193');
                            alert('계좌번호가 복사되었습니다.');
                          }} 
                          className={styles.copyButton}
                          aria-label="계좌번호 복사"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                      </div>
                      <div className={styles.bankName}>농협 (황은영)</div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className={styles.noticeCell}>※ 반드시 수강자 이름으로 입금해주세요.</td>
                  </tr>
                  <tr>
                    <th className={styles.tableHeader}>등록기간</th>
                    <td colSpan={3}>6월 29일(주일)까지 (마감 후 1만원 추가)</td>
                  </tr>
                  <tr>
                    <th rowSpan={2} className={styles.tableHeader}>문의</th>
                    <td colSpan={3} className={styles.contactCell}>신정민 간사 010-6395-8592</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className={styles.contactCell}>황은영 간사 010-8377-8573</td>
                  </tr>
                </tbody>
              </table>
            </motion.div>
          </motion.section>

          {/* 신청서 작성 섹션 */}
          <motion.section 
            className={styles.section}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.7,
                ease: "easeOut"
              }
            }}
            viewport={{ once: true, amount: 0.1 }}
          >
            <motion.div 
              className={styles.sectionHeader}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.1, duration: 0.5 }
              }}
              viewport={{ once: true }}
            >
              <div className={styles.subTitleBackground}>
                <Image 
                  src={images.subTitleBg2} 
                  alt="" 
                  fill
                  className={styles.subTitleImage}
                />
                <span className={styles.subTitleText}>신청서 작성</span>
              </div>
            </motion.div>
            <motion.div 
              className={styles.formContainer}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { 
                  delay: 0.2, 
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1]
                }
              }}
              viewport={{ once: true }}
            >
              <form className={styles.applicationForm} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                  <label htmlFor="phone">휴대폰번호 *</label>
                  <div className={styles.phoneInputContainer}>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      inputMode="text"
                      placeholder="010-1234-5678"
                      required
                      className={styles.phoneInput}
                    />
                    <button 
                      type="button" 
                      onClick={handleCheckPhone}
                      disabled={!formData.phone || isChecking}
                      className={styles.checkButton}
                    >
                      {isChecking ? '조회 중...' : '신청확인'}
                    </button>
                  </div>
                  {isEditMode && (
                    <p className={styles.editNotice}>
                      {hasChanges 
                        ? '변경사항이 감지되었습니다.' 
                        : '기존 신청 내역이 있습니다. 수정 후 제출해주세요.'}
                    </p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="name">이름</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name"
                    className={styles.formInput}
                    placeholder="이름을 입력해주세요"
                    value={formData.name}
                    onChange={handleChange}
                    required 
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="birthYear">출생연도</label>
                  <input 
                    type="number"
                    id="birthYear"
                    name="birthYear"
                    value={formData.birthYear}
                    onChange={handleChange}
                    min="1900" 
                    max={new Date().getFullYear()}
                    className={styles.formInput}
                    placeholder="출생연도 4자리를 입력해주세요 (예: 1990)"
                    required 
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="church">섬기는교회(담임목사님 성함)</label>
                  <input 
                    type="text" 
                    id="church" 
                    name="church"
                    className={styles.formInput}
                    placeholder="예: 서울안디옥교회(홍길동)"
                    value={formData.church}
                    onChange={handleChange}
                    required 
                  />
                </div>
                
                {submitStatus && (
                  <div className={`${styles.statusMessage} ${submitStatus.success ? styles.success : styles.error}`}>
                    {submitStatus.message}
                  </div>
                )}
                
                <div className={styles.formGroup}>
                  <button 
                    type="submit" 
                    className={`${styles.submitButton} ${isSubmitting ? styles.loading : ''}`}
                    disabled={isSubmitting || (originalData !== null && !hasChanges)}
                  >
                    {isSubmitting ? '처리 중...' : originalData !== null ? '수정하기' : '신청하기'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.section>
        </div>
      </main>

          {/* Footer */}
          {/* 확인 모달 */}
          <AnimatePresence>
            {showConfirmation && submittedData && (
              <motion.div 
                className={styles.modalOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className={styles.confirmationModal}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ 
                    type: "spring",
                    damping: 25,
                    stiffness: 500
                  }}
                >
                  <h3>입력하신 정보를 확인해주세요</h3>
                  <div className={styles.confirmationContent}>
                    <p><strong>이름:</strong> {submittedData.name || '입력 안 됨'}</p>
                    <p><strong>휴대폰번호:</strong> {submittedData.phone || '입력 안 됨'}</p>
                    <p><strong>출생연도:</strong> {submittedData.birthYear || '입력 안 됨'}</p>
                    <p><strong>섬기는교회:</strong> {submittedData.church || '입력 안 됨'}</p>
                  </div>
                  <div className={styles.modalButtons}>
                    <button 
                      onClick={() => setShowConfirmation(false)}
                      className={styles.cancelButton}
                      disabled={isSubmitting}
                    >
                      취소
                    </button>
                    <button 
                      onClick={confirmSubmission}
                      className={styles.confirmButton}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '처리 중...' : '확인'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
      
      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.copyright}> 2025 안디옥교회. All rights reserved.</p>
        <a 
          href="https://antiochi.org/ko" 
          target="_blank" 
          rel="noopener noreferrer"
          title="안디옥교회 홈페이지로 이동 (새 창에서 열림)"
          className={styles.logoLink}
        >
          <Image 
            src={images.logo2} 
            alt="안디옥교회" 
            width={240}
            height={80}
            className={styles.footerLogo}
            priority
          />
          <span className={styles.clickHint}>
          <svg 
              className={styles.clickArrow}
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Click!
          </span>
        </a>
      </footer>
    </div>
  );
}
