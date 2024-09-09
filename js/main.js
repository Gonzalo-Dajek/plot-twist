import { PlotCoordinator } from "./plotCoordinator.js";
import * as d3 from "d3";
// import {run} from "./benchMark.js";

import throttle from "lodash/throttle.js"; // TODO: add throttle

async function loadCSV(pathToCsv) {
    return await d3.csv(pathToCsv, function (data) {
        return data;
    });
}

// run();

// let data = await loadCSV("../test/test_data/debug_dataset.csv");
let data = await loadCSV("../local_data/athlete_events_1000.csv");
let pc = new PlotCoordinator();
console.log(data);
pc.init(data);

let fields = ["Height", "Weight", "Age", "Year"];

for (let f1 of fields) {
    for (let f2 of fields) {
        if (f1 === f2) {
            createHistogram(f1, pc.newPlotId(),data,pc);
        } else {
            createScatterPlot(f1, f2, pc.newPlotId(),data,pc);
        }
    }
}

// createScatterPlot("Height", "Weight", pc.newPlotId(), data, pc);
// createHistogram("Height", pc.newPlotId(), data, pc);

let keys = ["Weight", "Height", "Age"];
let keyz = "Weight";
createParallelCoordinates(keys, keyz, pc.newPlotId(), data, pc);

keys = ["Age", "Height", "Year", "Weight"];
keyz = "Year";
createParallelCoordinates(keys, keyz, pc.newPlotId(),data,pc);

createBarPlot("Medal", pc.newPlotId(), data, pc);
createBarPlot("Season", pc.newPlotId(), data, pc);

export function createScatterPlot(xField, yField, id, data, pc) {
    d3.select("#plotsContainer")
        .append("div")
        .attr("id", `plot_${id}`)
        .attr("class", "plot");

    // Specify the chart’s dimensions.
    const container = d3.select(`#plot_${id}`);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const marginTop = 15;
    const marginRight = 20;
    const marginBottom = 25;
    const marginLeft = 30;

    let selectedColor = "#589E4B";
    let unselectedColor = "grey";

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
    //
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

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x));

    // Add y-axis
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y));

    // Append the axis lines (grid lines)
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(
            d3
                .axisBottom(x)
                .tickSize(-height + marginTop + marginBottom)
                .tickFormat("")
        )
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .style("stroke-width", 0.5) // Thinner lines
                .style("stroke-opacity", 0.3)
        ); // Less opacity

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(
            d3
                .axisLeft(y)
                .tickSize(-width + marginLeft + marginRight)
                .tickFormat("")
        )
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .style("stroke-width", 0.5) // Thinner lines
                .style("stroke-opacity", 0.3)
        ); // Less opacity

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
                .style("r", isSelected ? 2.5 : 1.2)
                .style("fill-opacity", isSelected ? 0.5 : 0.2);
            // .style("r", isSelected ? 2.5 : 1.2);
        });
    });
}

export function createHistogram(field, id, data, pc) {
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

    let selectedColor = "#589E4B";
    let unselectedColor = "grey";

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

    // text
    svg.append("text")
        .attr("x", width - marginRight)
        .attr("y", marginTop + 5)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "black")
        .style("font-family", "sans-serif") // Set the font to sans-serif
        .text(field) // TODO: agregar Coeficiente de spearman y pearson
        .raise();

    // Append the axis lines (grid lines)
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(
            d3
                .axisBottom(x)
                .tickSize(-height + marginTop + marginBottom)
                .tickFormat("")
        )
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .style("stroke-width", 0.5) // Thinner lines
                .style("stroke-opacity", 0.3)
        ); // Less opacity

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(
            d3
                .axisLeft(y)
                .tickSize(-width + marginLeft + marginRight)
                .tickFormat("")
        )
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .style("stroke-width", 0.5) // Thinner lines
                .style("stroke-opacity", 0.3)
        ); // Less opacity

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

export function createParallelCoordinates(keys, keyz, id, data, pc) {
    // Specify chart dimensions
    const containerId = "plotsContainer";
    const width = 300;
    const height = keys.length * 120;
    // const height = 600
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

    const selections = new Map();

    function handleSelection(event, key) {
        let selection = event.selection;
        if (selection === null) {
            selections.delete(key);
        } else {
            selections.set(key, selection.map(x.get(key).invert));
        }
        let selected = [];
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

export function createBarPlot(field, id, data, pc) {
    d3.select("#plotsContainer")
        .append("div")
        .attr("id", `barplot_${id}`)
        .attr("class", "plot");

    const container = d3.select(`#barplot_${id}`);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const marginTop = 15;
    const marginRight = 20;
    const marginBottom = 25;
    const marginLeft = 30;

    let unselectedColor = "grey";

    // Use the provided categories (allCategories) to ensure all are present on the x-axis
    const categories = Array.from(new Set(data.map((d) => d[field])));

    // Define x-axis scale for categorical data
    const x = d3
        .scaleBand()
        .domain(categories)
        .range([marginLeft, width - marginRight])
        .padding(0.1);

    // Initialize bins for categories
    const bins = categories.map((cat) => ({
        category: cat,
        selected: 0,
        unselected: 0,
    }));

    // Assign data points to bins based on category and selection
    data.forEach((d, i) => {
        const bin = bins.find((b) => b.category === d[field]);
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

    // Define a color scale for the categories
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)  // Or any color scheme you prefer
        .domain(categories);

    // Add svg element
    const svg = d3
        .select(`#barplot_${id}`)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Add a transparent rectangle to capture clicks on the background
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent")
        .on("click", function(event) {
            // Handle click event on the background
            handleBackgroundClick();
        });

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x));

    // Add y-axis
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y));

    // Add text label
    svg.append("text")
        .attr("x", width - marginRight)
        .attr("y", marginTop + 5)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "black")
        .style("font-family", "sans-serif")
        .text(field);

    // Create bars (stacked for selected/unselected)
    const bar = svg
        .append("g")
        .selectAll("g")
        .data(bins)
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${x(d.category)},0)`);

    // Add unselected rect (drawn first, so it's behind)
    bar.append("rect")
        .attr("x", 1)
        .attr("width", x.bandwidth() - 1)
        .attr("y", d => y(d.unselected)) // Start at the top of the unselected area
        .attr("height", d => height - marginBottom - y(d.unselected)) // Height based on unselected count
        .attr("fill", unselectedColor)
        .on("click", function(event, d) {
            // Handle click event for unselected bars
            const clickedCategory = d.category;
            handleClick(clickedCategory);
        });

    // Add selected rect
    bar.append("rect")
        .attr("x", 1)
        .attr("width", x.bandwidth() - 1)
        .attr("y", d => y(d.selected + d.unselected)) // Start from the top of selected + unselected
        .attr("height", d => height - marginBottom - y(d.selected)) // Height based on selected count
        .attr("fill", d => colorScale(d.category)) // Use the color scale for selected bars
        .on("click", function(event, d) {
            // Handle click event for selected bars
            const clickedCategory = d.category;
            handleClick(clickedCategory);
        });

    // Handle click event for the bars
    function handleClick(clickedCategory) {
        const categoryIndexes = data
            .map((d, i) => (d[field] === clickedCategory ? i : null))
            .filter((i) => i !== null);

        // Toggle the selection of all data points in this category
        const selectedIndexes = [];
        categoryIndexes.forEach((i) => {
            if (selectedIndexes.includes(i)) {
                selectedIndexes.splice(selectedIndexes.indexOf(i), 1);
            } else {
                selectedIndexes.push(i);
            }
        });

        // Update the plot view with new selections
        pc.updatePlotsView(id, selectedIndexes);
    }

    // Handle click event for the background
    function handleBackgroundClick() {
        // Logic to execute when the background is clicked
        // console.log('Background clicked');
        // Example: clear all selections
        let selection = []
        for (let i = 0; i < data.length; i++) {
            selection.push(i);
        }
        pc.updatePlotsView(id, selection);
    }

    pc.addPlot(id, updateBarPlot);

    // Update the bar plot on selection
    function updateBarPlot() {
        bins.forEach((bin) => {
            bin.selected = 0;
            bin.unselected = 0;
        });

        data.forEach((d, i) => {
            const bin = bins.find((b) => b.category === d[field]);
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
            const unselectedRect = d3
                .select(this)
                .selectAll("rect")
                .filter(function () {
                    return d3.select(this).attr("fill") === unselectedColor;
                });

            const selectedRect = d3
                .select(this)
                .selectAll("rect")
                .filter(function () {
                    return d3.select(this).attr("fill") !== unselectedColor;
                });

            // Update the selected rect first so it's drawn below the unselected
            selectedRect
                .attr("height", height - marginBottom - y(bin.selected))
                .attr("y", y(bin.selected)); // Position based on selected + unselected height

            // Now update the unselected rect on top of the selected
            unselectedRect
                .attr("height", height - marginBottom - y(bin.unselected))
                .attr("y", y(bin.unselected + bin.selected)); // Positioned based on only unselected height
        });
    }
}




