export interface User {
  id: string;
  username: string;
  name: string;
}

export interface Mention {
  id: string;
  userId: string;
  user: User;
}

export interface Comment {
  id: string;
  content: string;
  docId: string;
  authorId: string;
  author: User;
  parentId: string | null;
  quote?: string;
  rangeStart?: number;
  rangeEnd?: number;
  status: 'open' | 'resolved' | 'deleted';
  createdAt: string;
  mentions: Mention[];
  children?: Comment[]; // For recursive UI
}
