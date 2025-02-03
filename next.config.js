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
  // Optimize for production performance
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Environment Variables Configuration
  env: {
    // Expose all environment variables that start with SOLANA_WALLET_, APTOS_WALLET_, or SUI_WALLET_
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
    domains: [], // Add domains you'll use for images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
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

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

module.exports = nextConfig;
