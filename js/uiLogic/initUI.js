import { createScatterPlot } from "../plots/scatterPlot.js";
import { createBarPlot } from "../plots/barPlot.js";
import { createHistogram } from "../plots/histogram.js";
import { createParallelCoordinates } from "../plots/parallelCoordinates.js";
import { PlotCoordinator } from "../core/plotCoordinator.js";
import { csvParse } from "d3";
import { initTopBarScroll } from "./topBarScroll.js";
import { adjustBodyStyle, getGridDimensions } from "./gridUtils.js";

function createPlotMenu(
    plotType,
    gridCell,
    plotMenu,
    addPlotButton,
    pcRef,
    gridPos,
) {
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
            numSelectFields = 10;
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
                    pcRef.pc.entries(),
                    pcRef.pc,
                    gridPos,
                );
                break;
            case "Parallel Coordinates":
                createParallelCoordinates(
                    selectedFields.filter((e) => e !== "none"),
                    selectedFields.filter((e) => e !== "none")[0],
                    pcRef.pc.newPlotId(),
                    pcRef.pc.entries(),
                    pcRef.pc,
                    gridPos,
                );
                break;
            case "Bar Plot":
                createBarPlot(
                    selectedFields[0],
                    pcRef.pc.newPlotId(),
                    pcRef.pc.entries(),
                    pcRef.pc,
                    gridPos,
                );
                break;
            case "Histogram":
                createHistogram(
                    selectedFields[0],
                    pcRef.pc.newPlotId(),
                    pcRef.pc.entries(),
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
        createPlotTypeMenu(gridCell, addPlotButton, pcRef, gridPos); // Show plot type menu again
    });
    plotButtonsContainer.appendChild(cancelButton);

    plotButtonsContainer.appendChild(createButton);
    // Append the buttons container to the plot options div
    plotOptionsDiv.appendChild(plotButtonsContainer);

    // Add the plot options div to the grid cell
    gridCell.appendChild(plotOptionsDiv);
}

function createPlotTypeMenu(gridCell, addPlotButton, pcRef, gridPos) {
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

function createGridCell(container, { col, row }, pcRef) {

    const gridCell = document.createElement("div");
    gridCell.classList.add("grid-cell");
    gridCell.setAttribute("id", `grid-cell-${col}-${row}`); // TODO: maybe

    gridCell.style.gridColumn = `${col}`;
    gridCell.style.gridRow = `${row}`;

    // Create a container div for the Add Plot button
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("button-container");

    // Create the Add Plot button
    const addPlotButton = document.createElement("button");
    addPlotButton.textContent = "Add Plot";
    addPlotButton.addEventListener("click", () => {
        // Create the plot menu with 4 plot options and a cancel button
        createPlotTypeMenu(gridCell, buttonContainer, pcRef, {
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

export function createGridItems(grid, pcRef) {
    const containerId = "plotsContainer";
    const container = document.getElementById(containerId);

    container.style.gridTemplateColumns = `repeat(${grid.col}, 350px)`;
    container.style.gridTemplateRows = `repeat(${grid.row}, 350px)`;

    for (let col = 1; col <= grid.col; col++) {
        for (let row = 1; row <= grid.row; row++) {
            createGridCell(container, { col, row }, pcRef);
        }
    }
    adjustBodyStyle();
}

function loadLayout(layoutData, pcRef) {
    if(layoutData[1]){
        layoutData[1].forEach((item) => {
            const segments = item.type.split("_");

            switch (segments[0]) {
                case "scatterPlot":
                    createScatterPlot(
                        segments[1],
                        segments[2],
                        pcRef.pc.newPlotId(),
                        pcRef.pc._entries,
                        pcRef.pc,
                        { col: item.col, row: item.row },
                    );
                    break;
                case "parallelCoord":
                    createParallelCoordinates(
                        segments.slice(1),
                        segments[1],
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
                    createHistogram(segments[1], pcRef.pc.newPlotId(), pcRef.pc._entries, pcRef.pc, {
                        col: item.col,
                        row: item.row,
                    });
                    break;
                case "barplot":
                    createBarPlot(segments[1], pcRef.pc.newPlotId(), pcRef.pc._entries, pcRef.pc, {
                        col: item.col,
                        row: item.row,
                    });
                    break;
            }
        });
    }
}

/**
 * initializes all the ui components
 */
export function initializeUI(pcRef, socketRef, connectFunction){
    initTopBarScroll();
    initExportLayout();
    initLoadLayout(pcRef);
    initGridResizing(pcRef);
    initLoadCsv(pcRef, socketRef, connectFunction);
}

/**
 * initializes the export layout to file button functionality  TODO: improve export schema
 */
export function initExportLayout() {

    function getGridElementsInfo() {
        const container = document.getElementById("plotsContainer");
        const elements = container.children;
        const gridInfoArray = [];

        for (const element of elements) {
            const id = element.id; //TODO: improve export schema
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

    function exportLayout() {
        let gridSize = getGridDimensions();

        const gridData = getGridElementsInfo();
        const filteredData = gridData.filter(
            (item) => !item.type.startsWith("grid"),
        );
        const jsonString = JSON.stringify([gridSize, filteredData], null, 2);

        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element to trigger the download
        const a = document.createElement("a");
        a.href = url;
        a.download = "layout.json";
        a.click();

        URL.revokeObjectURL(url);
    }

    document
        .getElementById("exportLayoutButton")
        .addEventListener("click", exportLayout);
}

/**
 * initializes the restore layout from file button functionality
 */
export function initLoadLayout(pcRef) {
    const fileInput = document.getElementById("layoutInput");

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    let parsedData = JSON.parse(event.target.result);

                    const container = document.getElementById("plotsContainer");

                    while (container.firstChild) {
                        container.removeChild(container.firstChild);
                    }

                    let gridSize = { col: 3, row: 3 };
                    gridSize.col = parsedData[0].col;
                    gridSize.row = parsedData[0].row;

                    pcRef.pc.removeAll();

                    createGridItems(gridSize, pcRef);
                    loadLayout(parsedData, pcRef);
                    adjustBodyStyle();
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    alert(
                        "Invalid JSON file. Please select a valid JSON file.",
                    );
                }
            };

            reader.readAsText(file);
        }
    });
}

/**
 * initializes the buttons responsible for adding columns and rows to the grid
 */
export function initGridResizing(pcRef) {
    let containerId = "plotsContainer";

    window.addEventListener('resize', function() {
        adjustBodyStyle();
    });

    document.getElementById("col").addEventListener("click", function() {
        let grid = getGridDimensions();

        grid.col++;
        const container = document.getElementById(containerId);

        container.style.gridTemplateColumns = `repeat(${grid.col}, 350px)`;
        container.style.gridTemplateRows = `repeat(${grid.row}, 350px)`;

        for (let i = 1; i <= grid.row; i++) {
            createGridCell(container, { col: grid.col, row: i }, pcRef);
        }
        adjustBodyStyle();
    });

    document.getElementById("row").addEventListener("click", function() {
        let grid = getGridDimensions();

        grid.row++;
        const container = document.getElementById(containerId);

        container.style.gridTemplateColumns = `repeat(${grid.col}, 350px)`;
        container.style.gridTemplateRows = `repeat(${grid.row}, 350px)`;

        for (let i = 1; i <= grid.col; i++) {
            createGridCell(container, { col: i, row: grid.row }, pcRef);
        }
        adjustBodyStyle();
    });
}

/**
 * initializes the button responsible of loading and parsing a csv file  TODO: handle non ASCII chars
 */
export function initLoadCsv(pcRef, socketRef, connectFunction) {

    let defaultGridSize = { col: 3, row: 3 };

    const fileInput = document.getElementById("fileInput");

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = async (event) => {
                const csvData = event.target.result;

                const container = document.getElementById("plotsContainer");

                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }

                let data = await csvParse(csvData);

                data = data.map(row => {
                    const modifiedRow = {};

                    // TODO: handle non ASCII chars
                    for (let key in row) {
                        const modifiedKey = key
                            .replace(/\s+/g, '-')    // Replace spaces with dashes
                            .replace(/_/g, '-')      // Replace underscores with dashes
                            .replace(/[^a-zA-Z0-9-]/g, ''); // Remove non-alphanumeric characters

                        modifiedRow[modifiedKey] = row[key];
                    }

                    return modifiedRow;
                });

                pcRef.pc = new PlotCoordinator();

                pcRef.pc.init(data, file.name);
                createGridItems(defaultGridSize, pcRef);

                document.getElementById("col").style.display = "flex";
                document.getElementById("row").style.display = "flex";

                connectFunction(socketRef, pcRef);
            };

            reader.readAsText(file);

            document.getElementById("slide-menu-btn").style.display="flex";
            document.getElementById("loadLayoutButton").style.display="flex";
            document.getElementById("exportLayoutButton").style.display="flex";

        } else {
            alert("Please select a CSV file.");
        }
    });
}
