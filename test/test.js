import { assert } from "chai";
import { suite, test } from "mocha";

import { parse } from "csv-parse/sync";
import { PlotCoordinator } from "../js/plotCoordinator.js";

import { fileURLToPath } from "url";
import { dirname } from "path";
import * as fs from "fs";
import * as path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseCSVToObject(filePath) {
    const fileData = fs.readFileSync(filePath, "utf8");
    return parse(fileData, {
        columns: true,
        trim: true,
    });
}

suite("PlotCoordinator", function () {
    const csvFilePath = path.join(
        __dirname,
        "./test_data/athlete_events_small.csv"
    );
    const data = parseCSVToObject(csvFilePath);

    // let pcLog = new PlotCoordinator();
    // pcLog.init(data);
    // console.log("\n -------------------------------------------- \n _entries: ");
    // console.log(pcLog._entries);
    // console.log("\n -------------------------------------------- \n _fields:");
    // console.log(pcLog._fields);
    // console.log("\n -------------------------------------------- \n _entriesSelectCounter:")
    // console.log(pcLog._entriesSelectCounter);

    test("addPlots", function () {
        let pc = new PlotCoordinator();
        pc.init(data);
        let fields = pc.fields();
        let field1 = pc.fieldEntries(fields[0]);
        let field2 = pc.fieldEntries(fields[1]);
        let field3 = pc.fieldEntries(fields[2]);

        let id1 = pc.newPlotId();
        let id2 = pc.newPlotId();

        pc.addPlot()

        assert.equal(1, 1);
    });
});
