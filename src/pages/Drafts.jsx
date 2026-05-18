import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, Edit3, Send } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

function Drafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  const [draftContent, setDraftContent] = useState('');
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'drafts'), 
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
      setDrafts(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveDraft = async () => {
    if (!draftContent.trim() || !user) return;
    setIsSaving(true);
    try {
      if (editingDraftId) {
        await updateDoc(doc(db, 'drafts', editingDraftId), {
          content: draftContent.trim(),
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'drafts'), {
          userId: user.uid,
          content: draftContent.trim(),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      }
      setDraftContent('');
      setEditingDraftId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostDraft = async () => {
    if (!draftContent.trim() || !user) return;
    setIsPosting(true);
    try {
      // ユーザー情報の取得（簡易版、実際のアプリではコンテキスト等から）
      const currentUsername = '@' + user.email.split('@')[0];
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        username: currentUsername,
        author: user.displayName || '自分',
        userPhotoURL: user.photoURL || null,
        content: draftContent.trim(),
        likes: 0,
        createdAt: serverTimestamp()
      });
      
      // 投稿に成功したら下書きを削除
      if (editingDraftId) {
        await deleteDoc(doc(db, 'drafts', editingDraftId));
      }
      setDraftContent('');
      setEditingDraftId(null);
      alert('下書きを投稿しました！');
    } catch (error) {
      console.error(error);
      alert('投稿に失敗しました');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('この下書きを削除しますか？')) {
      await deleteDoc(doc(db, 'drafts', id));
      if (editingDraftId === id) {
        setDraftContent('');
        setEditingDraftId(null);
      }
    }
  };

  const handleEdit = (draft) => {
    setDraftContent(draft.content);
    setEditingDraftId(draft.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setDraftContent('');
    setEditingDraftId(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '';
    const date = timestamp.toDate();
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <>
      <header className="header" style={{ padding: '12px 16px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>下書き</h1>
      </header>

      {/* 下書きエディタ */}
      <div className="composer" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface-hover)' }}>
        <div className="composer-form" style={{ width: '100%' }}>
          <div style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 700 }}>
            {editingDraftId ? '下書きを編集中' : '新しい下書きを作成'}
          </div>
          <textarea 
            className="composer-input"
            placeholder="下書きとして保存するテキスト..."
            value={draftContent}
            onChange={(e) => {
              setDraftContent(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            style={{ fontSize: '1.1rem', minHeight: '80px', width: '100%' }}
          />
          <div className="composer-actions" style={{ marginTop: '12px', justifyContent: 'flex-end', gap: '8px' }}>
            {editingDraftId && (
              <button onClick={cancelEdit} style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>キャンセル</button>
            )}
            <button 
              className="submit-btn" 
              onClick={handleSaveDraft} 
              disabled={isSaving || isPosting || !draftContent.trim()}
              style={{ backgroundColor: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--accent-color)' }}
            >
              {isSaving ? <Loader2 className="spinner" size={18} /> : '保存'}
            </button>
            <button 
              className="submit-btn" 
              onClick={handlePostDraft} 
              disabled={isSaving || isPosting || !draftContent.trim()}
            >
              {isPosting ? <Loader2 className="spinner" size={18} /> : <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Send size={16}/>ポスト</span>}
            </button>
          </div>
        </div>
      </div>

      {/* 下書き一覧 */}
      <div className="timeline">
        {loading ? (
           <div style={{ padding: '32px', textAlign: 'center' }}><Loader2 className="spinner" size={24} style={{margin: '0 auto'}}/></div>
        ) : drafts.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            保存された下書きはありません。
          </div>
        ) : (
          drafts.map(draft => (
            <article key={draft.id} className="post" style={{ flexDirection: 'column' }}>
              <div style={{ fontSize: '1rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, marginBottom: '12px' }}>
                {draft.content}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <span>保存日時: {formatDate(draft.updatedAt || draft.createdAt)}</span>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button onClick={() => handleEdit(draft)} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-color)' }}>
                    <Edit3 size={16} /> 編集
                  </button>
                  <button onClick={() => handleDelete(draft.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger-color)' }}>
                    <Trash2 size={16} /> 削除
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );
}

export default Drafts;
