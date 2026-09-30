import { getTr } from "@/i18n/server-tr";
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { BrandProvider } from "@/components/brand/brand-provider";
import { getBrand } from "@/lib/brand";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getTr();

  const { brandName, logoUrl } = await getBrand();
  return {
    title: tr(`${brandName} | To'yxona boshqaruv tizimi`),
    description: tr(`${brandName} to'yxonasi uchun admin panel: to'y buyurtmalari, menyular, ombor va ishchilar.`),
    manifest: "/manifest.webmanifest",
    icons: logoUrl ? { icon: logoUrl, apple: logoUrl } : { icon: "/icon.svg?v=2", apple: "/icon.svg?v=2" },
  };
}

export const viewport: Viewport = {
  themeColor: "#111813",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value;
  const locale: Locale = raw === "ru" ? "ru" : "uz";
  const brand = await getBrand();
  // The configured brand name replaces the built-in one everywhere t("common.brand") is used.
  const base = getDictionary(locale);
  const dictionary = { ...base, common: { ...base.common, brand: brand.brandName } };

  return (
    <html
      lang={locale}
      className={`${manrope.variable} ${cormorant.variable} h-full antialiased`}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.setAttribute('data-theme','light');}}catch(e){document.documentElement.setAttribute('data-theme','light');}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <BrandProvider brand={brand}>
          <LocaleProvider locale={locale} dictionary={dictionary}>
            {children}
          </LocaleProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
