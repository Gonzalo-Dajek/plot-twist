// import { testPlots } from "./testingPlots.js";
// import {run} from "./benchMark.js";
// run();
// testPlots(pcRef, data, gridSize);

import { initializeUI } from "./uiLogic/initUI.js";
import { scatterPlot } from "./plots/scatterPlot.js";
import { parallelCoordinates } from "./plots/parallelCoordinates.js";
import { histogram } from "./plots/histogram.js";
import { barPlot } from "./plots/barPlot.js";

let plots = [
    scatterPlot,
    histogram,
    barPlot,
    parallelCoordinates,
];

// TODO: loadLayout not breaking connection to websocket

let url = "ws://localhost:5226/"

initializeUI(plots, url);



