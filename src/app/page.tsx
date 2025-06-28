'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { motion, useInView, AnimatePresence, useAnimation } from 'framer-motion';
import styles from './page.module.css';
import images from './images';

interface FormData {
  name: string;
  phone: string;
  birthYear: string;
  church: string;
}

export default function Home() {
  const [showTitle, setShowTitle] = useState(false);
  
  useEffect(() => {
    // Show title with a small delay
    const timer = setTimeout(() => {
      setShowTitle(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    birthYear: '',
    church: '',
  });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'phone') {
      setIsEditMode(false);
    }
    
    // Clear status when user starts typing
    setSubmitStatus(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    try {
      console.log('Form submission started');
      
      // 현재 폼 데이터를 기반으로 새로운 객체 생성 (공백 제거)
      const dataToSubmit = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        birthYear: formData.birthYear.trim(),
        church: formData.church.trim()
      };
      
      console.log('Form data prepared for submission:', {
        ...dataToSubmit,
        phone: dataToSubmit.phone ? `${dataToSubmit.phone.substring(0, 3)}-****-${dataToSubmit.phone.substring(7)}` : ''
      });
      
      // 필수 필드 검증
      if (!dataToSubmit.name || !dataToSubmit.phone) {
        const errorMsg = '이름과 휴대폰 번호는 필수 입력 항목입니다.';
        console.warn('Validation failed:', errorMsg);
        setSubmitStatus({
          success: false,
          message: errorMsg
        });
        return;
      }
      
      // 휴대폰 번호 형식 검증 (숫자만 허용)
      const phoneRegex = /^\d{10,11}$/;
      if (!phoneRegex.test(dataToSubmit.phone.replace(/[^0-9]/g, ''))) {
        const errorMsg = '올바른 휴대폰 번호를 입력해주세요. (숫자 10-11자리)';
        console.warn('Phone validation failed:', dataToSubmit.phone);
        setSubmitStatus({
          success: false,
          message: errorMsg
        });
        return;
      }
      
      // 폼 상태 업데이트 (trimmed 값으로)
      setFormData(dataToSubmit);
      
      // 제출 데이터 설정 (새로운 객체로 생성)
      const newSubmittedData = { ...dataToSubmit };
      
      console.log('Setting submittedData for confirmation');
      setSubmittedData(newSubmittedData);
      
      // 확인 창 표시
      console.log('Showing confirmation dialog');
      setShowConfirmation(true);
      
    } catch (error) {
      const errorMsg = '폼 처리 중 오류가 발생했습니다.';
      console.error('Error in form submission:', error);
      setSubmitStatus({
        success: false,
        message: errorMsg
      });
    }
  };

  // API 기본 URL을 가져오는 함수
  const getApiBaseUrl = (): string => {
    // 개발 환경에서는 상대 경로 사용
    if (process.env.NODE_ENV === 'development') {
      return '';
    }
    // 프로덕션 환경에서는 절대 경로 사용 (GitHub Pages용)
    return 'https://obedlee.github.io/antioch-seminar';
  };

  // 서버 사이드 API를 통해 Google Sheets 데이터 조회
  const checkPhoneInSheet = async (phone: string) => {
    try {
      console.log('전화번호 확인 요청 (서버사이드 API 호출)');
      
      // 클라이언트 사이드에서 서버 API 호출
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('서버 오류:', error);
        throw new Error('서버에서 오류가 발생했습니다.');
      }

      const result = await response.json();
      
      if (result.success && result.exists) {
        console.log('사용자 데이터 조회 성공');
        return {
          name: result.data.name || '',
          phone: result.data.phone || '',
          birthYear: result.data.birthYear || '',
          church: result.data.church || '',
        };
      } else {
        console.log('일치하는 전화번호를 찾을 수 없습니다.');
        return null;
      }
    } catch (error) {
      console.error('사용자 조회 중 오류:', error);
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
    try {
      console.log('전화번호 확인 요청:', formData.phone);
      
      // 클라이언트 사이드에서 직접 Google Sheets API 호출
      const existingData = await checkPhoneInSheet(formData.phone);
      
      if (existingData) {
        // 기존 데이터로 폼 채우기
        setFormData({
          name: existingData.name || '',
          phone: existingData.phone || '',
          birthYear: existingData.birthYear || '',
          church: existingData.church || '',
        });
        setIsEditMode(true);
        setSubmitStatus({
          success: true,
          message: '기존 신청 내역을 불러왔습니다. 수정 후 제출해주세요.'
        });
      } else {
        setSubmitStatus({
          success: false,
          message: '등록된 신청 내역이 없습니다. 새로 작성해주세요.'
        });
      }
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

  const confirmSubmission = async () => {
    if (!submittedData) {
      console.error('No submitted data available');
      return;
    }
    
    console.log('Starting form submission with data:', {
      ...submittedData,
      phone: submittedData.phone ? `${submittedData.phone.substring(0, 3)}-****-${submittedData.phone.substring(7)}` : ''
    });
    
    setIsSubmitting(true);
    setShowConfirmation(false);
    
    try {
      console.log('Sending request to /api/submit');
      const startTime = Date.now();
      
      const apiUrl = '/api/submit';
      console.log('Submit API 요청 URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...submittedData,
          timestamp: new Date().toISOString(),
        }),
      });

      const responseTime = Date.now() - startTime;
      console.log(`API response received in ${responseTime}ms`, {
        status: response.status,
        ok: response.ok
      });

      let result;
      try {
        result = await response.json();
        console.log('API response data:', result);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다.');
      }

      if (response.ok) {
        const successMessage = result.isUpdate 
          ? '신청 정보가 수정되었습니다.' 
          : '신청이 완료되었습니다. 감사합니다!';
        
        console.log('Form submission successful:', successMessage);
        
        setSubmitStatus({
          success: true,
          message: successMessage,
        });
        
        // 폼 초기화
        const resetForm = {
          name: '',
          phone: '',
          birthYear: '',
          church: '',
        };
        
        setFormData(resetForm);
        setSubmittedData(null);
        setIsEditMode(false);
        
        console.log('Form has been reset');
      } else {
        // 서버에서 보낸 에러 메시지가 있으면 그대로 표시
        const errorMessage = result.message || `서버 오류 (${response.status})`;
        console.error('Server error:', {
          status: response.status,
          message: errorMessage,
          response: result
        });
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      
      console.error('Error in form submission:', {
        error,
        message: errorMessage
      });
      
      setSubmitStatus({
        success: false,
        message: errorMessage,
      });
      
      // 오류 발생 시 확인 창 다시 표시
      setShowConfirmation(true);
    } finally {
      setIsSubmitting(false);
      console.log('Form submission process completed');
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
                    <td>3만원(초·중·고 2만원)</td>
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
                      {isChecking ? '조회 중...' : '조회'}
                    </button>
                  </div>
                  {isEditMode && (
                    <p className={styles.editNotice}>
                      기존 신청 내역이 있습니다. 수정 후 제출해주세요.
                    </p>
                  )}
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
                
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={styles.submitButton}
                >
                  {isSubmitting ? '제출 중...' : isEditMode ? '수정하기' : '신청하기'}
                </button>
              </form>
            </motion.div>
          </motion.section>
        </div>
      </main>

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
