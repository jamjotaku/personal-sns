import React from 'react';
import { Home, Bell, Mail, User, Search, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

function Layout({ children }) {
  const location = useLocation();
  const user = auth.currentUser;

  const handleLogout = () => {
    // ログアウト処理（現状はダミーの可能性もあり）
    signOut(auth).catch(console.error);
  };

  return (
    <div className="app-container">
      {/* 左側サイドバー（ナビゲーション） */}
      <header className="sidebar">
        <div className="sidebar-inner">
          <div className="logo">
            <Sparkles size={32} color="#eff3f4" />
          </div>
          <nav className="nav-menu">
            <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
              <Home size={28} />
              <span className="nav-text">ホーム</span>
            </Link>
            <Link to="#" className="nav-item">
              <Search size={28} />
              <span className="nav-text">検索</span>
            </Link>
            <Link to="#" className="nav-item">
              <Bell size={28} />
              <span className="nav-text">通知</span>
            </Link>
            <Link to="#" className="nav-item">
              <Mail size={28} />
              <span className="nav-text">メッセージ</span>
            </Link>
            <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
              <User size={28} />
              <span className="nav-text">プロフィール</span>
            </Link>
          </nav>
          
          <button className="post-btn-sidebar">
            投稿する
          </button>

          <div className="user-profile-mini" onClick={handleLogout} title="ログアウト">
            <div className="avatar">
              <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.email?.split('@')[0] || 'U'}&background=1d9bf0&color=fff`} alt="avatar" />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.displayName || '自分'}</span>
              <span className="user-id">@{user?.email?.split('@')[0]}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 中央タイムラインエリア */}
      <main className="main-timeline">
        {children}
      </main>

      {/* 右側サイドバー（オプション） */}
      <aside className="right-sidebar">
        <div className="search-bar">
          <Search size={18} color="#71767b" />
          <input type="text" placeholder="検索" />
        </div>
        <div className="trends">
          <h2>おすすめのトレンド</h2>
          <div className="trend-item">
            <span className="trend-category">音楽 · トレンド</span>
            <span className="trend-name">#推しA</span>
            <span className="trend-posts">120件のポスト</span>
          </div>
          <div className="trend-item">
            <span className="trend-category">イベント · トレンド</span>
            <span className="trend-name">最高のライブ</span>
            <span className="trend-posts">45件のポスト</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default Layout;
