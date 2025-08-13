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

    // TODO: change layout export to include dataset it came from
    // TODO: add multiple plots in same client functionality

    let ip = "186.153.49.206";
    let url = `ws://${ip}:5226/`;
    const BENCHMARK = false;

    if(BENCHMARK){
        benchMark(plots, url).then();
    }else{
        initializeUI(plots, url);
    }
}

run();

