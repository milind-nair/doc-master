import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { broadcastComment } from './socket';

const prisma = new PrismaClient();
const router = Router();

// GET /users (Simple list for dropdown)
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /comments?docId=...
router.get('/', async (req, res) => {
  const { docId } = req.query;
  if (!docId) return res.status(400).json({ error: 'docId required' });
  
  try {
    const comments = await prisma.comment.findMany({
      where: { docId: String(docId) },
      include: { 
        author: true, 
        mentions: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(comments);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /comments
router.post('/', async (req, res) => {
  const { docId, content, authorId, parentId } = req.body;
  
  if (!docId || !content || !authorId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Create Comment
    const comment = await prisma.comment.create({
      data: {
        content,
        docId,
        authorId,
        parentId: parentId || null
      },
      include: { author: true }
    });

    // 2. Parse Mentions (Simple Regex)
    const mentionRegex = /@(\w+)/g;
    const mentions: any[] = [];
    let match;
    
    // Use a Set to avoid duplicate mentions per comment
    const mentionedUsernames = new Set<string>();

    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      if (mentionedUsernames.has(username)) continue;
      mentionedUsernames.add(username);

      const user = await prisma.user.findUnique({ where: { username } });
      if (user) {
         const mention = await prisma.mention.create({
           data: {
             commentId: comment.id,
             userId: user.id
           },
           include: { user: true }
         });
         mentions.push(mention);
      }
    }

    // 3. Broadcast
    // We attach the mentions to the comment object for the client
    const payload = { ...comment, mentions };
    broadcastComment(docId, payload);

    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

export default router;
