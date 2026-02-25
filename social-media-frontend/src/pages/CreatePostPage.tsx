import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postApi } from '../api/post.api';
import Navbar from '../components/common/Navbar';
import PostForm from '../components/post/PostForm';

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await postApi.createPost(formData);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <main className="main-content">
        <div className="form-page-container">
          <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate(-1)}>
            &larr; Back
          </button>
          <h2 className="page-title">Create Post</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <PostForm onSubmit={handleSubmit} submitLabel="Publish" isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
};

export default CreatePostPage;
