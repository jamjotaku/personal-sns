import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Link } from 'react-router-dom';
import LinkPreview from './LinkPreview';

const processHashtags = (children, onTagClick) => {
  if (!children) return children;

  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      const parts = child.split(/(#[^\s#]+)/g);
      return parts.map((part, index) => {
        if (part.startsWith('#')) {
          const tag = part;
          if (onTagClick) {
            return (
              <span
                key={index}
                className="hashtag"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                style={{ cursor: 'pointer', color: 'var(--accent-color)', fontWeight: 500 }}
              >
                {part}
              </span>
            );
          } else {
            return (
              <Link
                key={index}
                to={`/search?q=${encodeURIComponent(tag)}`}
                className="hashtag"
                onClick={(e) => e.stopPropagation()}
                style={{ color: 'var(--accent-color)', fontWeight: 500 }}
              >
                {part}
              </Link>
            );
          }
        }
        return part;
      });
    }
    return child;
  });
};

function MarkdownRenderer({ content, onTagClick }) {
  // パース前の文字列置換は廃止し、そのままReactMarkdownに渡す
  const processedContent = content || '';

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            // テキストがhrefと一致するか判定
            const textContent = Array.isArray(children) ? children.join('') : String(children);
            const isPlainUrl = textContent === href || textContent === decodeURIComponent(href);
              
            if (isPlainUrl) {
              return <LinkPreview url={href} {...props} />;
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                {...props}
              >
                {children}
              </a>
            );
          },
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: '0.9em', borderRadius: '8px', overflow: 'hidden', margin: '8px 0' }}
              >
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code
                className={className}
                style={{
                  backgroundColor: 'var(--hover-color, rgba(255,255,255,0.1))',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  fontFamily: 'monospace'
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          p: ({ children }) => <div style={{ margin: '0 0 8px 0', lineHeight: '1.6' }}>{processHashtags(children, onTagClick)}</div>,
          li: ({ children }) => <li>{processHashtags(children, onTagClick)}</li>
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
