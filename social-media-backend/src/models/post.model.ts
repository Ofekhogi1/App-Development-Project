import mongoose, { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  text: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    embedding: {
      type: [Number],
      select: false,
    },
  },
  { timestamps: true }
);

PostSchema.index({ text: 'text' });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ author: 1, createdAt: -1 });

export const Post = mongoose.model<IPost>('Post', PostSchema);
