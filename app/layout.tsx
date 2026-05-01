import type { Metadata } from "next";
import { cookies } from "next/headers";
import { JetBrains_Mono, DM_Sans } from 'next/font/google';
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Ragify | Your Personal Knowledge Chatbot",
  description: "Create, configure, and chat with your own RAG bots backed by your documents and retrieval settings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = cookies().get('theme')?.value || 'light';
  
  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning className={`${jetbrainsMono.variable} ${dmSans.variable}`}>
      <head>
        {/* Removed preconnects as next/font handles optimization */}
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
