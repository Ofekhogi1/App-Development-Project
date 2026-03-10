import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  text: z.string().min(1, 'Comment cannot be empty').max(1000, 'Maximum 1000 characters'),
});

type FormValues = z.infer<typeof schema>;

interface CommentFormProps {
  onSubmit: (text: string) => Promise<void>;
  isLoading?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({ onSubmit, isLoading }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onFormSubmit = async (values: FormValues) => {
    await onSubmit(values.text);
    reset();
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit(onFormSubmit)}>
      <div className="comment-input-row">
        <input
          {...register('text')}
          type="text"
          placeholder="Write a comment..."
          className={`form-input ${errors.text ? 'input-error' : ''}`}
          disabled={isLoading}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading}>
          {isLoading ? '...' : 'Post'}
        </button>
      </div>
      {errors.text && <span className="error-msg">{errors.text.message}</span>}
    </form>
  );
};

export default CommentForm;
