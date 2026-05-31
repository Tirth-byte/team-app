import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xinity Admin Portal",
  description: "Sign in with your administrator credentials to access the Xinity Admin Dashboard.",
  openGraph: {
    title: "Xinity Admin Portal",
    description: "Access the Xinity Administrator dashboard to manage team members and tasks.",
    url: "https://team-app-navy.vercel.app/admin",
    siteName: "Xinity Admin Portal",
    images: [
      {
        url: "https://team-app-navy.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Xinity Admin Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Xinity Admin Portal",
    description: "Access the Xinity Administrator dashboard to manage team members and tasks.",
    images: ["https://team-app-navy.vercel.app/og-image.png"],
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
