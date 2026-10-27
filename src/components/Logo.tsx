import React from 'react';
import logo from '../assets/logo.png';

/** شعار التطبيق (العملة الدائرية) */
export const Logo: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <img src={logo} width={size} height={size} alt="دولار العراق" className="rounded-full" draggable={false} />
);
