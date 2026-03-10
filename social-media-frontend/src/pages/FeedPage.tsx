import React, { useEffect, useState } from 'react';
import { Post } from '../types';
import { postApi } from '../api/post.api';
import Navbar from '../components/common/Navbar';
import PostList from '../components/post/PostList';
import Spinner from '../components/common/Spinner';

const FeedPage: React.FC = () => {
  const [initialPosts, setInitialPosts] = useState<Post[]>([]);
  const [initialNextCursor, setInitialNextCursor] = useState<string | null>(null);
  const [initialHasMore, setInitialHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    postApi
      .getFeed(undefined, 10)
      .then((data) => {
        setInitialPosts(data.posts);
        setInitialNextCursor(data.nextCursor);
        setInitialHasMore(data.hasMore);
      })
      .catch(() => setError('Failed to load feed'))
      .finally(() => setLoading(false));
  }, []);

  const fetchMore = async (cursor: string) => {
    return postApi.getFeed(cursor, 10);
  };

  return (
    <div className="page">
      <Navbar />
      <main className="main-content">
        <div className="feed-container">
          <h2 className="feed-title">Your Feed</h2>
          {loading ? (
            <Spinner />
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : (
            <PostList
              initialPosts={initialPosts}
              initialNextCursor={initialNextCursor}
              initialHasMore={initialHasMore}
              fetchMore={fetchMore}
              emptyMessage="No posts yet. Be the first to share something!"
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default FeedPage;
