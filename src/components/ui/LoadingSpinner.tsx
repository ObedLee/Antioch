'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showVerse?: boolean;
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  showVerse = true, 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const strokeWidthClasses = {
    sm: 'stroke-[3]',
    md: 'stroke-[4]',
    lg: 'stroke-[5]',
    xl: 'stroke-[6]'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* 두꺼운 원형 프로그래스바 */}
      <div className="relative">
        <svg 
          className={`${sizeClasses[size]} text-blue-600`}
          fill="none" 
          viewBox="0 0 24 24"
          style={{
            animation: 'spin 1s linear infinite',
          }}
        >
          {/* 배경 원 */}
          <circle 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="#e5e7eb"
            strokeWidth="3"
            fill="none"
          />
          {/* 진행 원 */}
          <circle 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="62.83"
            strokeDashoffset="47.12"
            fill="none"
            className="text-blue-600"
            style={{
              transformOrigin: '50% 50%',
              transition: 'stroke-dashoffset 0.3s ease',
            }}
          />
        </svg>
        
        {/* CSS 애니메이션 정의 */}
        <style jsx>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
          }
        `}</style>
      </div>

      {/* 성경 말씀 - 스피너와 동시에 표시 */}
      {showVerse && (
        <div className="text-center max-w-sm animate-fade-in">
          <p className="text-sm text-gray-600 leading-relaxed">
            "복 있는 사람은 악인의 꾀를 좇지 아니하며 죄인의 길에 서지 아니하며 오만한 자의 자리에 앉지 아니하고 오직 여호와의 율법을 즐거워하여 그 율법을 주야로 묵상하는 자로다"
          </p>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            시편 1:1-2
          </p>
        </div>
      )}
    </div>
  );
}
