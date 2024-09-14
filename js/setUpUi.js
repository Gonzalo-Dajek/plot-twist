import { createScatterPlot } from "./plots/scatterPlot.js";
import { createBarPlot } from "./plots/barPlot.js";
import { createHistogram } from "./plots/histogram.js";
import { createParallelCoordinates } from "./plots/parallelCoordinates.js";
import * as d3 from "d3";
import { PlotCoordinator } from "./plotCoordinator.js";

function createGridItems(containerId, grid, fields, pc, data) {
    const container = document.getElementById(containerId);

    // Clear existing content (if needed)
    // container.innerHTML = '';

    for (let col = 1; col <= grid.col; col++) {
        for (let row = 1; row <= grid.row; row++) {
            // Create a div for the grid cell
            const gridCell = document.createElement("div");
            gridCell.classList.add("grid-cell"); // Add a class for styling if needed
            gridCell.setAttribute("id", `grid-cell-${col}-${row}`);

            // Style the grid cell for specific row and column
            gridCell.style.gridColumn = `${col}`; // Set the column position
            gridCell.style.gridRow = `${row}`; // Set the row position

            // Array to store the select elements
            const selects = [];

            // Create 5 selects for fields
            for (let i = 0; i < 4; i++) {
                const select = document.createElement("select");

                fields.forEach((f) => {
                    const option = document.createElement("option");
                    option.value = f;
                    option.textContent = f;
                    select.appendChild(option);
                });

                gridCell.appendChild(select);
                selects.push(select); // Add the select element to the array
            }

            // Create scatter
            const scatterBtn = document.createElement("button");
            scatterBtn.textContent = "Create Scatter";
            scatterBtn.addEventListener("click", () => {
                createScatterPlot(
                    selects[0].value,
                    selects[1].value,
                    pc.newPlotId(),
                    data,
                    pc,
                    { col: col, row: row }
                );
            });

            gridCell.appendChild(scatterBtn);

            // Create barPlot
            const barPlotBtn = document.createElement("button");
            barPlotBtn.textContent = "Create bar plot";
            barPlotBtn.addEventListener("click", () => {
                createBarPlot(selects[0].value, pc.newPlotId(), data, pc, {
                    col: col,
                    row: row,
                });
            });

            gridCell.appendChild(barPlotBtn);

            // Create histogram
            const histogramBtn = document.createElement("button");
            histogramBtn.textContent = "Create histogram";
            histogramBtn.addEventListener("click", () => {
                createHistogram(selects[0].value, pc.newPlotId(), data, pc, {
                    col: col,
                    row: row,
                });
            });

            gridCell.appendChild(histogramBtn);

            // Create parallelCoord
            const parallelCoordBtn = document.createElement("button");
            parallelCoordBtn.textContent = "Create parallel coordinates";
            parallelCoordBtn.addEventListener("click", () => {
                const selectedValues = selects.map((select) => select.value);
                createParallelCoordinates(
                    selectedValues,
                    selectedValues[0],
                    pc.newPlotId(),
                    data,
                    pc,
                    {
                        col: col,
                        row: row,
                    }
                );
            });

            gridCell.appendChild(parallelCoordBtn);

            // Append the grid cell div to the container
            container.appendChild(gridCell);
        }
    }
}

export function setUpLoadFile(){
    const fileInput = document.getElementById("fileInput");

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = async (event) => {
                const csvData = event.target.result;
                const data = await d3.csvParse(csvData);

                // Do something with the parsed data
                console.log(data);
                let pc = new PlotCoordinator("index");
                pc.init(data);
                createGridItems("plotsContainer", { col: 6, row: 3 }, pc.fields(), pc, data); // For example, 18 cells
            };

            reader.readAsText(file);
        } else {
            alert("Please select a CSV file.");
        }
    });
}

function getGridElementsInfo() {
    const container = document.getElementById("plotsContainer");
    const elements = container.children;
    const gridInfoArray = [];

    for (const element of elements) {
        const id = element.id;
        const col = window.getComputedStyle(element).getPropertyValue('grid-column-start');
        const row = window.getComputedStyle(element).getPropertyValue('grid-row-start');

        gridInfoArray.push({ type: id, col: parseInt(col), row: parseInt(row) });
    }

    return gridInfoArray;
}

// Function to export the grid data as JSON
function exportLayout() {
    const gridData = getGridElementsInfo();
    const filteredData = gridData.filter(item => !item.type.startsWith("grid"));
    const jsonString = JSON.stringify(filteredData, null, 2);

    // Create a blob from the JSON string
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger the download
    const a = document.createElement("a");
    a.href = url;
    a.download = "grid_layout.json";  // File name for the downloaded JSON
    a.click();

    // Clean up the object URL to avoid memory leaks
    URL.revokeObjectURL(url);
}

// Attach the export function to the button click event
export function setUpExport(){
    document.getElementById("exportLayoutButton").addEventListener("click", exportLayout);
}
