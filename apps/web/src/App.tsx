import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Comments } from './components/Comments';
import { Comment, User } from './types';
import { fetchUsers } from './api';
import './index.css';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [docId] = useState('doc-1');
  const [newComment, setNewComment] = useState<Comment | null>(null);
  const [docContent, setDocContent] = useState('Lorem ipsum dolor sit amet, consectetur adipiscing elit.\nSed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\nUt enim ad minim veniam, quis nostrud exercitation ullamco.');

  useEffect(() => {
    // Load Users
    fetchUsers().then(loadedUsers => {
      setUsers(loadedUsers);
      if (loadedUsers.length > 0) setCurrentUser(loadedUsers[0]);
    }).catch(console.error);

    // Connect to API
    const s = io('http://localhost:3001');

    s.on('connect', () => {
      console.log('Connected to socket', s.id);
      s.emit('join_doc', docId);
    });

    s.on('new_comment', (comment: Comment) => {
      console.log('New Comment:', comment);
      setNewComment(comment);
    });

    return () => {
      s.disconnect();
    };
  }, [docId]);

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
            onChange={(e) => setDocContent(e.target.value)}
          />
          <p className="hint">
            Highlights: <span className="highlight">Select text to comment (mock)</span>.
          </p>
        </section>
        
        <aside className="sidebar">
          <Comments 
            docId={docId} 
            currentUser={currentUser} 
            newComment={newComment} 
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
