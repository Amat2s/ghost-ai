import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { ui } from "@clerk/ui"
import { dark } from "@clerk/ui/themes"
import "./globals.css"
import "@xyflow/react/dist/style.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Ghost AI",
  description: "Real-time collaborative system design workspace",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      ui={ui}
      appearance={{
        theme: dark,
        variables: {
          colorBackground: "var(--bg-surface)",
          colorInput: "var(--bg-elevated)",
          colorInputForeground: "var(--text-primary)",
          colorForeground: "var(--text-primary)",
          colorMutedForeground: "var(--text-secondary)",
          colorPrimary: "var(--accent-primary)",
          colorDanger: "var(--state-error)",
          fontFamily: "var(--font-geist-sans)",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  )
}
