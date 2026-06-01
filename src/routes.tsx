import { lazy } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';
import RootLayout from './components/layout/root-layout';

// Lazy load the pages for modular, scalable code splitting
const Remap = lazy(() => import('./pages/remap'));
const Settings = lazy(() => import('./pages/settings'));

// Define the route hierarchy using React Router v7's data routers
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
  return <RouterProvider router={router} />;
}

export default App;
