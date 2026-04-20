import Image from "next/image";
import Link from "next/link";

const Logo = () => {
  return (
    <Link href="/" className="flex items-center">
      <Image
        src="/icon.png"
        alt="Gonzo Systems Logo"
        // Provide the larger of the two as the base height
        height={40}
        width={40}
        // Use className to handle the responsive scaling
        className="h-8 w-auto md:h-10 object-contain"
        priority
      />
    </Link>
  );
};

export default Logo;
