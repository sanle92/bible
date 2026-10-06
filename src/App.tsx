import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardPage } from '@/pages/DashboardPage';
import { ReaderPage } from '@/pages/ReaderPage';
import { NotesPage } from '@/pages/NotesPage';
import { HighlightsPage } from '@/pages/HighlightsPage';
import { SermonsPage } from '@/pages/SermonsPage';
import { PrayerJournalPage } from '@/pages/PrayerJournalPage';
import { JournalPage } from '@/pages/JournalPage';
import { GlobalSearchPage } from '@/pages/GlobalSearchPage';
import { ReadingPlansPage } from '@/pages/ReadingPlansPage';
import { NotificationSettingsPage } from '@/pages/NotificationSettingsPage';
import { BookmarksPage } from '@/pages/BookmarksPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage />, handle: { title: 'Dashboard' } },
          { path: '/read', element: <ReaderPage />, handle: { title: 'Read' } },
          { path: '/notes', element: <NotesPage />, handle: { title: 'Notes' } },
          { path: '/highlights', element: <HighlightsPage />, handle: { title: 'Highlights' } },
          { path: '/sermons', element: <SermonsPage />, handle: { title: 'Sermons' } },
          { path: '/prayer', element: <PrayerJournalPage />, handle: { title: 'Prayer Journal' } },
          { path: '/journal', element: <JournalPage />, handle: { title: 'Journal' } },
          { path: '/search', element: <GlobalSearchPage />, handle: { title: 'Search' } },
          { path: '/reading-plans', element: <ReadingPlansPage />, handle: { title: 'Reading Plans' } },
          { path: '/notifications', element: <NotificationSettingsPage />, handle: { title: 'Notifications' } },
          { path: '/bookmarks', element: <BookmarksPage />, handle: { title: 'Bookmarks' } },
          { path: '/profile', element: <ProfilePage />, handle: { title: 'Profile' } },
          { path: '/settings', element: <SettingsPage />, handle: { title: 'Settings' } },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/read" replace />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
