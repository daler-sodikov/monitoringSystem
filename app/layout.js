import './globals.css'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'

const sans = Outfit({
    subsets: ['latin', 'latin-ext', 'cyrillic'],
    variable: '--font-sans',
    display: 'swap',
})

const mono = JetBrains_Mono({
    subsets: ['latin', 'latin-ext', 'cyrillic'],
    variable: '--font-mono',
    display: 'swap',
})

export const metadata = {
    title: 'Платформаи тестӣ',
    description: 'Платформаи муосири тестӣ бо якчанд вариант ва баҳогузории автоматӣ',
    manifest: '/manifest.json',
}

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
}

export default function RootLayout({ children }) {
    return (
        <html lang="tg" suppressHydrationWarning>
            <body
                className={`${sans.variable} ${mono.variable} antialiased`}
                suppressHydrationWarning
            >
                {children}
                <Toaster position="top-center" richColors />
            </body>
        </html>
    )
}
