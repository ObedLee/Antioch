# Firebase 데이터 가져오기 도구 사용법

Excel, CSV, TXT 파일을 Firebase Firestore에 업로드하는 Python 도구입니다.

## 🎯 두 가지 버전 제공

1. **GUI 버전** (`firebase_data_import_gui.py`) - 사용자 친화적인 그래픽 인터페이스
2. **CLI 버전** (`firebase_data_import.py`) - 명령줄 인터페이스

## 🚀 빠른 시작

### 1. 필요한 패키지 설치

```bash
# import-utils 폴더로 이동
cd import-utils

# CLI 버전용 패키지 설치
pip install -r requirements-import.txt

# GUI 버전용 패키지 설치 (드래그&드롭 지원)
pip install -r requirements-gui.txt
```

### 2. Firebase 서비스 계정 키 설정

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. 프로젝트 설정 (⚙️ 아이콘) → 서비스 계정 탭
4. "새 비공개 키 생성" 버튼 클릭
5. JSON 파일 다운로드
6. 파일명을 `firebase-service-account.json`으로 변경
7. `import-utils` 폴더에 저장

### 3. 프로그램 실행

#### 🖥️ GUI 버전 (추천)

```bash
# GUI 프로그램 실행
python firebase_data_import_gui.py
```

**특징:**
- 드래그&드롭 지원
- 직관적인 그래픽 인터페이스
- 실시간 로그 및 진행률 표시
- 테스트 모드 지원
- Firebase 연결 상태 표시

#### 💻 CLI 버전

```bash
# 기본 사용법
python firebase_data_import.py <파일경로> <컬렉션명>

# Excel 파일 업로드
python firebase_data_import.py vehicles.xlsx vehicles

# CSV 파일 업로드 (쉼표 구분)
python firebase_data_import.py data.csv fruits --delimiter ","

# TXT 파일 업로드 (탭 구분)
python firebase_data_import.py data.txt members --delimiter "\t"

# 테스트 실행 (실제 업로드 없음)
python firebase_data_import.py test.xlsx test_collection --dry-run
```

## 📋 지원하는 파일 형식

- **Excel**: `.xlsx`, `.xls`
- **CSV**: `.csv` (구분자 지정 가능)
- **TXT**: `.txt` (구분자 지정 가능, 기본값: 탭)

## 🔧 옵션

| 옵션 | 설명 | 예시 |
|------|------|------|
| `--delimiter` | CSV/TXT 구분자 지정 | `--delimiter ","` |
| `--service-account` | 서비스 계정 키 파일 경로 | `--service-account my-key.json` |
| `--dry-run` | 실제 업로드 없이 테스트만 수행 | `--dry-run` |

## 📊 데이터 처리 방식

1. **파일 읽기**: pandas를 사용하여 파일 읽기
2. **데이터 정리**: 
   - 빈 행 제거
   - NaN 값을 None으로 변환
   - 컬럼명 정리
3. **Firestore 업로드**:
   - 각 행이 하나의 문서가 됨
   - 각 컬럼이 문서의 필드가 됨
   - 자동으로 `importedAt`, `importSource` 메타데이터 추가

## 🛡️ 보안 주의사항

- `firebase-service-account.json` 파일은 절대 Git에 커밋하지 마세요
- 이미 `.gitignore`에 추가되어 있습니다
- 서비스 계정 키는 안전한 곳에 보관하세요

## 🔍 트러블슈팅

### 1. "서비스 계정 키 파일을 찾을 수 없습니다" 오류
- `firebase-service-account.json` 파일이 프로젝트 루트에 있는지 확인
- 파일명이 정확한지 확인

### 2. "Firebase 초기화 실패" 오류
- 서비스 계정 키 파일이 유효한 JSON인지 확인
- Firebase 프로젝트 ID가 올바른지 확인

### 3. "지원하지 않는 파일 형식" 오류
- 파일 확장자가 `.xlsx`, `.xls`, `.csv`, `.txt` 중 하나인지 확인

### 4. 권한 오류
- Firebase Console에서 서비스 계정에 Firestore 쓰기 권한이 있는지 확인

## 📝 예시 파일 구조

### Excel/CSV 파일 예시:
```
이름     | 연락처        | 부서
김철수   | 010-1234-5678 | 개발팀
이영희   | 010-9876-5432 | 디자인팀
```

### 업로드된 Firestore 문서:
```json
{
  "이름": "김철수",
  "연락처": "010-1234-5678",
  "부서": "개발팀",
  "importedAt": "2024-01-15T10:30:00Z",
  "importSource": "python_script"
}
```

## 🎯 사용 팁

1. **대용량 파일**: 자동으로 배치 처리되므로 큰 파일도 안전하게 업로드 가능
2. **테스트 먼저**: `--dry-run` 옵션으로 먼저 테스트해보세요
3. **백업**: 중요한 데이터는 업로드 전에 백업하세요
4. **컬렉션명**: 의미 있는 컬렉션명을 사용하세요 (예: `vehicles`, `members`, `products`)

## 📞 문의

스크립트 사용 중 문제가 있으면 개발팀에 문의해주세요.
