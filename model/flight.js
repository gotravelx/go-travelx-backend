import mongoose from "mongoose";

// Define the Flight Data Schema
const flightDataSchema = new mongoose.Schema({
    flightNumber: { type: String, required: true },
    estimatedArrivalUTC: { type: String, required: true },
    estimatedDepartureUTC: { type: String, required: true },
    arrivalCity: { type: String, required: true },
    departureCity: { type: String, required: true },
    operatingAirline: { type: String, required: true },
    departureGate: { type: String, required: true },
    arrivalGate: { type: String, required: true },
    flightStatus: { type: String, required: true },
    statusCode: { type: String, required: true },
    equipmentModel: { type: String, required: true },
    phase: {
        type: String,
        enum: ['not_departed', 'out', 'off', 'on', 'in'],
        required: true
    },
    departureTerminal: { type: String },
    arrivalTerminal: { type: String },
    actualDepartureUTC: { type: String },
    actualArrivalUTC: { type: String },
    outTimeUTC: { type: String },
    offTimeUTC: { type: String },
    onTimeUTC: { type: String },
    inTimeUTC: { type: String },
    baggageClaim: { type: String },
    departureDelayMinutes: { type: Number },
    arrivalDelayMinutes: { type: Number },
    boardingTime: { type: String },
    isCanceled: { type: Boolean, required: true },
    scheduledArrivalUTCDateTime: { type: String, required: true },
    scheduledDepartureUTCDateTime: { type: String, required: true },
});

// Create the model
const FlightData = mongoose.model('FlightData', flightDataSchema);

export default FlightData;
