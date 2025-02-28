import https from 'https'
import fetch from 'node-fetch';
import FlightData from '../model/flight.js';

const agent = new https.Agent({
    rejectUnauthorized: false  // Disable certificate validation
});


const searchFlight = async (req, res) => {
    try {
        const { flightNumber } = req.body;  // Get the flight number from the request body
        const fltNbr = parseInt(flightNumber);
        // Step 1: Fetch flight data from the external API

        const response = await fetch(`https://rte.qa.asx.aws.ual.com/rte/flifo-dashboard/v1/flifo/getFlightStatus?fltNbr=${fltNbr}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            agent: agent // Add agent here
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch flight data. Status code: ${response.status}`);
        }



        // Step 2: Extract data from the API response
        const segment = data.FlightLegs?.[0]?.OperationalFlightSegments?.[0];
        const scheduledSegment = data.FlightLegs?.[0]?.ScheduledFlightSegments?.[0];

        if (!segment || !scheduledSegment) {
            return res.status(404).json({ message: "No flight data found" });
        }

        // Flight Status logic
        const flightStatusData = segment.FlightStatuses?.find((status) => status.StatusType === "LegStatus");
        const flightStatus = flightStatusData?.Description || "Unknown";
        const statusCode = flightStatusData?.Code || "Unknown";
        const isCanceled = statusCode === "CNCL";

        // Flight phase logic
        const flightIndicators = segment.Characteristic?.reduce((acc, char) => {
            if (["FltOutInd", "FltOffInd", "FltOnInd", "FltInInd", "FltCnclInd"].includes(char.Code)) {
                acc[char.Code] = char.Value === "1";
            }
            return acc;
        }, {});

        let phase = "not_departed";
        if (flightIndicators?.FltInInd) phase = "in";
        else if (flightIndicators?.FltOnInd) phase = "on";
        else if (flightIndicators?.FltOffInd) phase = "off";
        else if (flightIndicators?.FltOutInd) phase = "out";

        // Step 3: Transform the data into your model structure
        const flightData = {
            flightNumber: data.Flight.FlightNumber,
            estimatedArrivalUTC: segment.EstimatedArrivalUTCTime,
            estimatedDepartureUTC: segment.EstimatedDepartureUTCTime,
            actualDepartureUTC: segment.ActualDepartureUTCTime || "",
            actualArrivalUTC: segment.ActualArrivalUTCTime || "",
            outTimeUTC: segment.OutUTCTime,
            offTimeUTC: segment.OffUTCTime,
            onTimeUTC: segment.InUTCTime,
            inTimeUTC: segment.InUTCTime,
            arrivalCity: segment.ArrivalAirport.Address.City,
            departureCity: segment.DepartureAirport.Address.City,
            operatingAirline: segment.OperatingAirline.IATACode,
            departureGate: segment.DepartureGate || "TBD",
            arrivalGate: segment.ArrivalGate || "TBD",
            departureTerminal: segment.DepartureTerminal || "TBD",
            arrivalTerminal: segment.ArrivalTermimal || "TBD",
            flightStatus,
            statusCode,
            equipmentModel: segment.Equipment.Model.Description,
            phase,
            baggageClaim: segment.ArrivalBagClaimUnit?.trim() || "TBD",
            departureDelayMinutes: segment.DepartureDelayMinutes ? parseInt(segment.DepartureDelayMinutes, 10) : 0,
            arrivalDelayMinutes: segment.ArrivalDelayMinutes ? parseInt(segment.ArrivalDelayMinutes, 10) : 0,
            boardingTime: segment.BoardTime,
            isCanceled,
            scheduledArrivalUTCDateTime: scheduledSegment?.ArrivalUTCDateTime,
            scheduledDepartureUTCDateTime: scheduledSegment?.DepartureUTCDateTime,
        };

        // Step 4: Insert the flight data into the database
        const newFlight = new FlightData(flightData);
        const savedFlight = await newFlight.save();

        // Step 5: Respond with the saved flight data
        console.log("Flight data saved:", savedFlight);
        res.status(201).json(savedFlight);  // Send response back to client

    } catch (error) {
        console.error("Error fetching or saving flight data:", error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
        }
        res.status(502).json({ error: "Failed to fetch flight data", details: error.message });  // Return error response
    }
};

const testApi = async (flightNumberQuery) => {
    try {

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Error fetching flight data:", error);
        throw error;
    }
}


export default searchFlight;