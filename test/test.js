import { assert } from "chai";
import { suite, test } from "mocha";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { PlotCoordinator } from "../js/core/plotCoordinator.js";
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
    const file = "./test_data/debug_dataset.csv";
    const csvFilePath = path.join(__dirname, file);
    // const resultsFilePath = path.join(__dirname, "./output/benchmark.json");
    const data = parseCSVToObject(csvFilePath);
    // let results = [];
    // fs.writeFile(resultsFilePath, JSON.stringify(results, null, 2), () => {});

    test("Debugging", function () {
        let pc = new PlotCoordinator("index");
        pc.init(data);
        let id1 = pc.newPlotId();
        pc.addPlot(id1, () => {});
        pc.addPlot(pc.newPlotId(), () => {});

        let select = [
            {
                range: [50, 60],
                field: "Weight",
                type: "numerical",
            },
            {
                range: [160, 170],
                field: "Height",
                type: "numerical",
            },
        ];

        pc.updatePlotsView(id1, select);

        assert.equal(1, 1);
    });
});
