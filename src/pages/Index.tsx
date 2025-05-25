
import React from 'react';
import DTRScanner from '@/components/DTRScanner';
import AdminLink from '@/components/AdminLink';

const Index = () => {
  return (
    <div className="relative">
      <AdminLink />
      <DTRScanner />
    </div>
  );
};

export default Index;
