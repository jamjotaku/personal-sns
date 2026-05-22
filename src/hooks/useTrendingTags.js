import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useTrendingTags(maxPosts = 100, maxTags = 5) {
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 最新の投稿を取得してタグを集計する
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(maxPosts)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tagCounts = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.content) {
          // #から始まり空白や改行、#で終わるまでの文字列を抽出
          const matches = data.content.match(/(#[^\s#]+)/g);
          if (matches) {
            // 一つの投稿内で同じタグが複数回出た場合は1回としてカウントする（ユニーク化）
            const uniqueTags = [...new Set(matches)];
            uniqueTags.forEach(tag => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          }
        }
      });

      // オブジェクトを配列に変換して出現回数でソート
      const sortedTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, maxTags); // 上位N件を取得

      setTrendingTags(sortedTags);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching trending tags:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [maxPosts, maxTags]);

  return { trendingTags, loading };
}
