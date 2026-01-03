import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Comments } from './components/Comments';
import { Comment, User } from './types';
import { fetchUsers, fetchDocument, updateDocument } from './api';
import './index.css';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [docId] = useState('doc-1');
  const [newComment, setNewComment] = useState<Comment | null>(null);
  const [docContent, setDocContent] = useState('');
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    // Load Users
    fetchUsers().then(loadedUsers => {
      setUsers(loadedUsers);
      if (loadedUsers.length > 0) setCurrentUser(loadedUsers[0]);
    }).catch(console.error);

    // Load Document
    fetchDocument(docId).then(doc => {
      setDocContent(doc.content);
    }).catch(console.error);

    // Connect to API
    const s = io('http://localhost:3001');

    s.on('connect', () => {
      console.log('Connected to socket', s.id);
      s.emit('join_doc', docId);
    });

    s.on('new_comment', (payload: any) => {
      if (payload.type === 'doc_update') {
        // Simple "Last write wins" for MVP - replace content if external update
        // In real app, we need OT/CRDTs or robust merging
        setDocContent(payload.content);
      } else {
        console.log('New Comment:', payload);
        setNewComment(payload as Comment);
      }
    });

    return () => {
      s.disconnect();
    };
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
    }
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const u = users.find(u => u.username === e.target.value);
    if (u) setCurrentUser(u);
  };

  if (!currentUser) return <div>Loading...</div>;

  return (
    <div className="app-container">
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
          <textarea 
            className="doc-editor"
            value={docContent}
            onChange={handleDocChange}
            onSelect={handleSelect}
          />
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
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
