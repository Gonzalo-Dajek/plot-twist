import { assert } from "chai";
import { suite, test } from "mocha";

import { parse } from "csv-parse/sync";
import { PlotCoordinator } from "../js/plotCoordinator.js";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
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
        let id1 = pc.newPlotId();
        let id2 = pc.newPlotId();

        function logUpdate(changes, fullColorList){
            console.log("Changes: \n");
            console.log(changes);
            console.log("fullColorList: \n");
            console.log(fullColorList);
        }
        pc.addPlot(id1, logUpdate);
        pc.addPlot(id2, logUpdate)

        console.log("id1: " + id1 + "\n_plot[id1]:");
        console.log(pc._plots[id1]);

        console.log("id2: " + id2 + "\n_plot[id2]:");
        console.log(pc._plots[id2]);

        pc.updatePlotsView(id1, [0]);
        assert.equal(1,1);
    });
});
