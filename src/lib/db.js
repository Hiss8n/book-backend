import mongoose from "mongoose";
import { config } from "dotenv";
config();

/* const db=process.env.MONGODB_URI || 'mongodb+srv://test123:test123@cluster0.awvv3s7.mongodb.net/bookhub_db?retryWrites=true&w=majority&appName=Cluster0' */

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URI);
    console.log(`MONGODB CONNECTED SUCCESSFULLY: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1); //exit the process if connection fails
  }
};

export default connectDb;
