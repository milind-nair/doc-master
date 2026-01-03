import { useEffect, useState } from 'react';
import { Comment, User } from '../types';
import { createComment, fetchComments } from '../api';

interface Props {
  docId: string;
  currentUser: User;
  newComment: Comment | null;
  selectedContext?: string;
  selectedRange?: { start: number; end: number } | null;
}

export function Comments({ docId, currentUser, newComment, selectedContext, selectedRange }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    fetchComments(docId).then(setComments).catch(console.error);
  }, [docId]);

  useEffect(() => {
    if (newComment && newComment.docId === docId) {
      setComments(prev => {
        if (prev.some(c => c.id === newComment.id)) return prev;
        return [...prev, newComment];
      });
    }
  }, [newComment, docId]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    try {
      await createComment(
        docId, 
        text, 
        currentUser.id, 
        undefined, 
        selectedContext, 
        selectedRange?.start, 
        selectedRange?.end
      );
      setText('');
    } catch (e) {
      console.error(e);
      alert('Failed to post');
    }
  };

  return (
    <div className="comments-sidebar">
      <h3>Comments for {docId}</h3>
      <div className="comment-list">
        {comments.map(c => (
          <div key={c.id} className="comment-card">
            <div className="comment-header">
              <span className="author">{c.author?.username || 'Unknown'}</span>
              {c.parentId && <span className="reply-badge">Replying</span>}
            </div>
            <div className="comment-body">{c.content}</div>
            {c.quote && (
              <div className="comment-quote" style={{ fontSize: '0.8rem', color: '#666', borderLeft: '2px solid #ccc', paddingLeft: '4px', marginTop: '4px' }}>
                "{c.quote}"
              </div>
            )}
            {c.mentions && c.mentions.length > 0 && (
              <div className="mentions">
                Mentioned: {c.mentions.map(m => `@${m.user?.username}`).join(' ')}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="composer" style={{ flexDirection: 'column', gap: '0.5rem' }}>
        {selectedContext && (
          <div style={{ fontSize: '0.8rem', padding: '4px', background: '#f0f9ff', borderLeft: '3px solid #0284c7', color: '#0369a1' }}>
            Context: {selectedContext}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <textarea 
            placeholder="Write a comment..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button onClick={handleSubmit}>Post</button>
        </div>
      </div>
    </div>
  );
}
