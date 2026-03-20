import React from 'react';


const NewSaleLoadingState: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

export default NewSaleLoadingState;