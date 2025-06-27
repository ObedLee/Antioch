import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Pretendard 폰트 로드
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// 메타데이터 설정
export const metadata: Metadata = {
  title: "부모교사세미나 - 성경적 세계관 교육",
  description: "안디옥교회에서 진행하는 부모교사세미나에 초대합니다.",
  keywords: [
    "성경적 세계관",
    "안디옥교회",
    "기독교 교육",
    "한국교회",
    "신앙 교육",
    "부모교사세미나",
  ],
  viewport: "width=device-width, initial-scale=1.0",
  themeColor: "#2b6cb0",
  icons: {
    icon: "/images/아이콘.png",
    apple: "/images/아이콘.png",
  },
  openGraph: {
    title: "부모교사세미나 - 성경적 세계관 교육",
    description: "안디옥교회에서 진행하는 부모교사세미나에 초대합니다.",
    url: "https://antioch.web.app/parent-teacher-seminar",
    siteName: "안디옥교회",
    images: [
      {
        url: "/images/OG.jpg",
        width: 1200,
        height: 630,
        alt: "부모교사세미나",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "부모교사세미나 - 성경적 세계관 교육",
    description: "안디옥교회에서 진행하는 부모교사세미나에 초대합니다.",
    images: ["/images/OG.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 폰트 로드 */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard.css"
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
