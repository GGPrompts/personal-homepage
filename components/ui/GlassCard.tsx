import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'light' | 'dark';
  hover3d?: boolean;
  interactive?: boolean;
}

export default function GlassCard({
  children,
  className = '',
  variant = 'light',
  hover3d = false,
  interactive = false
}: GlassCardProps) {
  const baseClasses = variant === 'light' ? 'glass' : 'glass-dark';

  // Build hover classes based on options
  let hoverClasses = 'transition-all duration-300 ease-out';
  if (hover3d) {
    hoverClasses += ' hover:scale-[1.02] hover:-translate-y-1';
  }
  if (interactive) {
    hoverClasses += ' hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 cursor-pointer active:scale-[0.99]';
  }

  return (
    <div className={`${baseClasses} rounded-xl p-6 ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
}
