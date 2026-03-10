import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Post } from '../types';
import { postApi } from '../api/post.api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import PostForm from '../components/post/PostForm';
import Spinner from '../components/common/Spinner';

const EditPostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    postApi
      .getPost(id)
      .then((data) => {
        if (data.post.author._id !== user?._id) {
          navigate('/');
          return;
        }
        setPost(data.post);
      })
      .catch(() => setError('Post not found'))
      .finally(() => setPageLoading(false));
  }, [id, user]);

  const handleSubmit = async (formData: FormData) => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      await postApi.updatePost(id, formData);
      navigate(`/posts/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to update post');
    } finally {
      setIsLoading(false);
    }
  };

  if (pageLoading) return <div className="page"><Navbar /><div className="main-content"><Spinner /></div></div>;
  if (!post) return <div className="page"><Navbar /><div className="main-content"><div className="alert alert-error">{error}</div></div></div>;

  return (
    <div className="page">
      <Navbar />
      <main className="main-content">
        <div className="form-page-container">
          <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate(-1)}>
            &larr; Back
          </button>
          <h2 className="page-title">Edit Post</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <PostForm
            initialText={post.text}
            initialImageUrl={post.imageUrl}
            onSubmit={handleSubmit}
            submitLabel="Save changes"
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  );
};

export default EditPostPage;
