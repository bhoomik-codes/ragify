import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ragify | Your Personal Knowledge Chatbot",
  description: "Create, configure, and chat with your own RAG bots backed by your documents and retrieval settings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
