import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail';
import Search from './pages/Search';
import Bookmarks from './pages/Bookmarks';
import Drafts from './pages/Drafts';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#000', color: '#fff'}}>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={user ? <Layout><Home /></Layout> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <Layout><Profile /></Layout> : <Navigate to="/login" />} />
        <Route path="/post/:id" element={user ? <Layout><PostDetail /></Layout> : <Navigate to="/login" />} />
        <Route path="/search" element={user ? <Layout><Search /></Layout> : <Navigate to="/login" />} />
        <Route path="/bookmarks" element={user ? <Layout><Bookmarks /></Layout> : <Navigate to="/login" />} />
        <Route path="/drafts" element={user ? <Layout><Drafts /></Layout> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
