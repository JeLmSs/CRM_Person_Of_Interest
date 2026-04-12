import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/theme-context";

export const metadata: Metadata = {
  title: "Sphere | Tu Red Profesional, Amplificada",
  description: "El CRM de networking inteligente para directivos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        {/* Prevent flash: apply saved theme before paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')})()` }} />
      </head>
      <body className="min-h-full flex flex-col font-sans" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
