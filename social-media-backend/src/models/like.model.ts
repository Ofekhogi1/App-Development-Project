import mongoose, { Document, Schema } from 'mongoose';

export interface ILike extends Document {
  _id: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LikeSchema = new Schema<ILike>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

LikeSchema.index({ post: 1, user: 1 }, { unique: true });

export const Like = mongoose.model<ILike>('Like', LikeSchema);
