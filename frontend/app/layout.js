import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: "فريق الشرقية للمشي | المشي أسلوب حياة",
  description: "المنصة الرسمية لمجتمع فريق الشرقية للمشي والجري - سجل أنشطتك وتنافس مع زملائك",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('ewt_theme');
                  if (theme !== 'light' && theme !== 'dark') theme = 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans min-h-full bg-[var(--dark-bg)] text-[var(--text-primary)] flex flex-col antialiased transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
