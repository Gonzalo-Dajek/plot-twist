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
            fieldType: "numerical",
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

export function createScatterPlot(fields, options, plotDiv, data, updatePlotsFun, utils) {
    // fields & options
    let xField = fields.get("x-axis");
    let yField = fields.get("y-axis");

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

    const brushThrottleMs = 50;
    const transitionMs = 150;

    // fallback color + unselected color
    const fallbackColor = d3.scaleOrdinal(d3.schemeCategory10);
    const unselectedColor = "hsl(0, 0%, 75%)";

    // Normalize extents and avoid zero-width domains
    let xExtent = d3.extent(data, d => Number(d[xField]));
    if (xExtent[0] == null || xExtent[1] == null) xExtent = [0, 1];
    if (xExtent[0] === xExtent[1]) { xExtent[0] -= 0.5; xExtent[1] += 0.5; }

    let yExtent = d3.extent(data, d => Number(d[yField]));
    if (yExtent[0] == null || yExtent[1] == null) yExtent = [0, 1];
    if (yExtent[0] === yExtent[1]) { yExtent[0] -= 0.5; yExtent[1] += 0.5; }

    const x = d3.scaleLinear()
        .domain(xExtent)
        .nice()
        .range([marginLeft, width - marginRight])
        .unknown(marginLeft);

    const y = d3.scaleLinear()
        .domain(yExtent)
        .nice()
        .range([height - marginBottom, marginTop])
        .unknown(height - marginBottom);

    // SVG
    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Axes
    const xAxisG = svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(customTickFormat))
        .call((g) => g.select(".domain").remove())
        .call((g) => g.selectAll("text").style("text-anchor", "middle").style("font-size", "10px"))
        .call((g) => g.append("text")
            .attr("x", width - marginRight)
            .attr("y", -4)
            .attr("fill", "#000")
            .attr("font-weight", "bold")
            .attr("text-anchor", "end")
            .text(xField));

    const yAxisG = svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).ticks(7).tickFormat(customTickFormat))
        .call((g) => g.select(".domain").remove())
        .call((g) => g.select(".tick:last-of-type text").clone().attr("x", 4).attr("text-anchor", "start").attr("font-weight", "bold").text(yField));

    // grids
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).tickSize(-height + marginTop + marginBottom).tickFormat(""))
        .call((g) => g.select(".domain").remove())
        .call((g) => g.selectAll(".tick line").style("stroke-width", 0.5).style("stroke-opacity", 0.3));

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).tickSize(-width + marginLeft + marginRight).tickFormat(""))
        .call((g) => g.select(".domain").remove())
        .call((g) => g.selectAll(".tick line").style("stroke-width", 0.5).style("stroke-opacity", 0.3));

    // tooltip (reuse histogram style)
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("color", "#333")
        .style("background", "rgba(250, 250, 250, 0.9)")
        .style("padding", "6px 12px")
        .style("border-radius", "8px")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)")
        .style("font-size", "13px")
        .style("z-index", 10000)
        .style("opacity", 0)
        .style("transform", "translateY(5px)")
        .style("transition", "opacity 0.3s ease, transform 0.3s ease")
        .style("display", "none");

    // Keep track of hidden datasets
    const hiddenDatasets = new Set();

    // helper to access datasets of a row (copied logic from histogram)
    function dataSetsOfRow(i) {
        const u = utils();
        let others = [];
        if (typeof u.dataSetsOf === "function") {
            const res = u.dataSetsOf(i);
            if (Array.isArray(res)) others = res;
        } else if (Array.isArray(u.dataSestOf)) {
            const res = u.dataSestOf(i);
            if (Array.isArray(res)) others = res;
        } else if (Array.isArray(u.dataSetsOf)) {
            others = u.dataSetsOf;
        }

        // Include origin dataset if this row is selected (matching histogram behavior)
        const origin = typeof u.dataSet === "function" ? u.dataSet() : (u.dataSet || "");
        const isSelected = typeof u.isRowSelected === "function" ? !!u.isRowSelected(i) : !!u.isRowSelected;
        if (isSelected && origin) others.push(origin);

        // dedupe
        return Array.from(new Set(others || []));
    }

    function renderLegend(allDataSets, colors) {
        const outer = d3.select(plotDiv);
        outer.style("position", "relative");
        outer.selectAll(".legend-overlay").remove();

        const legendDiv = outer
            .append("div")
            .attr("class", "legend-overlay")
            .style("position", "absolute")
            .style("right", utils().allDataSets().length + 10 + "px")
            .style("top", -25 + "px")
            .style("display", "flex")
            .style("gap", "6px")
            .style("z-index", 9999)
            .style("pointer-events", "auto");

        const swatchSize = 16;
        const itemHeight = 18;

        const items = legendDiv.selectAll("div.legend-item").data(allDataSets, d => d);
        items.exit().remove();

        const enter = items.enter()
            .append("div")
            .attr("class", "legend-item")
            .style("display", "flex")
            .style("align-items", "center")
            .style("cursor", "pointer")
            .style("height", itemHeight + "px")
            .on("mouseover", function(event, d) {
                const rect = this.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                tooltip.html(d)
                    .style("left", (rect.left + scrollLeft + swatchSize + 8) + "px")
                    .style("top", (rect.top + scrollTop) + "px")
                    .style("display", "block")
                    .style("opacity", 1)
                    .on("transitionend", null);
            })
            .on("mousemove", function(event) {
                const rect = this.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                tooltip.style("left", (rect.left + scrollLeft + swatchSize + 8) + "px").style("top", (rect.top + scrollTop) + "px");
            })
            .on("mouseleave", function() {
                tooltip.style("opacity", 0).on("transitionend", function(event) {
                    if (event.propertyName === "opacity" && tooltip.style("opacity") === "0") {
                        tooltip.style("display", "none");
                        tooltip.on("transitionend", null);
                    }
                });
            })
            .on("click", function(event, d) {
                if (hiddenDatasets.has(d)) hiddenDatasets.delete(d);
                else hiddenDatasets.add(d);
                renderLegend(allDataSets, colors);
                updateScatter();
            });

        enter.append("div").attr("class", "legend-swatch").style("width", swatchSize + "px").style("height", swatchSize + "px").style("border-radius", "7px").style("border", "1px solid #ccc");

        enter.merge(items).select(".legend-swatch")
            .style("background-color", d => colors[d] || fallbackColor(d))
            .style("opacity", d => hiddenDatasets.has(d) ? 0.25 : 1);
    }

    // initial draw: dots bound to data
    const minRadius = 2.5;
    const maxRadius = 7;
    const radiusScale = d3.scaleLinear().domain([0, 500]).range([maxRadius, minRadius]).clamp(true);

    const dotsG = svg.append("g").attr("class", "dots-group");

    const dots = dotsG.selectAll("circle.dot").data(data).enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(Number(d[xField])))
        .attr("cy", d => y(Number(d[yField])))
        // initial neutral appearance; updateScatter will immediately re-style
        .attr("r", Math.max(1.2, radiusScale(data.length) / 2))
        .attr("fill", unselectedColor)
        .attr("fill-opacity", 0.7)
        .attr("stroke", "none")
        .on("mouseover", function(event, d) {
            const idx = data.indexOf(d);
            const ds = dataSetsOfRow(idx);
            const dsText = ds.length ? `<br/>datasets: ${ds.join(", ")}` : "";
            tooltip.html(`<strong>${xField}:</strong> ${d[xField]}<br/><strong>${yField}:</strong> ${d[yField]}${dsText}`)
                .style("left", (event.pageX + 8) + "px")
                .style("top", (event.pageY + 8) + "px")
                .style("display", "block");
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 8) + "px").style("top", (event.pageY + 8) + "px");
        })
        .on("mouseleave", function() { tooltip.style("display", "none"); });

    // regression clip
    svg.append("defs").append("clipPath").attr("id", "clip-scatter").append("rect")
        .attr("x", marginLeft)
        .attr("y", marginTop)
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom);

    // keep the legend in sync on initial render
    const initialUtils = utils();
    const initialAllDataSets = typeof initialUtils.allDataSets === "function" ? (initialUtils.allDataSets() || []) : (initialUtils.allDataSets || []);
    const initialColors = initialUtils.colorsPerDataSet || initialUtils.colors || {};
    renderLegend(initialAllDataSets, initialColors);

    // update loop
    function updateScatter() {
        const u = utils();
        let allDataSets = typeof u.allDataSets === "function" ? (u.allDataSets() || []) : (u.allDataSets || []);
        const colors = u.colorsPerDataSet || u.colors || {};

        // update legend
        renderLegend(allDataSets, colors);

        // compute visible/hidden dataset sets
        let visibleDatasets = new Set(allDataSets.filter(ds => !hiddenDatasets.has(ds)));

        // update dots' color and visibility based on dataset membership and selection
        dots.each(function(d, i) {
            const dsList = dataSetsOfRow(i);
            const belongsToAnyDataset = dsList.length > 0;

            // pick first non-hidden dataset
            let chosen = null;
            for (let j = 0; j < dsList.length; j++) {
                if (visibleDatasets.has(dsList[j])) { chosen = dsList[j]; break; }
            }

            const isSelected = chosen;
            const dsColor = chosen ? (colors[chosen] || fallbackColor(chosen)) : unselectedColor;

            // Now: do NOT hide dots visually. If no chosen dataset, render as grey small dot (unselected look).

            const node = d3.select(this);
            node.interrupt();

            node.style("display", null)
                // .transition().duration(transitionMs)
                .attr("r", isSelected ? 2.5 : 1.2)
                .style("fill", dsColor)
                .style("fill-opacity", 1)
                .style("opacity", 1);

            if (isSelected) node.raise();
        });

        // selected data used for regression / coefficients must exclude rows that belong exclusively to hidden datasets
        // compute visible datasets according to legend state
        allDataSets = utils().allDataSets() || [];
        visibleDatasets = new Set(allDataSets.filter(ds => !hiddenDatasets.has(ds)));

        // filteredData for stats: include rows that are selected AND belong to at least one visible dataset
        const selectedAndInVisibleDs = data.filter((d, i) => {
            // const isSel = typeof u.isRowSelected === "function" ? !!u.isRowSelected(i) : !!u.isRowSelected;
            // if (!isSel) return false;

            const dsList = dataSetsOfRow(i); // uses the helper added above
            if (!dsList || dsList.length === 0) return false; // exclude rows with no dataset
            return dsList.some(ds => visibleDatasets.has(ds));
        });

        updateRegressionLine(selectedAndInVisibleDs);
        updateCoefficients(selectedAndInVisibleDs);
    }

    if(isRegressionSelected){
        // Define the clipping pat
        svg.append("defs")
            .append("clipPath")
            .attr("id", "clip-scatter")
            .append("rect")
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom)
            .attr("x", marginLeft)
            .attr("y", marginTop);
    }


    // regression line updater — filtered by visible datasets for color choice & included rows
    function updateRegressionLine(filteredData) {
        // If not requested or not enough points, remove any existing line
        if (!isRegressionSelected) {
            svg.selectAll('.regression-line').remove();
            return;
        }
        if (!filteredData || filteredData.length < 2) {
            svg.selectAll('.regression-line').remove();
            return;
        }

        // compute regression function from filteredData
        const regression = calculateLinearRegression(filteredData, xField, yField);

        // pick origin dataset color
        const u = utils();
        const origin = typeof u.dataSet === "function" ? u.dataSet() : (u.dataSet || "");
        const colors = u.colorsPerDataSet || u.colors || {};
        const originColor = origin
            ? (colors[origin] || fallbackColor(origin))
            : u.dataSetColor();

        // data join (single datum) so we can transition the line
        const sel = svg.selectAll(".regression-line").data([null]);

        // enter -> append once, with final attributes overwritten by merge+transition
        const enter = sel.enter()
            .append("line")
            .attr("class", "regression-line")
            .attr("clip-path", "url(#clip-scatter)")
            .attr("stroke-width", 1)
            .attr("opacity", 0.9);

        // merge + transition to new endpoints and color
        enter.merge(sel)
            .transition()
            .duration(transitionMs)
            .attr("x1", x(x.domain()[0]))
            .attr("y1", y(regression(x.domain()[0])))
            .attr("x2", x(x.domain()[1]))
            .attr("y2", y(regression(x.domain()[1])))
            .attr("stroke", originColor);
    }

    function updateCoefficients(selectedData, visibleDatasets = null, colors = {}) {
        svg.selectAll('.correlation-text').remove();

        if ((!isPearsonSelected && !isSpearmanSelected) || !selectedData || selectedData.length < 2) return;

        let pearson;
        if (isPearsonSelected) {
            pearson = calculatePearson(selectedData, xField, yField).toFixed(2);
        }

        let spearman;
        if (isSpearmanSelected) {
            spearman = calculateSpearman(selectedData, xField, yField).toFixed(2);
        }

        const correlationText = svg.append("text")
            .attr("class", "correlation-text")
            .attr("x", width - marginRight)
            .attr("y", marginTop + 10)
            .attr("text-anchor", "end")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#000");

        const colorScale = d3.scaleLinear().domain([-1, 0, 1]).range(["red", "grey", "green"]);

        if (isPearsonSelected) {
            correlationText.append("tspan").attr("x", width - marginRight).attr("dy", "0em").text("Pearson: ");
            correlationText.append("tspan").attr("fill", colorScale(pearson)).text(pearson);
        }

        if (isSpearmanSelected) {
            correlationText.append("tspan").attr("x", width - marginRight).attr("dy", isPearsonSelected ? "1.2em" : "0em").text("Spearman: ");
            correlationText.append("tspan").attr("fill", colorScale(spearman)).text(spearman);
        }
    }

    // Brush behavior
    function handleSelection({ selection }) {
        let selectRanges;
        if (selection) {
            const [[x0, y0], [x1, y1]] = selection;
            let xRange = [x.invert(x0), x.invert(x1)];
            let yRange = [y.invert(y1), y.invert(y0)];
            selectRanges = [
                { range: xRange, field: xField, type: "numerical" },
                { range: yRange, field: yField, type: "numerical" },
            ];
        } else {
            selectRanges = [];
        }
        updatePlotsFun(selectRanges);
    }

    const throttledHandleSelection = throttle(handleSelection, brushThrottleMs);
    svg.call(d3.brush().extent([[marginLeft, marginTop], [width - marginRight, height - marginBottom]]).on("start brush end", throttledHandleSelection));

    // initial update
    updateScatter();

    // Return updater
    return function updateScatterWrapper() {
        updateScatter();
    };
}

// Pearson correlation coefficient
function calculatePearson(selectedData, xField, yField) {
    const xValues = selectedData.map((d) => +d[xField]);
    const yValues = selectedData.map((d) => +d[yField]);

    const xMean = d3.mean(xValues);
    const yMean = d3.mean(yValues);

    const numerator = d3.sum(xValues.map((x, i) => (x - xMean) * (yValues[i] - yMean)));
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

    return (x) => slope * x + intercept;
}

// Spearman rank correlation coefficient
function calculateSpearman(selectedData, xField, yField) {
    const xValues = selectedData.map((d) => +d[xField]);
    const yValues = selectedData.map((d) => +d[yField]);

    const xRanks = rank(xValues);
    const yRanks = rank(yValues);

    return calculatePearson(
        selectedData.map((d, i) => ({ [xField]: xRanks[i], [yField]: yRanks[i] })),
        xField,
        yField
    );
}

function rank(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return values.map((v) => sorted.indexOf(v) + 1);
}
