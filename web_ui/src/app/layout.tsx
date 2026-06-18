import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorkLink",
  description: "Delivery and store operations app",
};

import { auth } from "../../auth";
import { getI18n } from "@/i18n/server";
import { cookies } from "next/headers";
import { I18nProvider } from "@/i18n/I18nProvider";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import EmployeeOnlyGate from "@/components/layout/EmployeeOnlyGate";
import AuthProvider from "@/components/providers/AuthProvider";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { FeedbackProvider } from "@/components/providers/FeedbackProvider";
import { prisma } from "@/lib/prisma";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const t = await getI18n();
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'ko';
  const activeEmployment = session?.user?.id
    ? await prisma.employee.findFirst({
        where: {
          status: 'ACTIVE',
          accountId: session.user.id,
        },
        select: { id: true },
      })
    : null;
  const isEmployeeOnly = Boolean(session?.user?.id && (session.user.role === 'CUSTOMER' || session.user.role === 'EMPLOYEE') && activeEmployment);

  return (
    <html
      lang={locale}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <AuthProvider session={session}>
          <StoreProvider>
            <I18nProvider dictionary={t} locale={locale}>
              <FeedbackProvider>
                {session ? (
                  <div className="flex h-screen overflow-hidden">
                    {!isEmployeeOnly && <Sidebar session={session} />}
                    <main className={`flex-1 w-full h-full overflow-y-auto ${isEmployeeOnly ? '' : 'md:ml-64 pb-16 md:pb-0'}`}>
                      <EmployeeOnlyGate enabled={isEmployeeOnly}>
                        {children}
                      </EmployeeOnlyGate>
                    </main>
                    {!isEmployeeOnly && <BottomNav session={session} />}
                  </div>
                ) : (
                  <main className="flex-1 w-full h-full">
                    {children}
                  </main>
                )}
              </FeedbackProvider>
            </I18nProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
