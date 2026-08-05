import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import './index.css';

const root = document.getElementById('root')!;
const appRoot = document.getElementById('app-root') ?? root;

createRoot(appRoot).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
