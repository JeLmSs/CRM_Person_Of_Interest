import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sphere | Tu Red Profesional, Amplificada",
  description:
    "El CRM de networking inteligente para directivos. Gestiona contactos, seguimientos y relaciones estratégicas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#09090b] text-zinc-50 font-sans">
        {children}
      </body>
    </html>
  );
}
