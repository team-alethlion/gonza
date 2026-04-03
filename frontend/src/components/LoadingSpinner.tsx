import React from "react";
import Image from "next/image";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  size = "md",
  className = "",
}) => {
  const sizeMap = {
    sm: 32,
    md: 64,
    lg: 96,
  };

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <Image
        src="/icon.png"
        alt="Loading"
        width={sizeMap[size]}
        height={sizeMap[size]}
        className={`${sizeClasses[size]} animate-spin`}
      />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
