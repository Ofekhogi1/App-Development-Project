import React, { useState } from 'react';
import { likeApi } from '../../api/like.api';

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

const LikeButton: React.FC<LikeButtonProps> = ({ postId, initialLiked, initialCount }) => {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await likeApi.toggleLike(postId);
      setLiked(result.liked);
      setCount(result.likeCount);
    } catch {
      // revert on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`like-btn ${liked ? 'liked' : ''}`}
      onClick={toggle}
      disabled={loading}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <span className="like-icon">{liked ? '❤️' : '🤍'}</span>
      <span className="like-count">{count}</span>
    </button>
  );
};

export default LikeButton;
