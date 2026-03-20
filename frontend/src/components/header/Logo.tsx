import Link from 'next/link';

const Logo = () => {
  return (
    <Link href="/" className="flex items-center">
      <img
        src="/icon.png"
        alt="Gonzo Systems Logo"
        className="h-8 md:h-10"
      />
    </Link>
  );
};

export default Logo;
