import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post, Comment } from '../types';
import { postApi } from '../api/post.api';
import { commentApi } from '../api/comment.api';
import Navbar from '../components/common/Navbar';
import PostCard from '../components/post/PostCard';
import CommentItem from '../components/comment/CommentItem';
import CommentForm from '../components/comment/CommentForm';
import Spinner from '../components/common/Spinner';

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [addingComment, setAddingComment] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    postApi
      .getPost(id)
      .then((data) => setPost(data.post))
      .catch(() => setError('Post not found'))
      .finally(() => setLoading(false));

    commentApi
      .getComments(id)
      .then((data) => setComments(data.comments))
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [id]);

  const handleAddComment = async (text: string) => {
    if (!id) return;
    setAddingComment(true);
    try {
      const data = await commentApi.addComment(id, text);
      setComments((prev) => [...prev, data.comment]);
      if (post) {
        setPost({ ...post, commentCount: post.commentCount + 1 });
      }
    } catch {
      alert('Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await commentApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      if (post) {
        setPost({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
      }
    } catch {
      alert('Failed to delete comment');
    }
  };

  const handlePostDeleted = () => navigate('/');

  if (loading) return <div className="page"><Navbar /><div className="main-content"><Spinner /></div></div>;
  if (error || !post) return <div className="page"><Navbar /><div className="main-content"><div className="alert alert-error">{error || 'Post not found'}</div></div></div>;

  return (
    <div className="page">
      <Navbar />
      <main className="main-content">
        <div className="detail-container">
          <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate(-1)}>
            &larr; Back
          </button>

          <PostCard post={post} onDeleted={handlePostDeleted} />

          <section className="comments-section">
            <h3 className="comments-title">
              Comments ({post.commentCount})
            </h3>

            <CommentForm onSubmit={handleAddComment} isLoading={addingComment} />

            {commentsLoading ? (
              <Spinner size="sm" />
            ) : comments.length === 0 ? (
              <p className="empty-state">No comments yet. Be the first!</p>
            ) : (
              <div className="comments-list">
                {comments.map((c) => (
                  <CommentItem key={c._id} comment={c} onDeleted={handleDeleteComment} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default PostDetailPage;
