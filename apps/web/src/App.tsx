import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Comments } from './components/Comments';
import { Comment, User } from './types';
import { fetchUsers, fetchDocument, updateDocument, fetchComments } from './api';
import './index.css';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [docId] = useState('doc-1');
  const [newComment, setNewComment] = useState<Comment | null>(null);
  const [docContent, setDocContent] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeComment, setActiveComment] = useState<{comment: Comment, top: number, left: number} | null>(null);

  useEffect(() => {
    fetchUsers().then(u => {
      setUsers(u);
      if (u.length > 0) setCurrentUser(u[0]);
    });
    fetchDocument(docId).then(d => setDocContent(d.content));
    fetchComments(docId).then(setComments); // Fetch initially

    const s = io('http://localhost:3001');
    s.on('connect', () => s.emit('join_doc', docId));

    s.on('new_comment', (payload: any) => {
      if (payload.type === 'doc_update') {
        setDocContent(payload.content);
      } else if (payload.type === 'comment_update') {
        // Handle Delete/Resolve updates
        setComments(prev => prev.map(c => c.id === payload.id ? { ...c, status: payload.status } : c));
      } else {
        // Handle New Comment
        // Deduplicate just in case
        const c = payload as Comment;
        setComments(prev => {
          if (prev.some(existing => existing.id === c.id)) return prev;
          return [...prev, c];
        });
      }
    });

    return () => { s.disconnect(); };
  }, [docId]);

  const handleDocChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setDocContent(newContent);
    // Debounce this in production!
    updateDocument(docId, newContent);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== end) {
      const text = docContent.substring(start, end);
      setSelectedText(text);
      setSelectionRange({ start, end });
    }
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const u = users.find(u => u.username === e.target.value);
    if (u) setCurrentUser(u);
  };
  
  // Render Highlights
  const renderHighlights = () => {
    if (!docContent) return null;
    
    // Sort comments by start index. Filter out deleted!
    const sorted = [...comments]
      .filter(c => c.rangeStart != null && c.rangeEnd != null && c.status !== 'deleted')
      .sort((a, b) => (a.rangeStart || 0) - (b.rangeStart || 0));

    // Naive rendering: just full text with mark tags inserted
    // Ideally we split string into segments.
    // For MVP: let's build an array of segments.
    // NOTE: This assumes no overlapping comments (simple MVP).
    const segments = [];
    let lastIndex = 0;

    for (const c of sorted) {
      if (c.rangeStart! > lastIndex) {
        segments.push(<span key={lastIndex}>{docContent.slice(lastIndex, c.rangeStart!)}</span>);
      }
      // Highlight segment
      const end = Math.min(c.rangeEnd!, docContent.length);
      const isResolved = c.status === 'resolved';
      segments.push(
        <mark 
          key={c.id} 
          title={c.content} 
          className={`highlight-mark ${isResolved ? 'highlight-resolved' : ''}`}
        >
          {docContent.slice(c.rangeStart!, end)}
        </mark>
      );
      lastIndex = Math.max(lastIndex, end);
    }
    if (lastIndex < docContent.length) {
      segments.push(<span key={lastIndex}>{docContent.slice(lastIndex)}</span>);
    }

    return segments;
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const backdrop = document.getElementById('backdrop');
    if (backdrop) {
      backdrop.scrollTop = e.currentTarget.scrollTop;
      backdrop.scrollLeft = e.currentTarget.scrollLeft;
    }
  };
  
  // Callback for when comments change status (optimistic update from Sidebar)
  const onCommentUpdate = (id: string, newStatus: any) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  if (!currentUser) return <div>Loading...</div>;

  const handleEditorClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const { selectionStart } = target;
    
    // Find comment at this position
    const comment = comments.find(c => 
      c.status !== 'deleted' && 
      c.rangeStart != null && c.rangeEnd != null &&
      selectionStart >= c.rangeStart && selectionStart <= c.rangeEnd
    );

    if (comment) {
      const rect = target.getBoundingClientRect();
      setActiveComment({
        comment,
        top: e.clientY - rect.top + 20, 
        left: e.clientX - rect.left
      });
    } else {
      setActiveComment(null);
    }
  };

  return (
    <div className="app-container">
       {/* ... Header ... */}
      <header>
        <h1>Collaborative Docs</h1>
        <div className="controls">
          <label>
            User: 
            <select value={currentUser.username} onChange={handleUserChange}>
              {users.map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
            </select>
          </label>
        </div>
      </header>
      
      <main className="main-content">
        <section className="document-view">
          <h2>Document: {docId}</h2>
          
          <div className="editor-container">
            <div id="backdrop" className="doc-backdrop">
              <div className="highlights">
                {renderHighlights()}
                <br/> 
              </div>
            </div>
            <textarea 
              className="doc-editor"
              value={docContent}
              onChange={handleDocChange}
              onSelect={handleSelect}
              onScroll={handleScroll}
              spellCheck={false}
              onClick={handleEditorClick}
            />
            {activeComment && (
              <div className="comment-popover" style={{ top: activeComment.top, left: activeComment.left }}>
                <strong>{activeComment.comment.author.username}</strong>
                <p>{activeComment.comment.content}</p>
                <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
                    {activeComment.comment.status !== 'resolved' && (
                        <button style={{position: 'static', color: 'green'}} onClick={() => {
                            updateCommentStatus(activeComment.comment.id, 'resolved'); // Fire and forget
                            setActiveComment(null);
                        }}>Resolve</button>
                    )}
                </div>
                <button className="close-btn" onClick={() => setActiveComment(null)}>✕</button>
              </div>
            )}
          </div>

          <p className="hint">
            {selectedText ? (
              <span>Selected context: <strong style={{color: 'blue'}}>{selectedText}</strong></span>
            ) : (
              <span>Highlight text to attach context to your comment.</span>
            )}
          </p>
        </section>
        
        <aside className="sidebar">
          <Comments 
            docId={docId} 
            currentUser={currentUser}
            comments={comments} 
            selectedContext={selectedText}
            selectedRange={selectionRange}
            onCommentUpdate={onCommentUpdate}
          />
        </aside>
      </main>
    </div>
  );
}


export default App;
