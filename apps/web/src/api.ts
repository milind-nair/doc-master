import { Comment, User } from './types';

const API_URL = 'http://localhost:3001';

export const fetchUsers = async (): Promise<User[]> => {
  const res = await fetch(`${API_URL}/comments/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

export const fetchComments = async (docId: string): Promise<Comment[]> => {
  const res = await fetch(`${API_URL}/comments?docId=${docId}`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
};

export const createComment = async (
  docId: string, 
  content: string, 
  authorId: string, 
  parentId?: string
): Promise<Comment> => {
  const res = await fetch(`${API_URL}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docId, content, authorId, parentId })
  });
  if (!res.ok) throw new Error('Failed to create comment');
  return res.json();
};

export const fetchDocument = async (docId: string): Promise<{ content: string; title: string }> => {
  const res = await fetch(`${API_URL}/comments/documents/${docId}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  return res.json();
};

export const updateDocument = async (docId: string, content: string) => {
  await fetch(`${API_URL}/comments/documents/${docId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
};
