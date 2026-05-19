import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImagePlus, Heart, MessageCircle, Repeat, Share, Loader2, X, Trash2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, increment, deleteDoc, limit, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';
// TODO: 後ほどユーザーに設定してもらうCloudinaryの定数
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

function Home() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posts, setPosts] = useState([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [filterTag, setFilterTag] = useState(null);
  const [users, setUsers] = useState({});
  const [limitCount, setLimitCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();
  
  const lastPostElementRef = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setLimitCount(prev => prev + 20);
      }
    });
    if (node) observer.current.observe(node);
  }, [hasMore]);
  
  const fileInputRef = useRef(null);
  const user = auth.currentUser;

  // Firestoreからユーザープロフィール情報を取得
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

  // Firestoreからタイムラインを取得
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(limitCount));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
      setHasMore(snapshot.docs.length === limitCount);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, [limitCount]);

  // 画像選択のハンドリング
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 選択画像のキャンセル
  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Cloudinaryへ画像をアップロードする関数
  const uploadImageToCloudinary = async (file) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error("Cloudinaryの設定が完了していません。");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('画像のアップロードに失敗しました');
    }

    const data = await res.json();
    return data.secure_url; // HTTPSの画像URLを返す
  };

  // 投稿処理
  const handleSubmit = async () => {
    if (!content.trim() && !imageFile) return;
    setIsSubmitting(true);

    try {
      let imageUrl = null;
      if (imageFile) {
        // 画像がある場合は先にCloudinaryへアップロード
        imageUrl = await uploadImageToCloudinary(imageFile);
      }

      // Firestoreにデータを保存
      const currentUsername = '@' + user.email.split('@')[0];
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        username: currentUsername, 
        author: users[user.uid]?.displayName || '自分',
        userPhotoURL: users[user.uid]?.photoURL || null,
        content: content.trim(),
        image: imageUrl,
        likes: 0,
        createdAt: serverTimestamp()
      });

      // --- ヒートマップ用の日別投稿数をインクリメント ---
      const today = new Date();
      const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const statRef = doc(db, 'daily_stats', dateString);
      await setDoc(statRef, {
        date: dateString,
        count: increment(1),
        userId: user.uid
      }, { merge: true });

      // フォームをリセット
      setContent('');
      clearImage();
      setIsPreviewMode(false);
    } catch (error) {
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // いいね処理
  const handleLike = async (postId) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'posts', postId);
      const userRef = doc(db, 'users', user.uid);
      
      const isLiked = users[user.uid]?.bookmarks?.includes(postId);
      
      if (isLiked) {
        await updateDoc(postRef, { likes: increment(-1) });
        await updateDoc(userRef, { bookmarks: arrayRemove(postId) });
      } else {
        await updateDoc(postRef, { likes: increment(1) });
        await setDoc(userRef, { bookmarks: arrayUnion(postId) }, { merge: true });
      }
    } catch (error) {
      console.error("いいねエラー:", error);
    }
  };

  // 削除処理 (自分の投稿のみ)
  const handleDelete = async (postId, isOwnPost) => {
    if (!isOwnPost) return;
    if (window.confirm('このポストを削除しますか？')) {
      try {
        await deleteDoc(doc(db, 'posts', postId));
      } catch (error) {
        console.error("削除エラー:", error);
      }
    }
  };

  // 過去の投稿（userIdがない場合）も含めてプロフィールを解決する関数
  const getPostUserProfile = (post) => {
    if (post.userId && users[post.userId]) {
      return users[post.userId];
    }
    const currentUsername = '@' + user?.email?.split('@')[0];
    if (!post.userId && post.username === currentUsername && users[user?.uid]) {
      return users[user?.uid];
    }
    return {
      displayName: post.author || '自分',
      photoURL: post.userPhotoURL || null
    };
  };

  // 日付フォーマット関数
  const formatDate = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'たった今';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}分`;
    if (diffHours < 24) return `${diffHours}時間`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };



  // フィルタリングされた投稿
  const displayedPosts = filterTag 
    ? posts.filter(post => post.content && post.content.includes(filterTag))
    : posts.filter(post => !post.replyTo);

  return (
    <>
      <header className="header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 16px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ホーム</h1>
        {filterTag && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>{filterTag} の検索結果</span>
            <button 
              onClick={() => setFilterTag(null)} 
              style={{ color: 'var(--accent-color)', fontSize: '0.85rem' }}
            >
              (クリア)
            </button>
          </div>
        )}
      </header>

      {/* コンポーザー（投稿フォーム） */}
      <div className="composer">
        <div className="avatar">
          <img src={users[user?.uid]?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${user?.email?.split('@')[0] || 'ME'}&background=1d9bf0&color=fff`} alt="avatar" />
        </div>
        <div className="composer-form">
          {/* 編集・プレビュー切り替えタブ */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '12px', paddingBottom: '4px' }}>
            <button 
              onClick={() => setIsPreviewMode(false)} 
              style={{ 
                fontSize: '0.85rem', 
                fontWeight: !isPreviewMode ? '700' : '400',
                color: !isPreviewMode ? 'var(--accent-color)' : 'var(--text-secondary)',
                borderBottom: !isPreviewMode ? '2px solid var(--accent-color)' : 'none',
                padding: '4px 8px'
              }}
            >
              テキスト
            </button>
            <button 
              onClick={() => setIsPreviewMode(true)} 
              disabled={!content.trim()}
              style={{ 
                fontSize: '0.85rem', 
                fontWeight: isPreviewMode ? '700' : '400',
                color: isPreviewMode ? 'var(--accent-color)' : 'var(--text-secondary)',
                borderBottom: isPreviewMode ? '2px solid var(--accent-color)' : 'none',
                padding: '4px 8px',
                opacity: !content.trim() ? 0.5 : 1
              }}
            >
              プレビュー
            </button>
          </div>

          {isPreviewMode ? (
            <div style={{ minHeight: '52px', padding: '8px 0', overflowY: 'auto', maxHeights: '300px' }}>
              <MarkdownRenderer content={content} />
            </div>
          ) : (
            <textarea 
              className="composer-input"
              placeholder="いまどうしてる？（Ctrl+Enterで送信）"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
          )}
          
          {/* 画像プレビュー */}
          {imagePreview && (
            <div style={{position: 'relative', marginTop: '12px'}}>
              <button 
                onClick={clearImage}
                style={{
                  position: 'absolute', top: '8px', left: '8px', 
                  backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', 
                  borderRadius: '50%', padding: '4px', zIndex: 10
                }}
              >
                <X size={18} />
              </button>
              <img src={imagePreview} alt="preview" style={{width: '100%', borderRadius: '16px', maxHeight: '400px', objectFit: 'cover'}} />
            </div>
          )}

          <div className="composer-actions">
            <div className="action-buttons">
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                style={{display: 'none'}} 
              />
              <button className="action-btn" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                <ImagePlus size={20} />
              </button>
            </div>
            <button className="submit-btn" onClick={handleSubmit} disabled={isSubmitting || (!content.trim() && !imageFile)}>
              {isSubmitting ? <Loader2 className="spinner" size={18} /> : 'ポストする'}
            </button>
          </div>
        </div>
      </div>

      {/* タイムライン */}
      <div className="timeline">
        {displayedPosts.length === 0 ? (
          <div style={{padding: '32px', textAlign: 'center', color: 'var(--text-secondary)'}}>
            {filterTag ? `${filterTag} を含むポストが見つかりませんでした。` : 'まだポストがありません。初めての壁打ちをしてみましょう！'}
          </div>
        ) : (
          displayedPosts.map((post, index) => {
            const postUser = getPostUserProfile(post);
            const currentUsername = '@' + user?.email?.split('@')[0];
            const isOwnPost = post.userId === user?.uid || (!post.userId && post.username === currentUsername);
            const isLiked = users[user?.uid]?.bookmarks?.includes(post.id);
            const isLastPost = index === displayedPosts.length - 1;

            return (
            <article key={post.id} className="post" ref={isLastPost ? lastPostElementRef : null}>
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
                  {isOwnPost && (
                    <button className="interaction-btn" onClick={() => handleDelete(post.id, isOwnPost)}>
                      <Trash2 size={16} />
                    </button>
                  )}
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
                    <MarkdownRenderer content={post.content || ''} onTagClick={setFilterTag} />
                  </div>
                  {post.image && (
                    <div className="post-image">
                      <img src={post.image} alt="post attachment" />
                    </div>
                  )}
                </div>
                <div className="post-footer">
                  <button className="interaction-btn" onClick={(e) => { e.preventDefault(); navigate(`/post/${post.id}`); }}>
                    <MessageCircle size={18} />
                  </button>
                  <button className="interaction-btn">
                    <Repeat size={18} />
                  </button>
                  <button className="interaction-btn heart" onClick={() => handleLike(post.id)}>
                    <Heart size={18} fill={isLiked ? 'var(--danger-color)' : 'none'} color={isLiked ? 'var(--danger-color)' : 'currentColor'} />
                    <span style={{ color: isLiked ? 'var(--danger-color)' : 'inherit' }}>{post.likes > 0 ? post.likes : ''}</span>
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
        {hasMore && displayedPosts.length > 0 && !filterTag && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Loader2 className="spinner" size={24} style={{ margin: '0 auto' }} />
          </div>
        )}
      </div>
    </>
  );
}

export default Home;
