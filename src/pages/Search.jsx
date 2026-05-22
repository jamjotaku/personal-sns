import { useState, useEffect, useMemo } from 'react';
import { Heart, MessageCircle, Repeat, Share, Loader2, Search as SearchIcon } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, increment, arrayRemove, setDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';

function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [keyword, setKeyword] = useState(initialQuery);
  
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState({});
  const user = auth.currentUser;

  // URLパラメータ（q）の変更をローカルステートに同期（レンダー中にStateを更新するReact推奨パターン）
  const [prevQuery, setPrevQuery] = useState(initialQuery);
  if (initialQuery !== prevQuery) {
    setPrevQuery(initialQuery);
    setKeyword(initialQuery);
  }

  // ユーザー情報を取得
  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = {};
      snapshot.forEach(doc => { usersData[doc.id] = doc.data(); });
      setUsers(usersData);
    });
    return () => unsubscribeUsers();
  }, []);

  // 全投稿（今回は最新500件）を取得しておく（簡易的な全文検索のため）
  useEffect(() => {
    const fetchRecentPosts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(500));
        const snapshot = await getDocs(q);
        const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllPosts(postsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentPosts();
  }, []);

  // 検索実行（useMemoによる動的算出）
  const filteredPosts = useMemo(() => {
    if (!keyword.trim()) {
      return [];
    }
    const lowerKeyword = keyword.toLowerCase();
    return allPosts.filter(post => 
      post.content?.toLowerCase().includes(lowerKeyword) || 
      post.username?.toLowerCase().includes(lowerKeyword) ||
      post.author?.toLowerCase().includes(lowerKeyword)
    );
  }, [keyword, allPosts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ q: keyword });
  };

  const handleLike = async (postId) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'posts', postId);
      const userRef = doc(db, 'users', user.uid);
      const isLiked = users[user.uid]?.bookmarks?.includes(postId);
      if (isLiked) {
        await updateDoc(postRef, { likes: increment(-1) });
        await updateDoc(userRef, { bookmarks: arrayRemove(postId) });
        // ローカルステートを即時更新して画面に反映
        setAllPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === postId ? { ...post, likes: Math.max(0, (post.likes || 0) - 1) } : post
          )
        );
      } else {
        await updateDoc(postRef, { likes: increment(1) });
        await setDoc(userRef, { bookmarks: arrayUnion(postId) }, { merge: true });
        // ローカルステートを即時更新して画面に反映
        setAllPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === postId ? { ...post, likes: (post.likes || 0) + 1 } : post
          )
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getPostUserProfile = (post) => {
    if (post.userId && users[post.userId]) return users[post.userId];
    const currentUsername = '@' + user?.email?.split('@')[0];
    if (!post.userId && post.username === currentUsername && users[user?.uid]) return users[user?.uid];
    return { displayName: post.author || '自分', photoURL: post.userPhotoURL || null };
  };

  const formatDate = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '';
    const date = timestamp.toDate();
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <>
      <header className="header" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        <form onSubmit={handleSearch} style={{ width: '100%', display: 'flex', gap: '8px' }}>
          <div style={{ flexGrow: 1, backgroundColor: 'var(--search-bg)', borderRadius: '9999px', padding: '8px 16px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)' }}>
            <SearchIcon size={18} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="キーワードを検索" 
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
            />
          </div>
        </form>
      </header>

      <div className="timeline">
        {loading ? (
           <div style={{ padding: '32px', textAlign: 'center' }}><Loader2 className="spinner" size={24} style={{margin: '0 auto'}}/></div>
        ) : !keyword ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            検索キーワードを入力してください
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            「{keyword}」に一致する結果は見つかりませんでした。
          </div>
        ) : (
          filteredPosts.map(post => {
            const postUser = getPostUserProfile(post);
            const isLiked = users[user?.uid]?.bookmarks?.includes(post.id);
            return (
              <article key={post.id} className="post">
                <div className="avatar">
                  <img src={postUser.photoURL || `https://ui-avatars.com/api/?name=${post.username?.replace('@','') || 'U'}&background=1d9bf0&color=fff`} alt="avatar" />
                </div>
                <div className="post-content">
                  <div className="post-header" style={{display: 'flex', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', gap: '4px'}}>
                      <span className="post-author">{postUser.displayName}</span>
                      <span className="post-time" style={{color: 'var(--text-secondary)'}}>{post.username} · {formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                  <div 
                    onClick={(e) => {
                      if (e.target.closest('a, button, .hashtag, .interaction-btn')) {
                        return;
                      }
                      navigate(`/post/${post.id}`);
                    }}
                    style={{ display: 'block', color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
                  >
                    <div className="post-text">
                      <MarkdownRenderer content={post.content || ''} />
                    </div>
                    {post.image && <div className="post-image"><img src={post.image} alt="attachment" /></div>}
                  </div>
                  <div className="post-footer">
                    <button className="interaction-btn" onClick={(e) => { e.preventDefault(); navigate(`/post/${post.id}`); }}><MessageCircle size={18} /></button>
                    <button className="interaction-btn"><Repeat size={18} /></button>
                    <button className="interaction-btn heart" onClick={() => handleLike(post.id)}>
                      <Heart size={18} fill={isLiked ? 'var(--danger-color)' : 'none'} color={isLiked ? 'var(--danger-color)' : 'currentColor'} />
                      <span style={{ color: isLiked ? 'var(--danger-color)' : 'inherit' }}>{post.likes > 0 ? post.likes : ''}</span>
                    </button>
                    <button className="interaction-btn"><Share size={18} /></button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}

export default Search;
