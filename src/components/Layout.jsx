import { useState, useEffect } from 'react';
import { Home, Bell, Mail, User, Search, Sparkles, Moon, Sun } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTrendingTags } from '../hooks/useTrendingTags';

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [profileData, setProfileData] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });
  const [sidebarSearch, setSidebarSearch] = useState('');
  const { trendingTags, loading: tagsLoading } = useTrendingTags();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfileData(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, [user]);

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
            <Link to="/search" className={`nav-item ${location.pathname === '/search' ? 'active' : ''}`}>
              <Search size={28} />
              <span className="nav-text">検索</span>
            </Link>
            <Link to="/bookmarks" className={`nav-item ${location.pathname === '/bookmarks' ? 'active' : ''}`}>
              <Bell size={28} />
              <span className="nav-text">お気に入り</span>
            </Link>
            <Link to="/drafts" className={`nav-item ${location.pathname === '/drafts' ? 'active' : ''}`}>
              <Mail size={28} />
              <span className="nav-text">下書き</span>
            </Link>
            <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
              <User size={28} />
              <span className="nav-text">プロフィール</span>
            </Link>
            <button className="nav-item" onClick={() => setIsDarkMode(!isDarkMode)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
              {isDarkMode ? <Sun size={28} /> : <Moon size={28} />}
              <span className="nav-text">{isDarkMode ? 'ライトモード' : 'ダークモード'}</span>
            </button>
          </nav>
          
          <button 
            className="post-btn-sidebar"
            onClick={() => {
              navigate('/', { state: { focusComposer: true } });
            }}
          >
            投稿する
          </button>

          <div className="user-profile-mini" onClick={handleLogout} title="ログアウト">
            <div className="avatar">
              <img src={profileData?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${user?.email?.split('@')[0] || 'U'}&background=1d9bf0&color=fff`} alt="avatar" />
            </div>
            <div className="user-info">
              <span className="user-name">{profileData?.displayName || user?.displayName || '自分'}</span>
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
          <input 
            type="text" 
            placeholder="検索" 
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && sidebarSearch.trim()) {
                navigate(`/search?q=${encodeURIComponent(sidebarSearch.trim())}`);
                setSidebarSearch('');
              }
            }}
          />
        </div>
        <div className="trends">
          <h2>マイトレンド</h2>
          {tagsLoading ? (
            <div style={{ color: '#71767b', fontSize: '14px', marginTop: '10px' }}>読み込み中...</div>
          ) : trendingTags.length > 0 ? (
            trendingTags.map((t, index) => (
              <Link to={`/search?q=${encodeURIComponent(t.tag)}`} key={index} className="trend-item" style={{ textDecoration: 'none', display: 'block' }}>
                <span className="trend-category">よく使うタグ</span>
                <span className="trend-name">{t.tag}</span>
                <span className="trend-posts">{t.count}件のポスト</span>
              </Link>
            ))
          ) : (
            <div style={{ color: '#71767b', fontSize: '14px', marginTop: '10px' }}>最近使われたタグはありません</div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default Layout;
