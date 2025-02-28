
import dotenv from 'dotenv'
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors'
import router from './routes/flight.js';
import { connectDb } from './config/db.config.js'
// dotenv configuration
dotenv.config();
const app = express();
// here middleware is used to parse the incoming request body
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/v1/flights', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    connectDb()
        .then(() => {
            console.log(`Server is running on port http://localhost:${PORT}`);
        })
        .catch((error) => {
            console.log("Server failed to start", error);
        });
});