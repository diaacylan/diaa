import React from 'react';

/** شعار التطبيق: مربع أخضر مدوّر مع علامة الدولار */
export const Logo: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img" aria-label="دولار العراق">
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#12A065" />
        <stop offset="1" stopColor="#065A37" />
      </linearGradient>
    </defs>
    <rect width="96" height="96" rx="24" fill="url(#lg)" />
    <circle cx="48" cy="48" r="29" fill="none" stroke="#E5B94A" strokeWidth="3" />
    <text
      x="48"
      y="63"
      textAnchor="middle"
      fontSize="46"
      fontWeight="900"
      fill="#fff"
      fontFamily="'Cairo Variable', system-ui, sans-serif"
    >
      $
    </text>
  </svg>
);
