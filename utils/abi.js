ContractAbi = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
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
                "name": "operatingAirline",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "arrivalGate",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "departureGate",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "flightStatus",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "equipmentModel",
                "type": "string"
            }
        ],
        "name": "FlightDataSet",
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
                "name": "flight_times",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "status",
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
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "expiry",
                "type": "uint256"
            }
        ],
        "name": "Subscribed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "string",
                "name": "ArrivalUTC",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "DepartureUTC",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "estimatedArrivalUTC",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "estimatedDepartureUTC",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "scheduledArrivalUTC",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "scheduledDepartureUTC",
                "type": "string"
            }
        ],
        "name": "UTCTimeSet",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "name": "UtcTimes",
        "outputs": [
            {
                "internalType": "string",
                "name": "ArrivalUTC",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "DepartureUTC",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "estimatedArrivalUTC",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "estimatedDepartureUTC",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "scheduledArrivalUTC",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "scheduledDepartureUTC",
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
                "name": "",
                "type": "string"
            }
        ],
        "name": "checkFlightStatus",
        "outputs": [
            {
                "internalType": "string",
                "name": "flightStatusCode",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "flightStatusDescription",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "outUtc",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "offUtc",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "onUtc",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "inUtc",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "flightNumbers",
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
                "name": "",
                "type": "string"
            }
        ],
        "name": "flights",
        "outputs": [
            {
                "internalType": "string",
                "name": "flightNumber",
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
            },
            {
                "internalType": "string",
                "name": "operatingAirline",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "arrivalGate",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "departureGate",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "flightStatus",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "equipmentModel",
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
            }
        ],
        "name": "getFlightData",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "string",
                        "name": "flightNumber",
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
                    },
                    {
                        "internalType": "string",
                        "name": "operatingAirline",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "arrivalGate",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "departureGate",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "flightStatus",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "equipmentModel",
                        "type": "string"
                    }
                ],
                "internalType": "struct FlightStatusOracle.FlightData",
                "name": "",
                "type": "tuple"
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
            }
        ],
        "name": "getFlightStatus",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string[]",
                "name": "flightdata",
                "type": "string[]"
            },
            {
                "internalType": "string[]",
                "name": "Utctimes",
                "type": "string[]"
            },
            {
                "internalType": "string[]",
                "name": "status",
                "type": "string[]"
            }
        ],
        "name": "setFlightData",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "months",
                "type": "uint256"
            }
        ],
        "name": "subscribe",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "subscriptions",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];


module.exports = { ContractAbi };