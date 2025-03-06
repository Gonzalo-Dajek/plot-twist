import { scatterPlot } from "./plots/scatterPlot.js";
import { parallelCoordinates } from "./plots/parallelCoordinates.js";
import { histogram } from "./plots/histogram.js";
import { barPlot } from "./plots/barPlot.js";
import { initializeUI } from "./uiLogic/initUI.js";
import { benchMark } from "./core/benchMark.js";

async function run(){
    let plots = [
        scatterPlot,
        histogram,
        barPlot,
        parallelCoordinates,
    ];

    let url = "ws://localhost:5226/";

    // TODO: fix top bar in small resolutions
    // TODO: make initial size of layout dependant on resolution
    // TODO: make svg favicon and logo
    // TODO: load DEMO button
    // TODO: make GitHub pretty with instructions
    // TODO: test multiple clients
    // TODO: consider pathological data distribution
    // TODO: default values with variation on the input

    const BENCHMARK = true;
    if(BENCHMARK){
        await benchMark(plots, url, 1);
    }else{
        initializeUI(plots, url);
    }
}

run();

