export interface User {
  _id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Post {
  _id: string;
  author: User;
  text: string;
  imageUrl?: string | null;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  post: string;
  author: User;
  text: string;
  createdAt: string;
}

export interface PaginatedPosts {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SearchResult extends PaginatedPosts {
  intent: { keywords: string; daysAgo: number | null };
  aiUsed: boolean;
  originalQuery: string;
}

export interface AuthUser extends User {
  isProfileComplete?: boolean;
}
