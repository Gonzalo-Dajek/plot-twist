import * as d3 from "d3";
import { createScatterPlot } from "../plots/scatterPlot.js";
import { createHistogram } from "../plots/histogram.js";
import { createParallelCoordinates } from "../plots/parallelCoordinates.js";
import { createBarPlot } from "../plots/barPlot.js";
import { PlotCoordinator } from "./plotCoordinator.js";
import { createEmptyGrid } from "../uiLogic/gridUtils.js";

async function loadCSV(pathToCsv) {
    return await d3.csv(pathToCsv);
}

export async function testPlots(pcRef, data, gridSize) {
    // data = await loadCSV("/plot-twist/test/test_data/debug_dataset.csv");
    data = await loadCSV("/plot-twist/local_data/athlete_events_500.csv");
    // data = await loadCSV("/plot-twist/local_data/datos_muestreo_limpios.csv");
    // data = await loadCSV("/plot-twist/local_data/TP1-Dataset-incendios-incendios-cantidad-causas-provincia.csv");
    data = data.map(row => {
        const modifiedRow = {};

        // Iterate over each key-value pair in the row
        for (let key in row) {
            const modifiedKey = key.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');

            modifiedRow[modifiedKey] = row[key];
        }

        return modifiedRow;
    });

    pcRef.pc = new PlotCoordinator("index");
    pcRef.pc.init(data);
    // let fields = pcRef.pc.fields();
    // gridSize.col = pcRef.pc.fields().length;
    // gridSize.row = pcRef.pc.fields().length;

    // createEmptyGrid("plotsContainer", gridSize, pcRef, data);

    // document.getElementById("col").style.display = "flex";
    // document.getElementById("row").style.display = "flex";

    // for (let [i, f1] of fields.entries()) {
    //     for (let [j, f2] of fields.entries()) {
    //         let gridPos = { col: i + 1, row: j + 1 };
    //         if (f1 === f2) {
    //             createHistogram(f2, pcRef.pc.newPlotId(), data, pcRef.pc, gridPos);
    //         } else {
    //             createScatterPlot(f1, f2, pcRef.pc.newPlotId(), data, pcRef.pc, gridPos);
    //         }
    //     }
    // }

    gridSize.col = 4;
    gridSize.row = 3;
    createEmptyGrid("plotsContainer", gridSize, pcRef, data);
    let keys = ["Weight", "Height", "Age"];
    let keyz = "Weight";
    createParallelCoordinates(keys, keyz, pcRef.pc.newPlotId(), data, pcRef.pc, {
        col: 4,
        row: 1,
    });
    createBarPlot("Sex", pcRef.pc.newPlotId(), data, pcRef.pc, { col: 4, row: 3 });

    createHistogram("Height", pcRef.pc.newPlotId(), data, pcRef.pc, {col: 1, row:1});
    createScatterPlot("Height", "Weight", pcRef.pc.newPlotId(), data, pcRef.pc, {col: 1, row: 2});
    for (let i = 0; i<keys.length; i++) {
        for (let j = 0; j<keys.length; j++) {
            let gridPos = { col: i + 1, row: j + 1 };
            let f1 = keys[i];
            let f2 = keys[j];
            if (f1 === f2) {
                createHistogram(f2, pcRef.pc.newPlotId(), data, pcRef.pc, gridPos);
            } else {
                createScatterPlot(f1, f2, pcRef.pc.newPlotId(), data, pcRef.pc, gridPos);
            }
        }
    }
}
