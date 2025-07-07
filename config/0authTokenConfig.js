import  dotenv  from "dotenv";

dotenv.config();

const tokenConfig = {
    tokenUrl: process.env.TOKEN_URL,
    credentials: {
        client_id: process.env.TOKEN_CLIENT_ID,        
        client_secret: process.env.TOKEN_SECRET_ID,
        grant_type: process.env.TOKEN_GRANT_TYPE,
        scope: process.env.TOKEN_SCOP                 
    }
};

export default tokenConfig;