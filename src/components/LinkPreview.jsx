import { useState, useEffect } from 'react';

function LinkPreview({ url, children }) {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        if (data.status === 'success' && data.data) {
          setPreviewData(data.data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to fetch link preview:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  // エラー時、ローディング前、または不正なURLの場合は通常のリンクを表示するフォールバック
  if (error || (!loading && !previewData) || !url || !url.startsWith('http')) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        {children || url}
      </a>
    );
  }

  // ローディング中はスケルトンUIを表示
  if (loading) {
    return (
      <div className="link-preview-skeleton" style={{
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px',
        margin: '8px 0',
        display: 'flex',
        gap: '12px',
        opacity: 0.7
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: '16px', background: 'var(--hover-color)', width: '80%', marginBottom: '8px', borderRadius: '4px' }}></div>
          <div style={{ height: '12px', background: 'var(--hover-color)', width: '60%', borderRadius: '4px' }}></div>
        </div>
        <div style={{ width: '80px', height: '80px', background: 'var(--hover-color)', borderRadius: '8px' }}></div>
      </div>
    );
  }

  // 取得完了時のカード表示
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="link-preview-card"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex',
        flexDirection: 'row',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        margin: '12px 0',
        background: 'var(--bg-color)',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-color)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-color)'}
    >
      <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {previewData.title || url}
        </h4>
        {previewData.description && (
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#71767b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {previewData.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#71767b' }}>
          {previewData.logo?.url && (
            <img src={previewData.logo.url} alt="logo" style={{ width: '14px', height: '14px', borderRadius: '2px' }} />
          )}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {previewData.publisher || new URL(url).hostname}
          </span>
        </div>
      </div>
      {previewData.image?.url && (
        <div style={{ width: '120px', flexShrink: 0, borderLeft: '1px solid var(--border-color)' }}>
          <img
            src={previewData.image.url}
            alt="preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}
    </a>
  );
}

export default LinkPreview;
