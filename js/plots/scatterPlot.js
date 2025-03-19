import * as d3 from "d3";
import throttle from "lodash-es/throttle.js";
import { customTickFormat } from "./plotsUtils/tickFormat.js";

export const scatterPlot = {
    plotName: "Scatter Plot",
    fields: [
        {
            isRequired: true,
            fieldType: "numerical",
            fieldName: "x-axis"
        },
        {
            isRequired: true,
            fieldType: "neither",
            fieldName: "y-axis"
        },
    ],
    options: [
        "linear regression",
        "Spearman coefficient",
        "Pearson coefficient",
    ],
    height: 1,
    width: 1,
    createPlotFunction: createScatterPlot,
};

export function createScatterPlot(fields, options, plotDiv, data, updatePlotsFun, isSelectedFun) {
    let xField = fields.get("x-axis");
    let yField = fields.get("y-axis");

    // let sizeField = fields.get("size");
    // let colorField = fields.get("color");
    let isRegressionSelected = options.get("linear regression");
    let isSpearmanSelected = options.get("Spearman coefficient");
    let isPearsonSelected = options.get("Pearson coefficient");

    const container = d3.select(plotDiv);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const marginTop = 10;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 40;

    let selectedColor = "#5C6BC0";
    let unselectedColor = "hsl(0, 0%, 75%)";

    // Creates the horizontal scale, null values on the left margin.
    const xMax = d3.max(data, (d) => Number(d[xField]));
    const xMin = d3.min(data, (d) => Number(d[xField]));
    const x = d3
        .scaleLinear()
        .domain([xMin, xMax])
        .nice()
        .range([marginLeft, width - marginRight])
        .unknown(marginLeft);

    // Creates the vertical scale, null values on the bottom margin.
    const yMax = d3.max(data, (d) => Number(d[yField]));
    const yMin = d3.min(data, (d) => Number(d[yField]));
    const y = d3
        .scaleLinear()
        .domain([yMin, yMax])
        .nice()
        .range([height - marginBottom, marginTop])
        .unknown(height - marginBottom);

    // Create the SVG container.
    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .property("value", []);

    // Append the axes.
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x)
                .ticks(5)  // Limit to 5 ticks
                .tickFormat(customTickFormat)
        )
        .call((g) => g.select(".domain").remove())  // Remove the axis line
        .call((g) =>
            g
                .selectAll("text")
                // .attr("transform", "rotate(45)")  // Rotate the labels
                .style("text-anchor", "middle")
                .style("font-size", "10px"),
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

    // Append grid lines
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
                .style("stroke-width", 0.5)
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
                .style("stroke-width", 0.5)
                .style("stroke-opacity", 0.3),
        );

    // Custom radius depending on the size of the dataset (up to 500)
    const minRadius = 2.5;
    const maxRadius = 7;
    const radiusScale = d3.scaleLinear()
        .domain([0, 500])
        .range([maxRadius, minRadius])
        .clamp(true);

    // Append the dots
    const dot = svg
        .append("g")
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(Number(d[xField])))
        .attr("cy", (d) => y(Number(d[yField])))
        .attr("r", radiusScale(data.length)) // radius
        .attr("fill", selectedColor) // Dot color
        .attr("fill-opacity", 0.7) // Transparency
        .attr("stroke", "none"); // border

    if(isRegressionSelected){
        // Calculate the linear regression line
        const regression = calculateLinearRegression(data, xField, yField);
        // Define the clipping path
        svg.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom)
            .attr("x", marginLeft)
            .attr("y", marginTop);

        // Append the regression line
        svg.append("line")
            .attr("x1", x(xMin))
            .attr("y1", y(regression(xMin)))
            .attr("x2", x(xMax))
            .attr("y2", y(regression(xMax)))
            .attr("stroke", "black")
            .attr("opacity", 0.3)
            .attr("stroke-width", 1);
    }

    const throttledHandleSelection = throttle(handleSelection, 50);
    // const throttledHandleSelection = throttle(handleSelection, Math.max(20, Math.min(data.length/10, 1000)));

    svg.call(
        d3
            .brush()
            .extent([
                [marginLeft, marginTop],
                [width - marginRight, height - marginBottom],
            ])
            .on("start brush end", throttledHandleSelection),
    );

    // Function to update the regression line
    function updateRegressionLine(selectedData) {
        svg.selectAll(".regression-line").remove();

        if (selectedData.length < 2) {
            return;
        }

        // Recalculate the linear regression
        if(isRegressionSelected){
            const regression = calculateLinearRegression(
                selectedData,
                xField,
                yField,
            );

            // Append the updated regression line within the clipping path
            svg.append("line")
                .attr("class", "regression-line")
                .attr("x1", x(xMin))
                .attr("y1", y(regression(xMin)))
                .attr("x2", x(xMax))
                .attr("y2", y(regression(xMax)))
                .attr("stroke", "#465191")
                .attr("stroke-width", 1)
                .attr("clip-path", "url(#clip)");
        }
    }

    function updateCoefficients(selectedData) {
        svg.selectAll(".correlation-text").remove();
        // Calculate Pearson and Spearman coefficients
        let pearson;
        if(isPearsonSelected){
            pearson = calculatePearson(selectedData, xField, yField).toFixed(
                2
            );
        }

        let spearman
        if(isSpearmanSelected){
            spearman = calculateSpearman(
                selectedData,
                xField,
                yField
            ).toFixed(2);
        }

        // text for Pearson and Spearman coefficients in the top-right corner
        const correlationText = svg.append("text")
            .attr("class", "correlation-text")
            .attr("x", width - marginRight)
            .attr("y", marginTop + 10)
            .attr("text-anchor", "end")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#000");

        const colorScale = d3.scaleLinear()
            .domain([-1, 0, 1])
            .range(["red", "grey", "green"]);

        if (isPearsonSelected) {
            correlationText.append("tspan")
                .attr("x", width - marginRight)
                .attr("dy", "0em") // First line at the starting position
                .text("Pearson: ");

            correlationText.append("tspan")
                .attr("fill", colorScale(pearson))
                .text(pearson);
        }

        if (isSpearmanSelected) {
            correlationText.append("tspan")
                .attr("x", width - marginRight)
                .attr("dy", isPearsonSelected ? "1.2em" : "0em") // Move down if Pearson is also selected
                .text("Spearman: ");

            correlationText.append("tspan")
                .attr("fill", colorScale(spearman))
                .text(spearman);
        }
    }

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
            selectRanges = [];
        }

        updatePlotsFun(selectRanges);
    }

    return () => {
        dot.each(function(d, i) {
            const isSelected = isSelectedFun(i);

            d3.select(this)
                .style("fill", isSelected ? selectedColor : unselectedColor)
                .attr("r", isSelected ? radiusScale(data.length) : (radiusScale(data.length) / 2))
                .style("fill-opacity", isSelected ? 1 : 1)
                // .style("r", isSelected ? 2.5 : 1.2);

            if (isSelected) {
                d3.select(this).raise();  // Bring selected dots to the top
            }
        });

        const selectedData = data.filter((d, i) => isSelectedFun(i));
        updateRegressionLine(selectedData);
        updateCoefficients(selectedData);
    }
}

// Pearson correlation coefficient
function calculatePearson(selectedData, xField, yField) {
    const xValues = selectedData.map((d) => +d[xField]);
    const yValues = selectedData.map((d) => +d[yField]);

    const xMean = d3.mean(xValues);
    const yMean = d3.mean(yValues);

    const numerator = d3.sum(
        xValues.map((x, i) => (x - xMean) * (yValues[i] - yMean))
    );
    const denominator = Math.sqrt(
        d3.sum(xValues.map((x) => Math.pow(x - xMean, 2))) *
        d3.sum(yValues.map((y) => Math.pow(y - yMean, 2)))
    );

    return numerator / denominator;
}

// calculates linear regression coefficients
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

// Spearman rank correlation coefficient
function calculateSpearman(selectedData, xField, yField) {
    const xValues = selectedData.map((d) => +d[xField]);
    const yValues = selectedData.map((d) => +d[yField]);

    // Rank the x and y values
    const xRanks = rank(xValues);
    const yRanks = rank(yValues);

    // Calculate Pearson correlation on the ranks
    return calculatePearson(
        selectedData.map((d, i) => ({
            [xField]: xRanks[i],
            [yField]: yRanks[i],
        })),
        xField,
        yField
    );
}

// calculates ranks
function rank(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return values.map((v) => sorted.indexOf(v) + 1);
}
