import './globals.css'
import { Toaster } from 'sonner'

export const metadata = {
    title: 'Платформаи тестӣ',
    description: 'Платформаи муосири тестӣ бо якчанд вариант ва баҳогузории автоматӣ',
}

export default function RootLayout({ children }) {
    return (
        <html lang="tg">
        <body>
        {children}
        <Toaster position="top-center" richColors />
        </body>
        </html>
    )
}
