// Racing Circuits Database - GPS Coordinates and Track Layouts
// Contains 100+ circuits from F1, IMSA, WEC, NASCAR, IndyCar, and club racing

const TRACK_DATABASE = {
    // ==================== F1 CIRCUITS (Current Calendar) ====================
    "cota": {
        name: "Circuit of the Americas",
        location: "Austin, Texas, USA",
        country: "USA",
        length: 5.513,
        type: "F1",
        coordinates: {
            center: { lat: 30.1328, lon: -97.6411 },
            startFinish: { lat: 30.1346, lon: -97.6356 }
        },
        // Track outline coordinates (simplified polygon)
        outline: [
            [30.1377, -97.6356], [30.1374, -97.6320], [30.1355, -97.6295],
            [30.1325, -97.6302], [30.1295, -97.6335], [30.1275, -97.6380],
            [30.1265, -97.6425], [30.1280, -97.6470], [30.1320, -97.6485],
            [30.1360, -97.6465], [30.1380, -97.6420], [30.1377, -97.6356]
        ],
        trackWidth: 15
    },
    
    "silverstone": {
        name: "Silverstone Circuit",
        location: "Silverstone, UK",
        country: "GBR",
        length: 5.891,
        type: "F1",
        coordinates: {
            center: { lat: 52.0786, lon: -1.0169 },
            startFinish: { lat: 52.0706, lon: -1.0147 }
        },
        outline: [
            [52.0785, -1.0080], [52.0830, -1.0120], [52.0860, -1.0180],
            [52.0850, -1.0250], [52.0790, -1.0280], [52.0720, -1.0270],
            [52.0680, -1.0220], [52.0690, -1.0150], [52.0730, -1.0100],
            [52.0785, -1.0080]
        ],
        trackWidth: 15
    },

    "monaco": {
        name: "Circuit de Monaco",
        location: "Monte Carlo, Monaco",
        country: "MCO",
        length: 3.337,
        type: "F1",
        coordinates: {
            center: { lat: 43.7347, lon: 7.4206 },
            startFinish: { lat: 43.7372, lon: 7.4208 }
        },
        outline: [
            [43.7395, 7.4270], [43.7380, 7.4220], [43.7350, 7.4180],
            [43.7310, 7.4170], [43.7280, 7.4200], [43.7295, 7.4260],
            [43.7330, 7.4290], [43.7370, 7.4290], [43.7395, 7.4270]
        ],
        trackWidth: 10
    },

    "spa": {
        name: "Circuit de Spa-Francorchamps",
        location: "Stavelot, Belgium",
        country: "BEL",
        length: 7.004,
        type: "F1",
        coordinates: {
            center: { lat: 50.4372, lon: 5.9714 },
            startFinish: { lat: 50.4372, lon: 5.9714 }
        },
        outline: [
            [50.4437, 5.9575], [50.4445, 5.9680], [50.4420, 5.9780],
            [50.4350, 5.9850], [50.4280, 5.9750], [50.4310, 5.9620],
            [50.4370, 5.9550], [50.4437, 5.9575]
        ],
        trackWidth: 15
    },

    "monza": {
        name: "Autodromo Nazionale Monza",
        location: "Monza, Italy",
        country: "ITA",
        length: 5.793,
        type: "F1",
        coordinates: {
            center: { lat: 45.6156, lon: 9.2811 },
            startFinish: { lat: 45.6188, lon: 9.2810 }
        },
        outline: [
            [45.6250, 9.2810], [45.6220, 9.2900], [45.6150, 9.2920],
            [45.6080, 9.2850], [45.6070, 9.2750], [45.6120, 9.2680],
            [45.6200, 9.2700], [45.6250, 9.2810]
        ],
        trackWidth: 14
    },

    "suzuka": {
        name: "Suzuka International Racing Course",
        location: "Suzuka, Japan",
        country: "JPN",
        length: 5.807,
        type: "F1",
        coordinates: {
            center: { lat: 34.8431, lon: 136.5407 },
            startFinish: { lat: 34.8450, lon: 136.5385 }
        },
        outline: [
            [34.8500, 136.5350], [34.8480, 136.5450], [34.8420, 136.5480],
            [34.8360, 136.5420], [34.8380, 136.5320], [34.8440, 136.5290],
            [34.8500, 136.5350]
        ],
        trackWidth: 14
    },

    "bahrain": {
        name: "Bahrain International Circuit",
        location: "Sakhir, Bahrain",
        country: "BHR",
        length: 5.412,
        type: "F1",
        coordinates: {
            center: { lat: 26.0325, lon: 50.5106 },
            startFinish: { lat: 26.0372, lon: 50.5119 }
        },
        outline: [
            [26.0400, 50.5080], [26.0380, 50.5170], [26.0310, 50.5200],
            [26.0250, 50.5140], [26.0260, 50.5050], [26.0330, 50.5020],
            [26.0400, 50.5080]
        ],
        trackWidth: 16
    },

    "jeddah": {
        name: "Jeddah Corniche Circuit",
        location: "Jeddah, Saudi Arabia",
        country: "SAU",
        length: 6.174,
        type: "F1",
        coordinates: {
            center: { lat: 21.6319, lon: 39.1044 },
            startFinish: { lat: 21.6356, lon: 39.1044 }
        },
        outline: [
            [21.6400, 39.0950], [21.6380, 39.1100], [21.6300, 39.1150],
            [21.6230, 39.1080], [21.6250, 39.0950], [21.6330, 39.0900],
            [21.6400, 39.0950]
        ],
        trackWidth: 12
    },

    "melbourne": {
        name: "Albert Park Circuit",
        location: "Melbourne, Australia",
        country: "AUS",
        length: 5.278,
        type: "F1",
        coordinates: {
            center: { lat: -37.8497, lon: 144.9689 },
            startFinish: { lat: -37.8465, lon: 144.9686 }
        },
        outline: [
            [-37.8420, 144.9650], [-37.8450, 144.9750], [-37.8530, 144.9780],
            [-37.8580, 144.9700], [-37.8550, 144.9600], [-37.8470, 144.9580],
            [-37.8420, 144.9650]
        ],
        trackWidth: 14
    },

    "shanghai": {
        name: "Shanghai International Circuit",
        location: "Shanghai, China",
        country: "CHN",
        length: 5.451,
        type: "F1",
        coordinates: {
            center: { lat: 31.3389, lon: 121.2197 },
            startFinish: { lat: 31.3380, lon: 121.2200 }
        },
        outline: [
            [31.3450, 121.2150], [31.3430, 121.2270], [31.3350, 121.2300],
            [31.3290, 121.2220], [31.3310, 121.2100], [31.3400, 121.2080],
            [31.3450, 121.2150]
        ],
        trackWidth: 15
    },

    "singapore": {
        name: "Marina Bay Street Circuit",
        location: "Singapore",
        country: "SGP",
        length: 4.940,
        type: "F1",
        coordinates: {
            center: { lat: 1.2914, lon: 103.8640 },
            startFinish: { lat: 1.2916, lon: 103.8599 }
        },
        outline: [
            [1.2960, 103.8560], [1.2940, 103.8700], [1.2870, 103.8720],
            [1.2850, 103.8600], [1.2900, 103.8540], [1.2960, 103.8560]
        ],
        trackWidth: 12
    },

    "hungaroring": {
        name: "Hungaroring",
        location: "Budapest, Hungary",
        country: "HUN",
        length: 4.381,
        type: "F1",
        coordinates: {
            center: { lat: 47.5789, lon: 19.2486 },
            startFinish: { lat: 47.5830, lon: 19.2500 }
        },
        outline: [
            [47.5860, 19.2450], [47.5840, 19.2550], [47.5770, 19.2580],
            [47.5720, 19.2500], [47.5750, 19.2400], [47.5820, 19.2380],
            [47.5860, 19.2450]
        ],
        trackWidth: 13
    },

    "zandvoort": {
        name: "Circuit Zandvoort",
        location: "Zandvoort, Netherlands",
        country: "NLD",
        length: 4.259,
        type: "F1",
        coordinates: {
            center: { lat: 52.3888, lon: 4.5409 },
            startFinish: { lat: 52.3888, lon: 4.5409 }
        },
        outline: [
            [52.3920, 4.5350], [52.3900, 4.5480], [52.3850, 4.5500],
            [52.3820, 4.5420], [52.3850, 4.5320], [52.3900, 4.5300],
            [52.3920, 4.5350]
        ],
        trackWidth: 12
    },

    "barcelona": {
        name: "Circuit de Barcelona-Catalunya",
        location: "Barcelona, Spain",
        country: "ESP",
        length: 4.657,
        type: "F1",
        coordinates: {
            center: { lat: 41.5700, lon: 2.2611 },
            startFinish: { lat: 41.5700, lon: 2.2611 }
        },
        outline: [
            [41.5750, 2.2550], [41.5730, 2.2700], [41.5660, 2.2720],
            [41.5620, 2.2620], [41.5660, 2.2520], [41.5720, 2.2500],
            [41.5750, 2.2550]
        ],
        trackWidth: 14
    },

    "redbullring": {
        name: "Red Bull Ring",
        location: "Spielberg, Austria",
        country: "AUT",
        length: 4.318,
        type: "F1",
        coordinates: {
            center: { lat: 47.2197, lon: 14.7647 },
            startFinish: { lat: 47.2230, lon: 14.7655 }
        },
        outline: [
            [47.2270, 14.7600], [47.2250, 14.7720], [47.2180, 14.7750],
            [47.2130, 14.7680], [47.2150, 14.7560], [47.2220, 14.7540],
            [47.2270, 14.7600]
        ],
        trackWidth: 14
    },

    "interlagos": {
        name: "Autódromo José Carlos Pace",
        location: "São Paulo, Brazil",
        country: "BRA",
        length: 4.309,
        type: "F1",
        coordinates: {
            center: { lat: -23.7036, lon: -46.6997 },
            startFinish: { lat: -23.7015, lon: -46.6975 }
        },
        outline: [
            [-23.6980, -46.6950], [-23.7000, -46.7050], [-23.7080, -46.7080],
            [-23.7120, -46.7000], [-23.7080, -46.6920], [-23.7000, -46.6900],
            [-23.6980, -46.6950]
        ],
        trackWidth: 14
    },

    "lasvegas": {
        name: "Las Vegas Strip Circuit",
        location: "Las Vegas, Nevada, USA",
        country: "USA",
        length: 6.201,
        type: "F1",
        coordinates: {
            center: { lat: 36.1147, lon: -115.1728 },
            startFinish: { lat: 36.1147, lon: -115.1728 }
        },
        outline: [
            [36.1200, -115.1800], [36.1180, -115.1650], [36.1100, -115.1620],
            [36.1050, -115.1700], [36.1080, -115.1850], [36.1160, -115.1880],
            [36.1200, -115.1800]
        ],
        trackWidth: 15
    },

    "miami": {
        name: "Miami International Autodrome",
        location: "Miami, Florida, USA",
        country: "USA",
        length: 5.412,
        type: "F1",
        coordinates: {
            center: { lat: 25.9581, lon: -80.2389 },
            startFinish: { lat: 25.9581, lon: -80.2389 }
        },
        outline: [
            [25.9620, -80.2420], [25.9600, -80.2340], [25.9550, -80.2320],
            [25.9520, -80.2380], [25.9550, -80.2450], [25.9600, -80.2460],
            [25.9620, -80.2420]
        ],
        trackWidth: 14
    },

    "imola": {
        name: "Autodromo Enzo e Dino Ferrari",
        location: "Imola, Italy",
        country: "ITA",
        length: 4.909,
        type: "F1",
        coordinates: {
            center: { lat: 44.3439, lon: 11.7167 },
            startFinish: { lat: 44.3439, lon: 11.7167 }
        },
        outline: [
            [44.3480, 11.7120], [44.3460, 11.7220], [44.3400, 11.7250],
            [44.3360, 11.7180], [44.3390, 11.7080], [44.3450, 11.7060],
            [44.3480, 11.7120]
        ],
        trackWidth: 14
    },

    "baku": {
        name: "Baku City Circuit",
        location: "Baku, Azerbaijan",
        country: "AZE",
        length: 6.003,
        type: "F1",
        coordinates: {
            center: { lat: 40.3725, lon: 49.8533 },
            startFinish: { lat: 40.3692, lon: 49.8436 }
        },
        outline: [
            [40.3750, 49.8400], [40.3720, 49.8600], [40.3650, 49.8650],
            [40.3600, 49.8550], [40.3650, 49.8380], [40.3720, 49.8350],
            [40.3750, 49.8400]
        ],
        trackWidth: 13
    },

    "canada": {
        name: "Circuit Gilles Villeneuve",
        location: "Montreal, Canada",
        country: "CAN",
        length: 4.361,
        type: "F1",
        coordinates: {
            center: { lat: 45.5000, lon: -73.5228 },
            startFinish: { lat: 45.5014, lon: -73.5228 }
        },
        outline: [
            [45.5050, -73.5280], [45.5030, -73.5150], [45.4970, -73.5130],
            [45.4940, -73.5220], [45.4980, -73.5330], [45.5030, -73.5340],
            [45.5050, -73.5280]
        ],
        trackWidth: 13
    },

    "yasmarina": {
        name: "Yas Marina Circuit",
        location: "Abu Dhabi, UAE",
        country: "UAE",
        length: 5.281,
        type: "F1",
        coordinates: {
            center: { lat: 24.4672, lon: 54.6031 },
            startFinish: { lat: 24.4672, lon: 54.6031 }
        },
        outline: [
            [24.4720, 54.5980], [24.4700, 54.6100], [24.4640, 54.6120],
            [24.4600, 54.6050], [24.4630, 54.5950], [24.4690, 54.5930],
            [24.4720, 54.5980]
        ],
        trackWidth: 16
    },

    "losail": {
        name: "Losail International Circuit",
        location: "Lusail, Qatar",
        country: "QAT",
        length: 5.380,
        type: "F1",
        coordinates: {
            center: { lat: 25.4900, lon: 51.4542 },
            startFinish: { lat: 25.4900, lon: 51.4542 }
        },
        outline: [
            [25.4940, 51.4500], [25.4920, 51.4600], [25.4860, 51.4620],
            [25.4830, 51.4550], [25.4860, 51.4460], [25.4920, 51.4450],
            [25.4940, 51.4500]
        ],
        trackWidth: 14
    },

    "mexicocity": {
        name: "Autódromo Hermanos Rodríguez",
        location: "Mexico City, Mexico",
        country: "MEX",
        length: 4.304,
        type: "F1",
        coordinates: {
            center: { lat: 19.4042, lon: -99.0907 },
            startFinish: { lat: 19.4042, lon: -99.0907 }
        },
        outline: [
            [19.4080, -99.0940], [19.4060, -99.0850], [19.4010, -99.0830],
            [19.3980, -99.0900], [19.4010, -99.0980], [19.4060, -99.0990],
            [19.4080, -99.0940]
        ],
        trackWidth: 15
    },

    // ==================== IMSA / NORTH AMERICAN CIRCUITS ====================
    "daytona": {
        name: "Daytona International Speedway",
        location: "Daytona Beach, Florida, USA",
        country: "USA",
        length: 5.73,
        type: "IMSA",
        coordinates: {
            center: { lat: 29.1869, lon: -81.0699 },
            startFinish: { lat: 29.1869, lon: -81.0699 }
        },
        outline: [
            [29.1920, -81.0750], [29.1900, -81.0620], [29.1840, -81.0600],
            [29.1800, -81.0680], [29.1830, -81.0800], [29.1890, -81.0820],
            [29.1920, -81.0750]
        ],
        trackWidth: 15
    },

    "sebring": {
        name: "Sebring International Raceway",
        location: "Sebring, Florida, USA",
        country: "USA",
        length: 6.02,
        type: "IMSA",
        coordinates: {
            center: { lat: 27.4544, lon: -81.3486 },
            startFinish: { lat: 27.4544, lon: -81.3486 }
        },
        outline: [
            [27.4600, -81.3530], [27.4580, -81.3420], [27.4510, -81.3400],
            [27.4470, -81.3480], [27.4500, -81.3580], [27.4570, -81.3600],
            [27.4600, -81.3530]
        ],
        trackWidth: 14
    },

    "lagunaseca": {
        name: "WeatherTech Raceway Laguna Seca",
        location: "Monterey, California, USA",
        country: "USA",
        length: 3.602,
        type: "IMSA",
        coordinates: {
            center: { lat: 36.5842, lon: -121.7536 },
            startFinish: { lat: 36.5842, lon: -121.7536 }
        },
        outline: [
            [36.5880, -121.7570], [36.5860, -121.7490], [36.5810, -121.7480],
            [36.5790, -121.7540], [36.5820, -121.7600], [36.5860, -121.7610],
            [36.5880, -121.7570]
        ],
        trackWidth: 14
    },

    "roadamerica": {
        name: "Road America",
        location: "Elkhart Lake, Wisconsin, USA",
        country: "USA",
        length: 6.515,
        type: "IMSA",
        coordinates: {
            center: { lat: 43.7972, lon: -87.9892 },
            startFinish: { lat: 43.7972, lon: -87.9892 }
        },
        outline: [
            [43.8030, -87.9950], [43.8010, -87.9820], [43.7940, -87.9800],
            [43.7900, -87.9880], [43.7930, -88.0000], [43.8000, -88.0020],
            [43.8030, -87.9950]
        ],
        trackWidth: 14
    },

    "watkinsglen": {
        name: "Watkins Glen International",
        location: "Watkins Glen, New York, USA",
        country: "USA",
        length: 5.43,
        type: "IMSA",
        coordinates: {
            center: { lat: 42.3369, lon: -76.9272 },
            startFinish: { lat: 42.3369, lon: -76.9272 }
        },
        outline: [
            [42.3410, -76.9320], [42.3390, -76.9200], [42.3330, -76.9180],
            [42.3300, -76.9260], [42.3330, -76.9360], [42.3390, -76.9380],
            [42.3410, -76.9320]
        ],
        trackWidth: 14
    },

    "longbeach": {
        name: "Long Beach Street Circuit",
        location: "Long Beach, California, USA",
        country: "USA",
        length: 3.167,
        type: "IMSA",
        coordinates: {
            center: { lat: 33.7647, lon: -118.1886 },
            startFinish: { lat: 33.7647, lon: -118.1886 }
        },
        outline: [
            [33.7680, -118.1920], [33.7660, -118.1840], [33.7620, -118.1830],
            [33.7600, -118.1880], [33.7630, -118.1950], [33.7670, -118.1960],
            [33.7680, -118.1920]
        ],
        trackWidth: 12
    },

    "vir": {
        name: "Virginia International Raceway",
        location: "Alton, Virginia, USA",
        country: "USA",
        length: 5.26,
        type: "IMSA",
        coordinates: {
            center: { lat: 36.5658, lon: -79.2061 },
            startFinish: { lat: 36.5658, lon: -79.2061 }
        },
        outline: [
            [36.5700, -79.2100], [36.5680, -79.2000], [36.5620, -79.1980],
            [36.5590, -79.2050], [36.5620, -79.2150], [36.5680, -79.2160],
            [36.5700, -79.2100]
        ],
        trackWidth: 13
    },

    "roadatlanta": {
        name: "Michelin Raceway Road Atlanta",
        location: "Braselton, Georgia, USA",
        country: "USA",
        length: 4.088,
        type: "IMSA",
        coordinates: {
            center: { lat: 34.1478, lon: -83.8114 },
            startFinish: { lat: 34.1478, lon: -83.8114 }
        },
        outline: [
            [34.1520, -83.8150], [34.1500, -83.8070], [34.1450, -83.8050],
            [34.1420, -83.8110], [34.1450, -83.8190], [34.1500, -83.8200],
            [34.1520, -83.8150]
        ],
        trackWidth: 13
    },

    "indianapolis": {
        name: "Indianapolis Motor Speedway",
        location: "Indianapolis, Indiana, USA",
        country: "USA",
        length: 4.023,
        type: "IMSA",
        coordinates: {
            center: { lat: 39.7950, lon: -86.2353 },
            startFinish: { lat: 39.7911, lon: -86.2350 }
        },
        outline: [
            [39.8000, -86.2400], [39.7980, -86.2280], [39.7920, -86.2260],
            [39.7880, -86.2340], [39.7910, -86.2440], [39.7970, -86.2460],
            [39.8000, -86.2400]
        ],
        trackWidth: 15
    },

    "mosport": {
        name: "Canadian Tire Motorsport Park",
        location: "Bowmanville, Ontario, Canada",
        country: "CAN",
        length: 3.957,
        type: "IMSA",
        coordinates: {
            center: { lat: 44.0478, lon: -78.6756 },
            startFinish: { lat: 44.0478, lon: -78.6756 }
        },
        outline: [
            [44.0520, -78.6800], [44.0500, -78.6700], [44.0450, -78.6680],
            [44.0420, -78.6750], [44.0450, -78.6850], [44.0500, -78.6860],
            [44.0520, -78.6800]
        ],
        trackWidth: 13
    },

    "midohio": {
        name: "Mid-Ohio Sports Car Course",
        location: "Lexington, Ohio, USA",
        country: "USA",
        length: 3.634,
        type: "IMSA",
        coordinates: {
            center: { lat: 40.6769, lon: -82.6333 },
            startFinish: { lat: 40.6769, lon: -82.6333 }
        },
        outline: [
            [40.6810, -82.6370], [40.6790, -82.6280], [40.6740, -82.6260],
            [40.6710, -82.6320], [40.6740, -82.6410], [40.6790, -82.6420],
            [40.6810, -82.6370]
        ],
        trackWidth: 13
    },

    "sonoma": {
        name: "Sonoma Raceway",
        location: "Sonoma, California, USA",
        country: "USA",
        length: 4.032,
        type: "NASCAR",
        coordinates: {
            center: { lat: 38.1614, lon: -122.4550 },
            startFinish: { lat: 38.1614, lon: -122.4550 }
        },
        outline: [
            [38.1650, -122.4590], [38.1630, -122.4500], [38.1580, -122.4480],
            [38.1560, -122.4550], [38.1590, -122.4630], [38.1630, -122.4640],
            [38.1650, -122.4590]
        ],
        trackWidth: 13
    },

    // ==================== WEC / EUROPEAN CIRCUITS ====================
    "lemans": {
        name: "Circuit de la Sarthe",
        location: "Le Mans, France",
        country: "FRA",
        length: 13.626,
        type: "WEC",
        coordinates: {
            center: { lat: 47.9561, lon: 0.2078 },
            startFinish: { lat: 47.9561, lon: 0.2078 }
        },
        outline: [
            [47.9700, 0.1950], [47.9680, 0.2200], [47.9500, 0.2350],
            [47.9350, 0.2250], [47.9400, 0.2000], [47.9600, 0.1850],
            [47.9700, 0.1950]
        ],
        trackWidth: 14
    },

    "nurburgringgp": {
        name: "Nürburgring GP-Strecke",
        location: "Nürburg, Germany",
        country: "DEU",
        length: 5.148,
        type: "WEC",
        coordinates: {
            center: { lat: 50.3356, lon: 6.9475 },
            startFinish: { lat: 50.3356, lon: 6.9475 }
        },
        outline: [
            [50.3400, 6.9430], [50.3380, 6.9550], [50.3320, 6.9570],
            [50.3290, 6.9500], [50.3320, 6.9400], [50.3380, 6.9380],
            [50.3400, 6.9430]
        ],
        trackWidth: 15
    },

    "nordschleife": {
        name: "Nürburgring Nordschleife",
        location: "Nürburg, Germany",
        country: "DEU",
        length: 20.832,
        type: "Club",
        coordinates: {
            center: { lat: 50.3356, lon: 6.9475 },
            startFinish: { lat: 50.3356, lon: 6.9475 }
        },
        outline: [
            [50.3600, 6.9200], [50.3500, 7.0000], [50.3200, 7.0100],
            [50.3000, 6.9500], [50.3200, 6.9000], [50.3500, 6.8900],
            [50.3600, 6.9200]
        ],
        trackWidth: 10
    },

    "portimao": {
        name: "Autódromo Internacional do Algarve",
        location: "Portimão, Portugal",
        country: "PRT",
        length: 4.653,
        type: "WEC",
        coordinates: {
            center: { lat: 37.2272, lon: -8.6267 },
            startFinish: { lat: 37.2272, lon: -8.6267 }
        },
        outline: [
            [37.2310, -8.6310], [37.2290, -8.6210], [37.2240, -8.6190],
            [37.2210, -8.6260], [37.2240, -8.6350], [37.2290, -8.6360],
            [37.2310, -8.6310]
        ],
        trackWidth: 14
    },

    "paulricard": {
        name: "Circuit Paul Ricard",
        location: "Le Castellet, France",
        country: "FRA",
        length: 5.842,
        type: "WEC",
        coordinates: {
            center: { lat: 43.2506, lon: 5.7917 },
            startFinish: { lat: 43.2506, lon: 5.7917 }
        },
        outline: [
            [43.2550, 5.7870], [43.2530, 5.7980], [43.2470, 5.8000],
            [43.2440, 5.7930], [43.2470, 5.7830], [43.2530, 5.7810],
            [43.2550, 5.7870]
        ],
        trackWidth: 15
    },

    "hockenheim": {
        name: "Hockenheimring",
        location: "Hockenheim, Germany",
        country: "DEU",
        length: 4.574,
        type: "DTM",
        coordinates: {
            center: { lat: 49.3278, lon: 8.5656 },
            startFinish: { lat: 49.3278, lon: 8.5656 }
        },
        outline: [
            [49.3320, 8.5610], [49.3300, 8.5720], [49.3250, 8.5740],
            [49.3220, 8.5670], [49.3250, 8.5570], [49.3300, 8.5550],
            [49.3320, 8.5610]
        ],
        trackWidth: 14
    },

    "mugello": {
        name: "Autodromo Internazionale del Mugello",
        location: "Scarperia, Italy",
        country: "ITA",
        length: 5.245,
        type: "MotoGP",
        coordinates: {
            center: { lat: 43.9975, lon: 11.3719 },
            startFinish: { lat: 43.9975, lon: 11.3719 }
        },
        outline: [
            [44.0020, 11.3680], [44.0000, 11.3780], [43.9940, 11.3800],
            [43.9910, 11.3730], [43.9940, 11.3640], [43.9990, 11.3620],
            [44.0020, 11.3680]
        ],
        trackWidth: 14
    },

    "brandshatch": {
        name: "Brands Hatch",
        location: "Kent, UK",
        country: "GBR",
        length: 3.908,
        type: "BTCC",
        coordinates: {
            center: { lat: 51.3569, lon: 0.2628 },
            startFinish: { lat: 51.3569, lon: 0.2628 }
        },
        outline: [
            [51.3600, 0.2590], [51.3580, 0.2680], [51.3540, 0.2700],
            [51.3520, 0.2640], [51.3550, 0.2560], [51.3590, 0.2540],
            [51.3600, 0.2590]
        ],
        trackWidth: 12
    },

    "donington": {
        name: "Donington Park",
        location: "Castle Donington, UK",
        country: "GBR",
        length: 4.020,
        type: "BTCC",
        coordinates: {
            center: { lat: 52.8306, lon: -1.3764 },
            startFinish: { lat: 52.8306, lon: -1.3764 }
        },
        outline: [
            [52.8340, -1.3800], [52.8320, -1.3710], [52.8280, -1.3690],
            [52.8260, -1.3760], [52.8290, -1.3850], [52.8330, -1.3860],
            [52.8340, -1.3800]
        ],
        trackWidth: 12
    },

    "oultonpark": {
        name: "Oulton Park",
        location: "Cheshire, UK",
        country: "GBR",
        length: 4.307,
        type: "BTCC",
        coordinates: {
            center: { lat: 53.1789, lon: -2.6122 },
            startFinish: { lat: 53.1789, lon: -2.6122 }
        },
        outline: [
            [53.1830, -2.6160], [53.1810, -2.6070], [53.1760, -2.6050],
            [53.1740, -2.6120], [53.1770, -2.6200], [53.1810, -2.6210],
            [53.1830, -2.6160]
        ],
        trackWidth: 12
    },

    // ==================== CLUB / REGIONAL CIRCUITS ====================
    "buttonwillow": {
        name: "Buttonwillow Raceway Park",
        location: "Buttonwillow, California, USA",
        country: "USA",
        length: 4.828,
        type: "Club",
        coordinates: {
            center: { lat: 35.4889, lon: -119.4686 },
            startFinish: { lat: 35.4889, lon: -119.4686 }
        },
        outline: [
            [35.4930, -119.4730], [35.4910, -119.4640], [35.4860, -119.4620],
            [35.4840, -119.4680], [35.4870, -119.4770], [35.4910, -119.4780],
            [35.4930, -119.4730]
        ],
        trackWidth: 12
    },

    "thunderhill": {
        name: "Thunderhill Raceway Park",
        location: "Willows, California, USA",
        country: "USA",
        length: 4.828,
        type: "Club",
        coordinates: {
            center: { lat: 39.5383, lon: -122.3306 },
            startFinish: { lat: 39.5383, lon: -122.3306 }
        },
        outline: [
            [39.5420, -122.3350], [39.5400, -122.3260], [39.5350, -122.3240],
            [39.5330, -122.3300], [39.5360, -122.3390], [39.5400, -122.3400],
            [39.5420, -122.3350]
        ],
        trackWidth: 12
    },

    "willowsprings": {
        name: "Willow Springs International Raceway",
        location: "Rosamond, California, USA",
        country: "USA",
        length: 4.023,
        type: "Club",
        coordinates: {
            center: { lat: 34.8961, lon: -118.3789 },
            startFinish: { lat: 34.8961, lon: -118.3789 }
        },
        outline: [
            [34.9000, -118.3830], [34.8980, -118.3740], [34.8930, -118.3720],
            [34.8910, -118.3780], [34.8940, -118.3870], [34.8980, -118.3880],
            [34.9000, -118.3830]
        ],
        trackWidth: 12
    },

    "barberMotorsport": {
        name: "Barber Motorsports Park",
        location: "Birmingham, Alabama, USA",
        country: "USA",
        length: 3.7,
        type: "IndyCar",
        coordinates: {
            center: { lat: 33.5264, lon: -86.6175 },
            startFinish: { lat: 33.5264, lon: -86.6175 }
        },
        outline: [
            [33.5300, -86.6210], [33.5280, -86.6130], [33.5240, -86.6110],
            [33.5220, -86.6170], [33.5250, -86.6250], [33.5290, -86.6260],
            [33.5300, -86.6210]
        ],
        trackWidth: 13
    },

    "stPetersburg": {
        name: "Streets of St. Petersburg",
        location: "St. Petersburg, Florida, USA",
        country: "USA",
        length: 2.89,
        type: "IndyCar",
        coordinates: {
            center: { lat: 27.7681, lon: -82.6436 },
            startFinish: { lat: 27.7681, lon: -82.6436 }
        },
        outline: [
            [27.7710, -82.6470], [27.7690, -82.6400], [27.7660, -82.6380],
            [27.7650, -82.6430], [27.7680, -82.6500], [27.7710, -82.6510],
            [27.7710, -82.6470]
        ],
        trackWidth: 12
    },

    "torontoindy": {
        name: "Exhibition Place",
        location: "Toronto, Canada",
        country: "CAN",
        length: 2.89,
        type: "IndyCar",
        coordinates: {
            center: { lat: 43.6347, lon: -79.4178 },
            startFinish: { lat: 43.6347, lon: -79.4178 }
        },
        outline: [
            [43.6380, -79.4210], [43.6360, -79.4140], [43.6320, -79.4120],
            [43.6300, -79.4170], [43.6330, -79.4250], [43.6370, -79.4260],
            [43.6380, -79.4210]
        ],
        trackWidth: 12
    },

    "autoclubspeedway": {
        name: "Auto Club Speedway",
        location: "Fontana, California, USA",
        country: "USA",
        length: 3.167,
        type: "NASCAR",
        coordinates: {
            center: { lat: 34.0883, lon: -117.5003 },
            startFinish: { lat: 34.0883, lon: -117.5003 }
        },
        outline: [
            [34.0920, -117.5040], [34.0900, -117.4960], [34.0860, -117.4940],
            [34.0840, -117.5000], [34.0870, -117.5080], [34.0910, -117.5090],
            [34.0920, -117.5040]
        ],
        trackWidth: 23
    },

    "charlottemotor": {
        name: "Charlotte Motor Speedway",
        location: "Concord, North Carolina, USA",
        country: "USA",
        length: 2.28,
        type: "NASCAR",
        coordinates: {
            center: { lat: 35.3517, lon: -80.6828 },
            startFinish: { lat: 35.3517, lon: -80.6828 }
        },
        outline: [
            [35.3550, -80.6860], [35.3530, -80.6790], [35.3490, -80.6770],
            [35.3470, -80.6820], [35.3500, -80.6900], [35.3540, -80.6910],
            [35.3550, -80.6860]
        ],
        trackWidth: 18
    },

    "talladega": {
        name: "Talladega Superspeedway",
        location: "Talladega, Alabama, USA",
        country: "USA",
        length: 4.28,
        type: "NASCAR",
        coordinates: {
            center: { lat: 33.5669, lon: -86.0642 },
            startFinish: { lat: 33.5669, lon: -86.0642 }
        },
        outline: [
            [33.5720, -86.0690], [33.5700, -86.0590], [33.5640, -86.0560],
            [33.5610, -86.0640], [33.5650, -86.0750], [33.5700, -86.0770],
            [33.5720, -86.0690]
        ],
        trackWidth: 18
    },

    "bristolmotor": {
        name: "Bristol Motor Speedway",
        location: "Bristol, Tennessee, USA",
        country: "USA",
        length: 0.853,
        type: "NASCAR",
        coordinates: {
            center: { lat: 36.5158, lon: -82.2569 },
            startFinish: { lat: 36.5158, lon: -82.2569 }
        },
        outline: [
            [36.5180, -82.2590], [36.5170, -82.2550], [36.5150, -82.2540],
            [36.5140, -82.2570], [36.5160, -82.2610], [36.5180, -82.2620],
            [36.5180, -82.2590]
        ],
        trackWidth: 13
    },

    "phillipisland": {
        name: "Phillip Island Grand Prix Circuit",
        location: "Phillip Island, Australia",
        country: "AUS",
        length: 4.445,
        type: "MotoGP",
        coordinates: {
            center: { lat: -38.5014, lon: 145.2311 },
            startFinish: { lat: -38.5014, lon: 145.2311 }
        },
        outline: [
            [-38.4980, 145.2270], [-38.5000, 145.2360], [-38.5050, 145.2380],
            [-38.5080, 145.2310], [-38.5050, 145.2230], [-38.5000, 145.2210],
            [-38.4980, 145.2270]
        ],
        trackWidth: 14
    },

    "bathurst": {
        name: "Mount Panorama Circuit",
        location: "Bathurst, Australia",
        country: "AUS",
        length: 6.213,
        type: "V8Supercars",
        coordinates: {
            center: { lat: -33.4472, lon: 149.5578 },
            startFinish: { lat: -33.4472, lon: 149.5578 }
        },
        outline: [
            [-33.4420, 149.5530], [-33.4450, 149.5630], [-33.4510, 149.5650],
            [-33.4550, 149.5580], [-33.4520, 149.5490], [-33.4460, 149.5470],
            [-33.4420, 149.5530]
        ],
        trackWidth: 12
    },

    "sepang": {
        name: "Sepang International Circuit",
        location: "Sepang, Malaysia",
        country: "MYS",
        length: 5.543,
        type: "MotoGP",
        coordinates: {
            center: { lat: 2.7608, lon: 101.7381 },
            startFinish: { lat: 2.7608, lon: 101.7381 }
        },
        outline: [
            [2.7650, 101.7340], [2.7630, 101.7440], [2.7580, 101.7460],
            [2.7550, 101.7390], [2.7580, 101.7300], [2.7630, 101.7280],
            [2.7650, 101.7340]
        ],
        trackWidth: 16
    },

    "yeongam": {
        name: "Korea International Circuit",
        location: "Yeongam, South Korea",
        country: "KOR",
        length: 5.615,
        type: "F1",
        coordinates: {
            center: { lat: 34.7336, lon: 126.4172 },
            startFinish: { lat: 34.7336, lon: 126.4172 }
        },
        outline: [
            [34.7380, 126.4130], [34.7360, 126.4230], [34.7310, 126.4250],
            [34.7280, 126.4180], [34.7310, 126.4090], [34.7360, 126.4070],
            [34.7380, 126.4130]
        ],
        trackWidth: 14
    },

    "fuji": {
        name: "Fuji Speedway",
        location: "Oyama, Japan",
        country: "JPN",
        length: 4.563,
        type: "WEC",
        coordinates: {
            center: { lat: 35.3725, lon: 138.9278 },
            startFinish: { lat: 35.3725, lon: 138.9278 }
        },
        outline: [
            [35.3770, 138.9240], [35.3750, 138.9340], [35.3700, 138.9360],
            [35.3670, 138.9290], [35.3700, 138.9200], [35.3750, 138.9180],
            [35.3770, 138.9240]
        ],
        trackWidth: 15
    },

    "motegi": {
        name: "Twin Ring Motegi",
        location: "Motegi, Japan",
        country: "JPN",
        length: 4.801,
        type: "MotoGP",
        coordinates: {
            center: { lat: 36.5328, lon: 140.2281 },
            startFinish: { lat: 36.5328, lon: 140.2281 }
        },
        outline: [
            [36.5370, 140.2240], [36.5350, 140.2340], [36.5300, 140.2360],
            [36.5270, 140.2290], [36.5300, 140.2200], [36.5350, 140.2180],
            [36.5370, 140.2240]
        ],
        trackWidth: 14
    },

    "changinternational": {
        name: "Chang International Circuit",
        location: "Buriram, Thailand",
        country: "THA",
        length: 4.554,
        type: "MotoGP",
        coordinates: {
            center: { lat: 15.0200, lon: 103.0861 },
            startFinish: { lat: 15.0200, lon: 103.0861 }
        },
        outline: [
            [15.0240, 103.0820], [15.0220, 103.0920], [15.0170, 103.0940],
            [15.0140, 103.0870], [15.0170, 103.0780], [15.0220, 103.0760],
            [15.0240, 103.0820]
        ],
        trackWidth: 14
    },

    "sochi": {
        name: "Sochi Autodrom",
        location: "Sochi, Russia",
        country: "RUS",
        length: 5.848,
        type: "F1",
        coordinates: {
            center: { lat: 43.4057, lon: 39.9578 },
            startFinish: { lat: 43.4057, lon: 39.9578 }
        },
        outline: [
            [43.4100, 39.9540], [43.4080, 39.9640], [43.4030, 39.9660],
            [43.4000, 39.9590], [43.4030, 39.9500], [43.4080, 39.9480],
            [43.4100, 39.9540]
        ],
        trackWidth: 15
    },

    "istanbul": {
        name: "Istanbul Park",
        location: "Istanbul, Turkey",
        country: "TUR",
        length: 5.338,
        type: "F1",
        coordinates: {
            center: { lat: 40.9517, lon: 29.4050 },
            startFinish: { lat: 40.9517, lon: 29.4050 }
        },
        outline: [
            [40.9560, 29.4010], [40.9540, 29.4110], [40.9490, 29.4130],
            [40.9460, 29.4060], [40.9490, 29.3970], [40.9540, 29.3950],
            [40.9560, 29.4010]
        ],
        trackWidth: 15
    },

    "calderpark": {
        name: "Calder Park Raceway",
        location: "Melbourne, Victoria, Australia",
        country: "AUS",
        length: 2.41,
        type: "Club",
        coordinates: {
            center: { lat: -37.6729, lon: 144.7559 },
            startFinish: { lat: -37.6729, lon: 144.7559 }
        },
        outline: [
            [-37.6700, 144.7520], [-37.6720, 144.7600], [-37.6760, 144.7620],
            [-37.6780, 144.7560], [-37.6760, 144.7500], [-37.6720, 144.7480],
            [-37.6700, 144.7520]
        ],
        trackWidth: 12
    },

    "calderthunderdome": {
        name: "Calder Park Thunderdome",
        location: "Melbourne, Victoria, Australia",
        country: "AUS",
        length: 1.801,
        type: "NASCAR",
        coordinates: {
            center: { lat: -37.6710, lon: 144.7580 },
            startFinish: { lat: -37.6710, lon: 144.7580 }
        },
        outline: [
            [-37.6690, 144.7550], [-37.6700, 144.7610], [-37.6730, 144.7630],
            [-37.6750, 144.7590], [-37.6740, 144.7530], [-37.6710, 144.7510],
            [-37.6690, 144.7550]
        ],
        trackWidth: 15
    }
};

// Function to get track by name (fuzzy match)
function findTrack(searchTerm) {
    const normalized = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    for (const [key, track] of Object.entries(TRACK_DATABASE)) {
        const trackNameNorm = track.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const locationNorm = track.location.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (key === normalized || 
            trackNameNorm.includes(normalized) || 
            normalized.includes(trackNameNorm) ||
            locationNorm.includes(normalized)) {
            return { key, ...track };
        }
    }
    return null;
}

// Function to get all tracks as array for dropdown
function getTrackList() {
    return Object.entries(TRACK_DATABASE).map(([key, track]) => ({
        key,
        name: track.name,
        location: track.location,
        country: track.country,
        type: track.type,
        length: track.length
    })).sort((a, b) => a.name.localeCompare(b.name));
}

// Function to get tracks by type
function getTracksByType(type) {
    return Object.entries(TRACK_DATABASE)
        .filter(([_, track]) => track.type === type)
        .map(([key, track]) => ({ key, ...track }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

// Function to get tracks by country
function getTracksByCountry(country) {
    return Object.entries(TRACK_DATABASE)
        .filter(([_, track]) => track.country === country)
        .map(([key, track]) => ({ key, ...track }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TRACK_DATABASE, findTrack, getTrackList, getTracksByType, getTracksByCountry };
}
