import { createScatterPlot } from "../plots/scatterPlot.js";
import * as d3 from "d3";
import { PlotCoordinator } from "./plotCoordinator.js";

export async function run() {
    async function loadCSV(pathToCsv) {
        return await d3.csv(pathToCsv, function (data) {
            return data;
        });
    }

    let data = await loadCSV("../local_data/athlete_events_20000.csv");
    console.log(data);

    let results = [];
    for (let entriesNum = 1000; entriesNum <= 10_000; entriesNum += 2000) {
        console.log("_etnriesNum: ", entriesNum);
        let sample = data.slice(0, entriesNum);

        for (let plotsNum = 2; plotsNum <= 10; plotsNum += 2) {
            console.log("__plotsNum: ", plotsNum);
            let runs = 5;
            let deltaIndex = 0;
            let deltaPlot = 0;
            for (let run = 0; run < runs; run++) {
                console.log("___run: ", run);
                let pc = new PlotCoordinator("Index");
                pc.init(sample);
                for (let i = 0; i < plotsNum; i++) {
                    createScatterPlot(
                        "Weight",
                        "Height",
                        pc.newPlotId(),
                        data,
                        pc,
                        { col: 1, row: 1 }
                    );
                }
                pc.BENCHMARK.isActive = true;
                let selection = [];
                for (let i = 0; i < sample.length / 2; i++) {
                    selection.push(i);
                }

                d3.select("#plotsContainer").selectAll(".plot").remove();
                d3.select("#plotsContainer")
                    .selectAll(".plot")
                    .on(".zoom", null)
                    .on(".brush", null)
                    .on("click", null)
                    .remove(); // Remove the elements

                pc.updatePlotsView(1, selection);
                for (let id = 1; id <= pc._idCounter; id++) {
                    pc.removePlot(id);
                }
                deltaPlot += pc.BENCHMARK.deltaUpdatePlots;
                deltaIndex += pc.BENCHMARK.deltaUpdateIndexes;
            }
            results.push({
                entriesNum: entriesNum,
                plotsNum: plotsNum,
                deltaPlot: deltaPlot / runs,
                deltaIndex: deltaIndex / runs,
            });
        }
    }
    const json = JSON.stringify(results, null, 2);
    // Create a Blob with the JSON string
    const blob = new Blob([json], { type: "application/json" });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement("a");
    link.href = url;
    link.download = "results.json"; // Filename for the downloaded file

    // Append the link to the body (necessary for Firefox)
    document.body.appendChild(link);

    // Programmatically click the link to trigger the download
    link.click();

    // Clean up by removing the link and revoking the Blob URL
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
