import Image from "next/image";
import React from "react";

export function LoginLogo() {
  return (
    <div className="mb-6 flex justify-center">
      <Image
        width={64}
        height={64}
        src="/icon.png"
        alt="Gonzo Systems"
        className="h-16 md:h-20 object-contain"
      />
    </div>
  );
}
