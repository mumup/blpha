import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Activities from './pages/Activities';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/activities',
    element: <Activities />,
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
}; 