const ContractAbi = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "AlreadySubscribed",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "ArrayLengthMismatch",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "DateRangeExceeded",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "FlightNotFound",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidArrayLength",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidDateFormat",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidInput",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NoDataForCarrier",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NoFlightDataProvided",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NotSubscribed",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "RateLimitExceeded",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "ReentrancyGuard",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "StringTooLong",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "TooManyFlightsInBatch",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "Unauthorized",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "string",
                "name": "flightNumber",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "carrierCode",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "flightOriginateDate",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "arrivalAirport",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "departureAirport",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "arrivalCity",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "departureCity",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "arrivalStatus",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "departureStatus",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "legStatus",
                "type": "string"
            }
        ],
        "name": "FlightDataInserted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "string",
                "name": "flightNumber",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "carrierCode",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "flightOriginateDate",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "newArrivalStatus",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "newDepartureStatus",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "newLegStatus",
                "type": "string"
            }
        ],
        "name": "FlightStatusUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "flightNumber",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "carrierCode",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "arrivalAirport",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "departureAirport",
                "type": "string"
            }
        ],
        "name": "FlightSubscriptionAdded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "flightNumber",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "carrierCode",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "arrivalAirport",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "departureAirport",
                "type": "string"
            }
        ],
        "name": "FlightUnsubscribed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "oracle",
                "type": "address"
            }
        ],
        "name": "OracleAuthorized",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "oracle",
                "type": "address"
            }
        ],
        "name": "OracleRevoked",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "flightNumber",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "carrierCode",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "arrivalAirport",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "departureAirport",
                "type": "string"
            }
        ],
        "name": "addFlightSubscription",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "oracle",
                "type": "address"
            }
        ],
        "name": "authorizeOracle",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllFlightNumbers",
        "outputs": [
            {
                "internalType": "string[]",
                "name": "",
                "type": "string[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "flightNumber",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "carrierCode",
                "type": "string"
            }
        ],
        "name": "getCurrentFlightStatus",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "flightNumber",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "carrierCode",
                "type": "string"
            }
        ],
        "name": "getFlightDates",
        "outputs": [
            {
                "internalType": "string[]",
                "name": "",
                "type": "string[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "flightNumber",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "fromDate",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "fromDateInTimeStamp",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "toDate",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "carrierCode",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "arrivalAirport",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "departureAirport",
                "type": "string"
            }
        ],
        "name": "getFlightHistory",
        "outputs": [
            {
                "components": [
                    {
                        "components": [
                            {
                                "internalType": "string",
                                "name": "carrierCode",
                                "type": "string"
                            },
                            {
                                "internalType": "string",
                                "name": "flightNumber",
                                "type": "string"
                            },
                            {
                                "internalType": "string",
                                "name": "flightOriginateDate",
                                "type": "string"
                            }
                        ],
                        "internalType": "struct FlightStatusOracle.FlightIdentifiers",
                        "name": "identifiers",
                        "type": "tuple"
                    },
                    {
                        "components": [
                            {
                                "internalType": "string",
                                "name": "arrivalAirport",
                                "type": "string"
                            },
                            {
                                "internalType": "string",
                                "name": "departureAirport",
                                "type": "string"
                            },
                            {
                                "internalType": "string",
                                "name": "arrivalCity",
                                "type": "string"
                            },
                            {
                                "internalType": "string",
                                "name": "departureCity",
                                "type": "string"
                            }
                        ],
                        "internalType": "struct FlightStatusOracle.AirportDetails",
                        "name": "airports",
                        "type": "tuple"
                    },
                    {
                        "components": [
                            {
                                "internalType": "string",
                                "name": "arrivalStatus",
                                "type": "string"
                            },
                            {
                                "internalType": "string",
                                "name": "departureStatus",
                                "type": "string"
                            },
                            {
                                "internalType": "string",
                                "name": "legStatus",
                                "type": "string"
                            }
                        ],
                        "internalType": "struct FlightStatusOracle.FlightStatuses",
                        "name": "statuses",
                        "type": "tuple"
                    },
                    {
                        "internalType": "bytes",
                        "name": "compressedFlightInformation",
                        "type": "bytes"
                    }
                ],
                "internalType": "struct FlightStatusOracle.FlightInfo[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getOwner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "oracle",
                "type": "address"
            }
        ],
        "name": "isAuthorizedOracle",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "name": "isFlightExist",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "flightNumber",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "carrierCode",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "arrivalAirport",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "departureAirport",
                "type": "string"
            }
        ],
        "name": "isUserSubscribed",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string[]",
                "name": "flightNumbers",
                "type": "string[]"
            },
            {
                "internalType": "string[]",
                "name": "carrierCodes",
                "type": "string[]"
            },
            {
                "internalType": "string[]",
                "name": "arrivalAirports",
                "type": "string[]"
            },
            {
                "internalType": "string[]",
                "name": "departureAirports",
                "type": "string[]"
            }
        ],
        "name": "removeFlightSubscription",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "oracle",
                "type": "address"
            }
        ],
        "name": "revokeOracle",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string[]",
                "name": "flightDetails",
                "type": "string[]"
            },
            {
                "internalType": "string",
                "name": "compressedFlightInformation",
                "type": "string"
            }
        ],
        "name": "storeFlightDetails",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "string[]",
                        "name": "flightDetails",
                        "type": "string[]"
                    },
                    {
                        "internalType": "string",
                        "name": "compressedFlightInformation",
                        "type": "string"
                    }
                ],
                "internalType": "struct FlightStatusOracle.FlightInput[]",
                "name": "flightInputs",
                "type": "tuple[]"
            }
        ],
        "name": "storeMultipleFlightDetails",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "flightNumber",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "flightOriginateDate",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "carrierCode",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "arrivalStatus",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "departureStatus",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "legStatus",
                "type": "string"
            }
        ],
        "name": "updateFlightStatus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

export default ContractAbi;
