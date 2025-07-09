import mongoose from 'mongoose';
const Schema = mongoose.Schema;
const ReplySchema = new Schema({
    replyTo:{
        type:String,
        required:true,
    },
    comment:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
    },
    username:{
        type:String,
        required:true,
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    updatedAt:{
        type:Date,
        default:Date.now
    },
});

const Reply = mongoose.model('Reply', ReplySchema);

export default Reply;