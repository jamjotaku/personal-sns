import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Sparkles, Loader2 } from 'lucide-react';
import '../index.css';

function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!userId || !password) {
      setError('IDとパスワードを入力してください。');
      return;
    }

    setLoading(true);
    // 独自IDをダミーのメールアドレス形式に変換してFirebaseに渡す
    const dummyEmail = `${userId}@personal-sns.local`;

    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, dummyEmail, password);
      } else {
        await createUserWithEmailAndPassword(auth, dummyEmail, password);
      }
    } catch (err) {
      console.error(err);
      // よくあるエラーのハンドリング
      if (err.code === 'auth/invalid-api-key' || err.message.includes('API key')) {
        setError('Firebaseの設定がまだ完了していません。コンソールからAPIキーを取得して設定してください。');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
         setError('IDまたはパスワードが間違っています。');
      } else if (err.code === 'auth/email-already-in-use') {
         setError('このIDは既に使われています。別のIDをお試しください。');
      } else if (err.code === 'auth/weak-password') {
         setError('パスワードは6文字以上で設定してください。');
      } else {
         setError('エラーが発生しました。設定が正しいか確認してください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-header">
          <Sparkles size={40} color="#eff3f4" />
          <h1>{isLoginMode ? 'personal-sns にログイン' : 'アカウントを作成'}</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="input-group">
            <input 
              type="text" 
              className="auth-input" 
              placeholder="ログインID" 
              value={userId}
              onChange={(e) => setUserId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} // 英数字アンダースコアのみ
              required
            />
          </div>
          
          <div className="input-group">
            <input 
              type="password" 
              className="auth-input" 
              placeholder="パスワード" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={24} /> : (isLoginMode ? 'ログイン' : '登録する')}
          </button>
        </form>

        <div className="auth-footer">
          {isLoginMode ? (
            <p>アカウントをお持ちでない場合は <button className="text-btn" onClick={() => setIsLoginMode(false)}>登録</button></p>
          ) : (
            <p>既にアカウントをお持ちの場合は <button className="text-btn" onClick={() => setIsLoginMode(true)}>ログイン</button></p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
