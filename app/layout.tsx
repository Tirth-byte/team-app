import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Xinity Team",
  description: "Sign in with your Google account to access your assigned contacts on Xinity Team.",
  openGraph: {
    title: "Xinity Team",
    description: "Sign in with your Google account to access your assigned contacts.",
    url: "https://team-app-navy.vercel.app/",
    siteName: "Xinity Team",
    images: [
      {
        url: "https://team-app-navy.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Xinity Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Xinity Team",
    description: "Sign in with your Google account to access your assigned contacts.",
    images: ["https://team-app-navy.vercel.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
