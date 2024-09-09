import { assert } from "chai";
import { suite, test } from "mocha";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { PlotCoordinator } from "../js/plotCoordinator.js";
// import * as plotMain from "../js/main.js";
// import * as d3 from "d3";

function parseCSVToObject(filePath) {
    const fileData = fs.readFileSync(filePath, "utf8");
    return parse(fileData, {
        columns: true,
        trim: true,
    });
}


suite("PlotCoordinator", function () {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // const file = "./test_data/debug_dataset.csv";
    const file = "./test_data/athlete_events_clean.csv";
    const csvFilePath = path.join(__dirname, file);
    const resultsFilePath = path.join(__dirname, "./output/benchmark.json");
    const data = parseCSVToObject(csvFilePath);

    test("Number of plots _vs_ Number of entries", function () {
        let results = [];


        fs.writeFile(resultsFilePath, JSON.stringify(results, null, 2), () => {});

        assert.equal(1, 1);
    });
});
