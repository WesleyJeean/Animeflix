import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProfileSelect from './pages/ProfileSelect';
import Browse from './pages/Browse';
import AnimeDetails from './pages/AnimeDetails';
import Watch from './pages/Watch';
import MyList from './pages/MyList';
import Search from './pages/Search';
import ProtectedRoute from './components/ProtectedRoute';

function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/profiles" element={<ProtectedRoute><ProfileSelect /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Browse /></ProtectedRoute>} />
      <Route path="/anime/:animeId" element={<ProtectedRoute><AnimeDetails /></ProtectedRoute>} />
      <Route path="/watch/:episodeId" element={<ProtectedRoute><Watch /></ProtectedRoute>} />
      <Route path="/my-list" element={<ProtectedRoute><MyList /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <AppRouter />
        <Toaster position="top-center" richColors />
      </div>
    </Router>
  );
}

export default App;