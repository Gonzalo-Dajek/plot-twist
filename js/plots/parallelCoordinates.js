import * as d3 from "d3";
import throttle from "lodash-es/throttle.js";

export function createParallelCoordinates(keys, keyz, id, data, pc, gridPos) {
    d3.select("#plotsContainer")
        .append("div")
        .attr("id", `parallelCoord_${id}`)
        .attr("class", "plot gridRectangle")
        .style("grid-column", gridPos.col)
        .style("grid-row", `${gridPos.row} / span 2`);

    // Specify chart dimensions
    const container = d3.select(`#parallelCoord_${id}`);
    const width = container.node().clientWidth;
    // const height = keys.length * 120;
    const height = 600-40;
    const marginTop = 20;
    const marginRight = 10;
    const marginBottom = 20;
    const marginLeft = 10;

    const selectedColor = "green";
    const unselectedColor = "grey";
    let selectedColorSecondary = "#FFC784";


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
            // d3.interpolateRgb.gamma(0.7)(selectedColorSecondary, selectedColor)
            d3.interpolateRdYlGn
        );

    // Create the SVG container
    const svg = d3
        .select(`#parallelCoord_${id}`)
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
            d3.select(this).call(d3.axisBottom(x.get(d)));
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

    function handleSelection({selection}, fieldSelected) {
        if (selection === null) {
            selectionsFromAxis.delete(fieldSelected);
        } else {
            selectionsFromAxis.set(fieldSelected, selection.map(x.get(fieldSelected).invert));
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
        const selectRanges = Array.from(selectionsFromAxis, ([field, [min, max]]) => ({
            range: [min, max],
            field: field,
            type: "numerical", // Assuming all are numerical for this example
        }));

        // You can use selectRanges here as needed
        // console.log(selectRanges);

        pc.updatePlotsView(id, selectRanges);
    }

    const throttledHandleSelection = throttle(handleSelection, 100);

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
