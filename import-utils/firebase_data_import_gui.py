#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Firebase 데이터 가져오기 GUI 프로그램
Excel, CSV, TXT 파일을 드래그&드롭 또는 파일 선택으로 Firebase Firestore에 업로드

필요한 패키지 설치:
    pip install firebase-admin pandas openpyxl tkinterdnd2

Firebase 서비스 계정 키 파일이 필요합니다:
    - Firebase Console > 프로젝트 설정 > 서비스 계정에서 키 생성
    - 파일명을 'firebase-service-account.json'으로 저장
"""

import os
import sys
import json
import threading
from datetime import datetime
from typing import Dict, List, Any, Optional
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

try:
    from tkinterdnd2 import DND_FILES, TkinterDnD
    DND_AVAILABLE = True
except ImportError:
    DND_AVAILABLE = False
    print("⚠️  tkinterdnd2가 설치되지 않았습니다. 드래그&드롭 기능이 비활성화됩니다.")
    print("설치: pip install tkinterdnd2")

class FirebaseDataImporterGUI:
    def __init__(self):
        """GUI 초기화"""
        self.db = None
        self.service_account_path = 'firebase-service-account.json'
        
        # GUI 설정
        if DND_AVAILABLE:
            self.root = TkinterDnD.Tk()
        else:
            self.root = tk.Tk()
            
        self.root.title("🔥 Firebase 데이터 가져오기 도구")
        self.root.geometry("800x700")
        self.root.resizable(True, True)
        
        # 스타일 설정
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # 변수들
        self.file_path = tk.StringVar()
        self.collection_name = tk.StringVar(value="vehicles")
        self.delimiter = tk.StringVar(value=",")
        self.file_type = tk.StringVar(value="auto")
        self.dry_run = tk.BooleanVar(value=True)
        
        self.setup_gui()
        self.initialize_firebase()
    
    def setup_gui(self):
        """GUI 레이아웃 설정"""
        # 메인 프레임
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # 제목
        title_label = ttk.Label(main_frame, text="🔥 Firebase 데이터 가져오기", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Firebase 연결 상태
        self.firebase_status = ttk.Label(main_frame, text="🔴 Firebase 연결 안됨", 
                                        foreground="red")
        self.firebase_status.grid(row=1, column=0, columnspan=3, pady=(0, 10))
        
        # 파일 선택 섹션
        file_frame = ttk.LabelFrame(main_frame, text="📁 파일 선택", padding="10")
        file_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        file_frame.columnconfigure(1, weight=1)
        
        # 파일 경로 입력
        ttk.Label(file_frame, text="파일:").grid(row=0, column=0, sticky=tk.W, padx=(0, 5))
        self.file_entry = ttk.Entry(file_frame, textvariable=self.file_path, width=50)
        self.file_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(0, 5))
        
        ttk.Button(file_frame, text="파일 선택", 
                  command=self.browse_file).grid(row=0, column=2)
        
        # 드래그&드롭 영역
        if DND_AVAILABLE:
            self.drop_frame = ttk.Frame(file_frame, relief="sunken", borderwidth=2)
            self.drop_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), 
                               pady=(10, 0))
            self.drop_frame.columnconfigure(0, weight=1)
            
            drop_label = ttk.Label(self.drop_frame, 
                                 text="📂 여기에 파일을 드래그&드롭하세요\n(Excel, CSV, TXT 파일 지원)",
                                 justify=tk.CENTER, padding="20")
            drop_label.grid(row=0, column=0)
            
            # 드래그&드롭 이벤트 바인딩
            self.drop_frame.drop_target_register(DND_FILES)
            self.drop_frame.dnd_bind('<<Drop>>', self.on_drop)
        
        # 설정 섹션
        config_frame = ttk.LabelFrame(main_frame, text="⚙️ 설정", padding="10")
        config_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        config_frame.columnconfigure(1, weight=1)
        
        # 컬렉션명
        ttk.Label(config_frame, text="컬렉션명:").grid(row=0, column=0, sticky=tk.W, padx=(0, 5))
        ttk.Entry(config_frame, textvariable=self.collection_name, width=30).grid(
            row=0, column=1, sticky=tk.W, padx=(0, 20))
        
        # 파일 형식
        ttk.Label(config_frame, text="파일 형식:").grid(row=0, column=2, sticky=tk.W, padx=(0, 5))
        format_combo = ttk.Combobox(config_frame, textvariable=self.file_type, 
                                   values=["auto", "excel", "csv", "txt"], 
                                   state="readonly", width=10)
        format_combo.grid(row=0, column=3, sticky=tk.W)
        
        # 구분자 (CSV/TXT용)
        ttk.Label(config_frame, text="구분자:").grid(row=1, column=0, sticky=tk.W, padx=(0, 5))
        delimiter_combo = ttk.Combobox(config_frame, textvariable=self.delimiter,
                                     values=[",", ";", "\t", "|"], width=10)
        delimiter_combo.grid(row=1, column=1, sticky=tk.W, padx=(0, 20))
        
        # 테스트 모드
        ttk.Checkbutton(config_frame, text="🧪 테스트 모드 (실제 업로드 안함)", 
                       variable=self.dry_run).grid(row=1, column=2, columnspan=2, sticky=tk.W)
        
        # 버튼 섹션
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=4, column=0, columnspan=3, pady=(0, 10))
        
        self.upload_button = ttk.Button(button_frame, text="🚀 업로드 시작", 
                                       command=self.start_upload, style="Accent.TButton")
        self.upload_button.pack(side=tk.LEFT, padx=(0, 10))
        
        ttk.Button(button_frame, text="🔄 Firebase 재연결", 
                  command=self.reconnect_firebase).pack(side=tk.LEFT, padx=(0, 10))
        
        ttk.Button(button_frame, text="📋 로그 지우기", 
                  command=self.clear_log).pack(side=tk.LEFT)
        
        # 진행률 바
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(main_frame, variable=self.progress_var, 
                                          maximum=100, length=400)
        self.progress_bar.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # 로그 출력 영역
        log_frame = ttk.LabelFrame(main_frame, text="📝 로그", padding="5")
        log_frame.grid(row=6, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(6, weight=1)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=15, width=80)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 상태바
        self.status_var = tk.StringVar(value="준비됨")
        status_bar = ttk.Label(main_frame, textvariable=self.status_var, 
                              relief=tk.SUNKEN, anchor=tk.W)
        status_bar.grid(row=7, column=0, columnspan=3, sticky=(tk.W, tk.E))
    
    def log(self, message: str, level: str = "INFO"):
        """로그 메시지 출력"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_message = f"[{timestamp}] {level}: {message}\n"
        
        self.log_text.insert(tk.END, log_message)
        self.log_text.see(tk.END)
        self.root.update_idletasks()
        
        # 콘솔에도 출력
        print(f"{level}: {message}")
    
    def clear_log(self):
        """로그 지우기"""
        self.log_text.delete(1.0, tk.END)
    
    def browse_file(self):
        """파일 선택 다이얼로그"""
        filetypes = [
            ("모든 지원 파일", "*.xlsx;*.xls;*.csv;*.txt"),
            ("Excel 파일", "*.xlsx;*.xls"),
            ("CSV 파일", "*.csv"),
            ("텍스트 파일", "*.txt"),
            ("모든 파일", "*.*")
        ]
        
        filename = filedialog.askopenfilename(
            title="업로드할 파일 선택",
            filetypes=filetypes
        )
        
        if filename:
            self.file_path.set(filename)
            self.log(f"파일 선택됨: {filename}")
    
    def on_drop(self, event):
        """드래그&드롭 이벤트 처리"""
        if not DND_AVAILABLE:
            return
            
        files = self.root.tk.splitlist(event.data)
        if files:
            file_path = files[0]
            self.file_path.set(file_path)
            self.log(f"파일 드롭됨: {file_path}")
    
    def initialize_firebase(self):
        """Firebase 초기화"""
        try:
            if not os.path.exists(self.service_account_path):
                self.log(f"서비스 계정 키 파일을 찾을 수 없습니다: {self.service_account_path}", "ERROR")
                self.firebase_status.config(text="🔴 서비스 계정 키 파일 없음", foreground="red")
                return False
            
            # Firebase 앱이 이미 초기화되어 있는지 확인
            if not firebase_admin._apps:
                cred = credentials.Certificate(self.service_account_path)
                firebase_admin.initialize_app(cred)
            
            self.db = firestore.client()
            self.log("Firebase 연결 성공!", "SUCCESS")
            self.firebase_status.config(text="🟢 Firebase 연결됨", foreground="green")
            return True
            
        except Exception as e:
            self.log(f"Firebase 초기화 실패: {str(e)}", "ERROR")
            self.firebase_status.config(text="🔴 Firebase 연결 실패", foreground="red")
            return False
    
    def reconnect_firebase(self):
        """Firebase 재연결"""
        self.log("Firebase 재연결 시도 중...")
        self.initialize_firebase()
    
    def read_file(self, file_path: str) -> pd.DataFrame:
        """파일 읽기"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")
        
        file_ext = os.path.splitext(file_path)[1].lower()
        file_type = self.file_type.get()
        
        # 자동 감지
        if file_type == "auto":
            if file_ext in ['.xlsx', '.xls']:
                file_type = "excel"
            elif file_ext == '.csv':
                file_type = "csv"
            elif file_ext == '.txt':
                file_type = "txt"
        
        try:
            if file_type == "excel":
                self.log(f"Excel 파일 읽는 중: {file_path}")
                df = pd.read_excel(file_path)
                
            elif file_type == "csv":
                self.log(f"CSV 파일 읽는 중: {file_path}")
                delimiter = self.delimiter.get()
                df = pd.read_csv(file_path, delimiter=delimiter)
                
            elif file_type == "txt":
                self.log(f"TXT 파일 읽는 중: {file_path}")
                delimiter = self.delimiter.get() if self.delimiter.get() != "," else '\t'
                df = pd.read_csv(file_path, delimiter=delimiter)
                
            else:
                raise ValueError(f"지원하지 않는 파일 형식: {file_type}")
            
            self.log(f"파일 읽기 완료: {len(df)}개 행, {len(df.columns)}개 열")
            self.log(f"컬럼명: {list(df.columns)}")
            
            return df
            
        except Exception as e:
            self.log(f"파일 읽기 실패: {str(e)}", "ERROR")
            raise
    
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """데이터 정리"""
        self.log("데이터 정리 중...")
        
        # NaN 값을 None으로 변환
        df = df.where(pd.notnull(df), None)
        
        # 컬럼명 정리
        df.columns = df.columns.str.strip()
        
        # 빈 행 제거
        df = df.dropna(how='all')
        
        self.log(f"데이터 정리 완료: {len(df)}개 행")
        return df
    
    def convert_to_firestore_format(self, row: pd.Series) -> Dict[str, Any]:
        """Firestore 문서 형식으로 변환"""
        doc = {}
        current_time = datetime.now()
        
        for key, value in row.items():
            if pd.isna(value) or value is None:
                doc[key] = None
                continue
            
            if isinstance(value, (pd.Timestamp, datetime)):
                doc[key] = value
            elif isinstance(value, (int, float)):
                if pd.isna(value) or not pd.isfinite(value):
                    doc[key] = None
                else:
                    doc[key] = value
            else:
                doc[key] = str(value).strip() if str(value).strip() else None
        
        # 자동 Timestamp 필드 추가
        if 'createdAt' not in doc or doc['createdAt'] is None:
            doc['createdAt'] = current_time
        if 'updatedAt' not in doc or doc['updatedAt'] is None:
            doc['updatedAt'] = current_time
        
        return doc
    
    def upload_to_firestore(self, df: pd.DataFrame, collection_name: str) -> bool:
        """Firestore에 업로드"""
        try:
            total_rows = len(df)
            self.log(f"Firestore 업로드 시작: {total_rows}개 문서를 '{collection_name}' 컬렉션에 추가")
            
            if self.dry_run.get():
                self.log("🧪 테스트 모드: 실제 업로드는 수행하지 않습니다.")
                
                if not df.empty:
                    sample_doc = self.convert_to_firestore_format(df.iloc[0])
                    self.log("업로드될 문서 구조 예시:")
                    self.log(json.dumps(sample_doc, indent=2, default=str, ensure_ascii=False))
                
                # 가짜 진행률 업데이트
                for i in range(101):
                    self.progress_var.set(i)
                    self.root.update_idletasks()
                    if i % 10 == 0:
                        self.log(f"테스트 진행률: {i}%")
                
                return True
            
            collection_ref = self.db.collection(collection_name)
            uploaded_count = 0
            batch_size = 500
            
            # 배치 단위로 업로드
            for i in range(0, total_rows, batch_size):
                batch = self.db.batch()
                batch_end = min(i + batch_size, total_rows)
                
                self.log(f"배치 {i//batch_size + 1} 처리 중: {i+1}-{batch_end}/{total_rows}")
                
                for idx in range(i, batch_end):
                    row = df.iloc[idx]
                    doc_data = self.convert_to_firestore_format(row)
                    
                    doc_ref = collection_ref.document()
                    batch.set(doc_ref, doc_data)
                
                # 배치 커밋
                batch.commit()
                uploaded_count += (batch_end - i)
                
                # 진행률 업데이트
                progress = (uploaded_count / total_rows) * 100
                self.progress_var.set(progress)
                self.root.update_idletasks()
                
                self.log(f"배치 완료: {uploaded_count}/{total_rows} 업로드됨")
            
            self.log(f"🎉 업로드 완료! 총 {uploaded_count}개 문서가 '{collection_name}' 컬렉션에 추가되었습니다.", "SUCCESS")
            return True
            
        except Exception as e:
            self.log(f"업로드 실패: {str(e)}", "ERROR")
            return False
    
    def start_upload(self):
        """업로드 시작 (별도 스레드에서 실행)"""
        # 입력 검증
        if not self.file_path.get():
            messagebox.showerror("오류", "파일을 선택해주세요.")
            return
        
        if not self.collection_name.get():
            messagebox.showerror("오류", "컬렉션명을 입력해주세요.")
            return
        
        if not self.db:
            messagebox.showerror("오류", "Firebase에 연결되지 않았습니다.")
            return
        
        # UI 비활성화
        self.upload_button.config(state="disabled")
        self.progress_var.set(0)
        
        # 별도 스레드에서 업로드 실행
        thread = threading.Thread(target=self._upload_worker)
        thread.daemon = True
        thread.start()
    
    def _upload_worker(self):
        """업로드 작업 스레드"""
        try:
            self.status_var.set("업로드 중...")
            
            # 파일 읽기
            df = self.read_file(self.file_path.get())
            
            # 데이터 정리
            df = self.clean_data(df)
            
            if df.empty:
                self.log("업로드할 데이터가 없습니다.", "WARNING")
                return
            
            # 업로드
            success = self.upload_to_firestore(df, self.collection_name.get())
            
            if success:
                self.status_var.set("업로드 완료!")
                if not self.dry_run.get():
                    messagebox.showinfo("완료", "데이터 업로드가 완료되었습니다!")
                else:
                    messagebox.showinfo("테스트 완료", "테스트가 완료되었습니다!")
            else:
                self.status_var.set("업로드 실패")
                messagebox.showerror("오류", "업로드 중 오류가 발생했습니다.")
                
        except Exception as e:
            self.log(f"업로드 오류: {str(e)}", "ERROR")
            self.status_var.set("오류 발생")
            messagebox.showerror("오류", f"오류가 발생했습니다:\n{str(e)}")
            
        finally:
            # UI 다시 활성화
            self.upload_button.config(state="normal")
            self.progress_var.set(0)

def main():
    """메인 함수"""
    app = FirebaseDataImporterGUI()
    
    # 종료 시 정리
    def on_closing():
        if messagebox.askokcancel("종료", "프로그램을 종료하시겠습니까?"):
            app.root.destroy()
    
    app.root.protocol("WM_DELETE_WINDOW", on_closing)
    
    # GUI 시작
    app.log("🔥 Firebase 데이터 가져오기 GUI 시작!")
    app.log("파일을 선택하거나 드래그&드롭하여 업로드하세요.")
    
    app.root.mainloop()

if __name__ == "__main__":
    main()
