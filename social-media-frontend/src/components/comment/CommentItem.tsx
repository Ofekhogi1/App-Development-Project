import React from 'react';
import { Comment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';

interface CommentItemProps {
  comment: Comment;
  onDeleted: (id: string) => void;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const CommentItem: React.FC<CommentItemProps> = ({ comment, onDeleted }) => {
  const { user } = useAuth();
  const isOwner = user?._id === comment.author._id;

  return (
    <div className="comment-item">
      <Avatar src={comment.author.avatarUrl} username={comment.author.username} size={36} />
      <div className="comment-body">
        <div className="comment-header">
          <span className="comment-username">@{comment.author.username}</span>
          <span className="comment-date">{formatDate(comment.createdAt)}</span>
          {isOwner && (
            <button
              className="btn btn-danger btn-xs"
              onClick={() => onDeleted(comment._id)}
              aria-label="Delete comment"
            >
              Delete
            </button>
          )}
        </div>
        <p className="comment-text">{comment.text}</p>
      </div>
    </div>
  );
};

export default CommentItem;
