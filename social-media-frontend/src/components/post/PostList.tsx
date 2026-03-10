import React, { useCallback, useState } from 'react';
import { Post } from '../../types';
import PostCard from './PostCard';
import Spinner from '../common/Spinner';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

interface PostListProps {
  initialPosts: Post[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  fetchMore: (cursor: string) => Promise<{ posts: Post[]; nextCursor: string | null; hasMore: boolean }>;
  emptyMessage?: string;
}

const PostList: React.FC<PostListProps> = ({
  initialPosts,
  initialNextCursor,
  initialHasMore,
  fetchMore,
  emptyMessage = 'No posts yet.',
}) => {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !nextCursor) return;
    setLoading(true);
    try {
      const result = await fetchMore(nextCursor);
      setPosts((prev) => [...prev, ...result.posts]);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, nextCursor, fetchMore]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loading);

  const handleDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  if (posts.length === 0 && !hasMore) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="post-list">
      {posts.map((post) => (
        <PostCard key={post._id} post={post} onDeleted={handleDeleted} />
      ))}
      {loading && (
        <div className="loading-more">
          <Spinner size="sm" />
        </div>
      )}
      <div ref={sentinelRef} className="scroll-sentinel" />
    </div>
  );
};

export default PostList;
