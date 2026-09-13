import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Music Tournament",
  description: "Определи лучший трек в своем плейлисте Spotify",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${figtree.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-sans bg-zinc-950 text-zinc-50">
        {children}
      </body>
    </html>
  );
}
