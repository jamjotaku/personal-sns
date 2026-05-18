import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Repeat, Share, Loader2, Trash2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, increment, arrayRemove, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { Link } from 'react-router-dom';

function Bookmarks() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});
  const user = auth.currentUser;

  // ユーザーのブックマークIDリストを監視
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const bookmarkIds = userData.bookmarks || [];
        
        // IDのリストから実際のポストデータを取得
        const postPromises = bookmarkIds.map(id => getDoc(doc(db, 'posts', id)));
        const postSnaps = await Promise.all(postPromises);
        
        const fetchedPosts = postSnaps
          .filter(snap => snap.exists())
          .map(snap => ({ id: snap.id, ...snap.data() }))
          // 新しい順（createdAtが新しい順）にソート
          .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          
        setPosts(fetchedPosts);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // 他のユーザー情報を取得（Homeと同じ）
  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = {};
      snapshot.forEach(doc => {
        usersData[doc.id] = doc.data();
      });
      setUsers(usersData);
    });
    return () => unsubscribeUsers();
  }, []);

  const handleUnlike = async (postId) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'posts', postId);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(postRef, { likes: increment(-1) });
      await updateDoc(userRef, { bookmarks: arrayRemove(postId) });
    } catch (error) {
      console.error("いいね解除エラー:", error);
    }
  };

  const getPostUserProfile = (post) => {
    if (post.userId && users[post.userId]) return users[post.userId];
    const currentUsername = '@' + user?.email?.split('@')[0];
    if (!post.userId && post.username === currentUsername && users[user?.uid]) return users[user?.uid];
    return { displayName: post.author || '自分', photoURL: post.userPhotoURL || null };
  };

  const formatDate = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'たった今';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 60) return `${diffMins}分`;
    if (diffHours < 24) return `${diffHours}時間`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const renderContentWithTags = (text) => {
    if (!text) return '';
    const parts = text.split(/(#[^\s#]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) return <span key={i} className="hashtag">{part}</span>;
      return part;
    });
  };

  return (
    <>
      <header className="header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 16px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>お気に入り</h1>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          いいねした投稿一覧
        </div>
      </header>

      <div className="timeline">
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Loader2 className="spinner" size={24} style={{ margin: '0 auto' }} />
          </div>
        ) : posts.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            まだお気に入りの投稿がありません。
          </div>
        ) : (
          posts.map(post => {
            const postUser = getPostUserProfile(post);
            
            return (
            <article key={post.id} className="post">
              <div className="avatar">
                <img src={postUser.photoURL || `https://ui-avatars.com/api/?name=${post.username?.replace('@','') || 'U'}&background=1d9bf0&color=fff`} alt="avatar" />
              </div>
              <div className="post-content">
                <div className="post-header" style={{display: 'flex', justifyContent: 'space-between'}}>
                  <div style={{display: 'flex', gap: '4px'}}>
                    <span className="post-author">{postUser.displayName}</span>
                    <span className="post-time" style={{color: 'var(--text-secondary)'}}>
                      {post.username} · {formatDate(post.createdAt)}
                    </span>
                  </div>
                </div>
                <Link to={`/post/${post.id}`}>
                  <div className="post-text">
                    {renderContentWithTags(post.content || '')}
                  </div>
                  {post.image && (
                    <div className="post-image">
                      <img src={post.image} alt="post attachment" />
                    </div>
                  )}
                </Link>
                <div className="post-footer">
                  <button className="interaction-btn">
                    <MessageCircle size={18} />
                  </button>
                  <button className="interaction-btn">
                    <Repeat size={18} />
                  </button>
                  <button className="interaction-btn heart liked" onClick={() => handleUnlike(post.id)}>
                    <Heart size={18} fill="var(--danger-color)" color="var(--danger-color)" />
                    <span style={{ color: 'var(--danger-color)' }}>{post.likes > 0 ? post.likes : ''}</span>
                  </button>
                  <button className="interaction-btn">
                    <Share size={18} />
                  </button>
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

export default Bookmarks;
