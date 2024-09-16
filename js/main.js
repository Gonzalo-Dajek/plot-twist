import { PlotCoordinator } from "./plotCoordinator.js";
import * as d3 from "d3";
import { createScatterPlot } from "./plots/scatterPlot.js";
import { createHistogram } from "./plots/histogram.js";
import { createParallelCoordinates } from "./plots/parallelCoordinates.js";
import { createBarPlot } from "./plots/barPlot.js";
import {
    setUpLoadFile,
    setUpExport,
    setUpLayoutFileLoader,
} from "./setUpUi.js";

import {run} from "./benchMark.js";
run();

// let pc = new PlotCoordinator("index");
// let data = [];
// setUpLoadFile(data,pc);
// setUpExport();
// setUpLayoutFileLoader(data,pc);

// async function loadCSV(pathToCsv) {
//     return await d3.csv(pathToCsv, function (data) {
//         return data;
//     });
// }
//
// // let data = await loadCSV("../test/test_data/debug_dataset.csv");
// let data = await loadCSV("../local_data/athlete_events_1000.csv");
// let pc = new PlotCoordinator("index");
// pc.init(data);
//
//
// let fields = ["Height", "Weight", "Age"];
// for (let [i, f1] of fields.entries()) {
//     for (let [j, f2] of fields.entries()) {
//         let gridPos = { col: i + 1, row: j + 1 };
//         if (f1 === f2) {
//             createHistogram(f2, pc.newPlotId(), data, pc, gridPos);
//         } else {
//             createScatterPlot(f1, f2, pc.newPlotId(), data, pc, gridPos);
//         }
//     }
// }
//
// let keys = ["Weight", "Height", "Age", "Year"];
// let keyz = "Weight";
// createParallelCoordinates(keys, keyz, pc.newPlotId(), data, pc, {col: 4, row: 1});
// createBarPlot("Sex", pc.newPlotId(), data, pc, {col: 4, row: 3});
//
//


// Example usage
// const gridData = getGridElementsInfo();
// const gridDataJson = JSON.stringify(gridData, null, 2); // Pretty-print JSON with 2-space indentation
// console.log(gridDataJson);


