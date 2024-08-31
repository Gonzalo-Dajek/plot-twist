import { parse } from "csv-parse/browser/esm/sync";
import { PlotCoordinator } from "./js/plotCoordinator.js";
import * as Plotly from "plotly.js-dist";

let pc = new PlotCoordinator();

// HTML
document
    .getElementById("csvFileInput")
    .addEventListener("change", function (event) {
        // Get the selected file
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const csvContent = e.target.result.toString();

                // parse CSV
                let dataSet = parse(csvContent, {
                    columns: true,
                    skip_empty_lines: true,
                });

                console.log("csv dataset parse:");
                console.log(dataSet); // CONSOLE_LOG

                // On success:
                pc.init(dataSet);
                let fields = pc.fields();
                let optionsArr = [];
                for (let key in fields) {
                    optionsArr.push(key);
                }

                initializeDropdown(optionsArr, "dropdown-scatter-x-axis");
                initializeDropdown(optionsArr, "dropdown-scatter-y-axis");
                initializeDropdown(optionsArr, "dropdown-histogram");
                console.log("optionsArr:");
                console.log(optionsArr); // CONSOLE_LOG
            };

            reader.onerror = function () {
                // TODO: add ui feedback for error / handle error
                console.error("Error reading the file");
            };

            // Read the file as text
            reader.readAsText(file);
        }
    });

function initializeDropdown(optionsArray, dropdownId) {
    const dropdown = document.getElementById(dropdownId);

    optionsArray.forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option;
        opt.textContent = option;
        dropdown.appendChild(opt);
    });
}

// SCATTER PLOT
document
    .getElementById("create-scatter-plot-btn")
    .addEventListener("click", () => {
        const selectedX = document.getElementById(
            "dropdown-scatter-x-axis"
        ).value;
        const selectedY = document.getElementById(
            "dropdown-scatter-y-axis"
        ).value;

        createScatterPlot(selectedX, selectedY);

    });

function createScatterPlot(selectedX, selectedY) {
    let id = pc.newPlotId(); // Increment plot count
    let fields = pc.fields();

    // Create a new div for the new plot
    const newPlotDiv = document.createElement("div");
    newPlotDiv.id = `plot${id}`;
    newPlotDiv.style.width = "50%";
    newPlotDiv.style.height = "500px";
    document.getElementById("plotContainer").appendChild(newPlotDiv);

    const trace = {
        x: fields[selectedX].map((e) => e[0]), // X-axis data
        y: fields[selectedY].map((e) => e[0]), // Y-axis data
        mode: "markers", // Scatter plot mode
        type: "scatter", // Plot type
    };

    const layout = {
        title: "Scatter Plot",
        xaxis: { title: selectedX },
        yaxis: { title: selectedY },
    };

    const data = [trace];

    // Render the plot in the newly created div
    Plotly.newPlot(newPlotDiv.id, data, layout);

    let handleSelect = function (eventData) {
        const selectedPointsIndexes = eventData.points.map(
            (p) => p.pointIndex
        );

        console.log("selectedPointsIndexes:");
        console.log(selectedPointsIndexes);
        pc.updatePlotsView(id, selectedPointsIndexes);
    };

    // event listener for brushing
    document
        .getElementById(newPlotDiv.id)
        .on("plotly_selecting", handleSelect);

    // document.getElementById(newPlotDiv.id).on('plotly_selecting', function(eventData) {
    //     const selectedPointIndexes = eventData.points.map(p => p.pointIndex);
    //
    //     // console.log("selectingPointIndexes:");
    //     // console.log(selectedPointIndexes);
    //     updatePlots(selectedPointIndexes);
    // });

    // TODO: add update plot behaviour
    pc.addPlot(id, function comoActualizarPlot(changes, colorList) {
        // let plotData = document.getElementById(newPlotDiv.id).data;
        Plotly.restyle(newPlotDiv.id, "marker.color", [colorList]);
    });

    // document.getElementById(newPlotDiv.id).on("plotly_deselect", function () {
    //     console.log("plotly_deselect");
    // });
}

// HISTOGRAM
document
    .getElementById("create-histogram-plot-btn")
    .addEventListener("click", () => {
        const selectedField =
            document.getElementById("dropdown-histogram").value;

        createHistogram(selectedField);
    });

function createHistogram(selectedField) {}
