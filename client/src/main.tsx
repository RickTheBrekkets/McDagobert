import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles.css';
import { CreateGroup } from './pages/CreateGroup.js';
import { JoinGroup } from './pages/JoinGroup.js';
import { GroupOrder } from './pages/GroupOrder.js';
import { ResultView } from './pages/ResultView.js';

const router = createBrowserRouter([
  { path: '/', element: <CreateGroup /> },
  { path: '/g/:code/join', element: <JoinGroup /> },
  { path: '/g/:code', element: <GroupOrder /> },
  { path: '/g/:code/result', element: <ResultView /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
