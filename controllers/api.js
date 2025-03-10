import fetch from "node-fetch";
import https from 'https';
import dotenv from "dotenv"
const agent = new https.Agent({
    rejectUnauthorized: false,
});

dotenv.config();

export const fetchFlightData = async (flightNumber, options = {}) => {
    try {
        console.log(`[API] Fetching flight ${flightNumber} , data from external API...`);


        if (!flightNumber) {
            throw new Error("Flight number is required");
        }
        console.log('--------------------------------->', process.env.API);
        // Build the URL with mandatory and optional parameters
        let url = `${process.env.API}=${flightNumber}`;

        // Add optional parameters if provided
        if (options.departureDate) {
            url += `&fltLegSchedDepDt=${options.departureDate}`;
        }

        if (options.departure) {
            url += `&departure=${options.departure}`;
        }

        console.log(`[API] Fetching flight data from: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            agent: agent,
            timeout: 30000 // 30 second timeout
        });


        const data = await response.json();

        // Check if the API response was received successfully
        if (data.info && data.info[0].cd === "200") {
            // API call was successful, now check if flight was found
            if (data.flightStatusResp.Error) {
                // Flight not found error
                const errorCode = data.flightStatusResp.Error[0].Code;
                const errorDescription = data.flightStatusResp.Error[0].Description;

                console.log(`[API] Flight not found: ${errorDescription}`);

                // Return error information
                return {
                    success: false,
                    errorMessage: `Sorry, we couldn't find flight ${flightNumber}. Please verify the flight number and try again.`,
                    errorDetails: {
                        code: errorCode,
                        description: errorDescription
                    }
                };
            } else {
                console.log(`[API] Successfully fetched flight ${flightNumber} data`);

                // Process the flight data
                const segment = data.flightStatusResp.FlightLegs?.[0]?.OperationalFlightSegments?.[0];
                const scheduledSegment = data.flightStatusResp.FlightLegs?.[0]?.ScheduledFlightSegments?.[0];

                if (!segment || !scheduledSegment) {
                    throw new Error("No flight segment data found");
                }

                // Flight Status logic
                const flightStatusData = segment.FlightStatuses?.find((status) => status.StatusType === "LegStatus");
                const flightStatus = flightStatusData?.Description || "Unknown";
                const statusCode = flightStatusData?.Code || "Unknown";
                const isCanceled = statusCode === "CNCL";

                const operatingAirline = segment.OperatingAirline?.IATACode || "Unknown";
                const flightOriginationDate = data.flightStatusResp.Flight?.FlightOriginationDate || new Date().toISOString().split('T')[0];

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
                else if (flightIndicators?.FltCnclInd) phase = "canceled";

                // Prepare flight data
                const flightData = {
                    success: true,
                    flightNumber: data.flightStatusResp.Flight.FlightNumber,
                    flightDepartureDate: data.flightStatusResp.Flight.FlightOriginationDate,
                    carrierCode: "UA",
                    operatingAirline,
                    estimatedArrivalUTC: segment.EstimatedArrivalUTCTime,
                    estimatedDepartureUTC: segment.EstimatedDepartureUTCTime,
                    actualDepartureUTC: segment.ActualDepartureUTCTime || "",
                    actualArrivalUTC: segment.ActualArrivalUTCTime || "",
                    outTimeUTC: segment.OutUTCTime || "",
                    offTimeUTC: segment.OffUTCTime || "",
                    onTimeUTC: segment.OnUTCTime || "",
                    inTimeUTC: segment.InUTCTime || "",
                    arrivalCity: segment.ArrivalAirport.Address.City,
                    departureCity: segment.DepartureAirport.Address.City,
                    departureGate: segment.DepartureGate || "TBD",
                    arrivalGate: segment.ArrivalGate || "TBD",
                    departureTerminal: segment.DepartureTerminal || "TBD",
                    arrivalTerminal: segment.ArrivalTermimal || segment.ArrivalTerminal || "TBD",
                    flightStatus,
                    statusCode,
                    equipmentModel: segment.Equipment.Model.Description,
                    phase,
                    baggageClaim: segment.ArrivalBagClaimUnit?.trim() || "TBD",
                    departureDelayMinutes: segment.DepartureDelayMinutes ? parseInt(segment.DepartureDelayMinutes, 10) :
                        segment.EstimatedDepartureDelayMinutes ? parseInt(segment.EstimatedDepartureDelayMinutes, 10) : 0,
                    arrivalDelayMinutes: segment.ArrivalDelayMinutes ? parseInt(segment.ArrivalDelayMinutes, 10) :
                        segment.EstimatedArrivalDelayMinutes ? parseInt(segment.EstimatedArrivalDelayMinutes, 10) : 0,
                    boardingTime: segment.BoardTime,
                    isCanceled,
                    scheduledArrivalUTCDateTime: scheduledSegment?.ArrivalUTCDateTime,
                    scheduledDepartureUTCDateTime: scheduledSegment?.DepartureUTCDateTime,
                };

                return flightData;
            }
        } else {
            // API call failed
            console.log(`[API] API call failed: ${data.info?.[0]?.msg || "Unknown error"}`);
            return {
                success: false,
                errorMessage: "Unable to check flight status at this time. Please try again later.",
                errorDetails: {
                    code: data.info?.[0]?.cd || "Unknown",
                    description: data.info?.[0]?.msg || "Unknown error"
                }
            };
        }
    } catch (error) {
        console.log("[API] Error fetching flight data:", error);
        return {
            success: false,
            errorMessage: "An error occurred while checking flight status. Please try again later.",
            errorDetails: {
                description: error.message
            }
        };
    }
};

