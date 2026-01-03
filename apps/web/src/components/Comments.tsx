import { useState } from 'react';
import { Comment, User } from '../types';
import { createComment, updateCommentStatus } from '../api';
import '../index.css';

interface Props {
  docId: string;
  currentUser: User;
  comments: Comment[]; // Received from parent
  selectedContext?: string;
  selectedRange?: { start: number; end: number } | null;
  onCommentUpdate: (id: string, status: any) => void;
}

export function Comments({ docId, currentUser, comments, selectedContext, selectedRange, onCommentUpdate }: Props) {
  const [text, setText] = useState('');

  const handleStatus = async (id: string, status: string) => {
    await updateCommentStatus(id, status);
    onCommentUpdate(id, status);
  };

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
      // Logic handled via socket in App.tsx now
      setText('');
    } catch (e) {
      console.error(e);
      alert('Failed to post');
    }
  };

  const visibleComments = comments.filter(c => c.status !== 'deleted');

  return (
    <div className="comments-section">
      <h3>Comments for {docId}</h3>
      <div className="comments-list">
        {visibleComments.map(c => (
          <div key={c.id} className={`comment-card ${c.status === 'resolved' ? 'resolved' : ''}`}>
            <div className="comment-header">
              <strong>{c.author.username}</strong>
              {c.parentId && <span className="reply-badge">Replying</span>}
              <div className="actions">
                 {c.status !== 'resolved' && <button onClick={() => handleStatus(c.id, 'resolved')} className="btn-xs">✓</button>}
                 <button onClick={() => handleStatus(c.id, 'deleted')} className="btn-xs">🗑️</button>
              </div>
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
            <div className="comment-footer">
              {new Date(c.createdAt).toLocaleTimeString()}
            </div>
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
