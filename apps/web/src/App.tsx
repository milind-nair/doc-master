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
      } else {
        const c = payload as Comment;
        setNewComment(c);
        setComments(prev => [...prev, c]); // Update local comments
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
    
    // Sort comments by start index
    const sorted = [...comments]
      .filter(c => c.rangeStart != null && c.rangeEnd != null)
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
      segments.push(
        <mark key={c.id} title={c.content} className="highlight-mark">
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

  if (!currentUser) return <div>Loading...</div>;

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
                {/* Add a trailing space to fix weird scroll alignment */}
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
            />
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
            newComment={newComment}
            selectedContext={selectedText}
            selectedRange={selectionRange}
          />
        </aside>
      </main>
    </div>
  );
}


export default App;
