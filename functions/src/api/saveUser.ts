import * as admin from 'firebase-admin';
import { Request, Response } from 'express-serve-static-core';

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface UserData {
  name: string;
  phone: string;
  normalizedPhone?: string; // Optional as it's generated automatically
  birthYear: string;
  church: string;
  createdAt?: string; // Optional as it's set automatically
  updatedAt?: string; // Optional as it's set automatically
  [key: string]: any;
}

interface SaveUserRequest extends Request {
  body: {
    name: string;
    phone: string;
    normalizedPhone?: string;
    birthYear: string;
    church: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
  };
}

export const saveUserHandler = async (req: SaveUserRequest, res: Response) => {
  try {
    console.log('=== saveUser 호출됨 ===');
    console.log('요청 본문:', JSON.stringify(req.body, null, 2));

    const userData: UserData = req.body;

    // 필수 필드 검증
    if (!userData.name || !userData.phone) {
      console.error('필수 필드 누락:', { name: userData.name, phone: userData.phone });
      return res.status(400).json({
        success: false,
        error: '이름과 전화번호는 필수 항목입니다.'
      });
    }

    // 전화번호 정규화 (숫자만 남기기)
    const normalizedPhone = userData.phone.replace(/[^0-9]/g, '');
    if (normalizedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: '유효한 전화번호를 입력해주세요.'
      });
    }

    // 사용자 데이터 업데이트
    const userRecord: UserData = {
      ...userData,
      normalizedPhone,
      updatedAt: new Date().toISOString()
    };

    // Firestore에서 기존 사용자 확인
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef
      .where('normalizedPhone', '==', normalizedPhone)
      .limit(1)
      .get();

    let result;
    if (!querySnapshot.empty) {
      // 기존 사용자 업데이트
      const doc = querySnapshot.docs[0];
      result = await doc.ref.update(userRecord);
      console.log('기존 사용자 업데이트 완료:', doc.id);
    } else {
      // 새 사용자 생성
      userRecord.createdAt = new Date().toISOString();
      const docRef = await usersRef.add(userRecord);
      console.log('새 사용자 생성 완료:', docRef.id);
      result = { id: docRef.id };
    }

    return res.status(200).json({
      success: true,
      message: '사용자 정보가 저장되었습니다.',
      data: result
    });

  } catch (error) {
    console.error('사용자 저장 중 오류 발생:', error);
    return res.status(500).json({
      success: false,
      error: '사용자 정보를 저장하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
