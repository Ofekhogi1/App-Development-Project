import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { aiApi } from '../../api/ai.api';

const schema = z
  .object({
    text: z.string().max(2000, 'Maximum 2000 characters').optional().default(''),
  })
  .refine(
    (data) => (data.text && data.text.trim().length > 0) || false,
    { message: 'Post must contain text or an image', path: ['text'] }
  );

type FormValues = z.infer<typeof schema>;

interface PostFormProps {
  initialText?: string;
  initialImageUrl?: string | null;
  onSubmit: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

const BASE_URL = import.meta.env.VITE_API_URL || '';

const PostForm: React.FC<PostFormProps> = ({
  initialText = '',
  initialImageUrl,
  onSubmit,
  submitLabel = 'Post',
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    clearErrors,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: initialText },
  });

  const [imagePreview, setImagePreview] = useState<string | null>(
    initialImageUrl ? `${BASE_URL}${initialImageUrl}` : null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generatedImageBase64, setGeneratedImageBase64] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiCaptionLoading, setAiCaptionLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const text = watch('text') || '';
  const hasText = text.trim().length > 0;
  const hasImage = !!imagePreview;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setImageFile(file);
      setGeneratedImageBase64(null);
      setRemoveImage(false);
      setAiError('');
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setGeneratedImageBase64(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateImage = async () => {
    if (!hasText) return;
    setAiImageLoading(true);
    setAiError('');
    try {
      const { imageBase64 } = await aiApi.generateImage(text.trim());
      setGeneratedImageBase64(imageBase64);
      setImagePreview(`data:image/jpeg;base64,${imageBase64}`);
      setImageFile(null);
      setRemoveImage(false);
      clearErrors('text');
    } catch {
      setAiError('Failed to generate image. Please try again.');
    } finally {
      setAiImageLoading(false);
    }
  };

  const handleGenerateCaption = async () => {
    if (!imageFile) return;
    setAiCaptionLoading(true);
    setAiError('');
    try {
      const { caption } = await aiApi.generateCaption(imageFile);
      setValue('text', caption, { shouldValidate: true });
      clearErrors('text');
    } catch {
      setAiError('Failed to generate caption. Please try again.');
    } finally {
      setAiCaptionLoading(false);
    }
  };

  const onFormSubmit = async (values: FormValues) => {
    if (!hasText && !hasImage) return;

    const fd = new FormData();
    if (values.text?.trim()) fd.append('text', values.text.trim());

    if (generatedImageBase64) {
      // Convert base64 to Blob and append as file
      const byteString = atob(generatedImageBase64);
      const byteArray = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      fd.append('image', blob, 'ai-generated.jpg');
    } else if (fileInputRef.current?.files?.[0]) {
      fd.append('image', fileInputRef.current.files[0]);
    }

    if (removeImage) fd.append('removeImage', 'true');
    await onSubmit(fd);
  };

  // Custom submit validation: allow if has text OR has image
  const handleFormSubmit = handleSubmit(
    (values) => onFormSubmit(values),
    () => {
      // If schema says text is required but we have an image, skip that error
      if (hasImage) onFormSubmit({ text });
    }
  );

  return (
    <form className="post-form" onSubmit={handleFormSubmit}>
      <div className="form-group">
        <textarea
          {...register('text')}
          placeholder="What's on your mind?"
          className={`form-textarea ${errors.text && !hasImage ? 'input-error' : ''}`}
          rows={4}
          disabled={isLoading || aiImageLoading || aiCaptionLoading}
        />
        <div className="textarea-footer">
          {errors.text && !hasImage && <span className="error-msg">{errors.text.message}</span>}
          <span className="char-count">{text.length}/2000</span>
        </div>

        {hasText && !hasImage && (
          <button
            type="button"
            className="btn btn-secondary btn-sm ai-generate-btn"
            onClick={handleGenerateImage}
            disabled={isLoading || aiImageLoading || aiCaptionLoading}
          >
            {aiImageLoading ? '✨ Generating image...' : '✨ Generate image with AI'}
          </button>
        )}
      </div>

      <div className="form-group">
        {imagePreview && (
          <div className="image-preview-wrapper">
            <img src={imagePreview} alt="Preview" className="image-preview" />
            {generatedImageBase64 && (
              <span className="ai-badge">✨ AI Generated</span>
            )}
            <button
              type="button"
              className="remove-image-btn"
              onClick={handleRemoveImage}
              aria-label="Remove image"
            >
              &times;
            </button>
          </div>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="file-input"
          id="post-image"
          disabled={isLoading || aiImageLoading || aiCaptionLoading}
        />
        <label htmlFor="post-image" className="file-input-label">
          &#128247; {imagePreview ? 'Change image' : 'Add image'}
        </label>

        {imageFile && !hasText && (
          <button
            type="button"
            className="btn btn-secondary btn-sm ai-generate-btn"
            onClick={handleGenerateCaption}
            disabled={isLoading || aiImageLoading || aiCaptionLoading}
          >
            {aiCaptionLoading ? '✨ Generating caption...' : '✨ Generate caption with AI'}
          </button>
        )}
      </div>

      {aiError && <div className="alert alert-error">{aiError}</div>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={isLoading || aiImageLoading || aiCaptionLoading || (!hasText && !hasImage)}
      >
        {isLoading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
};

export default PostForm;
