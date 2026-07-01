import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

export const VEHICLES_COLLECTION = 'vehicles';
export const FRUITS_COLLECTION = 'fruits';
export const ALLOWED_EMAILS_COLLECTION = 'allowedEmails';

// 허용된 이메일인지 확인
export async function isAllowedEmail(email: string): Promise<boolean> {
  if (!db || !email) return false;
  try {
    const docRef = doc(db, ALLOWED_EMAILS_COLLECTION, email);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('[Firestore] 이메일 권한 확인 오류:', error);
    return false;
  }
}

type WithId<T> = T & { id: string };

// 문서를 객체로 변환
const docToObject = <T>(doc: QueryDocumentSnapshot | DocumentSnapshot): WithId<T> => ({
  id: doc.id,
  ...doc.data()
} as WithId<T>);

// 차량 관련 함수들
export const vehicleService = {
  // 모든 차량 조회
  async getVehicles() {
    const q = query(
      collection(db, VEHICLES_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObject<Vehicle>(doc as QueryDocumentSnapshot<Vehicle>));
  },

  // 페이지네이션으로 차량 조회
  async getVehiclesPaginated(limitCount = 30, lastDoc = null) {
    let q = query(
      collection(db, VEHICLES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    if (lastDoc) {
      q = query(
        collection(db, VEHICLES_COLLECTION),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const vehicles = querySnapshot.docs.map(doc => docToObject<Vehicle>(doc as QueryDocumentSnapshot<Vehicle>));
    
    return {
      vehicles,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
      hasMore: querySnapshot.docs.length === limitCount
    };
  },

  // 차량 ID로 조회
  async getVehicleById(id: string) {
    const docRef = doc(db, VEHICLES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return docToObject<Vehicle>(docSnap);
  },

  // 연락처 + 차량번호로 중복 체크
  async checkDuplicateVehicle(phoneNumber: string, carNumber: string, excludeId?: string) {
    const q = query(
      collection(db, VEHICLES_COLLECTION),
      where('phoneNumber', '==', phoneNumber),
      where('carNumber', '==', carNumber)
    );
    
    const querySnapshot = await getDocs(q);
    const vehicles = querySnapshot.docs.map(doc => docToObject<Vehicle>(doc as QueryDocumentSnapshot<Vehicle>));
    
    // excludeId가 있으면 해당 ID는 제외 (수정 시 사용)
    if (excludeId) {
      return vehicles.filter(vehicle => vehicle.id !== excludeId);
    }
    
    return vehicles;
  },

  // 차량 추가
  async addVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, VEHICLES_COLLECTION), {
      ...vehicle,
      createdAt: now,
      updatedAt: now,
    });
    
    return { id: docRef.id, ...vehicle, createdAt: now, updatedAt: now };
  },

  // 차량 수정
  async updateVehicle(id: string, updates: Partial<Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>>) {
    const docRef = doc(db, VEHICLES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  // 차량 삭제
  async deleteVehicle(id: string) {
    const docRef = doc(db, VEHICLES_COLLECTION, id);
    await deleteDoc(docRef);
  },
};

// 열매 관련 함수들
export const fruitService = {
  // 모든 열매 조회
  async getFruits() {
    const q = query(
      collection(db, FRUITS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObject<Fruit>(doc as QueryDocumentSnapshot<Fruit>));
  },

  // 페이지네이션으로 열매 조회
  async getFruitsPaginated(limitCount = 30, lastDoc = null) {
    let q = query(
      collection(db, FRUITS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    if (lastDoc) {
      q = query(
        collection(db, FRUITS_COLLECTION),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const fruits = querySnapshot.docs.map(doc => docToObject<Fruit>(doc as QueryDocumentSnapshot<Fruit>));
    
    return {
      fruits,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
      hasMore: querySnapshot.docs.length === limitCount
    };
  },

  // 열매 ID로 조회
  async getFruitById(id: string) {
    const docRef = doc(db, FRUITS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return docToObject<Fruit>(docSnap as DocumentSnapshot<Fruit>);
  },

  // 열매 추가
  async addFruit(fruitData: Omit<Fruit, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, FRUITS_COLLECTION), {
      ...fruitData,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  // 열매 생성 (addFruit와 동일하지만 다른 이름)
  async createFruit(fruitData: Omit<Fruit, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.addFruit(fruitData);
  },

  // 열매 단일 조회 (getFruitById와 동일하지만 다른 이름)
  async getFruit(id: string) {
    return this.getFruitById(id);
  },

  // 열매 수정
  async updateFruit(id: string, fruitData: Partial<Omit<Fruit, 'id' | 'createdAt'>>) {
    const docRef = doc(db, FRUITS_COLLECTION, id);
    await updateDoc(docRef, {
      ...fruitData,
      updatedAt: Timestamp.now(),
    });
  },

  // 열매 삭제
  async deleteFruit(id: string) {
    const docRef = doc(db, FRUITS_COLLECTION, id);
    await deleteDoc(docRef);
  },
};

// 타입 정의
export interface Vehicle {
  id: string;
  ownerName: string;
  phoneNumber: string;
  secondaryPhoneNumber?: string;
  carType: string;
  carNumber: string;
  department?: string;
  position?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface Fruit {
  id: string;
  영접자: string;        // 필수
  전도자: string;        // 필수
  사역자?: string;
  구분: string;         // 필수 (상태)
  만남날짜: string;       // 필수
  만남장소?: string;
  만남횟수?: string;     // 문자열로 변경 ("1회", "2회" 등)
  나이?: string;        // 문자열로 변경 ("25세", "30대" 등)
  연락처: string;
  영적상태?: string;    // 비고
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
