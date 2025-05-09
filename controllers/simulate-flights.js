import DataSource from "../model/data-source.js";

// Helper function to get current UTC time
const getCurrentUTCTime = () => {
  return new Date().toISOString();
};

const calculateDepartureState = (flight) => {
  if (flight.isCanceled) {
    return "CNL";
  }

  const scheduledTime = new Date(flight.scheduledDepartureUTCDateTime);
  const estimatedTime = flight.estimatedDepartureUTC
    ? new Date(flight.estimatedDepartureUTC)
    : null;
  const actualTime = flight.actualDepartureUTC
    ? new Date(flight.actualDepartureUTC)
    : null;

  const delayThresholdMinutes = 15;

  if (
    estimatedTime &&
    (estimatedTime - scheduledTime) / (1000 * 60) >= delayThresholdMinutes
  ) {
    return "DLY";
  }

  if (actualTime && actualTime > scheduledTime) {
    return "DLY";
  }

  if (flight.decisionTimeUTC) {
    const decisionTime = new Date(flight.decisionTimeUTC);
    if (decisionTime > scheduledTime) {
      return "PND";
    }
  }

  if (flight.isDiverted) {
    return "DIV";
  }

  if (flight.isExtraStop) {
    return "XSP";
  }

  if (flight.isNoStop) {
    return "NSP";
  }

  if (flight.hasMishap) {
    return "LCK";
  }

  return "ONT";
};

const calculateArrivalState = (flight) => {
  if (flight.isCanceled) {
    return "CNL";
  }

  const scheduledTime = new Date(flight.scheduledArrivalUTCDateTime);
  const estimatedTime = flight.estimatedArrivalUTC
    ? new Date(flight.estimatedArrivalUTC)
    : null;
  const actualTime = flight.actualArrivalUTC
    ? new Date(flight.actualArrivalUTC)
    : null;

  const timeThresholdMinutes = 15;

  if (
    estimatedTime &&
    (scheduledTime - estimatedTime) / (1000 * 60) >= timeThresholdMinutes
  ) {
    return "ERL";
  }

  if (actualTime && actualTime < scheduledTime) {
    return "ERL";
  }

  if (
    estimatedTime &&
    (estimatedTime - scheduledTime) / (1000 * 60) >= timeThresholdMinutes
  ) {
    return "DLY";
  }

  if (actualTime && actualTime > scheduledTime) {
    return "DLY";
  }

  if (flight.decisionTimeUTC) {
    return "PND";
  }

  if (flight.isDiverted) {
    return "DVT";
  }

  if (flight.isExtraStop) {
    return "XST";
  }

  if (flight.isNoStop) {
    return "NST";
  }

  if (flight.hasMishap) {
    return "LCK";
  }

  return "ONT";
};

// Update states after any status change
const updateFlightStates = async (flight) => {
  flight.departureState = calculateDepartureState(flight);
  flight.arrivalState = calculateArrivalState(flight);
  return flight;
};

export const updateToOut = async (req, res) => {
  const { flightNumber, scheduledDepartureDate, departureAirport } = req.body;

  const flight = await DataSource.findOne({
    flightNumber,
    scheduledDepartureDate,
    departureAirport,
  });

  if (!flight) return res.status(404).json({ message: "Flight not found" });

  if (flight.currentFlightStatus === "out") {
    return res.status(400).json({ message: "Already updated to OUT" });
  }

  flight.currentFlightStatus = "out";
  flight.statusCode = "OUT";
  flight.flightStatusDescription = "Departed Gate";
  flight.actualDepartureUTC = getCurrentUTCTime();
  flight.outTimeUTC = getCurrentUTCTime();

  // Calculate and update states
  await updateFlightStates(flight);

  await flight.save();

  res.json({ message: "Flight status updated to OUT", data: flight });
};

export const updateToOff = async (req, res) => {
  const { flightNumber, scheduledDepartureDate, departureAirport } = req.body;

  const flight = await DataSource.findOne({
    flightNumber,
    scheduledDepartureDate,
    departureAirport,
  });

  if (!flight) return res.status(404).json({ message: "Flight not found" });

  if (flight.currentFlightStatus === "off") {
    return res.status(400).json({ message: "Already updated to OFF" });
  }

  flight.currentFlightStatus = "off";
  flight.statusCode = "OFF";
  flight.flightStatusDescription = "In Flight";
  flight.offTimeUTC = getCurrentUTCTime();

  // Calculate and update states
  await updateFlightStates(flight);

  await flight.save();

  res.json({ message: "Flight status updated to OFF", data: flight });
};

export const updateToOn = async (req, res) => {
  const { flightNumber, scheduledDepartureDate, departureAirport } = req.body;

  const flight = await DataSource.findOne({
    flightNumber,
    scheduledDepartureDate,
    departureAirport,
  });

  if (!flight) return res.status(404).json({ message: "Flight not found" });

  if (flight.currentFlightStatus === "on") {
    return res.status(400).json({ message: "Already updated to ON" });
  }

  flight.currentFlightStatus = "on";
  flight.statusCode = "ON";
  flight.flightStatusDescription = "Landed";
  flight.onTimeUTC = getCurrentUTCTime();

  // Calculate and update states
  await updateFlightStates(flight);

  await flight.save();

  res.json({ message: "Flight status updated to ON", data: flight });
};

export const updateToIn = async (req, res) => {
  const { flightNumber, scheduledDepartureDate, departureAirport } = req.body;

  const flight = await DataSource.findOne({
    flightNumber,
    scheduledDepartureDate,
    departureAirport,
  });

  if (!flight) return res.status(404).json({ message: "Flight not found" });

  if (flight.currentFlightStatus === "in") {
    return res.status(400).json({ message: "Already updated to IN" });
  }

  flight.currentFlightStatus = "in";
  flight.statusCode = "IN";
  flight.flightStatusDescription = "Arrived at Gate";
  flight.inTimeUTC = getCurrentUTCTime();
  flight.actualArrivalUTC = getCurrentUTCTime();

  // Calculate and update states
  await updateFlightStates(flight);

  await flight.save();

  res.json({ message: "Flight status updated to IN", data: flight });
};

export const updateToCancelled = async (req, res) => {
  const { flightNumber, scheduledDepartureDate, departureAirport } = req.body;

  const flight = await DataSource.findOne({
    flightNumber,
    scheduledDepartureDate,
    departureAirport,
  });

  if (!flight) return res.status(404).json({ message: "Flight not found" });

  if (flight.currentFlightStatus === "cncl") {
    return res.status(400).json({ message: "Flight already cancelled" });
  }

  flight.currentFlightStatus = "cncl";
  flight.statusCode = "CNCL";
  flight.flightStatusDescription = "Cancelled";
  flight.isCanceled = true;

  // Calculate and update states
  await updateFlightStates(flight);

  await flight.save();

  res.json({ message: "Flight status updated to CANCELLED", data: flight });
};

export const updateToReturnedToGate = async (req, res) => {
  const { flightNumber, scheduledDepartureDate, departureAirport } = req.body;

  const flight = await DataSource.findOne({
    flightNumber,
    scheduledDepartureDate,
    departureAirport,
  });

  if (!flight) return res.status(404).json({ message: "Flight not found" });

  if (flight.currentFlightStatus === "rtbl") {
    return res.status(400).json({ message: "Flight already returned to gate" });
  }

  flight.currentFlightStatus = "rtbl";
  flight.statusCode = "RTBL";
  flight.flightStatusDescription = "Returned to Gate";
  flight.isReturnedToGate = true;

  // Calculate and update states
  await updateFlightStates(flight);

  await flight.save();

  res.json({
    message: "Flight status updated to RETURNED TO GATE",
    data: flight,
  });
};

export const updateToReturnedToAirport = async (req, res) => {
  const { flightNumber, scheduledDepartureDate, departureAirport } = req.body;

  const flight = await DataSource.findOne({
    flightNumber,
    scheduledDepartureDate,
    departureAirport,
  });

  if (!flight) return res.status(404).json({ message: "Flight not found" });

  if (flight.currentFlightStatus === "rtfl") {
    return res
      .status(400)
      .json({ message: "Flight already returned to airport" });
  }

  flight.currentFlightStatus = "rtfl";
  flight.statusCode = "RTFL";
  flight.flightStatusDescription = "Returned to Airport";
  flight.isReturnedToAirport = true;

  // Calculate and update states
  await updateFlightStates(flight);

  await flight.save();

  res.json({
    message: "Flight status updated to RETURNED TO AIRPORT",
    data: flight,
  });
};

export const updateToDiverted = async (req, res) => {
  const { flightNumber, scheduledDepartureDate, departureAirport, divertedTo } =
    req.body;

  const flight = await DataSource.findOne({
    flightNumber,
    scheduledDepartureDate,
    departureAirport,
  });

  if (!flight) return res.status(404).json({ message: "Flight not found" });

  if (flight.currentFlightStatus === "dvrt") {
    return res.status(400).json({ message: "Flight already diverted" });
  }

  flight.currentFlightStatus = "dvrt";
  flight.statusCode = "DVRT";
  flight.flightStatusDescription = "Diverted";
  flight.isDiverted = true;

  // If divertedTo is provided, update arrival airport
  if (divertedTo) {
    flight.arrivalAirport = divertedTo;
  }

  // Calculate and update states
  await updateFlightStates(flight);

  await flight.save();

  res.json({ message: "Flight status updated to DIVERTED", data: flight });
};

export const updateToMishap = async (req, res) => {
  const { flightNumber, scheduledDepartureDate, departureAirport } = req.body;

  const flight = await DataSource.findOne({
    flightNumber,
    scheduledDepartureDate,
    departureAirport,
  });

  if (!flight) return res.status(404).json({ message: "Flight not found" });

  if (flight.currentFlightStatus === "lock") {
    return res.status(400).json({ message: "Flight already in LOCK state" });
  }

  flight.currentFlightStatus = "lock";
  flight.statusCode = "LOCK";
  flight.flightStatusDescription = "Contact United";
  flight.hasMishap = true;

  // Calculate and update states
  await updateFlightStates(flight);

  await flight.save();

  res.json({
    message: "Flight status updated to LOCK (Contact Airline)",
    data: flight,
  });
};
