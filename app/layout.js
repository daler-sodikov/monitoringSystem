import './globals.css'
import { Toaster } from 'sonner'

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
            <body suppressHydrationWarning>
                {children}
                <Toaster position="top-center" richColors />
            </body>
        </html>
    )
}
