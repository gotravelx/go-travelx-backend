import { getAllCarriers, createCarrier, deleteCarrierByCode } from "../model/CarrierModel.js";

export const getCarriers = async (req, res) => {
    try {
        const result = await getAllCarriers();
        if (result.success) {
            res.status(200).json(result.items);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const seedCarriers = async (req, res) => {
    try {
        const carriers = [
            { carrierCode: "UA", carrierName: "United Airlines", program: "Star Alliance" },
            { carrierCode: "AI", carrierName: "Air India", program: "Star Alliance" },
            { carrierCode: "A3", carrierName: "Aegean Airlines", program: "Star Alliance" },
            { carrierCode: "JP", carrierName: "Adria Airways", program: "Star Alliance" },
            { carrierCode: "OZ", carrierName: "Asiana Airlines", program: "Star Alliance" },
            { carrierCode: "SN", carrierName: "Brussels Airlines", program: "Star Alliance" },
            { carrierCode: "MS", carrierName: "EgyptAir", program: "Star Alliance" },
            { carrierCode: "LO", carrierName: "LOT Polish Airlines", program: "Star Alliance" },
            { carrierCode: "SK", carrierName: "Scandinavian Airlines", program: "Star Alliance" },
            { carrierCode: "ZH", carrierName: "Shenzhen Airlines", program: "Star Alliance" },
            { carrierCode: "SQ", carrierName: "Singapore Airlines", program: "Star Alliance" },
            { carrierCode: "SA", carrierName: "South African Airways", program: "Star Alliance" },
            { carrierCode: "TG", carrierName: "Thai Airways", program: "Star Alliance" },
            { carrierCode: "TP", carrierName: "TAP Air Portugal", program: "Star Alliance" },
            { carrierCode: "TK", carrierName: "Turkish Airlines", program: "Star Alliance" },
            { carrierCode: "AC", carrierName: "Air Canada", program: "Star Alliance" },
            { carrierCode: "NZ", carrierName: "Air New Zealand", program: "Star Alliance" },
            { carrierCode: "NH", carrierName: "ANA (All Nippon Airways)", program: "Star Alliance" },
            { carrierCode: "OS", carrierName: "Austrian Airlines", program: "Star Alliance" },
            { carrierCode: "CA", carrierName: "Air China", program: "Star Alliance" },
            { carrierCode: "OU", carrierName: "Croatia Airlines", program: "Star Alliance" },
            { carrierCode: "LH", carrierName: "Lufthansa", program: "Star Alliance" },
            { carrierCode: "LX", carrierName: "Swiss International Air Lines", program: "Star Alliance" },
            { carrierCode: "ET", carrierName: "Ethiopian Airlines", program: "Star Alliance" },
            { carrierCode: "CM", carrierName: "Copa Airlines", program: "Star Alliance" },
            { carrierCode: "BR", carrierName: "EVA Air", program: "Star Alliance" },
            { carrierCode: "MX", carrierName: "Breeze Airways", program: "None" },
            { carrierCode: "HA", carrierName: "Hawaiian Airlines", program: "None" },
            { carrierCode: "WN", carrierName: "Southwest Airlines", program: "None" },
            { carrierCode: "G3", carrierName: "GOL Airlines", program: "None" },
            { carrierCode: "VS", carrierName: "Virgin Atlantic", program: "None" }
        ];

        const results = [];
        for (const carrier of carriers) {
            const result = await createCarrier(carrier);
            results.push(result);
        }

        res.status(200).json({ message: "Seeding complete", results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const addCarrier = async (req, res) => {
    try {
        const carrierData = req.body;
        if (!carrierData.carrierCode || !carrierData.carrierName || !carrierData.program) {
            return res.status(400).json({ error: "Missing required fields: carrierCode, carrierName, program" });
        }

        const result = await createCarrier(carrierData);
        if (result.success) {
            res.status(201).json(result.item);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteCarrier = async (req, res) => {
    try {
        const { carrierCode } = req.params;
        if (!carrierCode) {
            return res.status(400).json({ error: "Carrier code is required" });
        }

        const result = await deleteCarrierByCode(carrierCode);
        if (result.success) {
            res.status(200).json({ message: `Carrier ${carrierCode} deleted successfully` });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
