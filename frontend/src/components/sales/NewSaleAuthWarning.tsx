import React from 'react';

const NewSaleAuthWarning: React.FC = () => {
  return (
    <div className="bg-amber-50 border border-amber-200 p-4 rounded-md mb-6">
      <p className="text-amber-800">
        You need to be signed in to create or edit sales. All sales are saved to your Supabase database.
      </p>
    </div>
  );
};

export default NewSaleAuthWarning;