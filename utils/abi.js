const ContractAbi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "flightNumber",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "scheduledDepartureDate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "carrierCode",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "arrivalCity",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "departureCity",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "arrivalAirport",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "departureAirport",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "operatingAirlineCode",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "arrivalGate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "departureGate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "flightStatus",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "equipmentModel",
        type: "string",
      },
    ],
    name: "FlightDataSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "flightNumber",
        type: "string",
      },
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "carrierCode",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "scheduledDepartureDate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "departureAirport",
        type: "string",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isSubscribe",
        type: "bool",
      },
    ],
    name: "SubscriptionDetails",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "actualArrivalUTC",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "actualDepartureUTC",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "estimatedArrivalUTC",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "estimatedDepartureUTC",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "scheduledArrivalUTC",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "scheduledDepartureUTC",
        type: "string",
      },
    ],
    name: "UTCTimeSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "flightNumber",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "scheduledDepartureDate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "flight_times",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "carrierCode",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "status",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "statusCode",
        type: "string",
      },
    ],
    name: "currentFlightStatus",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "UtcTimes",
    outputs: [
      {
        internalType: "string",
        name: "actualArrivalUTC",
        type: "string",
      },
      {
        internalType: "string",
        name: "actualDepartureUTC",
        type: "string",
      },
      {
        internalType: "string",
        name: "estimatedArrivalUTC",
        type: "string",
      },
      {
        internalType: "string",
        name: "estimatedDepartureUTC",
        type: "string",
      },
      {
        internalType: "string",
        name: "scheduledArrivalUTC",
        type: "string",
      },
      {
        internalType: "string",
        name: "scheduledDepartureUTC",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "flightNumber",
        type: "string",
      },
      {
        internalType: "string",
        name: "carrierCode",
        type: "string",
      },
      {
        internalType: "string",
        name: "departureAirport",
        type: "string",
      },
      {
        internalType: "string",
        name: "scheduledDepartureDate",
        type: "string",
      },
    ],
    name: "addFlightSubscription",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "checkFlightStatus",
    outputs: [
      {
        internalType: "string",
        name: "flightStatusCode",
        type: "string",
      },
      {
        internalType: "string",
        name: "flightStatusDescription",
        type: "string",
      },
      {
        internalType: "string",
        name: "outUtc",
        type: "string",
      },
      {
        internalType: "string",
        name: "offUtc",
        type: "string",
      },
      {
        internalType: "string",
        name: "onUtc",
        type: "string",
      },
      {
        internalType: "string",
        name: "inUtc",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "flightNumbers",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "flights",
    outputs: [
      {
        internalType: "string",
        name: "flightNumber",
        type: "string",
      },
      {
        internalType: "string",
        name: "scheduledDepartureDate",
        type: "string",
      },
      {
        internalType: "string",
        name: "carrierCode",
        type: "string",
      },
      {
        internalType: "string",
        name: "arrivalCity",
        type: "string",
      },
      {
        internalType: "string",
        name: "departureCity",
        type: "string",
      },
      {
        internalType: "string",
        name: "arrivalAirport",
        type: "string",
      },
      {
        internalType: "string",
        name: "departureAirport",
        type: "string",
      },
      {
        internalType: "string",
        name: "operatingAirlineCode",
        type: "string",
      },
      {
        internalType: "string",
        name: "arrivalGate",
        type: "string",
      },
      {
        internalType: "string",
        name: "departureGate",
        type: "string",
      },
      {
        internalType: "string",
        name: "flightStatus",
        type: "string",
      },
      {
        internalType: "string",
        name: "equipmentModel",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "flightNumber",
        type: "string",
      },
      {
        internalType: "string",
        name: "scheduledDepartureDate",
        type: "string",
      },
      {
        internalType: "string",
        name: "carrierCode",
        type: "string",
      },
    ],
    name: "getFlightDetails",
    outputs: [
      {
        components: [
          {
            internalType: "string",
            name: "flightNumber",
            type: "string",
          },
          {
            internalType: "string",
            name: "scheduledDepartureDate",
            type: "string",
          },
          {
            internalType: "string",
            name: "carrierCode",
            type: "string",
          },
          {
            internalType: "string",
            name: "arrivalCity",
            type: "string",
          },
          {
            internalType: "string",
            name: "departureCity",
            type: "string",
          },
          {
            internalType: "string",
            name: "arrivalAirport",
            type: "string",
          },
          {
            internalType: "string",
            name: "departureAirport",
            type: "string",
          },
          {
            internalType: "string",
            name: "operatingAirlineCode",
            type: "string",
          },
          {
            internalType: "string",
            name: "arrivalGate",
            type: "string",
          },
          {
            internalType: "string",
            name: "departureGate",
            type: "string",
          },
          {
            internalType: "string",
            name: "flightStatus",
            type: "string",
          },
          {
            internalType: "string",
            name: "equipmentModel",
            type: "string",
          },
        ],
        internalType: "struct FlightStatusOracle.FlightData",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "flightNumber",
        type: "string",
      },
      {
        internalType: "string",
        name: "scheduledDepartureDate",
        type: "string",
      },
      {
        internalType: "string",
        name: "carrierCode",
        type: "string",
      },
    ],
    name: "getFlightStatus",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string[]",
        name: "flightdata",
        type: "string[]",
      },
      {
        internalType: "string[]",
        name: "Utctimes",
        type: "string[]",
      },
      {
        internalType: "string[]",
        name: "status",
        type: "string[]",
      },
    ],
    name: "insertFlightDetails",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "isFlightExist",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "flightNumber",
        type: "string",
      },
      {
        internalType: "string",
        name: "carrierCode",
        type: "string",
      },
      {
        internalType: "string",
        name: "departureAirport",
        type: "string",
      },
      {
        internalType: "string",
        name: "scheduledDepartureDate",
        type: "string",
      },
    ],
    name: "removeFlightSubscription",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "subscriptions",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export default ContractAbi;
  