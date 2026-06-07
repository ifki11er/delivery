import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baedalk Delivery",
  description: "Delivery and store operations app",
};

import { auth } from "../../auth";
import { getI18n } from "@/i18n/server";
import { cookies } from "next/headers";
import { I18nProvider } from "@/i18n/I18nProvider";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import AuthProvider from "@/components/providers/AuthProvider";
import { StoreProvider } from "@/components/providers/StoreProvider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const t = await getI18n();
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'ko';

  return (
    <html
      lang={locale}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <AuthProvider session={session}>
          <StoreProvider>
            <I18nProvider dictionary={t} locale={locale}>
              {session ? (
                <div className="flex h-screen overflow-hidden">
                  <Sidebar session={session} />
                  <main className="flex-1 md:ml-64 w-full h-full overflow-y-auto pb-16 md:pb-0">
                    {children}
                  </main>
                  <BottomNav session={session} />
                </div>
              ) : (
                <main className="flex-1 w-full h-full">
                  {children}
                </main>
              )}
            </I18nProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
