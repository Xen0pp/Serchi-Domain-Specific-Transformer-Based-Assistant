import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Serchi',
  description: 'Expert project planning advisor.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0f0f0f] text-[#e4e2e1] antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
