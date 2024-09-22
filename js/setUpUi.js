import { createScatterPlot } from "./plots/scatterPlot.js";
import { createBarPlot } from "./plots/barPlot.js";
import { createHistogram } from "./plots/histogram.js";
import { createParallelCoordinates } from "./plots/parallelCoordinates.js";
import * as d3 from "d3";
import { PlotCoordinator } from "./plotCoordinator.js";

function createPlotMenu(
    plotType,
    gridCell,
    plotMenu,
    addPlotButton,
    pcRef,
    data,
    gridPos,
) {
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
        pcRef.pc.fields().forEach((field) => {
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
                    pcRef.pc.newPlotId(),
                    data,
                    pcRef.pc,
                    gridPos,
                );
                break;
            case "Parallel Coordinates":
                createParallelCoordinates(
                    selectedFields.filter((e) => e !== "none"),
                    selectedFields.filter((e) => e !== "none")[0],
                    pcRef.pc.newPlotId(),
                    data,
                    pcRef.pc,
                    gridPos,
                );
                break;
            case "Bar Plot":
                createBarPlot(
                    selectedFields[0],
                    pcRef.pc.newPlotId(),
                    data,
                    pcRef.pc,
                    gridPos,
                );
                break;
            case "Histogram":
                createHistogram(
                    selectedFields[0],
                    pcRef.pc.newPlotId(),
                    data,
                    pcRef.pc,
                    gridPos,
                );
                break;
        }
    });
    createButton.classList.add("plot-button", "create-button");

    // Create and append the cancel button
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Back";
    cancelButton.classList.add("plot-button", "cancel-button");
    cancelButton.addEventListener("click", () => {
        gridCell.removeChild(plotOptionsDiv); // Remove the plot options menu
        createPlotTypeMenu(gridCell, addPlotButton, pcRef.pc, data, gridPos); // Show plot type menu again
    });
    plotButtonsContainer.appendChild(cancelButton);

    plotButtonsContainer.appendChild(createButton);
    // Append the buttons container to the plot options div
    plotOptionsDiv.appendChild(plotButtonsContainer);

    // Add the plot options div to the grid cell
    gridCell.appendChild(plotOptionsDiv);
}

function createPlotTypeMenu(gridCell, addPlotButton, pcRef, data, gridPos) {
    // Create a menu for plot type selection
    const plotMenu = document.createElement("div");
    plotMenu.classList.add("plot-menu");

    // Create buttons for different plot types
    const plotTypes = [
        "Scatter Plot",
        "Bar Plot",
        "Parallel Coordinates",
        "Histogram",
    ];
    plotTypes.forEach((plotType) => {
        const plotButton = document.createElement("button");
        plotButton.textContent = plotType;
        plotButton.addEventListener("click", () => {
            createPlotMenu(
                plotType,
                gridCell,
                plotMenu,
                addPlotButton,
                pcRef,
                data,
                gridPos,
            ); // Proceed to plot-specific menu
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

function createGridItems(containerId, grid, pcRef, data) {
    const container = document.getElementById(containerId);

    // Set the number of columns and rows in the CSS grid
    container.style.gridTemplateColumns = `repeat(${grid.col}, 290px)`;
    container.style.gridTemplateRows = `repeat(${grid.row}, 290px)`;

    // Adjust the container's width and height
    const containerWidth = grid.col * 290 + (grid.col - 1) * 15 + 30; // width of cells + gaps + padding
    const containerHeight = grid.row * 290 + (grid.row - 1) * 15 + 30; // height of cells + gaps + padding

    container.style.width = `${containerWidth}px`;
    container.style.height = `${containerHeight}px`;

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
                createPlotTypeMenu(gridCell, buttonContainer, pcRef, data, {
                    col: col,
                    row: row,
                });

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

export function setUpLoadCsv(data, pcRef, gridSize) {
    const fileInput = document.getElementById("fileInput");

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = async (event) => {
                const csvData = event.target.result;

                const container = document.getElementById('plotsContainer');

                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }

                data = await d3.csvParse(csvData);
                pcRef.pc = new PlotCoordinator("index");

                pcRef.pc.init(data);
                createGridItems("plotsContainer", gridSize, pcRef, data);

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
        const col = window
            .getComputedStyle(element)
            .getPropertyValue("grid-column-start");
        const row = window
            .getComputedStyle(element)
            .getPropertyValue("grid-row-start");

        gridInfoArray.push({
            type: id,
            col: parseInt(col),
            row: parseInt(row),
        });
    }

    return gridInfoArray;
}

export function setUpExportLayout(gridSize) {

    // Function to export the grid data as JSON
    function exportLayout() {
        const gridData = getGridElementsInfo();
        const filteredData = gridData.filter(
            (item) => !item.type.startsWith("grid"),
        );
        const jsonString = JSON.stringify([gridSize, filteredData], null, 2);

        // Create a blob from the JSON string
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element to trigger the download
        const a = document.createElement("a");
        a.href = url;
        a.download = "grid_layout.json"; // File name for the downloaded JSON
        a.click();

        // Clean up the object URL to avoid memory leaks
        URL.revokeObjectURL(url);
    }

    document
        .getElementById("exportLayoutButton")
        .addEventListener("click", exportLayout);
}

function loadLayout(layoutData, pcRef) {
    console.log("Loaded layout:", layoutData);
    // TODO: loadGridSize(layoutData[0])
    layoutData[1].forEach((item) => {
        // Split the type string into an array of segments
        const segments = item.type.split("_");

        // Use the first segment in the switch statement
        switch (segments[0]) {
            case "scatterPlot":
                createScatterPlot(
                    segments[2],
                    segments[3],
                    pcRef.pc.newPlotId(),
                    pcRef.pc._entries,
                    pcRef.pc,
                    { col: item.col, row: item.row },
                );
                break;
            case "parallelCoord":
                // console.log("a");  // Action for parallelCoord
                createParallelCoordinates(
                    segments.slice(2),
                    segments[2],
                    pcRef.pc.newPlotId(),
                    pcRef.pc._entries,
                    pcRef.pc,
                    {
                        col: item.col,
                        row: item.row,
                    },
                );
                break;
            case "histogram":
                // console.log("b");  // Action for histogram
                createHistogram(segments[2], pcRef.pc.newPlotId(), pcRef.pc._entries, pcRef.pc, {
                    col: item.col,
                    row: item.row,
                });
                break;
            case "barplot":
                createBarPlot(segments[2], pcRef.pc.newPlotId(), pcRef.pc._entries, pcRef.pc, {
                    col: item.col,
                    row: item.row,
                });
                break;
        }
    });
}

export function setUpLoadLayout(data, pcRef) {
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
                    loadLayout(data, pcRef);
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    alert(
                        "Invalid JSON file. Please select a valid JSON file.",
                    );
                }
            };

            // Read the file as text (JSON)
            reader.readAsText(file);
        } else {
            alert("Please select a JSON file.");
        }
    });
}

export function setUpTopBarScroll() {
    window.addEventListener("scroll", function() {
        const topBar = document.querySelector(".top-bar");
        const scrollPosition = window.scrollY || window.pageYOffset;

        if (scrollPosition > 10) { // Adjust this value to control when the effect starts
            topBar.classList.add("scrolled");
        } else {
            topBar.classList.remove("scrolled");
        }
    });
}
