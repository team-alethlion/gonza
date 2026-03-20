
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ProductImageProps {
  imageUrl?: string | null;
  alt: string;
  size?: 'sm' | 'md';
}

const ProductImage: React.FC<ProductImageProps> = ({
  imageUrl,
  alt,
  size = 'md'
}) => {
  const dimensions = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
  
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={alt} 
        className={`${dimensions} object-cover rounded-md`}
      />
    );
  }
  
  return (
    <div className={`${dimensions} bg-gray-100 flex items-center justify-center rounded-md`}>
      <ImageIcon size={size === 'sm' ? 16 : 18} className="text-gray-400" />
    </div>
  );
};

export default ProductImage;
