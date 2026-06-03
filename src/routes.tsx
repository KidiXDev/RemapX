import RootLayout from '@/components/layout/root-layout';
import { QueryProvider } from '@/components/providers/query-provider';
import { lazy } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';

const Remap = lazy(() => import('@/pages/remap'));
const Settings = lazy(() => import('@/pages/settings'));

const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Remap />
      },
      {
        path: 'settings',
        element: <Settings />
      }
    ]
  }
]);

export function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  );
}

export default App;
