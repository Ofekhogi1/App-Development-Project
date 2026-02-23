import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Post } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { postApi } from '../../api/post.api';
import Avatar from '../common/Avatar';
import LikeButton from './LikeButton';

interface PostCardProps {
  post: Post;
  onDeleted?: (postId: string) => void;
}

const BASE_URL = import.meta.env.VITE_API_URL || '';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const PostCard: React.FC<PostCardProps> = ({ post, onDeleted }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?._id === post.author._id;

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await postApi.deletePost(post._id);
      onDeleted?.(post._id);
    } catch {
      alert('Failed to delete post');
    }
  };

  return (
    <article className="post-card">
      <div className="post-header">
        <Link to={`/profile/${post.author._id}`} className="post-author-link">
          <Avatar src={post.author.avatarUrl} username={post.author.username} size={44} />
          <div className="post-author-info">
            <span className="post-username">@{post.author.username}</span>
            <span className="post-date">{formatDate(post.createdAt)}</span>
          </div>
        </Link>

        {isOwner && (
          <div className="post-actions">
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => navigate(`/posts/${post._id}/edit`)}
            >
              Edit
            </button>
            <button className="btn btn-danger btn-xs" onClick={handleDelete}>
              Delete
            </button>
          </div>
        )}
      </div>

      <Link to={`/posts/${post._id}`} className="post-content-link">
        <p className="post-text">{post.text}</p>
        {post.imageUrl && (
          <div className="post-image-wrapper">
            <img
              src={`${BASE_URL}${post.imageUrl}`}
              alt="Post image"
              className="post-image"
              loading="lazy"
            />
          </div>
        )}
      </Link>

      <div className="post-footer">
        <LikeButton postId={post._id} initialLiked={post.liked} initialCount={post.likeCount} />
        <Link to={`/posts/${post._id}`} className="comment-link">
          &#128172; {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </Link>
      </div>
    </article>
  );
};

export default PostCard;
