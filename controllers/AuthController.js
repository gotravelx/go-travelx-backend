import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDocumentClient,getDynamoClient } from "../config/Dynamodb.js";
const JWT_SECRET = process.env.JWT_SECRET || "SECRET";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "REFRESH_SECRET"; 

const USERS_TABLE = "Users";
const DEFAULT_ADMIN = {
  username: "admin",
  password: "$2b$12$B1ydFnmUcaNhP9Z3Xf3AgeRNSSgZAE1jN/khbZbbl0Bqb9/Z3yqtC", 
};
const ensureUsersTableExists = async () => {
  const dynamoClient = getDynamoClient();
  const docClient = getDocumentClient();

  try {
    await dynamoClient.describeTable({ TableName: "Users" }).promise();
  } catch (err) {
    if (err.code === "ResourceNotFoundException") {
      await dynamoClient.createTable({
        TableName: USERS_TABLE,
        KeySchema: [{ AttributeName: "username", KeyType: "HASH" }],
        AttributeDefinitions: [{ AttributeName: "username", AttributeType: "S" }],
        BillingMode: "PAY_PER_REQUEST",
      }).promise();

      await dynamoClient.waitFor("tableExists", { TableName: "Users" }).promise();

      await docClient.put({
        TableName: "Users",
        Item: DEFAULT_ADMIN
      }).promise();
    } else {
      throw err;
    }
  }
};


const generateAccessToken = (user) => {
  return jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: "1h" });
};


const generateRefreshToken = (user) => {
  return jwt.sign({ username: user.username }, REFRESH_SECRET, { expiresIn: "7d" });
};

// Login function
export const authLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
   
    // Ensure table exists
    await ensureUsersTableExists();

    const docClient = getDocumentClient();
    const result = await docClient.get({
      TableName: "Users",
      Key: { username },
    }).promise();

    const user = result.Item;
    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid username or password" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(200).json({
      success: true,
      username: user.username,
      accessToken,
      refreshToken,
    });

  } catch (error) {
    console.error("[ERROR] Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Refresh token endpoint
export const refreshToken = (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Refresh token required" });

    const payload = jwt.verify(token, REFRESH_SECRET);

    const newAccessToken = generateAccessToken({ username: payload.username });
    const newRefreshToken = generateRefreshToken({ username: payload.username });

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    console.error("[ERROR] Refresh token error:", error);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

