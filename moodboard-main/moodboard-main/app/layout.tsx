import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interior Moodboard Generator",
  description: "Generate a single collage-style interior design moodboard using Gemini."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F9F5F0] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}


