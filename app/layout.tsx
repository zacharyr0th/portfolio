import { Inter } from 'next/font/google'
import './globals.css'
import { RootLayoutClient } from '@/app/components/layout/RootLayoutClient'
import { metadata } from '@/lib/utils/core/metadata'
import { viewport } from '@/lib/utils/ui/viewport'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export { metadata, viewport }

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
                />
                <meta name="theme-color" content="#000000" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            </head>
            <body className={`${inter.className} min-h-screen bg-background mobile-safe-area`}>
                <RootLayoutClient>{children}</RootLayoutClient>
            </body>
        </html>
    )
}
