import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { IncidentProvider } from "../context/IncidentContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JalDrishti - Water-Secure Delhi",
  description: "3D Water-logging Prediction Dashboard",
};

import { Sidebar } from "@/components/dashboard/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased bg-black text-white`}
      >
        {/* <IncidentProvider> */}
        <Toaster position="top-center" toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            border: '1px solid #ffffff20',
          },
        }} />
        {children}
        {/* </IncidentProvider> */}
      </body>
    </html>
  );
}
