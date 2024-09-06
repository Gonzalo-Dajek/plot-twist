import { PlotCoordinator } from "./js/plotCoordinator.js";
import * as d3 from "d3";
import throttle from "lodash/throttle";

async function loadCSV(pathToCsv) {
    return await d3.csv(pathToCsv, function (data) {
        return data;
    });
}

let data = await loadCSV("../local_data/athlete_events_2500.csv");
let pc = new PlotCoordinator();
pc.init(data);

let fields = ["Height", "Weight", "Age"];

for (let f1 of fields) {
    for (let f2 of fields) {
        // createScatterPlot(f1, f2, pc.newPlotId());
        if (f1 === f2) {
            createHistogram(f1, pc.newPlotId());
        } else {
            createScatterPlot(f1, f2, pc.newPlotId());
        }
    }
}

// createScatterPlot("Height", "Weight", pc.newPlotId());
// createScatterPlot("Height", "Weight", pc.newPlotId());
// createHistogram("Height", pc.newPlotId());

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
                .style("r", isSelected ? 2.5 : 1.5);
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
