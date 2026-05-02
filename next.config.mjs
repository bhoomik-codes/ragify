/** @type {import('next').NextConfig} */
const nextConfig = {
  // ---------------------------------------------------------------------------
  // Packages that must run in the Node.js runtime (not bundled by webpack).
  // `pdf-parse` and `better-sqlite3` use native bindings / file-system access
  // that are incompatible with Next.js's edge bundler.
  // ---------------------------------------------------------------------------
  experimental: {
    serverComponentsExternalPackages: [
      'pdf-parse',
      'pdfjs-dist',
      'better-sqlite3',
      '@prisma/adapter-better-sqlite3',
      'mammoth',
      'bcryptjs',
    ],
  },

  // ---------------------------------------------------------------------------
  // Compiler options
  // ---------------------------------------------------------------------------
  compiler: {
    // Remove all console.log calls in production builds.
    // console.warn/error are retained for structured logging.
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['warn', 'error'] }
      : false,
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'zod/v3': 'zod',
    };
    return config;
  },


  // ---------------------------------------------------------------------------
  // HTTP response headers
  // ---------------------------------------------------------------------------
  async headers() {
    return [
      {
        // Cache static assets for 1 year (immutable — Next.js hashes filenames).
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Prevent clickjacking and sniffing on all routes.
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
