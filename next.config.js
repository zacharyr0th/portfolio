/** @type {import('next').NextConfig} */

// Suppress Node.js warnings including punycode deprecation
const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  if (
    name === `warning` &&
    typeof data === "object" &&
    data.name === "DeprecationWarning" &&
    data.message.includes("punycode")
  ) {
    return false;
  }
  return originalEmit.apply(process, [name, data, ...args]);
};

const nextConfig = {
  // Core configuration
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,

  // Environment Variables Configuration
  env: {
    // Only expose necessary environment variables to the client
    API_URL: process.env.API_URL || '/api',
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    DEFAULT_CHAIN: process.env.DEFAULT_CHAIN || 'aptos',
    SIMPLEHASH_API_KEY: process.env.SIMPLEHASH_API_KEY,
    // Expose wallet addresses for client-side configuration
    ...Object.keys(process.env).reduce((acc, key) => {
      if (key.match(/^(SOLANA|APTOS|SUI)_WALLET_/)) {
        acc[key] = process.env[key]
      }
      return acc
    }, {}),
  },

  // Image optimization
  images: {
    unoptimized: false, // Enable image optimization
    domains: ['cdn.simplehash.com'], // Add domains you'll use for images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
        minimize: true,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        mangleExports: true,
      };
    }

    // Handle ESM modules
    config.resolve.alias = {
      ...config.resolve.alias,
      "decimal.js-light": require.resolve("decimal.js-light"),
    };

    return config;
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,OPTIONS,PUT,DELETE",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
    ];
  },

  // Stable features only
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

module.exports = nextConfig;
