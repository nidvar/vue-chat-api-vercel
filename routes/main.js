import Post from '../models/Post.js';
import Reply from '../models/Replies.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

export const routes = function(app){

    const authMiddleware = async function(req, res, next){
        const token = req.cookies.token;
        if(!token){
            return res.json({message: 'no token'});
        };
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (err) {
            console.log(err);
            return res.json({authenticated: false});
        }
    };

    app.get('/auth', authMiddleware, (req, res)=>{
        return res.json({authenticated: true, email: req.user.email});
    });

    app.delete('/delete', authMiddleware, async (req, res)=>{
        if(req.body.comment){
            const comment = await Reply.findOne({_id: req.body.blogId});
            if(comment){
                await Reply.deleteOne({ _id: req.body.blogId });
                res.json({ message: 'deleted'});
            }else{
                res.json({ message: 'Post does not exist' });
            };
        }else{
            const post = await Post.findOne({_id: req.body.blogId});
            if(post){
                await Post.deleteOne({ _id: req.body.blogId });
                res.json({ message: 'deleted'});
            }else{
                res.json({ message: 'Post does not exist' });
            };
        }
    });

    app.get('/', async (req, res)=>{
        const posts = await Post.find({});
        const userEmails = [];
        posts.forEach((item)=>{
            if(!userEmails.includes(item.email)){
                userEmails.push(item.email);
            }
        });
        const users = await User.find({ email: { $in: userEmails } })
        const data = {
            posts: posts,
            users: users
        }
        res.json(data);
    });

    app.get('/dashboard', authMiddleware, async (req, res)=>{
        const user = await User.findOne({ username: req.cookies.username });
        const posts = await Post.find({ username: req.cookies.username });

        const userDetails = {
            user: user,
            posts: posts
        };
        res.json(userDetails);
    });

    app.get('/blog/:id', async (req, res)=>{
        const blogPost = await Post.findOne({ _id: req.params.id });
        const replies = await Reply.find({ replyTo:req.params.id });
        const userEmails = [];
        userEmails.push(blogPost.email);
        replies.forEach((item)=>{
            if(!userEmails.includes(item.email)){
                userEmails.push(item.email);
            };
        });
        const allInvolvedUsers = await User.find({ email: { $in: userEmails } });
        const data = {
            blogPost: blogPost,
            replies: replies,
            allUsers: allInvolvedUsers
        };
        res.json(data);
    });

    app.post('/create', authMiddleware,  async (req, res)=>{
        try{
            const payload = {
                title: req.body.title, 
                body: req.body.body,
                email: req.cookies.email,
                username: req.cookies.username
            };
            await Post.create(payload);
            res.json({ message: 'blog created'});
        }catch(error){
            console.log(error);
            return res.json({ message: error});
        }
    });

    app.put('/update', authMiddleware, async (req, res)=>{
        const post = await Post.findOne({ _id: req.body.id})
        if(post){
            await Post.findByIdAndUpdate(
                req.body.id,
                { 
                    title: req.body.blogTitle,
                    body: req.body.blogBody
                },
                { new: true }
            );
            return res.json({message: 'updated'})
        }else{
            return res.json({message: 'fail'})
        }
    })

    app.post('/comment', authMiddleware, async (req, res)=>{
        try{
            const payload = {
                replyTo: req.body.replyTo, 
                comment: req.body.comment,
                email: req.cookies.email,
                username: req.cookies.username
            };
            await Reply.create(payload);
            return res.json({message:'comment added'});
        }catch(error){
            console.log(error);
            return res.json({message:error});
        }
    });

    app.post('/login', async (req, res)=>{
        try{
            const user = await User.findOne({email:req.body.email});
            if(user == null){
                return res.json({loggedIn: false, error:'no user found'});
            }else{
                const validatePassword = await bcrypt.compare(req.body.password, user.password);
                if(!validatePassword){
                    return res.json({loggedIn: false, error: 'Incorrect password'})
                };
                const token = jwt.sign({email: user.email, userId: user._id}, process.env.JWT_SECRET, {expiresIn: '10m'});

                res.cookie('token', token, {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'None',
                  maxAge: 1000 * 60 * 60 * 24,
                });
                
                res.cookie('email', req.body.email, {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'None',
                });
                
                res.cookie('username', user.username, {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'None',
                });
                return res.json({loggedIn: true});
            };
        }catch(err){
            console.log(err);
            return res.json(err);
        }
    });

    app.post('/register', async (req, res)=>{
        const emailExists = await User.findOne({email:req.body.email});
        const usernameExists = await User.findOne({username:req.body.username});
        if(emailExists == null || usernameExists == null){
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            await User.create(
                {
                    username: req.body.username, 
                    password: hashedPassword, 
                    admin: false,
                    email: req.body.email,
                    profilePic: req.body.profilePic
                }
            );
            res.json({ message: 'user created'});
        }else{
            return res.json({message: 'user exists'});
        }
    });

    app.put('/picture', authMiddleware, async (req, res)=>{
        const user = await User.findOne({ email: req.cookies.email});
        if(user){
            await User.updateOne(
                { email: req.cookies.email },
                { $set: { profilePic: req.body.profilePic } },
            );
            return res.json({message: 'backend recieved'})
        }else{
            return res.json({message: 'fail'})
        }
    })

    app.get('/logout', (req, res)=>{
        res.clearCookie('token', {
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        });
        res.clearCookie('email', {
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        });
        res.clearCookie('username', {
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        });
        return res.json({message: 'logged out'});
    });
};
