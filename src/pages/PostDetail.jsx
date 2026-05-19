import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Repeat, Share, Loader2, ArrowLeft, Trash2, ImagePlus, X } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, increment, arrayUnion, arrayRemove, setDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  // 返信フォーム用ステート
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = {};
      snapshot.forEach(d => { usersData[d.id] = d.data(); });
      setUsers(usersData);
    });
    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    // メインの投稿を取得
    const unsubscribePost = onSnapshot(doc(db, 'posts', id), (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        setPost(null);
      }
      setLoading(false);
    });

    // 返信を取得 (複合インデックスエラーを避けるためorderByを外しクライアントでソート)
    const q = query(collection(db, 'posts'), where('replyTo', '==', id));
    const unsubscribeReplies = onSnapshot(q, (snapshot) => {
      const reps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      reps.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setReplies(reps);
    });

    return () => {
      unsubscribePost();
      unsubscribeReplies();
    };
  }, [id]);

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      const currentUsername = '@' + user.email.split('@')[0];
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        username: currentUsername,
        author: users[user.uid]?.displayName || '自分',
        userPhotoURL: users[user.uid]?.photoURL || null,
        content: replyContent.trim(),
        likes: 0,
        createdAt: serverTimestamp(),
        replyTo: id // スレッド紐付け
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

      setReplyContent('');
    } catch (error) {
      console.error("返信エラー:", error);
    } finally {
      setIsSubmitting(false);
    }
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
      } else {
        await updateDoc(postRef, { likes: increment(1) });
        await setDoc(userRef, { bookmarks: arrayUnion(postId) }, { merge: true });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (postId, isOwnPost) => {
    if (!isOwnPost) return;
    if (window.confirm('このポストを削除しますか？')) {
      try {
        await deleteDoc(doc(db, 'posts', postId));
        if (postId === id) navigate('/'); // メインポストを消したらホームに戻る
      } catch (error) {
        console.error("削除エラー:", error);
      }
    }
  };

  const getPostUserProfile = (p) => {
    if (p.userId && users[p.userId]) return users[p.userId];
    const currentUsername = '@' + user?.email?.split('@')[0];
    if (!p.userId && p.username === currentUsername && users[user?.uid]) return users[user?.uid];
    return { displayName: p.author || '自分', photoURL: p.userPhotoURL || null };
  };

  const formatDate = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '';
    const date = timestamp.toDate();
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };



  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}><Loader2 className="spinner" size={24} style={{margin: '0 auto'}}/></div>;
  }

  if (!post) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>投稿が見つかりません。</div>;
  }

  const postUser = getPostUserProfile(post);
  const isLiked = users[user?.uid]?.bookmarks?.includes(post.id);
  const isOwnPost = post.userId === user?.uid || (!post.userId && post.username === '@' + user?.email?.split('@')[0]);

  return (
    <>
      <header className="header" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', transition: 'background-color 0.2s' }} className="action-btn">
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ポスト</h1>
      </header>

      {/* メインの投稿 */}
      <article className="post" style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'block' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <div className="avatar" style={{ width: '48px', height: '48px' }}>
            <img src={postUser.photoURL || `https://ui-avatars.com/api/?name=${post.username?.replace('@','') || 'U'}&background=1d9bf0&color=fff`} alt="avatar" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{postUser.displayName}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{post.username}</span>
          </div>
        </div>
        
        <div style={{ fontSize: '1.25rem', whiteSpace: 'normal', lineHeight: 1.5, marginBottom: '16px' }}>
          <MarkdownRenderer content={post.content || ''} />
        </div>
        
        {post.image && (
          <div className="post-image" style={{ marginBottom: '16px' }}>
            <img src={post.image} alt="attachment" />
          </div>
        )}

        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          {formatDate(post.createdAt)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '12px' }}>
          <button className="interaction-btn" onClick={(e) => { e.preventDefault(); document.querySelector('.composer-input').focus(); }}><MessageCircle size={22} /></button>
          <button className="interaction-btn"><Repeat size={22} /></button>
          <button className="interaction-btn heart" onClick={() => handleLike(post.id)}>
            <Heart size={22} fill={isLiked ? 'var(--danger-color)' : 'none'} color={isLiked ? 'var(--danger-color)' : 'currentColor'} />
            <span style={{ color: isLiked ? 'var(--danger-color)' : 'inherit' }}>{post.likes > 0 ? post.likes : ''}</span>
          </button>
          {isOwnPost ? (
            <button className="interaction-btn" onClick={() => handleDelete(post.id, isOwnPost)}><Trash2 size={22} /></button>
          ) : (
            <button className="interaction-btn"><Share size={22} /></button>
          )}
        </div>
      </article>

      {/* 返信フォーム */}
      <div className="composer" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
        <div className="avatar">
          <img src={users[user?.uid]?.photoURL || `https://ui-avatars.com/api/?name=${user?.email?.split('@')[0] || 'ME'}&background=1d9bf0&color=fff`} alt="avatar" />
        </div>
        <div className="composer-form">
          <textarea 
            className="composer-input"
            placeholder="返信をポスト"
            value={replyContent}
            onChange={(e) => {
              setReplyContent(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            style={{ fontSize: '1.1rem', minHeight: '40px' }}
          />
          <div className="composer-actions" style={{ marginTop: '8px' }}>
            <div className="action-buttons"></div>
            <button className="submit-btn" onClick={handleReplySubmit} disabled={isSubmitting || !replyContent.trim()}>
              {isSubmitting ? <Loader2 className="spinner" size={18} /> : '返信'}
            </button>
          </div>
        </div>
      </div>

      {/* 返信一覧 */}
      <div className="timeline">
        {replies.map(reply => {
          const rUser = getPostUserProfile(reply);
          const rIsLiked = users[user?.uid]?.bookmarks?.includes(reply.id);
          const rIsOwnPost = reply.userId === user?.uid || (!reply.userId && reply.username === '@' + user?.email?.split('@')[0]);

          return (
            <article key={reply.id} className="post">
              <div className="avatar">
                <img src={rUser.photoURL || `https://ui-avatars.com/api/?name=${reply.username?.replace('@','') || 'U'}&background=1d9bf0&color=fff`} alt="avatar" />
              </div>
              <div className="post-content">
                <div className="post-header" style={{display: 'flex', justifyContent: 'space-between'}}>
                  <div style={{display: 'flex', gap: '4px'}}>
                    <span className="post-author">{rUser.displayName}</span>
                    <span className="post-time" style={{color: 'var(--text-secondary)'}}>
                      {reply.username}
                    </span>
                  </div>
                  {rIsOwnPost && (
                    <button className="interaction-btn" onClick={() => handleDelete(reply.id, rIsOwnPost)}><Trash2 size={16} /></button>
                  )}
                </div>
                <div className="post-text">
                  <MarkdownRenderer content={reply.content || ''} />
                </div>
                <div className="post-footer">
                  <button className="interaction-btn" onClick={(e) => { e.preventDefault(); navigate(`/post/${reply.id}`); }}><MessageCircle size={18} /></button>
                  <button className="interaction-btn heart" onClick={() => handleLike(reply.id)}>
                    <Heart size={18} fill={rIsLiked ? 'var(--danger-color)' : 'none'} color={rIsLiked ? 'var(--danger-color)' : 'currentColor'} />
                    <span style={{ color: rIsLiked ? 'var(--danger-color)' : 'inherit' }}>{reply.likes > 0 ? reply.likes : ''}</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

export default PostDetail;
