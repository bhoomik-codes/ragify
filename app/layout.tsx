import type { Metadata } from "next";
import { cookies } from "next/headers";
import { JetBrains_Mono } from 'next/font/google';
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
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
    <html lang="en" data-theme={theme} suppressHydrationWarning className={jetbrainsMono.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
