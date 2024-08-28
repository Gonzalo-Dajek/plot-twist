import { helloWorld } from "./js/plot.js";
import * as Plotly from "plotly.js-dist";

let TESTER = document.getElementById("tester");

Plotly.newPlot(
    TESTER,
    [
        {
            x: [1, 2, 3, 4, 5],
            y: [1, 2, 4, 8, 16],
        },
    ],
    {
        margin: { t: 0 },
    }
);

helloWorld();
