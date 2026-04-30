"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  message?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  inline?: boolean;
  showMessage?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  size = "md",
  className = "",
  inline = false,
  showMessage = true,
}) => {
  const sizeMap = {
    xs: 16,
    sm: 24,
    md: 48,
    lg: 80,
  };

  const sizeClasses = {
    xs: "w-4 h-4",
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-20 h-20",
  };

  const spinner = (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      className={`${sizeClasses[size]} shrink-0`}
    >
      <Image
        src="/icon.png"
        alt="Loading"
        width={sizeMap[size]}
        height={sizeMap[size]}
        className="w-full h-full object-contain"
      />
    </motion.div>
  );

  if (inline) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {spinner}
        {showMessage && message && (
          <span className="text-muted-foreground text-sm font-medium">
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col items-center justify-center space-y-4 ${className}`}
    >
      {spinner}
      {showMessage && message && (
        <motion.p 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-muted-foreground text-sm font-medium text-center"
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
};

export default LoadingSpinner;
