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
        name: "CurrentFlightStatus",
        type: "string",
      },
      {
        components: [
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
        indexed: false,
        internalType: "struct FlightStatusOracle.UTCTimeStruct",
        name: "utcTimes",
        type: "tuple",
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
        indexed: false,
        internalType: "string",
        name: "scheduledDepartureDate",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "currentFlightStatusTime",
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
        name: "FlightStatus",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "ArrivalState",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "DepartureState",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "bagClaim",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "FlightStatusCode",
        type: "string",
      },
    ],
    name: "FlightStatusUpdate",
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
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "numberOfFlightsUnsubscribed",
        type: "uint256",
      },
    ],
    name: "SubscriptionsRemoved",
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
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "MarketedFlightSegments",
    outputs: [
      {
        internalType: "string",
        name: "MarketingAirlineCode",
        type: "string",
      },
      {
        internalType: "string",
        name: "FlightNumber",
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
      {
        internalType: "string",
        name: "arrivalDelayMinutes",
        type: "string",
      },
      {
        internalType: "string",
        name: "departureDelayMinutes",
        type: "string",
      },
      {
        internalType: "string",
        name: "bagClaim",
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
        name: "ArrivalState",
        type: "string",
      },
      {
        internalType: "string",
        name: "DepartureState",
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
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "flightDates",
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
        name: "fromDate",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "fromDateInTimeStamp",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "toDate",
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
            name: "flightData",
            type: "tuple",
          },
          {
            components: [
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
              {
                internalType: "string",
                name: "arrivalDelayMinutes",
                type: "string",
              },
              {
                internalType: "string",
                name: "departureDelayMinutes",
                type: "string",
              },
              {
                internalType: "string",
                name: "bagClaim",
                type: "string",
              },
            ],
            internalType: "struct FlightStatusOracle.UtcTime",
            name: "utcTime",
            type: "tuple",
          },
          {
            components: [
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
                name: "ArrivalState",
                type: "string",
              },
              {
                internalType: "string",
                name: "DepartureState",
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
            internalType: "struct FlightStatusOracle.statuss",
            name: "status",
            type: "tuple",
          },
          {
            components: [
              {
                internalType: "string",
                name: "MarketingAirlineCode",
                type: "string",
              },
              {
                internalType: "string",
                name: "FlightNumber",
                type: "string",
              },
            ],
            internalType: "struct FlightStatusOracle.MarketedFlightSegment[]",
            name: "marketedSegments",
            type: "tuple[]",
          },
          {
            internalType: "string",
            name: "currentStatus",
            type: "string",
          },
          {
            internalType: "string",
            name: "scheduledDepartureDate",
            type: "string",
          },
        ],
        internalType: "struct FlightStatusOracle.FlightDetailsWithDate[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
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
      {
        internalType: "string[]",
        name: "MarketingAirlineCode",
        type: "string[]",
      },
      {
        internalType: "string[]",
        name: "marketingFlightNumber",
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
        name: "date1",
        type: "string",
      },
      {
        internalType: "string",
        name: "date2",
        type: "string",
      },
    ],
    name: "isDateLessThanOrEqual",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "pure",
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
        internalType: "address",
        name: "",
        type: "address",
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
    name: "isFlightSubscribed",
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
        internalType: "string[]",
        name: "flightNum",
        type: "string[]",
      },
      {
        internalType: "string[]",
        name: "carrierCode",
        type: "string[]",
      },
      {
        internalType: "string[]",
        name: "departureAirport",
        type: "string[]",
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
    ],
    name: "setStatus",
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
        name: "currentTime",
        type: "string",
      },
      {
        internalType: "string",
        name: "flightStatus",
        type: "string",
      },
      {
        internalType: "string",
        name: "flightStatusCode",
        type: "string",
      },
    ],
    name: "updateFlightStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export default ContractAbi;
