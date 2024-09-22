import {
    setUpLoadCsv,
    setUpExportLayout,
    setUpLoadLayout,
    setUpTopBarScroll,
    setUpResize
} from "./setUpUi.js";
import { testPlots } from "./testingPlots.js";

// import {run} from "./benchMark.js";
// run();

let pcRef = {pc: undefined};
let data = [];
let gridSize = { col: 3, row: 3 };

// testPlots();

setUpTopBarScroll();
setUpLoadCsv(data, pcRef, gridSize);
setUpExportLayout(gridSize);
setUpLoadLayout(data, pcRef, gridSize);
setUpResize("plotsContainer", gridSize, pcRef, data);







