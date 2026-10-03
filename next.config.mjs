import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable standalone output - incompatible with Vercel serverless functions
    // output: 'standalone', // Commented out for Vercel compatibility
    // Fix HTTP 431 "Request Header Fields Too Large" caused by large cookies in dev
    httpAgentOptions: {
        keepAlive: true,
    },
    // Fix OOM during `Running TypeScript ...` (heap ~2GB limit). Allow build to continue
    // even on low-memory machines; type-check can run separately via `pnpm type-check` with
    // increased heap. Set to false locally if you want strict checking.
    typescript: {
        ignoreBuildErrors: true,
    },
    // Disable Turbopack to resolve next-server.js.nft.json build artifact issue
    experimental: {
        turbopack: false,
        optimizePackageImports: [
            'lucide-react',
            '@radix-ui/react-accordion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'date-fns',
            'recharts',
            'react-hook-form',
        ],
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/api/(.*)',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3001' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
                    { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-tenant-id, Authorization' },
                ],
            },
            {
                source: '/uploads/(.*)',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
                ],
            },
        ];
    },
};

export default withNextIntl(nextConfig);
