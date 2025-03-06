export function loadLayout(layoutData, pcRef, plots) {
    let gridSize = { col: 3, row: 3 };
    gridSize.col = layoutData[0].col;
    gridSize.row = layoutData[0].row;

    createEmptyGrid(pcRef, plots, gridSize);

    if (layoutData[1]) {
        layoutData[1].forEach((item) => {
            plots.forEach((plot) => {
                if(item.type === plot.plotName){
                    createPlot(plot,
                        pcRef,
                        { col: item.col, row: item.row },
                        new Map(item.fields.map(field => [field.fieldName, field.fieldSelected])),
                        new Map(item.options.map(option => [option.optionName, option.optionCheckBox]))
                    )
                }
            });
        });
    }
}

function createPlot(selectedPlot, pcRef, gridPos, selectedFields, selectedCheckBoxes){
    let id = pcRef.pc.newPlotId();
    let col = gridPos.col;
    let row = gridPos.row;

    // stores the Plot details into a json embedded in the div for the layout information
    const createdPlotJsonInfo = {
        plotName: selectedPlot.plotName,
        fields: Array.from(selectedFields.entries()).map(([key, value]) => ({
            fieldName: key,
            fieldSelected: value
        })),
        options: Array.from(selectedCheckBoxes.entries()).map(([key, value]) => ({
            optionName: key,
            optionCheckBox: value
        })),
        col: col,
        row: row,
    };

    // creates the plotDiv where the delete button and the plot will reside
    const plotDiv = document.createElement("div");
    plotDiv.id = `plot-${col}-${row}`;
    plotDiv.setAttribute("data-json", JSON.stringify(createdPlotJsonInfo));
    plotDiv.classList.add("plotAndDeleteButton-container");
    plotDiv.style.gridColumn = col;
    plotDiv.style.gridRow = row;
    plotDiv.style.width = `${349*selectedPlot.width+(selectedPlot.width-1)*15.1}px`;
    plotDiv.style.height = `${348.18*selectedPlot.height+(selectedPlot.height-1)*15.1}px`;
    document.getElementById("plotsContainer").appendChild(plotDiv);

    // Adds top bar on top of plot where delete button resides
    const deleteButtonContainer = document.createElement("div");
    deleteButtonContainer.classList.add("plot-deleteButton-container");
    plotDiv.appendChild(deleteButtonContainer);

    // Adds delete button to remove the plot when clicked
    const button = document.createElement("button");
    button.textContent = "Delete";
    button.classList.add("delete-plot");
    button.addEventListener("click", () => {
        pcRef.pc.removePlot(id);
        plotDiv.remove();
    });
    deleteButtonContainer.appendChild(button);

    // Adds the div where the actual plot will reside
    const innerPlotContainer = document.createElement("div");
    innerPlotContainer.classList.add("plot-content");
    innerPlotContainer.style.width = `${350*selectedPlot.width+(selectedPlot.width-1)*15}px`;
    innerPlotContainer.style.height = `${350*selectedPlot.height+(selectedPlot.height-1)*15-43}px`;
    plotDiv.appendChild(innerPlotContainer);

    let updateFunction = selectedPlot.createPlotFunction(
        selectedFields,
        selectedCheckBoxes,
        innerPlotContainer,
        pcRef.pc.entries(),
        (selection)=> {
            pcRef.pc.updatePlotsView(id, selection);
        },
        (entry) => {
            return pcRef.pc.isSelected(entry);
        }
    );

    pcRef.pc.addPlot(id, updateFunction);
}

function createFieldSelectionMenu(selectedPlot, pcRef, gridPos, plotTypes) {
    let col = gridPos.col;
    let row = gridPos.row;
    const gridCell = document.getElementById(`grid-cell-${col}-${row}`);

    const plotOptionsDiv = document.createElement("div");
    plotOptionsDiv.classList.add("plot-fields-selection-menu");

    const plotFieldsContainer = document.createElement("div");
    plotFieldsContainer.classList.add("plot-fields-container");
    plotOptionsDiv.appendChild(plotFieldsContainer);

    let selectedFields = new Map();
    let selectedCheckBoxes = new Map();

    for (let i = 0; i < selectedPlot.fields.length; i++) {
        let selectField = document.createElement("select");
        selectField.classList.add("field-select-dropDown");

        if (!selectedPlot.fields[i].isRequired) {
            const noneOption = document.createElement("option");
            noneOption.value = "";
            noneOption.text = "----";
            selectField.appendChild(noneOption);
        }

        pcRef.pc.fields().forEach((field) => {
            const option = document.createElement("option");
            option.value = field;
            option.text = field;
            selectField.appendChild(option);
        });

        // Add label and select field
        const label = document.createElement("label");
        label.textContent = selectedPlot.fields[i].fieldName;
        label.classList.add("field-select-label");

        // Initialize the map with the default value
        selectedFields.set(selectedPlot.fields[i].fieldName, selectField.value);

        selectField.addEventListener("change", () => {
            selectedFields.set(selectedPlot.fields[i].fieldName, selectField.value);
        });

        plotFieldsContainer.appendChild(label);
        plotFieldsContainer.appendChild(selectField);
    }

    for (let i = 0; i < selectedPlot.options.length; i++) {
        const container = document.createElement("div");
        container.classList.add("plotCreation-checkbox-container");

        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("plotCreation-checkbox");
        checkbox.id = `checkbox-${i}-${row}-${col}`;

        // Initialize the map with false
        selectedCheckBoxes.set(selectedPlot.options[i], false);

        checkbox.addEventListener("change", () => {
            selectedCheckBoxes.set(selectedPlot.options[i], checkbox.checked);
        });

        const label = document.createElement("label");
        label.textContent = selectedPlot.options[i];
        label.classList.add("plotCreation-checkbox-label");
        label.htmlFor = checkbox.id;

        container.appendChild(checkbox);
        container.appendChild(label);
        plotFieldsContainer.appendChild(container);
    }

    // Add the "create" button at the bottom
    const plotButtonsContainer = document.createElement("div");
    plotButtonsContainer.classList.add("fieldSelection-buttons-container");

    const createButton = document.createElement("button");
    createButton.textContent = "Create";

    createButton.addEventListener("click", ()=>{
        // TODO: if the dimensions allows it else alert("cannot do that")
        createPlot(selectedPlot, pcRef, gridPos, selectedFields, selectedCheckBoxes);
    });

    createButton.classList.add("plot-button", "create-plot-button");

    // Add the "back" button at the button
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Back";
    cancelButton.classList.add("plot-button", "cancel-button");
    cancelButton.addEventListener("click", () => {
        gridCell.removeChild(plotOptionsDiv); // Remove the plot options menu
        createPlotTypeSelectionMenu(pcRef, gridPos, plotTypes); // Show plot type menu again
    });

    plotButtonsContainer.appendChild(cancelButton);
    plotButtonsContainer.appendChild(createButton);
    plotOptionsDiv.appendChild(plotButtonsContainer);
    gridCell.appendChild(plotOptionsDiv);
}

/**
 * creates the menu responsible for the selection of the type of plot to be created
 */
function createPlotTypeSelectionMenu(pcRef, gridPos, plotTypes) {
    let col = gridPos.col;
    let row = gridPos.row;
    const gridCell = document.getElementById(`grid-cell-${col}-${row}`);
    const addPlotButton = gridCell.querySelector(".empty-grid-cell");

    const plotMenu = document.createElement("div");
    plotMenu.classList.add("plotType-selection-menu");

    const plotSelectionInnerMenu = document.createElement("div");
    plotSelectionInnerMenu.classList.add("plotSelectionInnerMenu");
    plotMenu.appendChild(plotSelectionInnerMenu);

    plotTypes.forEach((plot) => {
        const plotButton = document.createElement("button");
        plotButton.textContent = plot.plotName;
        plotButton.addEventListener("click", () => {
            createFieldSelectionMenu(plot, pcRef, gridPos, plotTypes);
            gridCell.removeChild(plotMenu);
        });
        plotSelectionInnerMenu.appendChild(plotButton);
    });

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Back";
    cancelButton.classList.add("cancel-button");
    cancelButton.addEventListener("click", () => {
        gridCell.removeChild(plotMenu);
        addPlotButton.style.display = "flex"; // Show the "Add Plot" button again
    });

    plotMenu.appendChild(cancelButton);
    gridCell.appendChild(plotMenu);
}

/**
 * creates an empty cell with an "Add Plot" button
 */
export function createEmptyGridCell({ col, row }, pcRef, plots) {
    const containerId = "plotsContainer";
    const container = document.getElementById(containerId);

    const gridCell = document.createElement("div");
    gridCell.classList.add("grid-cell");
    gridCell.setAttribute("id", `grid-cell-${col}-${row}`);

    gridCell.style.gridColumn = `${col}`;
    gridCell.style.gridRow = `${row}`;

    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("empty-grid-cell");

    const addPlotButton = document.createElement("button");
    addPlotButton.textContent = "Add Plot";
    addPlotButton.addEventListener("click", () => {
        // when clicked display the plot type menu
        createPlotTypeSelectionMenu(pcRef, { col: col, row: row }, plots);

        // Hide the Add Plot button
        buttonContainer.style.display = "none";
    });

    buttonContainer.appendChild(addPlotButton);
    gridCell.appendChild(buttonContainer);
    container.appendChild(gridCell);
}

/**
 * creates the default plot-less 3x3 grid
 */
export function createEmptyGrid(pcRef, plots, gridDimensions = { col: 3, row: 2 }) {

    const containerId = "plotsContainer";
    const container = document.getElementById(containerId);

    container.style.gridTemplateColumns = `repeat(${gridDimensions.col}, 350px)`;
    container.style.gridTemplateRows = `repeat(${gridDimensions.row}, 350px)`;

    for (let col = 1; col <= gridDimensions.col; col++) {
        for (let row = 1; row <= gridDimensions.row; row++) {
            createEmptyGridCell({ col, row }, pcRef, plots);
        }
    }

    adjustBodyStyle();
}

/**
 * Adjust the css styling of the grid such that if the screen allows it, it is fixed and centered,
 * and if not it properly overflows
 */
export function adjustBodyStyle() {
    const content = document.getElementById("grid-container");
    const body = document.body;

    const contentRect = content.getBoundingClientRect();
    if (contentRect.width > window.innerWidth) {
        body.style.display = "block";
        body.style.flexDirection = "";
        body.style.alignItems = "";
    } else {
        body.style.display = "flex";
        body.style.flexDirection = "column";
        body.style.alignItems = "center";
    }
}

/**
 * Returns the grid width (number of columns) and height (number of rows)
 */
export function getGridDimensions() {
    const plotsContainer = document.getElementById("plotsContainer");
    const styles = window.getComputedStyle(plotsContainer);

    const cols = styles.getPropertyValue("grid-template-columns").split(" ").length;
    const rows = styles.getPropertyValue("grid-template-rows").split(" ").length;

    return { col: cols, row: rows };
}
