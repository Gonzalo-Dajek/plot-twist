import * as d3 from "d3";
import throttle from "lodash-es/throttle.js";
import { customTickFormat } from "./plotsUtils/tickFormat.js";

export const histogram = {
    plotName: "Histogram",
    fields: [
        {
            isRequired: true,
            fieldName: "bin-variable",
            fieldType: "numerical",
        },
    ],
    options: [],
    height: 1,
    width: 1,
    createPlotFunction: createHistogram,
};

// TODO: fix dissapearing bars on either side of the plot with certain amounts of data
export function createHistogram(fields, options, plotDiv, data, updatePlotsFun, isSelectedFun) {

    let field = fields.get("bin-variable")

    const container = d3.select(plotDiv);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const marginTop = 10;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 40;

    // let selectedColor = "#589E4B";
    let selectedColor = "#465191";
    let unselectedColor = "#c9c9c9";

    // Define x-axis scale
    const x = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => Number(d[field])))
        .range([marginLeft, width - marginRight]);

    // Create a bin generator
    const binGenerator = d3.bin()
        .domain(x.domain())
        .thresholds(x.ticks());

    // Create custom bins for the histogram manually
    let bins = binGenerator(data);
    const thresholds = x.ticks(bins.length);
    // const thresholds = x.ticks(Math.sqrt(data.length));
    bins = Array.from({ length: thresholds.length - 1 }, (_, i) => ({
        x0: thresholds[i],
        x1: thresholds[i + 1],
        selected: 0,
        unselected: 0,
    }));

    // Assign data points to bins based on field value
    data.forEach((d, i) => {
        const value = Number(d[field]);
        const bin = bins.find((b) => b.x0 <= value && value < b.x1);
        if (bin) {
            if (isSelectedFun(i)) {
                bin.selected++;
            } else {
                bin.unselected++;
            }
        }
    });

    // Define y-axis scale based on the maximum bin height
    const y = d3
        .scaleLinear()
        .domain([0, d3.max(bins, (d) => d.selected + d.unselected)])
        .range([height - marginBottom, marginTop]);

    // Create the SVG container.
    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .property("value", []);

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(customTickFormat));

    // Add y-axis
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).ticks(7).tickFormat(customTickFormat));

    // text
    svg.append("text")
        .attr("x", width - marginRight)
        .attr("y", marginTop + 5)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "black")
        .style("font-family", "sans-serif") // Set the font to sans-serif
        .text(field)
        .raise();

    // Append the axis lines (grid lines)
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(
            d3
                .axisBottom(x)
                .tickSize(-height + marginTop + marginBottom)
                .tickFormat(""),
        )
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .style("stroke-width", 0.5) // Thinner lines
                .style("stroke-opacity", 0.3),
        );

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(
            d3
                .axisLeft(y)
                .tickSize(-width + marginLeft + marginRight)
                .tickFormat(""),
        )
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .style("stroke-width", 0.5) // Thinner lines
                .style("stroke-opacity", 0.3),
        );

    // Create bars (stacked for selected/unselected)
    const bar = svg
        .append("g")
        .selectAll("g")
        .data(bins)
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${x(d.x0)},0)`);

    // Add unselected rect
    bar.append("rect")
        .attr("x", 1)
        .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
        .attr("y", (d) => y(d.unselected))
        .attr("height", (d) => height - marginBottom - y(d.unselected))
        .attr("fill", unselectedColor);

    // Add selected rect (stacked on top of unselected)
    bar.append("rect")
        .attr("x", 1)
        .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
        .attr("y", (d) => y(d.selected + d.unselected))
        .attr("height", (d) => height - marginBottom - y(d.selected))
        .attr("fill", selectedColor);

    // Brush behavior
    function handleSelection({ selection }) {
        let selectRanges;
        if (selection) {
            const [x0, x1] = selection;
            let xRange = [x.invert(x0), x.invert(x1)];
            selectRanges = [
                {
                    range: xRange,
                    field: field,
                    type: "numerical",
                },
            ];
        } else {
            selectRanges = [];
            // selectRanges = [
            //     {
            //         range: null,
            //         xField: field,
            //         type: "numerical",
            //     },
            // ];
        }

        updatePlotsFun(selectRanges);
    }

    const throttledHandleSelection = throttle(handleSelection, 50);
    svg.call(
        d3
            .brushX()
            .extent([
                [marginLeft, marginTop],
                [width - marginRight, height - marginBottom],
            ])
            .on("start brush end", throttledHandleSelection),
    );

    return function updateHistogram() {
        bins.forEach((bin) => {
            bin.selected = 0;
            bin.unselected = 0;
        });

        data.forEach((d, i) => {
            const value = Number(d[field]);
            const bin = bins.find((b) => b.x0 <= value && value < b.x1);
            if (bin) {
                bin.selected = isSelectedFun(i)
                    ? bin.selected + 1
                    : bin.selected;
                bin.unselected = !isSelectedFun(i)
                    ? bin.unselected + 1
                    : bin.unselected;
            }
        });

        bar.each(function(bin) {
            const selectedRect = d3
                .select(this)
                .selectAll("rect")
                .filter(function() {
                    return d3.select(this).attr("fill") === selectedColor;
                });
            const unselectedRect = d3
                .select(this)
                .selectAll("rect")
                .filter(function() {
                    return d3.select(this).attr("fill") === unselectedColor;
                });

            selectedRect
                .attr("height", height - marginBottom - y(bin.selected))
                .attr("y", y(bin.selected));

            unselectedRect
                .attr("height", height - marginBottom - y(bin.unselected))
                .attr("y", y(bin.unselected + bin.selected));
        });
    }
}
