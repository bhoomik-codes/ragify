"use client";

import Script from 'next/script';

export default function BrainScene() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Script
        type="module"
        src="https://unpkg.com/@splinetool/viewer@1.12.91/build/spline-viewer.js"
        strategy="lazyOnload"
      />
      {/* @ts-ignore - custom web component */}
      <spline-viewer url="https://prod.spline.design/PizZVe2BEVqla-s3/scene.splinecode"></spline-viewer>
    </div>
  );
}
