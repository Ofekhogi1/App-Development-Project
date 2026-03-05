import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, Post } from '../types';
import { userApi } from '../api/user.api';
import { postApi } from '../api/post.api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import Avatar from '../components/common/Avatar';
import PostList from '../components/post/PostList';
import Spinner from '../components/common/Spinner';

const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [initialPosts, setInitialPosts] = useState<Post[]>([]);
  const [initialNextCursor, setInitialNextCursor] = useState<string | null>(null);
  const [initialHasMore, setInitialHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOwnProfile = currentUser?._id === id;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    userApi
      .getProfile(id)
      .then((data) => {
        setProfileUser(data.user);
        setInitialPosts(data.posts);
        setInitialNextCursor(data.nextCursor);
        setInitialHasMore(data.hasMore);
      })
      .catch(() => setError('User not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchMorePosts = async (cursor: string) => {
    if (!id) return { posts: [], nextCursor: null, hasMore: false };
    const data = await userApi.getProfile(id, cursor);
    return { posts: data.posts, nextCursor: data.nextCursor, hasMore: data.hasMore };
  };

  if (loading) return <div className="page"><Navbar /><div className="main-content"><Spinner /></div></div>;
  if (error || !profileUser) return <div className="page"><Navbar /><div className="main-content"><div className="alert alert-error">{error || 'User not found'}</div></div></div>;

  const joinedDate = new Date(profileUser.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="page">
      <Navbar />
      <main className="main-content">
        <div className="profile-container">
          <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate(-1)}>
            &larr; Back
          </button>

          <div className="profile-header">
            <Avatar src={profileUser.avatarUrl} username={profileUser.username} size={90} />
            <div className="profile-info">
              <h2 className="profile-username">@{profileUser.username}</h2>
              <p className="profile-email">{profileUser.email}</p>
              <p className="profile-joined">Joined {joinedDate}</p>
            </div>
            {isOwnProfile && (
              <Link to="/profile/edit" className="btn btn-secondary">
                Edit Profile
              </Link>
            )}
          </div>

          <div className="profile-posts">
            <h3 className="profile-posts-title">Posts</h3>
            <PostList
              initialPosts={initialPosts}
              initialNextCursor={initialNextCursor}
              initialHasMore={initialHasMore}
              fetchMore={fetchMorePosts}
              emptyMessage="No posts yet."
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
