import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata = {
  title: "LaunchNYC",
  description: "Your NYC apartment search, simplified.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-white font-sans text-[#001f3f] antialiased">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
