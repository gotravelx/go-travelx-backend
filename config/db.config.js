import mongoose from "mongoose";

const connectDb = async () => {
    try {
        console.log("Connecting to database...", process.env.MONGO_URI);

        const connection = await mongoose.connect(process.env.MONGO_URI);
        console.log(
            "Database connected successfully",
            connection.connection.host,
            connection.connection.name
        );
    } catch (error) {
        console.log("Database connection failed");
        process.exit(1);
    }
};


export { connectDb };