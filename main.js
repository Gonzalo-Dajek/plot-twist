import { parse } from "csv-parse/browser/esm/sync";

const dataStore = {
    raw_records: [],
};

const tableLookUp = {};

document
    .getElementById("csvFileInput")
    .addEventListener("change", function (event) {
        const file = event.target.files[0]; // Get the selected file
        if (file) {
            // TODO: add multiple csv functionality
            // TODO: Wipe dataStore

            const reader = new FileReader();

            // When the file is loaded, read it as text
            reader.onload = function (e) {
                const csvContent = e.target.result;

                // parse CSV
                dataStore.raw_records = parse(csvContent, {
                    columns: true,
                    skip_empty_lines: true,
                });

                console.log(dataStore.raw_records); // CONSOLE_LOG

                // on success create table look up
                createTableLookUp();
                console.log(tableLookUp);
            };

            // TODO: add ui feedback for error
            reader.onerror = function () {
                // TODO: handle error?
                console.error("Error reading the file");
            };

            // Read the file as text
            reader.readAsText(file);
        }
    });

function createTableLookUp() {
    let n = dataStore.raw_records.length;
    if (n === 0) {
        return;
    }

    for (let row in dataStore.raw_records[0]) {
        tableLookUp[row] = [];

        for (let i = 0; i < n; i++) {
            let record_i = dataStore.raw_records[i];
            tableLookUp[row].push([record_i[row], i]);
        }

        tableLookUp[row].sort();
    }
}
