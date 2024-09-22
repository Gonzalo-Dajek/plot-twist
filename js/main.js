import { PlotCoordinator } from "./plotCoordinator.js";
import {
    setUpLoadCsv,
    setUpExportLayout,
    setUpLoadLayout,
    setUpTopBarScroll,
} from "./setUpUi.js";
import { testPlots } from "./testingPlots.js";

// import {run} from "./benchMark.js";
// run();

let pcRef = {pc: undefined};
let data = [];
let gridSize = { col: 6, row: 3 };

// testPlots();

setUpTopBarScroll();
setUpLoadCsv(data, pcRef, gridSize);
setUpExportLayout(gridSize);
setUpLoadLayout(data, pcRef);

document.getElementById('col').addEventListener('click', function() {
    gridSize.col++;
});

document.getElementById('row').addEventListener('click', function() {
    gridSize.row++;
});
