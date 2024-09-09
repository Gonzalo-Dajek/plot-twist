import { createScatterPlot } from "./main.js";
import * as d3 from "d3";
import { PlotCoordinator } from "./plotCoordinator.js";

export async function run() {
    async function loadCSV(pathToCsv) {
        return await d3.csv(pathToCsv, function (data) {
            return data;
        });
    }

    let data = await loadCSV("../local_data/athlete_events_10000.csv");
    // console.log(data);

    let results = [];
    for (let entriesNum = 5000; entriesNum <= 100_000; entriesNum += 5000) {
        let sample = data.slice(0, entriesNum);

        for (let plotsNum = 2; plotsNum <= 32; plotsNum += 2) {
            let pc = new PlotCoordinator();
            pc.init(sample);
            for (let i = 0; i < plotsNum; i++) {
                createScatterPlot("Weight", "Height", pc.newPlotId(),data,pc);
            }
            pc._BENCHMARK.isActive = true;
            let selection = [];
            for (let i = 0; i < sample.length / 2; i++) {
                selection.push(i);
            }

            results.push({
                entriesNum: entriesNum,
                plotsNum: plotsNum,
                deltaPlot: pc._BENCHMARK.deltaUpdatePlots,
                deltaIndex: pc._BENCHMARK.deltaUpdateIndexes,
            });

            pc.updatePlotsView(1, selection);
            for (let id = 1; id <= pc._idCounter; id++){
                pc.removePlot(id);
            }

            d3.select("#plotsContainer").selectAll(".plot").remove();
            d3.select("#plotsContainer").selectAll(".plot")
                .on(".zoom", null)    // Clear zoom events if applicable
                .on(".brush", null)   // Clear brush events if applicable
                .on("click", null)    // Clear custom events if applicable
                .remove();            // Remove the elements

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
