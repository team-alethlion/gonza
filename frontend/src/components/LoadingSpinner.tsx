
import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <img 
        src="/lovable-uploads/7f7549a3-e9df-4762-b8b9-8e041e34f55d.png" 
        alt="Loading" 
        className={`${sizeClasses[size]} animate-spin`}
      />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
