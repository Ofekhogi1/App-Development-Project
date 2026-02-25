import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../api/user.api';
import { useAuth } from '../context/AuthContext';
import { Post } from '../types';
import Navbar from '../components/common/Navbar';
import Avatar from '../components/common/Avatar';
import PostList from '../components/post/PostList';
import Spinner from '../components/common/Spinner';

const MyPostsPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    userApi
      .getProfile(user._id)
      .then((data) => {
        setPosts(data.posts);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      })
      .catch(() => setError('Failed to load posts'))
      .finally(() => setIsLoading(false));
  }, [user]);

  const fetchMorePosts = async (cursor: string) => {
    const data = await userApi.getProfile(user!._id, cursor);
    return { posts: data.posts, nextCursor: data.nextCursor, hasMore: data.hasMore };
  };

  if (isLoading) return <div className="page"><Navbar /><div className="main-content"><Spinner /></div></div>;
  if (error) return <div className="page"><Navbar /><div className="main-content"><div className="alert alert-error">{error}</div></div></div>;

  return (
    <div className="page">
      <Navbar />
      <main className="main-content">
        <div className="profile-container">
          <div className="profile-header">
            <Avatar src={user?.avatarUrl} username={user?.username || ''} size={90} />
            <div className="profile-info">
              <h2 className="profile-username">@{user?.username}</h2>
              <p className="profile-email">{user?.email}</p>
            </div>
            <Link to="/profile/edit" className="btn btn-secondary">
              Edit Profile
            </Link>
          </div>

          <div className="profile-posts">
            <h3 className="profile-posts-title">My Posts</h3>
            <PostList
              initialPosts={posts}
              initialNextCursor={nextCursor}
              initialHasMore={hasMore}
              fetchMore={fetchMorePosts}
              emptyMessage="You haven't posted anything yet."
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyPostsPage;
