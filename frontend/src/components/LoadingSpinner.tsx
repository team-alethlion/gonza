"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col items-center justify-center space-y-4 ${className}`}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className={sizeClasses[size]}
      >
        <Image
          src="/icon.png"
          alt="Loading"
          width={sizeMap[size]}
          height={sizeMap[size]}
          className="w-full h-full"
        />
      </motion.div>
      <motion.p 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-muted-foreground text-sm font-medium"
      >
        {message}
      </motion.p>
    </motion.div>
  );
};

export default LoadingSpinner;
