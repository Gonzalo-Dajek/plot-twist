import * as d3 from "d3";
import { createScatterPlot } from "./plots/scatterPlot.js";
import { createHistogram } from "./plots/histogram.js";
import { createParallelCoordinates } from "./plots/parallelCoordinates.js";
import { createBarPlot } from "./plots/barPlot.js";
import { PlotCoordinator } from "./plotCoordinator.js";

async function loadCSV(pathToCsv) {
    return await d3.csv(pathToCsv, function (data) {
        return data;
    });
}

export async function testPlots() {
    // let data = await loadCSV("../test/test_data/debug_dataset.csv");
    let data = await loadCSV("../local_data/athlete_events_1000.csv");
    let pc = new PlotCoordinator("index");
    pc.init(data);

    let fields = ["Height", "Weight", "Age"];
    for (let [i, f1] of fields.entries()) {
        for (let [j, f2] of fields.entries()) {
            let gridPos = { col: i + 1, row: j + 1 };
            if (f1 === f2) {
                createHistogram(f2, pc.newPlotId(), data, pc, gridPos);
            } else {
                createScatterPlot(f1, f2, pc.newPlotId(), data, pc, gridPos);
            }
        }
    }

    let keys = ["Weight", "Height", "Age", "Year"];
    let keyz = "Weight";
    createParallelCoordinates(keys, keyz, pc.newPlotId(), data, pc, {
        col: 4,
        row: 1,
    });
    createBarPlot("Sex", pc.newPlotId(), data, pc, { col: 4, row: 3 });
}
