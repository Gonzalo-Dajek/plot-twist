import * as d3 from "d3";
import throttle from "lodash-es/throttle.js";
import { createButtons } from "./plotsUtils/plotButtons.js";
import { customTickFormat } from "./plotsUtils/ticks.js";

export function createScatterPlot(xField, yField, id, data, pc, gridPos) {
    const divId = `scatterPlot_${id}_${xField}_${yField}`;

    d3.select("#plotsContainer")
        .append("div")
        .attr("id", divId)
        .attr("class", "plot gridBox")
        .style("grid-column", gridPos.col)
        .style("grid-row", gridPos.row);

    // Specify the chart’s dimensions.
    const container = d3.select(`#${divId}`);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight - 40;

    const marginTop = 10;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 40;

    let selectedColor = "#5C6BC0";
    let unselectedColor = "hsl(0, 0%, 75%)";

    let btns = createButtons(container, pc, id);
    let setActiveButton = btns.setActiveButton;

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
        .select(`#${divId}`)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .property("value", []);

// Append the axes.
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x)
                .ticks(5)  // Limit to 5 ticks

                .tickFormat(customTickFormat)  // Use the custom tick format
            // .tickFormat(d3.format(".4s"))  // Format large numbers with abbreviations (e.g., 1k, 1M)
        )
        .call((g) => g.select(".domain").remove())  // Remove the axis line
        .call((g) =>
            g
                .selectAll("text")  // Select the existing tick labels
                // .attr("transform", "rotate(45)")  // Rotate the labels (commented out)
                .style("text-anchor", "middle")  // Align text to the end for better readability
                .style("font-size", "10px"),  // Reduce font size if needed
        )
        .call((g) =>
            g
                .append("text")
                .attr("x", width - marginRight)
                .attr("y", -4)
                .attr("fill", "#000")
                .attr("font-weight", "bold")
                .attr("text-anchor", "end")
                .text(xField),
        );


// Add y-axis
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).ticks(7).tickFormat(customTickFormat))  // Set to 7 ticks with custom formatting
        .call((g) => g.select(".domain").remove())  // Remove the axis line
        .call((g) =>
            g
                .select(".tick:last-of-type text")  // Clone the last tick label
                .clone()
                .attr("x", 4)
                .attr("text-anchor", "start")
                .attr("font-weight", "bold")
                .text(yField)
        );


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
        ); // Less opacity

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
        .attr("fill-opacity", 0.7) // Transparency
        .attr("stroke", "none"); // border

    // Calculate the linear regression line
    const regression = calculateLinearRegression(data, xField, yField);
    // Append the regression line
    // Define the clipping path
    svg.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom)
        .attr("x", marginLeft)
        .attr("y", marginTop);

    svg.append("line")
        .attr("x1", x(xMin))
        .attr("y1", y(regression(xMin)))
        .attr("x2", x(xMax))
        .attr("y2", y(regression(xMax)))
        .attr("stroke", "black")
        .attr("opacity", 0.3)
        .attr("stroke-width", 1);

    // // Pearson correlation coefficient
    // function calculatePearson(selectedData, xField, yField) {
    //     const xValues = selectedData.map((d) => +d[xField]);
    //     const yValues = selectedData.map((d) => +d[yField]);
    //
    //     const xMean = d3.mean(xValues);
    //     const yMean = d3.mean(yValues);
    //
    //     const numerator = d3.sum(
    //         xValues.map((x, i) => (x - xMean) * (yValues[i] - yMean))
    //     );
    //     const denominator = Math.sqrt(
    //         d3.sum(xValues.map((x) => Math.pow(x - xMean, 2))) *
    //             d3.sum(yValues.map((y) => Math.pow(y - yMean, 2)))
    //     );
    //
    //     return numerator / denominator;
    // }

    // // Spearman rank correlation coefficient
    // function calculateSpearman(selectedData, xField, yField) {
    //     const xValues = selectedData.map((d) => +d[xField]);
    //     const yValues = selectedData.map((d) => +d[yField]);
    //
    //     // Rank the x and y values
    //     const xRanks = rank(xValues);
    //     const yRanks = rank(yValues);
    //
    //     // Calculate Pearson correlation on the ranks
    //     return calculatePearson(
    //         selectedData.map((d, i) => ({
    //             [xField]: xRanks[i],
    //             [yField]: yRanks[i],
    //         })),
    //         xField,
    //         yField
    //     );
    // }

    // // Helper function to calculate ranks
    // function rank(values) {
    //     const sorted = [...values].sort((a, b) => a - b);
    //     return values.map((v) => sorted.indexOf(v) + 1);
    // }

    // Create the brush behavior.
    function handleSelection({ selection }) {
        let selectRanges;
        if (selection) {
            const [[x0, y0], [x1, y1]] = selection;
            let xRange = [x.invert(x0), x.invert(x1)];
            let yRange = [y.invert(y1), y.invert(y0)];
            selectRanges = [
                {
                    range: xRange,
                    field: xField,
                    type: "numerical",
                },
                {
                    range: yRange,
                    field: yField,
                    type: "numerical",
                },
            ];
        } else {
            // selectRanges = [];
            selectRanges = [
                {
                    range: null,
                    xField: xField,
                    type: "numerical",
                },
                {
                    range: null,
                    field: yField,
                    type: "numerical",
                },
            ];
            setActiveButton("AND");
            pc.changeSelectionMode(id, "AND");
        }

        pc.updatePlotsView(id, selectRanges);
        // console.log(selectRanges);
    }

    const throttledHandleSelection = throttle(handleSelection, 50);

    svg.call(
        d3
            .brush()
            .extent([
                [marginLeft, marginTop],
                [width - marginRight, height - marginBottom],
            ])
            .on("start brush end", throttledHandleSelection),
    );

    pc.addPlot(id, function updateScatterPlot() {
        dot.each(function(d, i) {
            const isSelected = pc.isSelected(i); // Check if index i is in the selection array

            d3.select(this)
                .style("fill", isSelected ? selectedColor : unselectedColor)
                .style("r", isSelected ? 2.7 : 1.4)
                .style("fill-opacity", isSelected ? 0.8 : 0.2);

            // if (isSelected) {
            //     d3.select(this).raise();  // Bring selected dots to the top
            // }
            // .style("r", isSelected ? 2.5 : 1.2);
        });

        const selectedData = data.filter((d, i) => pc.isSelected(i));
        updateRegressionLine(selectedData);
    });

    // Function to update the regression line
    function updateRegressionLine(selectedData) {
        // Remove the old regression line
        svg.selectAll(".regression-line").remove();

        // Check if there's enough data to compute a regression
        if (selectedData.length < 2) {
            return; // No regression if fewer than 2 points are selected
        }

        // Recalculate the linear regression
        const regression = calculateLinearRegression(
            selectedData,
            xField,
            yField,
        );

        // Append the updated regression line within the clipping path
        svg.append("line")
            .attr("class", "regression-line") // Add a class for easy reference
            .attr("x1", x(xMin))
            .attr("y1", y(regression(xMin)))
            .attr("x2", x(xMax))
            .attr("y2", y(regression(xMax)))
            .attr("stroke", "#465191")
            .attr("stroke-width", 1)
            .attr("clip-path", "url(#clip)"); // Apply the clipping path

        svg.selectAll(".correlation-text").remove();

        // // Calculate Pearson and Spearman coefficients
        // const pearson = calculatePearson(selectedData, xField, yField).toFixed(
        //     2
        // );
        // const spearman = calculateSpearman(
        //     selectedData,
        //     xField,
        //     yField
        // ).toFixed(2);
        //
        // // Add text for Pearson and Spearman coefficients in the top-right corner
        // svg.append("text")
        //     .attr("class", "correlation-text")
        //     .attr("x", width - marginRight)
        //     .attr("y", marginTop + 10)
        //     .attr("text-anchor", "end")
        //     .attr("font-size", "12px")
        //     .attr("font-weight", "bold")
        //     .attr("fill", "#000")
        //     .text(`Pearson: ${pearson}, Spearman: ${spearman}`);
    }

    // Function to calculate linear regression coefficients
    function calculateLinearRegression(data, xField, yField) {
        const n = data.length;
        let sumX = 0,
            sumY = 0,
            sumXY = 0,
            sumX2 = 0;

        data.forEach((d) => {
            const xVal = Number(d[xField]);
            const yVal = Number(d[yField]);
            sumX += xVal;
            sumY += yVal;
            sumXY += xVal * yVal;
            sumX2 += xVal * xVal;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Return the regression function
        return (x) => slope * x + intercept;
    }
}
