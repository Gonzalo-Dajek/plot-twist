import { scatterPlot } from "./plots/scatterPlot.js";
import { parallelCoordinates } from "./plots/parallelCoordinates.js";
import { histogram } from "./plots/histogram.js";
import { barPlot } from "./plots/barPlot.js";
import { initializeUI } from "./uiLogic/initUI.js";
import { benchMark } from "./core/benchMark.js";

function run(){
    let plots = [
        scatterPlot,
        histogram,
        barPlot,
        parallelCoordinates,
    ];

    let url = "ws://localhost:5226/";

    // TODO: add categorical and numerical data distinction in the ui
    // TODO: make svg favicon and logo
    // TODO: make GitHub pretty with instructions
    // TODO: add introductory text before loadCSV
    // TODO: add canBePlacedPlot condition

    const BENCHMARK = false;
    if(BENCHMARK){
        benchMark(plots, url, 1).then();
    }else{
        initializeUI(plots, url);
    }
}

run();

