import * as d3 from "d3";
import { createScatterPlot } from "./plots/scatterPlot.js";
import { createHistogram } from "./plots/histogram.js";
import { createParallelCoordinates } from "./plots/parallelCoordinates.js";
import { createBarPlot } from "./plots/barPlot.js";
import { createGridItems } from "./setUpUi.js";
import { PlotCoordinator } from "./plotCoordinator.js";

async function loadCSV(pathToCsv) {
    return await d3.csv(pathToCsv, function (data) {
        return data;
    });
}

export async function testPlots(pcRef, data, gridSize) {
    // let data = await loadCSV("../test/test_data/debug_dataset.csv");
    // let data = await loadCSV("../local_data/athlete_events_1000.csv");
    data = await loadCSV("../local_data/datos_muestreo_limpios.csv");
    data = data.map(row => {
        const modifiedRow = {};

        // Iterate over each key-value pair in the row
        for (let key in row) {
            const modifiedKey = key.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');;

            modifiedRow[modifiedKey] = row[key];
        }

        return modifiedRow;
    });

    pcRef.pc = new PlotCoordinator("index");
    pcRef.pc.init(data);
    let fields = pcRef.pc.fields();
    gridSize.col = pcRef.pc.fields().length;
    gridSize.row = pcRef.pc.fields().length;

    createGridItems("plotsContainer", gridSize, pcRef, data);

    document.getElementById("col").style.display = "flex";
    document.getElementById("row").style.display = "flex";

    for (let [i, f1] of fields.entries()) {
        for (let [j, f2] of fields.entries()) {
            let gridPos = { col: i + 1, row: j + 1 };
            if (f1 === f2) {
                createHistogram(f2, pcRef.pc.newPlotId(), data, pcRef.pc, gridPos);
            } else {
                createScatterPlot(f1, f2, pcRef.pc.newPlotId(), data, pcRef.pc, gridPos);
            }
        }
    }

    // let keys = ["Weight", "Height", "Age", "Year"];
    // let keyz = "Weight";
    // createParallelCoordinates(keys, keyz, pc.newPlotId(), data, pc, {
    //     col: 4,
    //     row: 1,
    // });
    // createBarPlot("Sex", pc.newPlotId(), data, pc, { col: 4, row: 3 });
}
