#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Firebase 데이터 가져오기 스크립트
Excel, CSV, TXT 파일을 읽어서 Firebase Firestore에 업로드

사용법:
    python firebase_data_import.py <파일경로> <컬렉션명> [옵션]

예시:
    python firebase_data_import.py vehicles.xlsx vehicles
    python firebase_data_import.py data.csv fruits --delimiter ","
    python firebase_data_import.py data.txt members --delimiter "\t"

필요한 패키지 설치:
    pip install firebase-admin pandas openpyxl

Firebase 서비스 계정 키 파일이 필요합니다:
    - Firebase Console > 프로젝트 설정 > 서비스 계정에서 키 생성
    - 파일명을 'firebase-service-account.json'으로 저장
"""

import os
import sys
import json
import argparse
from datetime import datetime
from typing import Dict, List, Any, Optional
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

class FirebaseDataImporter:
    def __init__(self, service_account_path: str = None):
        """
        Firebase 데이터 가져오기 클래스 초기화
        
        Args:
            service_account_path: Firebase 서비스 계정 키 파일 경로
        """
        self.db = None
        self.service_account_path = service_account_path or 'firebase-service-account.json'
        self.initialize_firebase()
    
    def initialize_firebase(self):
        """Firebase Admin SDK 초기화"""
        try:
            if not os.path.exists(self.service_account_path):
                print(f"❌ 서비스 계정 키 파일을 찾을 수 없습니다: {self.service_account_path}")
                print("Firebase Console에서 서비스 계정 키를 생성하고 'firebase-service-account.json'으로 저장해주세요.")
                sys.exit(1)
            
            # Firebase 앱이 이미 초기화되어 있는지 확인
            if not firebase_admin._apps:
                cred = credentials.Certificate(self.service_account_path)
                firebase_admin.initialize_app(cred)
            
            self.db = firestore.client()
            print("✅ Firebase 연결 성공!")
            
        except Exception as e:
            print(f"❌ Firebase 초기화 실패: {str(e)}")
            sys.exit(1)
    
    def read_file(self, file_path: str, delimiter: str = None) -> pd.DataFrame:
        """
        파일을 읽어서 DataFrame으로 반환
        
        Args:
            file_path: 파일 경로
            delimiter: 구분자 (CSV, TXT용)
            
        Returns:
            pandas.DataFrame
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")
        
        file_ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if file_ext in ['.xlsx', '.xls']:
                print(f"📊 Excel 파일 읽는 중: {file_path}")
                df = pd.read_excel(file_path)
                
            elif file_ext == '.csv':
                print(f"📄 CSV 파일 읽는 중: {file_path}")
                delimiter = delimiter or ','
                df = pd.read_csv(file_path, delimiter=delimiter)
                
            elif file_ext == '.txt':
                print(f"📝 TXT 파일 읽는 중: {file_path}")
                delimiter = delimiter or '\t'  # 기본값: 탭
                df = pd.read_csv(file_path, delimiter=delimiter)
                
            else:
                raise ValueError(f"지원하지 않는 파일 형식: {file_ext}")
            
            print(f"✅ 파일 읽기 완료: {len(df)}개 행, {len(df.columns)}개 열")
            print(f"📋 컬럼명: {list(df.columns)}")
            
            return df
            
        except Exception as e:
            print(f"❌ 파일 읽기 실패: {str(e)}")
            raise
    
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        데이터 정리 및 전처리
        
        Args:
            df: 원본 DataFrame
            
        Returns:
            정리된 DataFrame
        """
        print("🧹 데이터 정리 중...")
        
        # NaN 값을 None으로 변환 (Firestore 호환)
        df = df.where(pd.notnull(df), None)
        
        # 컬럼명 정리 (공백 제거, 특수문자 처리)
        df.columns = df.columns.str.strip()
        
        # 빈 행 제거
        df = df.dropna(how='all')
        
        print(f"✅ 데이터 정리 완료: {len(df)}개 행")
        return df
    
    def convert_to_firestore_format(self, row: pd.Series) -> Dict[str, Any]:
        """
        pandas Series를 Firestore 문서 형식으로 변환
        
        Args:
            row: pandas Series (DataFrame의 한 행)
            
        Returns:
            Firestore 문서 딕셔너리
        """
        doc = {}
        current_time = datetime.now()
        
        for key, value in row.items():
            # None 값 처리
            if pd.isna(value) or value is None:
                doc[key] = None
                continue
            
            # 날짜/시간 처리
            if isinstance(value, (pd.Timestamp, datetime)):
                doc[key] = value
            
            # 숫자 처리
            elif isinstance(value, (int, float)):
                # NaN이나 inf 값 처리
                if pd.isna(value) or not pd.isfinite(value):
                    doc[key] = None
                else:
                    doc[key] = value
            
            # 문자열 처리
            else:
                doc[key] = str(value).strip() if str(value).strip() else None
        
        # 자동 Timestamp 필드 추가
        if 'createdAt' not in doc or doc['createdAt'] is None:
            doc['createdAt'] = current_time
        if 'updatedAt' not in doc or doc['updatedAt'] is None:
            doc['updatedAt'] = current_time
        
        return doc
    
    def upload_to_firestore(self, df: pd.DataFrame, collection_name: str, 
                          batch_size: int = 500, dry_run: bool = False) -> bool:
        """
        DataFrame을 Firestore에 업로드
        
        Args:
            df: 업로드할 DataFrame
            collection_name: Firestore 컬렉션명
            batch_size: 배치 크기
            dry_run: 실제 업로드 없이 테스트만 수행
            
        Returns:
            성공 여부
        """
        try:
            total_rows = len(df)
            print(f"🚀 Firestore 업로드 시작: {total_rows}개 문서를 '{collection_name}' 컬렉션에 추가")
            
            if dry_run:
                print("🧪 DRY RUN 모드: 실제 업로드는 수행하지 않습니다.")
                
                # 첫 번째 행만 변환해서 구조 확인
                if not df.empty:
                    sample_doc = self.convert_to_firestore_format(df.iloc[0])
                    print("📋 업로드될 문서 구조 예시:")
                    print(json.dumps(sample_doc, indent=2, default=str, ensure_ascii=False))
                
                return True
            
            collection_ref = self.db.collection(collection_name)
            uploaded_count = 0
            
            # 배치 단위로 업로드
            for i in range(0, total_rows, batch_size):
                batch = self.db.batch()
                batch_end = min(i + batch_size, total_rows)
                
                print(f"📦 배치 {i//batch_size + 1} 처리 중: {i+1}-{batch_end}/{total_rows}")
                
                for idx in range(i, batch_end):
                    row = df.iloc[idx]
                    doc_data = self.convert_to_firestore_format(row)
                    
                    # 문서 ID 생성 (자동 생성 또는 특정 필드 사용)
                    doc_ref = collection_ref.document()
                    batch.set(doc_ref, doc_data)
                
                # 배치 커밋
                batch.commit()
                uploaded_count += (batch_end - i)
                
                print(f"✅ 배치 완료: {uploaded_count}/{total_rows} 업로드됨")
            
            print(f"🎉 업로드 완료! 총 {uploaded_count}개 문서가 '{collection_name}' 컬렉션에 추가되었습니다.")
            return True
            
        except Exception as e:
            print(f"❌ 업로드 실패: {str(e)}")
            return False
    
    def import_data(self, file_path: str, collection_name: str, 
                   delimiter: str = None, dry_run: bool = False) -> bool:
        """
        파일에서 데이터를 읽어서 Firestore에 업로드하는 메인 함수
        
        Args:
            file_path: 파일 경로
            collection_name: Firestore 컬렉션명
            delimiter: 구분자 (CSV, TXT용)
            dry_run: 실제 업로드 없이 테스트만 수행
            
        Returns:
            성공 여부
        """
        try:
            # 1. 파일 읽기
            df = self.read_file(file_path, delimiter)
            
            # 2. 데이터 정리
            df = self.clean_data(df)
            
            if df.empty:
                print("⚠️  업로드할 데이터가 없습니다.")
                return False
            
            # 3. Firestore에 업로드
            return self.upload_to_firestore(df, collection_name, dry_run=dry_run)
            
        except Exception as e:
            print(f"❌ 데이터 가져오기 실패: {str(e)}")
            return False

def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description="Excel, CSV, TXT 파일을 Firebase Firestore에 업로드",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python firebase_data_import.py vehicles.xlsx vehicles
  python firebase_data_import.py data.csv fruits --delimiter ","
  python firebase_data_import.py data.txt members --delimiter "\\t"
  python firebase_data_import.py test.xlsx test_collection --dry-run
        """
    )
    
    parser.add_argument('file_path', help='가져올 파일 경로')
    parser.add_argument('collection_name', help='Firestore 컬렉션명')
    parser.add_argument('--delimiter', '-d', help='구분자 (CSV, TXT용)', default=None)
    parser.add_argument('--service-account', '-s', help='Firebase 서비스 계정 키 파일 경로', 
                       default='firebase-service-account.json')
    parser.add_argument('--dry-run', action='store_true', help='실제 업로드 없이 테스트만 수행')
    
    args = parser.parse_args()
    
    print("🔥 Firebase 데이터 가져오기 스크립트")
    print("=" * 50)
    
    # 데이터 가져오기 실행
    importer = FirebaseDataImporter(args.service_account)
    success = importer.import_data(
        file_path=args.file_path,
        collection_name=args.collection_name,
        delimiter=args.delimiter,
        dry_run=args.dry_run
    )
    
    if success:
        print("\n🎉 작업이 성공적으로 완료되었습니다!")
        sys.exit(0)
    else:
        print("\n❌ 작업이 실패했습니다.")
        sys.exit(1)

if __name__ == "__main__":
    main()
