import mongoose from 'mongoose';
const Schema = mongoose.Schema;
const UserSchema = new Schema({
    username:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
    },
    profilePic: {
        data: Buffer,
        type: String,
        required:false
    },
    admin:{
        type:Boolean,
        required:false,
        default:false
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

const User = mongoose.model('User', UserSchema);
export default User;