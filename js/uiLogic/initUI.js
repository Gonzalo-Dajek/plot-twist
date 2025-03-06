import { csvParse } from "d3";
import { PlotCoordinator } from "../core/plotCoordinator.js";
import { initTopBarScroll } from "./topBarScroll.js";
import { connectToWebSocket, initFieldGroups } from "./fieldGroups.js";
import {
    adjustBodyStyle,
    createEmptyGrid,
    createEmptyGridCell,
    getGridDimensions,
    loadLayout,
} from "./gridUtils.js";

/**
 * initializes all the ui components
 */
export function initializeUI(plots, url) {
    let pcRef = { pc: undefined };
    let socketRef = { socket: undefined };
    initTopBarScroll();
    initExportLayout();
    initLoadLayout(pcRef, plots);
    initGridResizing(pcRef, plots);
    initFieldGroups(pcRef, socketRef);
    initLoadCsv(pcRef, socketRef, url, plots);
}

/**
 * initializes the export layout to file button functionality
 */
export function initExportLayout() {

    function getGridElementsInfo() {
        const container = document.getElementById("plotsContainer");
        const elements = container.getElementsByClassName("plotAndDeleteButton-container");
        const gridInfoArray = [];

        for (const element of elements) {
            const jsonData = JSON.parse(element.getAttribute("data-json"));

            gridInfoArray.push({
                type: jsonData.plotName,
                col: jsonData.col,
                row: jsonData.row,
                fields: jsonData.fields,
                options: jsonData.options,
            });
        }

        return gridInfoArray;
    }

    function exportLayout() {
        let gridSize = getGridDimensions();

        const gridData = getGridElementsInfo();
        const jsonString = JSON.stringify([gridSize, gridData], null, 2);

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
export function initLoadLayout(pcRef, plots) {
    const fileInput = document.getElementById("layoutInput");

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = (event) => {
                let parsedData;
                try {
                    parsedData = JSON.parse(event.target.result);
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    alert(
                        "Invalid JSON file. Please select a valid JSON file.",
                    );
                }

                const container = document.getElementById("plotsContainer");

                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }

                pcRef.pc.removeAll();

                loadLayout(parsedData, pcRef, plots);
                adjustBodyStyle();
            };

            reader.readAsText(file);
        }
    });
}

/**
 * initializes the buttons responsible for adding columns and rows to the grid
 */
export function initGridResizing(pcRef, plots) {
    let containerId = "plotsContainer";

    window.addEventListener("resize", function() {
        adjustBodyStyle();
    });

    document.getElementById("col").addEventListener("click", function() {
        let grid = getGridDimensions();

        grid.col++;
        const container = document.getElementById(containerId);

        container.style.gridTemplateColumns = `repeat(${grid.col}, 350px)`;
        container.style.gridTemplateRows = `repeat(${grid.row}, 350px)`;

        for (let i = 1; i <= grid.row; i++) {
            createEmptyGridCell( { col: grid.col, row: i }, pcRef, plots);
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
            createEmptyGridCell({ col: i, row: grid.row }, pcRef, plots);
        }
        adjustBodyStyle();
    });
}

/**
 * initializes the button responsible for loading and parsing a csv file
 */
export function initLoadCsv(pcRef, socketRef, url, plots) {

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

                let data = await csvParse(csvData.toString());

                pcRef.pc = new PlotCoordinator();

                pcRef.pc.init(data, file.name);

                createEmptyGrid(pcRef, plots);

                document.getElementById("col").style.display = "flex";
                document.getElementById("row").style.display = "flex";

                connectToWebSocket(socketRef, pcRef, url);
            };

            reader.readAsText(file);

            document.getElementById("loadLayoutButton").style.display = "flex";
            document.getElementById("exportLayoutButton").style.display = "flex";

        } else {
            alert("Please select a CSV file.");
        }
    });
}
