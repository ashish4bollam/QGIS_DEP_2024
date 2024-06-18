const fs = require('fs');
const csv = require('csv-parser');
const proj4 = require('proj4');
const turf = require('@turf/turf');

const csvFilePath = 'data/Data.csv';
const dataJsonFilePath = 'data/Data_1.js';
const bufferedJsonFilePath = 'data/Buffered_2.js';

// Function to convert coordinates to EPSG:3857
function convertTo3857(longitude, latitude) {
    return proj4(proj4.defs('EPSG:4326'), proj4.defs('EPSG:3857'), [longitude, latitude]);
}

// Function to update JSON data within a new variable declaration
function updateDataJsonFile(jsonData) {
    const jsonString = `var json_Data_1 = ${JSON.stringify(jsonData, null, 4)};`;
    fs.writeFileSync(dataJsonFilePath, jsonString, 'utf8');
    console.log('Data JSON file updated successfully.');
}

// Function to update JSON data within a new variable declaration for buffered data
function updateBufferedJsonFile(bufferedData) {
    const jsonString = `var json_Buffered_2 = ${JSON.stringify(bufferedData, null, 4)};`;
    fs.writeFileSync(bufferedJsonFilePath, jsonString, 'utf8');
    console.log('Buffered JSON file updated successfully.');
}

// Function to update JSON data from CSV
function updateDataJson() {
    let jsonData = {
        type: "FeatureCollection",
        name: "Data_1",
        crs: {
            type: "name",
            properties: {
                name: "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        features: []
    };

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            const [longitude3857, latitude3857] = convertTo3857(parseFloat(row.Longitude), parseFloat(row.Latitude));
            const feature = {
                type: "Feature",
                properties: {
                    Frequency: row.Frequency,
                    Username: row.Username,
                    Radius: row.Radius,
                    Latitude: parseFloat(row.Latitude),
                    Longitude: parseFloat(row.Longitude),
                    "Time Acquired": row["Time Acquired"],
                    "Power Level": row['Power Level']
                },
                geometry: {
                    type: "Point",
                    coordinates: [parseFloat(row.Longitude), parseFloat(row.Latitude)]
                }
            };
            jsonData.features.push(feature);
        })
        .on('end', () => {
            // Update JSON data within the new variable declaration
            updateDataJsonFile(jsonData);
        });
}

// Function to update JSON data from CSV and create buffered polygons
function updateBufferedJson() {
    let bufferedJsonData = {
        type: "FeatureCollection",
        name: "Buffered_2",
        crs: {
            type: "name",
            properties: {
                name: "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        features: []
    };

    const processedPoints = new Set(); // To keep track of processed points

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            // Read CSV data and create properties
            const properties = {
                Frequency: row.Frequency,
                Username: row.Username,
                Radius: row.Radius,
                Latitude: parseFloat(row.Latitude),
                Longitude: parseFloat(row.Longitude),
                "Time Acquired": row["Time Acquired"],
                "Power Level": row['Power Level']
            };

            const pointKey = `${properties.Latitude},${properties.Longitude}`;
            if (processedPoints.has(pointKey)) {
                // Skip processing if this point has already been processed
                return;
            }

            // Create buffered polygon using Turf.js
            const point = turf.point([properties.Longitude, properties.Latitude]);
            const buffered = turf.buffer(point, parseInt(row.Radius), {units: 'meters',steps:100});

            // Create feature and add to features array
            const feature = {
                type: "Feature",
                properties: properties,
                geometry: buffered.geometry
            };
            bufferedJsonData.features.push(feature);

            // Add point to the set of processed points
            processedPoints.add(pointKey);
        })
        .on('end', () => {
            // Update JSON data within the new variable declaration
            updateBufferedJsonFile(bufferedJsonData);
        });
}

// Monitor CSV file for changes and update JSON
fs.watchFile(csvFilePath, (curr, prev) => {
    console.log('CSV file changed. Updating JSON files...');
    updateDataJson();
    updateBufferedJson();
});

// Initial update of JSON files
updateDataJson();
updateBufferedJson();
