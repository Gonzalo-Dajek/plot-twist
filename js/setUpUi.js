import { createScatterPlot } from "./plots/scatterPlot.js";
import { createBarPlot } from "./plots/barPlot.js";
import { createHistogram } from "./plots/histogram.js";
import { createParallelCoordinates } from "./plots/parallelCoordinates.js";
import * as d3 from "d3";

function createPlotMenu(plotType, gridCell, plotMenu, addPlotButton, pc, data, gridPos) {
    // Remove the plot type menu
    gridCell.removeChild(plotMenu);

    // Create a new menu for plot options
    const plotOptionsDiv = document.createElement("div");
    plotOptionsDiv.classList.add("plot-options");

    // Create a container for the select fields (scrollable)
    const plotFieldsContainer = document.createElement("div");
    plotFieldsContainer.classList.add("plot-fields-container");

    // Number of selected fields depending on type of plot
    let numSelectFields;
    switch (plotType) {
        case "Scatter Plot":
            numSelectFields = 2;
            break;
        case "Parallel Coordinates":
            numSelectFields = 5;
            break;
        case "Bar Plot":
            numSelectFields = 1;
            break;
        case "Histogram":
            numSelectFields = 1;
            break;
    }
    // Array to store selected values
    const selectedFields = [];
    selectedFields.length = numSelectFields;


    // Add select fields dynamically
    for (let i = 0; i < numSelectFields; i++) {
        let selectField;
        selectField = document.createElement("select");
        selectField.classList.add("plot-select");

        // If it's a Parallel Coordinates plot, add a "None" option
        if (plotType === "Parallel Coordinates" && i >= 2) {
            const noneOption = document.createElement("option");
            noneOption.value = "none";
            noneOption.text = "None";
            selectField.appendChild(noneOption);
        }

        // Add options from the fields array to the select element
        pc.fields().forEach(field => {
            const option = document.createElement("option");
            option.value = field;
            option.text = field;
            selectField.appendChild(option);
        });

        // Add label and select field to the scrollable container
        const label = document.createElement("label");
        label.textContent = `Select field ${i + 1}`;
        label.classList.add("plot-select-label");

        // Add the selected field value to the array when the value changes
        selectedFields[i] = selectField.value;
        selectField.addEventListener("change", () => {
            selectedFields[i] = selectField.value;
        });

        plotFieldsContainer.appendChild(label);
        plotFieldsContainer.appendChild(selectField);
    }

    // Append the fields container to the plot options div
    plotOptionsDiv.appendChild(plotFieldsContainer);

    // Add buttons at the bottom in a separate fixed container
    const plotButtonsContainer = document.createElement("div");
    plotButtonsContainer.classList.add("plot-buttons-container");

    // Create and append the create button
    const createButton = document.createElement("button");
    createButton.textContent = "Create";
    createButton.addEventListener("click", () => {
        switch (plotType) {
            case "Scatter Plot":
                createScatterPlot(
                    selectedFields[0],
                    selectedFields[1],
                    pc.newPlotId(),
                    data,
                    pc,
                    gridPos,
                );
                break;
            case "Parallel Coordinates":
                createParallelCoordinates(
                    selectedFields.filter(e => e !== "none"),
                    selectedFields.filter(e => e !== "none")[0],
                    pc.newPlotId(),
                    data,
                    pc,
                    gridPos,
                );
                break;
            case "Bar Plot":
                createBarPlot(selectedFields[0], pc.newPlotId(), data, pc, gridPos);
                break;
            case "Histogram":
                createHistogram(selectedFields[0], pc.newPlotId(), data, pc, gridPos);
                break;
        }
    });
    createButton.classList.add("plot-button", "create-button");
    plotButtonsContainer.appendChild(createButton);

    // Create and append the cancel button
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Back";
    cancelButton.classList.add("plot-button", "cancel-button");
    cancelButton.addEventListener("click", () => {
        gridCell.removeChild(plotOptionsDiv); // Remove the plot options menu
        createPlotTypeMenu(gridCell, addPlotButton, pc, data, gridPos); // Show plot type menu again
    });
    plotButtonsContainer.appendChild(cancelButton);

    // Append the buttons container to the plot options div
    plotOptionsDiv.appendChild(plotButtonsContainer);

    // Add the plot options div to the grid cell
    gridCell.appendChild(plotOptionsDiv);
}

function createPlotTypeMenu(gridCell, addPlotButton, pc, data, gridPos) {
    // Create a menu for plot type selection
    const plotMenu = document.createElement("div");
    plotMenu.classList.add("plot-menu");

    // Create buttons for different plot types
    const plotTypes = ["Scatter Plot", "Bar Plot", "Parallel Coordinates", "Histogram"];
    plotTypes.forEach(plotType => {
        const plotButton = document.createElement("button");
        plotButton.textContent = plotType;
        plotButton.addEventListener("click", () => {
            createPlotMenu(plotType, gridCell, plotMenu, addPlotButton, pc, data, gridPos); // Proceed to plot-specific menu
        });
        plotMenu.appendChild(plotButton);
    });

    // Create Cancel button for the plot type menu
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Back";
    cancelButton.classList.add("cancel-button"); // Add this class for styling
    cancelButton.addEventListener("click", () => {
        gridCell.removeChild(plotMenu); // Remove plot menu
        addPlotButton.style.display = "flex"; // Show the Add Plot button again
    });
    plotMenu.appendChild(cancelButton);

    // Add the plot menu to the grid cell
    gridCell.appendChild(plotMenu);
}

function createGridItems(containerId, grid, pc, data) {
    const container = document.getElementById(containerId);

    for (let col = 1; col <= grid.col; col++) {
        for (let row = 1; row <= grid.row; row++) {
            // Create a div for the grid cell
            const gridCell = document.createElement("div");
            gridCell.classList.add("grid-cell"); // Add a class for styling if needed
            gridCell.setAttribute("id", `grid-cell-${col}-${row}`);

            // Style the grid cell for specific row and column
            gridCell.style.gridColumn = `${col}`; // Set the column position
            gridCell.style.gridRow = `${row}`; // Set the row position

            // Create a container div for the Add Plot button
            const buttonContainer = document.createElement("div");
            buttonContainer.classList.add("button-container");

            // Create the Add Plot button
            const addPlotButton = document.createElement("button");
            addPlotButton.textContent = "Add Plot";
            addPlotButton.addEventListener("click", () => {
                // Create the plot menu with 4 plot options and a cancel button
                createPlotTypeMenu(gridCell, buttonContainer, pc, data, { col: col, row: row });

                // Hide the Add Plot button
                buttonContainer.style.display = "none";
            });

            // Add the Add Plot button to the button container
            buttonContainer.appendChild(addPlotButton);

            // Append the button container to the grid cell
            gridCell.appendChild(buttonContainer);

            // Append the grid cell div to the container
            container.appendChild(gridCell);
        }
    }
}


export function setUpLoadFile(data, pc) {
    const fileInput = document.getElementById("fileInput");

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = async (event) => {
                const csvData = event.target.result;
                data = await d3.csvParse(csvData);

                // console.log(data);
                pc.init(data);
                createGridItems("plotsContainer", { col: 6, row: 3 }, pc, data); // For example, 18 cells
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
        const col = window.getComputedStyle(element).getPropertyValue("grid-column-start");
        const row = window.getComputedStyle(element).getPropertyValue("grid-row-start");

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
export function setUpExport() {
    document.getElementById("exportLayoutButton").addEventListener("click", exportLayout);
}

// Function to be called with the parsed JSON data
function loadLayout(layoutData, pc) {
    console.log("Loaded layout:", layoutData);
    layoutData.forEach(item => {
        // Split the type string into an array of segments
        const segments = item.type.split("_");

        // Use the first segment in the switch statement
        switch (segments[0]) {
            case "scatterPlot":
                createScatterPlot(
                    segments[2],
                    segments[3],
                    pc.newPlotId(),
                    pc._entries,
                    pc,
                    { col: item.col, row: item.row },
                );
                break;
            case "parallelCoord":
                // console.log("a");  // Action for parallelCoord
                createParallelCoordinates(
                    segments.slice(2),
                    segments[2],
                    pc.newPlotId(),
                    pc._entries,
                    pc,
                    {
                        col: item.col,
                        row: item.row,
                    },
                );
                break;
            case "histogram":
                // console.log("b");  // Action for histogram
                createHistogram(segments[2], pc.newPlotId(), pc._entries, pc, {
                    col: item.col,
                    row: item.row,
                });
                break;
            case "barplot":
                createBarPlot(segments[2], pc.newPlotId(), pc._entries, pc, {
                    col: item.col,
                    row: item.row,
                });
                break;
            // default:
            // console.log("Unknown type");
        }
    });
}

export function setUpLayoutFileLoader(data, pc) {
    const fileInput = document.getElementById("layoutInput");

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    // Parse the JSON data from the file
                    data = JSON.parse(event.target.result);

                    // TODO: clean layout
                    // Call loadLayout with the parsed JSON object
                    loadLayout(data, pc);
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    alert("Invalid JSON file. Please select a valid JSON file.");
                }
            };

            // Read the file as text (JSON)
            reader.readAsText(file);
        } else {
            alert("Please select a JSON file.");
        }
    });
}
