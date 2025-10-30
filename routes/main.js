import Post from '../models/Post.js';
import Reply from '../models/Replies.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

export const routes = function (app) {
  // Determine environment for cookie security
  const isProduction = process.env.NODE_ENV === 'production';

  // ----------------- AUTH MIDDLEWARE -----------------
  const authMiddleware = async function (req, res, next) {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ authenticated: false, message: 'No token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      console.log(err);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ authenticated: false, message: 'Token expired' });
      }
      return res.status(401).json({ authenticated: false, message: 'Invalid token' });
    }
  };

  // ----------------- AUTH CHECK -----------------
  app.get('/auth', authMiddleware, (req, res) => {
    return res.json({ authenticated: true, email: req.user.email });
  });

  // ----------------- DELETE POST OR COMMENT -----------------
  app.delete('/delete', authMiddleware, async (req, res) => {
    try {
      const { comment, blogId } = req.body;

      if (comment) {
        const reply = await Reply.findOne({ _id: blogId, email: req.user.email });
        if (!reply) return res.json({ message: 'Not authorized or reply not found' });

        await Reply.deleteOne({ _id: blogId });
        return res.json({ message: 'deleted' });
      }

      const post = await Post.findOne({ _id: blogId, email: req.user.email });
      if (!post) return res.json({ message: 'Not authorized or post not found' });

      await Post.deleteOne({ _id: blogId });
      return res.json({ message: 'deleted' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ----------------- GET ALL POSTS -----------------
  app.get('/', async (req, res) => {
    try {
      const posts = await Post.find({});
      const userEmails = [...new Set(posts.map(p => p.email))];
      const users = await User.find({ email: { $in: userEmails } });
      res.json({ posts, users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ----------------- DASHBOARD -----------------
  app.get('/dashboard', authMiddleware, async (req, res) => {
    try {
      const { username } = req.cookies;
      const user = await User.findOne({ username });
      const posts = await Post.find({ username });
      res.json({ user, posts });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ----------------- GET SINGLE BLOG -----------------
  app.get('/blog/:id', async (req, res) => {
    try {
      const blogPost = await Post.findById(req.params.id);
      const replies = await Reply.find({ replyTo: req.params.id });

      const userEmails = [blogPost.email, ...new Set(replies.map(r => r.email))];
      const users = await User.find({ email: { $in: userEmails } });

      res.json({ blogPost, replies, users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ----------------- CREATE POST -----------------
  app.post('/create', authMiddleware, async (req, res) => {
    try {
      const payload = {
        title: req.body.title,
        body: req.body.body,
        email: req.cookies.email,
        username: req.cookies.username,
      };
      await Post.create(payload);
      res.json({ message: 'blog created' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ----------------- UPDATE POST -----------------
  app.put('/update', authMiddleware, async (req, res) => {
    try {
      const post = await Post.findOne({ _id: req.body.id, email: req.cookies.email });
      if (!post) return res.json({ message: 'Not authorized or post not found' });

      await Post.findByIdAndUpdate(req.body.id, {
        title: req.body.blogTitle,
        body: req.body.blogBody,
      });
      res.json({ message: 'updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ----------------- ADD COMMENT -----------------
  app.post('/comment', authMiddleware, async (req, res) => {
    try {
      const payload = {
        replyTo: req.body.replyTo,
        comment: req.body.comment,
        email: req.cookies.email,
        username: req.cookies.username,
      };
      await Reply.create(payload);
      res.json({ message: 'comment added' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ----------------- LOGIN -----------------
  app.post('/login', async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) return res.json({ loggedIn: false, error: 'No user found' });

      const valid = await bcrypt.compare(req.body.password, user.password);
      if (!valid) return res.json({ loggedIn: false, error: 'Incorrect password' });

      const token = jwt.sign(
        { email: user.email, userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax',
      };

      res.cookie('token', token, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 });
      res.cookie('email', user.email, cookieOptions);
      res.cookie('username', user.username, cookieOptions);

      res.json({ loggedIn: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ loggedIn: false, error: 'Server error' });
    }
  });

  // ----------------- REGISTER -----------------
  app.post('/register', async (req, res) => {
    try {
      const { email, username, password, profilePic } = req.body;

      const emailExists = await User.findOne({ email });
      const usernameExists = await User.findOne({ username });

      if (emailExists || usernameExists) {
        return res.json({ message: 'user exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        username,
        password: hashedPassword,
        admin: false,
        email,
        profilePic,
      });

      res.json({ message: 'user created' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ----------------- UPDATE PROFILE PICTURE -----------------
  app.put('/picture', authMiddleware, async (req, res) => {
    try {
      const user = await User.findOne({ email: req.cookies.email });
      if (!user) return res.json({ message: 'User not found' });

      await User.updateOne(
        { email: req.cookies.email },
        { $set: { profilePic: req.body.profilePic } }
      );

      res.json({ message: 'Profile picture updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ----------------- LOGOUT -----------------
  app.get('/logout', (req, res) => {
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax',
    };
    res.clearCookie('token', cookieOptions);
    res.clearCookie('email', cookieOptions);
    res.clearCookie('username', cookieOptions);
    res.json({ message: 'logged out' });
  });
};
