const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL_USER);
    console.log('Connected to UserDB');
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    throw new Error('Failed to connect to MongoDB. Server cannot start.');
  }
};

module.exports = connectDB;
