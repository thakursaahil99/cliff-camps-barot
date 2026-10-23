import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import { Spinner } from './components/ui.jsx';

const Stay = lazy(() => import('./pages/Stay.jsx'));
const Experiences = lazy(() => import('./pages/Experiences.jsx'));
const Gallery = lazy(() => import('./pages/Gallery.jsx'));
const Book = lazy(() => import('./pages/Book.jsx'));
const BookingStatus = lazy(() => import('./pages/BookingStatus.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'));
const AdminApp = lazy(() => import('./pages/admin/AdminApp.jsx'));

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-forest text-lime" role="status">
      <Spinner className="h-10 w-10" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default function App() {
  return (
    // Respect the visitor's "reduce motion" OS setting for every animation
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="stay" element={<Stay />} />
            <Route path="experiences" element={<Experiences />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="book" element={<Book />} />
            <Route path="booking/:id" element={<BookingStatus />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin" element={<AdminApp />} />
        </Routes>
      </Suspense>
    </MotionConfig>
  );
}
