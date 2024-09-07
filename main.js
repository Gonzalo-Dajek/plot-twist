import { PlotCoordinator } from "./js/plotCoordinator.js";
import * as d3 from "d3";
import throttle from "lodash/throttle";

async function loadCSV(pathToCsv) {
    return await d3.csv(pathToCsv, function (data) {
        return data;
    });
}

let data = await loadCSV("../local_data/athlete_events_500.csv");
let pc = new PlotCoordinator();
pc.init(data);
//
// let fields = ["Height", "Weight", "Age", "Year"];
//
// for (let f1 of fields) {
//     for (let f2 of fields) {
//         if (f1 === f2) {
//             createHistogram(f1, pc.newPlotId());
//         } else {
//             createScatterPlot(f1, f2, pc.newPlotId());
//         }
//     }
// }

createScatterPlot("Height", "Weight", pc.newPlotId());
createScatterPlot("Height", "Weight", pc.newPlotId());
createHistogram("Height", pc.newPlotId());

// createParallelCoordinates(pc.newPlotId());

function createScatterPlot(xField, yField, id) {
    d3.select("#plotsContainer")
        .append("div")
        .attr("id", `plot_${id}`)
        .attr("class", "plot");

    // color
    const selectedColor = "green";
    const unselectedColor = "grey";

    // Specify the chart’s dimensions.
    const container = d3.select(`#plot_${id}`);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const marginTop = 15;
    const marginRight = 20;
    const marginBottom = 25;
    const marginLeft = 30;

    // Create the horizontal (x) scale, positioning N/A values on the left margin.
    const xMax = d3.max(data, (d) => Number(d[xField]));
    const xMin = d3.min(data, (d) => Number(d[xField]));
    const x = d3
        .scaleLinear()
        .domain([xMin, xMax])
        .nice()
        .range([marginLeft, width - marginRight])
        .unknown(marginLeft);

    // Create the vertical (y) scale, positioning N/A values on the bottom margin.
    const yMax = d3.max(data, (d) => Number(d[yField]));
    const yMin = d3.min(data, (d) => Number(d[yField]));
    const y = d3
        .scaleLinear()
        .domain([yMin, yMax])
        .nice()
        .range([height - marginBottom, marginTop])
        .unknown(height - marginBottom);

    // Create the SVG container.
    const svg = d3
        .select(`#plot_${id}`)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .property("value", []);

    // Append the axes.
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x))
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .append("text")
                .attr("x", width - marginRight)
                .attr("y", -4)
                .attr("fill", "#000")
                .attr("font-weight", "bold")
                .attr("text-anchor", "end")
                .text(xField)
        );

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y))
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .select(".tick:last-of-type text")
                .clone()
                .attr("x", 4)
                .attr("text-anchor", "start")
                .attr("font-weight", "bold")
                .text(yField)
        );

    // Append the dots
    const dot = svg
        .append("g")
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(Number(d[xField])))
        .attr("cy", (d) => y(Number(d[yField])))
        .attr("r", 2.5) // radius
        .attr("fill", selectedColor) // Dot color
        .attr("fill-opacity", 0.3) // Transparency
        .attr("stroke", "none"); // border

    // Create the brush behavior.
    function handleSelection({ selection }) {
        let selectedIndices;
        if (selection) {
            const [[x0, y0], [x1, y1]] = selection;

            // Get indices of the selected points
            selectedIndices = data
                .map((d, i) => i)
                .filter(
                    (i) =>
                        x0 <= x(Number(data[i][xField])) &&
                        x(Number(data[i][xField])) < x1 &&
                        y0 <= y(Number(data[i][yField])) &&
                        y(Number(data[i][yField])) < y1
                );
        } else {
            selectedIndices = [];
            for (let i = 0; i < data.length; i++) {
                selectedIndices.push(i);
            }
        }

        pc.updatePlotsView(id, selectedIndices);
    }

    const throttledHandleSelection = throttle(handleSelection, 100);

    svg.call(
        d3
            .brush()
            .extent([
                [marginLeft, marginTop],
                [width - marginRight, height - marginBottom],
            ])
            .on("start brush end", throttledHandleSelection)
    );

    pc.addPlot(id, function updateScatterPlot() {
        dot.each(function (d, i) {
            const isSelected = pc.isSelected(i); // Check if index i is in the selection array

            d3.select(this)
                .style("fill", isSelected ? selectedColor : unselectedColor)
                .style("r", isSelected ? 2.5 : 1.3);
        });
    });
}

function createHistogram(field, id) {
    d3.select("#plotsContainer")
        .append("div")
        .attr("id", `histogram_${id}`)
        .attr("class", "plot");

    const container = d3.select(`#histogram_${id}`);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const marginTop = 15;
    const marginRight = 20;
    const marginBottom = 25;
    const marginLeft = 30;

    const selectedColor = "green";
    const unselectedColor = "grey";

    // Define x-axis scale
    const x = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => Number(d[field])))
        .range([marginLeft, width - marginRight]);

    // Create custom bins for the histogram manually
    const thresholds = x.ticks(40);
    const bins = Array.from({ length: thresholds.length - 1 }, (_, i) => ({
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
            if (pc.isSelected(i)) {
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

    // add svg element
    const svg = d3
        .select(`#histogram_${id}`)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x));

    // Add y-axis
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y));

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
        let selectedIndices;
        if (selection) {
            const [x0, x1] = selection;
            selectedIndices = data
                .map((d, i) => i)
                .filter(
                    (i) =>
                        x0 <= x(Number(data[i][field])) &&
                        x(Number(data[i][field])) <= x1
                );
        } else {
            selectedIndices = [];
            for (let i = 0; i < data.length; i++) {
                selectedIndices.push(i);
            }
        }
        pc.updatePlotsView(id, selectedIndices);
    }

    const throttledHandleSelection = throttle(handleSelection, 100);
    svg.call(
        d3
            .brushX()
            .extent([
                [marginLeft, marginTop],
                [width - marginRight, height - marginBottom],
            ])
            .on("start brush end", throttledHandleSelection)
    );

    pc.addPlot(id, updateHistogram);

    // Update the histogram on selection
    function updateHistogram() {
        bins.forEach((bin) => {
            bin.selected = 0;
            bin.unselected = 0;
        });

        data.forEach((d, i) => {
            const value = Number(d[field]);
            const bin = bins.find((b) => b.x0 <= value && value < b.x1);
            if (bin) {
                bin.selected = pc.isSelected(i)
                    ? bin.selected + 1
                    : bin.selected;
                bin.unselected = !pc.isSelected(i)
                    ? bin.unselected + 1
                    : bin.unselected;
            }
        });

        bar.each(function (bin) {
            const selectedRect = d3
                .select(this)
                .selectAll("rect")
                .filter(function () {
                    return d3.select(this).attr("fill") === selectedColor;
                });
            const unselectedRect = d3
                .select(this)
                .selectAll("rect")
                .filter(function () {
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

// function createParallelCoordinates(keys, keyz, id) {
function createParallelCoordinates( keys, keyz, id) {
    // Specify chart dimensions
    const containerId = "plotsContainer";
    const width = 600;
    const height = keys.length * 120;
    // const height = 600
    const marginTop = 20;
    const marginRight = 10;
    const marginBottom = 20;
    const marginLeft = 10;

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
        .interpolator(d3.interpolateBrBG);

    // Create the SVG container
    const svg = d3
        .select(`#${containerId}`)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", width)
        .attr("height", height);

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
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.4)
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
    const selections = new Map();

    function handleSelection(event, key) {
        const selection = event.selection;
        if (selection === null) {
            selections.delete(key);
        } else {
            selections.set(key, selection.map(x.get(key).invert));
        }
        const selected = [];
        path.each(function (d, i) {
            const active = Array.from(selections).every(
                ([key, [min, max]]) => d[key] >= min && d[key] <= max
            );

            if (active) {
                d3.select(this).raise();
                // selected.push(d); // selected entry
                selected.push(i);
            }
        });

        pc.updatePlotsView(id, selected);
    }


    const throttledHandleSelection = throttle(handleSelection, 100);

    const deselectedColor = "#ddd";
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
        // fill
    });
}

const keys = ["Weight", "Height", "Age"];
const keyz = "Weight";

// createParallelCoordinates(keys, keyz, pc.newPlotId());
createParallelCoordinates(keys, keyz , pc.newPlotId());
