import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Camera, Loader2 } from 'lucide-react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import Layout from '../components/Layout';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

function Profile() {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '自分');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ヒートマップ用ステート
  const [heatmapData, setHeatmapData] = useState([]);
  const [totalPostsThisYear, setTotalPostsThisYear] = useState(0);

  // ヒートマップデータの取得
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'daily_stats'),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stats = [];
      let total = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        stats.push({
          date: data.date,
          count: data.count || 0
        });
        total += data.count || 0;
      });
      setHeatmapData(stats);
      setTotalPostsThisYear(total);
    }, (error) => {
      console.error("Firestore Error fetching stats:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestoreからプロフィール情報を取得
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDisplayName(data.displayName || '');
        setBio(data.bio || '');
        setPhotoURL(data.photoURL || '');
      }
    };
    fetchProfile();
  }, [user]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('画像のアップロードに失敗しました');

      const data = await res.json();
      setPhotoURL(data.secure_url);
    } catch (error) {
      console.error(error);
      alert('画像のアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Firebase Authのプロフィール更新
      await updateProfile(user, {
        displayName: displayName,
        photoURL: photoURL
      });

      // Firestoreのユーザー情報を更新/作成
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName: displayName,
        bio: bio,
        photoURL: photoURL,
        updatedAt: new Date()
      }, { merge: true });

      alert('プロフィールを保存しました！');
    } catch (error) {
      console.error(error);
      alert('プロフィールの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  return (
    <>
      <header className="header">
        <h1>プロフィール編集</h1>
      </header>

      <div style={{ padding: '24px', maxWidth: '650px', margin: '0 auto' }}>
        
        {/* ヒートマップ */}
        <div style={{
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '20px',
          backgroundColor: 'var(--bg-surface-hover)',
          marginBottom: '32px'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>活動ステータス</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            過去1年間に <strong style={{ color: 'var(--accent-color)', fontSize: '1.05rem' }}>{totalPostsThisYear}回</strong> 壁打ちを行いました！
          </p>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <div style={{ minWidth: '500px' }}>
              <CalendarHeatmap
                startDate={oneYearAgo}
                endDate={today}
                values={heatmapData}
                classForValue={(value) => {
                  if (!value || value.count === 0) {
                    return 'color-empty';
                  }
                  if (value.count === 1) return 'color-scale-1';
                  if (value.count === 2) return 'color-scale-2';
                  if (value.count === 3) return 'color-scale-3';
                  return 'color-scale-4';
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            <span>Less</span>
            <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--border-color)', borderRadius: '2px' }}></span>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#0e4429', borderRadius: '2px' }}></span>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#006d32', borderRadius: '2px' }}></span>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#26a641', borderRadius: '2px' }}></span>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#39d353', borderRadius: '2px' }}></span>
            <span>More</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '400px' }}>
          
          {/* アイコン画像 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>アイコン画像</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div 
                style={{ 
                  width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--border-color)', 
                  overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative'
                }}
              >
                {photoURL ? (
                  <img src={photoURL} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={`https://ui-avatars.com/api/?name=${user?.email?.split('@')[0]}&background=1d9bf0&color=fff`} style={{ width: '100%', height: '100%' }} />
                )}
                {isUploading && (
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Loader2 className="spinner" size={24} color="#fff" />
                  </div>
                )}
              </div>
              <button 
                className="auth-submit-btn" 
                style={{ marginTop: 0, padding: '8px 16px', fontSize: '0.9rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Camera size={18} style={{ marginRight: '8px' }} />
                画像を変更
              </button>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
            </div>
          </div>

          {/* 名前 */}
          <div className="input-group">
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>名前</label>
            <input 
              type="text" 
              className="auth-input" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
              placeholder="表示名"
            />
          </div>

          {/* 自己紹介 */}
          <div className="input-group">
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>自己紹介 (壁打ちのテーマなど)</label>
            <textarea 
              className="auth-input" 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              placeholder="自己紹介を書いてみましょう"
              style={{ minHeight: '100px', resize: 'none' }}
            />
          </div>

          <button 
            className="auth-submit-btn" 
            onClick={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="spinner" size={24} /> : '保存する'}
          </button>
        </div>
      </div>
    </>
  );
}

export default Profile;
