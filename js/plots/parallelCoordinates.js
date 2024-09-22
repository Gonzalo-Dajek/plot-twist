import * as d3 from "d3";
import throttle from "lodash-es/throttle.js";
import { createButtons } from "./plotsUtils/plotButtons.js";
import { customTickFormat } from "./plotsUtils/ticks.js";

export function createParallelCoordinates(keys, keyz, id, data, pc, gridPos) {
    let divId = `parallelCoord_${id}`;
    divId = divId + "_" + keys.join("_");
    d3.select("#plotsContainer")
        .append("div")
        .attr("id", divId)
        .attr("class", "plot gridRectangle")
        .style("grid-column", gridPos.col)
        .style("grid-row", `${gridPos.row} / span 2`);

    // Specify chart dimensions
    const container = d3.select(`#${divId}`);
    const width = container.node().clientWidth;
    // const height = keys.length * 120;
    const height = 596 - 40;
    const marginTop = 20;
    const marginRight = 15;
    const marginBottom = 30;
    const marginLeft = 15;

    const selectedColor = "green";
    const unselectedColor = "grey";
    let selectedColorSecondary = "#FFC784";

    let btns = createButtons(container, pc, id, true);
    let setActiveButton = btns.setActiveButton;

    // Create horizontal x scale for each key
    const x = new Map(
        Array.from(keys, (key) => [
            key,
            d3
                .scaleLinear()
                .domain(d3.extent(data, (d) => Number(d[key])))
                .range([marginLeft, width - marginRight]),
        ])
    );

    // Create vertical y scale
    const y = d3
        .scalePoint()
        .domain(keys)
        .range([marginTop, height - marginBottom]);

    // Create color scale
    const color = d3
        .scaleSequential()
        .domain(d3.extent(data, (d) => Number(d[keyz])))
        // .interpolator(d3.interpolateRgb.gamma(1.6)("purple", "orange"));
        .interpolator(
            // d3.interpolateRdYlGn
            d3.interpolateViridis
            // d3.interpolateRgb.gamma(0.7)(selectedColorSecondary, selectedColor)
            // d3.interpolateHclLong("purple", "orange")
            // d3.scaleLinear()
            //     .domain([0, 0.2, 0.4, 0.6, 0.8, 1])
            //     .range([
            //         "rgba(98, 0, 238, 0.8)", // Bold Purple
            //         "rgba(0, 153, 255, 0.8)", // Bright Blue
            //         "rgba(255, 165, 0, 0.8)", // Vivid Orange
            //         "rgba(0, 255, 128, 0.8)", // Bright Mint
            //         "rgba(128, 0, 128, 0.8)", // Strong Purple
            //         "rgba(255, 20, 147, 0.8)"  // Deep Pink
            //     ])
        );

    // Create the SVG container
    const svg = d3
        .select(`#${divId}`)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Line generator function
    const line = d3
        .line()
        .defined(([, value]) => value != null)
        .x(([key, value]) => x.get(key)(value))
        .y(([key]) => y(key));

    // Append lines
    const path = svg
        .append("g")
        .attr("fill", "none")
        .attr("class", `data-paths${id}`)
        .attr("stroke-width", 1.5) // TODO: agregar variable
        .attr("stroke-opacity", 0.4) // TODO: agregar variable
        .selectAll("path")
        .data(data)
        .join("path")
        .attr("stroke", (d) => color(d[keyz]))
        .attr("d", (d) => line(keys.map((key) => [key, d[key]])))
        .append("title")
        .text((d) => d.name);

    // Append axes for each key
    const axes = svg
        .append("g")
        .selectAll("g")
        .data(keys)
        .join("g")
        .attr("transform", (d) => `translate(0,${y(d)})`)
        .each(function (d) {
            d3.select(this).call(d3.axisBottom(x.get(d)).ticks(5).tickFormat(customTickFormat));
        })
        .call((g) =>
            g
                .append("text")
                .attr("x", marginLeft)
                .attr("y", -6)
                .attr("text-anchor", "start")
                .attr("fill", "currentColor")
                .text((d) => d)
        )
        .call((g) =>
            g
                .selectAll("text")
                .clone(true)
                .lower()
                .attr("fill", "none")
                .attr("stroke-width", 5)
                .attr("stroke-linejoin", "round")
                .attr("stroke", "white")
        );

    // Brush behavior

    const selectionsFromAxis = new Map();

    function handleSelection({ selection }, fieldSelected) {
        if (selection === null) {
            selectionsFromAxis.delete(fieldSelected);
        } else {
            selectionsFromAxis.set(
                fieldSelected,
                selection.map(x.get(fieldSelected).invert)
            );
        }
        // let selected = [];
        // path.each(function (d, i) {
        //     const active = Array.from(selectionsFromAxis).every(
        //         ([key, [min, max]]) => d[key] >= min && d[key] <= max
        //     );
        //
        //     if (active) {
        //         d3.select(this).raise();
        //         // selected.push(d); // selected entry
        //         selected.push(i);
        //     }
        // });

        // Convert selectionsFromAxis to desired structure
        const selectRanges = Array.from(
            selectionsFromAxis,
            ([field, [min, max]]) => ({
                range: [min, max],
                field: field,
                type: "numerical", // Assuming all are numerical for this example
            })
        );

        // You can use selectRanges here as needed
        // console.log(selectRanges);

        pc.updatePlotsView(id, selectRanges);
    }

    const throttledHandleSelection = throttle(handleSelection, 50);

    const brushHeight = 50;
    const brush = d3
        .brushX()
        .extent([
            [marginLeft, -(brushHeight / 2)],
            [width - marginRight, brushHeight / 2],
        ])
        .on("start brush end", throttledHandleSelection);

    axes.call(brush);

    pc.addPlot(id, function () {
        svg.selectAll(`.data-paths${id} path`)
            .attr("stroke", (d, i) =>
                pc.isSelected(i) ? color(d[keyz]) : unselectedColor
            )
            .attr("stroke-width", (d, i) => (pc.isSelected(i) ? 1.3 : 0.3))
            .attr("stroke-opacity", (d, i) => (pc.isSelected(i) ? 0.3 : 0.05));
    });
}
