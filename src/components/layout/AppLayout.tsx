import { Outlet, useMatches } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { TopBar } from '@/components/layout/TopBar';
import { VerifyEmailBanner } from '@/components/auth/VerifyEmailBanner';
import { ToastProvider } from '@/hooks/useToast';

interface RouteHandle {
  title?: string;
}

export function AppLayout() {
  const matches = useMatches();
  const last = matches[matches.length - 1];
  const title = (last?.handle as RouteHandle | undefined)?.title ?? 'Bible Study Workspace';
  const isReadPage = last?.pathname === '/read';

  return (
    <ToastProvider>
      <div className="flex flex-1 h-full min-h-0">
        <Sidebar />
        <MobileSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <VerifyEmailBanner />
          <TopBar title={title} className={isReadPage ? 'md:flex hidden' : ''} />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>
        <MobileNav />
      </div>
    </ToastProvider>
  );
}
