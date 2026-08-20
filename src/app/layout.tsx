import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rekap Cepat",
  description:
    "Gabungkan dan rapikan file Excel/CSV berantakan dari berbagai unit kampus — semua diproses di browser Anda, tanpa upload ke server.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
