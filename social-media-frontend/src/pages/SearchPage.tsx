import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Post, SearchResult } from '../types';
import { aiApi } from '../api/ai.api';
import Navbar from '../components/common/Navbar';
import PostCard from '../components/post/PostCard';
import Spinner from '../components/common/Spinner';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  const [inputValue, setInputValue] = useState(query);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchMeta, setSearchMeta] = useState<Omit<SearchResult, 'posts' | 'nextCursor' | 'hasMore'> | null>(null);

  useEffect(() => {
    setInputValue(query);
    if (!query) {
      setPosts([]);
      setSearchMeta(null);
      return;
    }

    setLoading(true);
    setError('');
    setPosts([]);

    aiApi
      .search(query)
      .then((data) => {
        setPosts(data.posts);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setSearchMeta({ intent: data.intent, aiUsed: data.aiUsed, originalQuery: data.originalQuery });
      })
      .catch(() => setError('Search failed. Please try again.'))
      .finally(() => setLoading(false));
  }, [query]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await aiApi.search(query, nextCursor);
      setPosts((prev) => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextCursor, query]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loadingMore);

  const handleDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() });
    }
  };

  return (
    <div className="page">
      <Navbar />
      <main className="main-content">
        <div className="feed-container">
          <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate(-1)}>
            &larr; Back
          </button>

          <form className="page-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search with AI..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="form-input"
              autoFocus={!query}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>

          {searchMeta && (
            <div className="search-meta">
              <p className="search-query">
                Results for: <strong>"{searchMeta.originalQuery}"</strong>
              </p>
              {searchMeta.aiUsed && searchMeta.intent.keywords && (
                <p className="search-interpreted">
                  AI interpreted as: <em>"{searchMeta.intent.keywords}"</em>
                  {searchMeta.intent.daysAgo && ` from the last ${searchMeta.intent.daysAgo} days`}
                </p>
              )}
            </div>
          )}

          {loading ? (
            <Spinner />
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : !query ? (
            <p className="empty-state">Enter a query above to search posts</p>
          ) : posts.length === 0 ? (
            <p className="empty-state">No posts found for "{query}"</p>
          ) : (
            <div className="post-list">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} onDeleted={handleDeleted} />
              ))}
              {loadingMore && <Spinner size="sm" />}
              <div ref={sentinelRef} className="scroll-sentinel" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchPage;
