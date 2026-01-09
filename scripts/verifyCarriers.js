import { connectDynamoDB } from "../config/Dynamodb.js";
import { getAllCarriers } from "../model/CarrierModel.js";
import dotenv from "dotenv";

dotenv.config();

(async () => {
    try {
        await connectDynamoDB();
        const res = await getAllCarriers();
        console.log("Total Carriers:", res.items.length);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
