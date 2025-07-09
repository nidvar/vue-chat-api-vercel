import mongoose from 'mongoose';

export const connectDB = async ()=>{
    try{
        mongoose.set('strictQuery', false);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('===============================================');
        console.log('welcome to database: ', mongoose.connection.name);
    }catch(error){
        console.log(error);
    }
};