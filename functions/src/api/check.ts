import * as admin from 'firebase-admin';

interface Request {
  body: {
    phoneNumber?: string;
    phone?: string;
    [key: string]: any;
  };
}

type Response = {
  status: (code: number) => Response;
  json: (data: any) => void;
};

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

// Firestore 참조
const db = admin.firestore();
const usersRef = db.collection('users');

// 전화번호 정규화 함수
const normalizePhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.replace(/[^0-9]/g, '');
};

export const checkHandler = async (req: Request, res: Response) => {
  try {
    console.log('Received request body:', req.body);
    const phoneNumber = req.body.phone || req.body.phoneNumber;
    console.log('Extracted phone number:', phoneNumber);

    // 필수 파라미터 검증
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false,
        error: '전화번호를 입력해주세요.' 
      });
    }
    
    // 전화번호 정규화
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    try {
      // Firestore에서 사용자 검색 (normalizedPhone 또는 phone 필드로 검색)
      const querySnapshot = await usersRef
        .where('normalizedPhone', '==', normalizedPhone)
        .limit(1)
        .get();
      
      if (querySnapshot.empty) {
        // normalizedPhone으로 검색되지 않으면 phone 필드로 다시 시도
        const altQuerySnapshot = await usersRef
          .where('phone', '==', normalizedPhone)
          .limit(1)
          .get();
        
        if (altQuerySnapshot.empty) {
          return res.status(404).json({ 
            success: false,
            error: '등록된 사용자를 찾을 수 없습니다.' 
          });
        }
        
        // phone 필드로 찾은 경우
        const doc = altQuerySnapshot.docs[0];
        const userData = doc.data();
        
        return res.status(200).json({
          success: true,
          data: {
            id: doc.id,
            name: userData.name || '',
            phone: userData.phone || '',
            church: userData.church || '',
            department: userData.department || '',
            position: userData.position || '',
            group: userData.group || '',
            registrationDate: userData.registrationDate || '',
            status: userData.status || '',
            memo: userData.memo || ''
          }
        });
      }
      
      // normalizedPhone으로 찾은 경우
      const doc = querySnapshot.docs[0];
      const userData = doc.data();
      
      return res.status(200).json({
        success: true,
        data: {
          id: doc.id,
          name: userData.name || '',
          phone: userData.phone || '',
          church: userData.church || '',
          department: userData.department || '',
          position: userData.position || '',
          group: userData.group || '',
          registrationDate: userData.registrationDate || '',
          status: userData.status || '',
          memo: userData.memo || ''
        }
      });
    } catch (error) {
      console.error('데이터베이스 조회 중 오류 발생:', error);
      return res.status(500).json({
        success: false,
        error: '사용자 정보를 조회하는 중 오류가 발생했습니다.'
      });
    }
  } catch (error) {
    console.error('서버 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
};


