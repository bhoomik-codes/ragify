import React from 'react';
import { SkeletonCard } from '../../../components/shared/SkeletonCard';

export default function DashboardLoading() {
  // Return the skeleton grid layout that matches RagCard visual sizes
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '48px auto' }}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
