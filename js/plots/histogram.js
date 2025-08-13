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

export function createHistogram(fields, options, plotDiv, data, updatePlotsFun, utils) {
    const field = fields.get("bin-variable");
    const container = d3.select(plotDiv);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const marginTop = 10;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 40;

    const brushThrottleMs = 50; // confirmed default
    const transitionMs = 150;
    const barInnerPadding = 2; // px between group bars

    // Build x scale & bins (static bins like before)
    let [min, max] = d3.extent(data, (d) => Number(d[field]));
    if (min === max) { min -= 0.5; max += 0.5; }

    const x = d3
        .scaleLinear()
        .domain([min, max])
        .range([marginLeft, width - marginRight]);

    const binGenerator = d3.bin()
        .domain(x.domain())
        .thresholds(x.ticks());

    let rawBins = binGenerator(data.map(d => Number(d[field])));

    // convert to consistent bin objects
    let bins = rawBins.map(b => ({ x0: b.x0, x1: b.x1 }));

    // fallback color scale
    const fallbackColor = d3.scaleOrdinal(d3.schemeCategory10);

    // SVG
    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Axes + grids
    const xAxisG = svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(customTickFormat));

    const y = d3.scaleLinear().range([height - marginBottom, marginTop]);

    const yAxisG = svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`);

    // Title text
    svg.append("text")
        .attr("x", width - marginRight)
        .attr("y", marginTop + 5)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "black")
        .style("font-family", "sans-serif")
        .text(field)
        .raise();

    // grid lines (x and y)
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(
            d3.axisBottom(x)
                .tickSize(-height + marginTop + marginBottom)
                .tickFormat("")
        )
        .call((g) => g.select(".domain").remove())
        .call((g) => g.selectAll(".tick line").style("stroke-width", 0.5).style("stroke-opacity", 0.3));

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(
            d3.axisLeft(y)
                .tickSize(-width + marginLeft + marginRight)
                .tickFormat("")
        )
        .call((g) => g.select(".domain").remove())
        .call((g) => g.selectAll(".tick line").style("stroke-width", 0.5).style("stroke-opacity", 0.3));

    // Containers for bars and legend
    const barsG = svg.append("g").attr("class", "bars-group");

    // Legend container (we'll bind items later)
    const legendContainer = svg.append("g").attr("class", "legend-group");

    // Keep track of hidden datasets from legend clicks
    const hiddenDatasets = new Set();

    // Compute counts given the current utils() state
    function computeCounts() {
        const u = utils();
        const origin = typeof u.dataSet === "function" ? u.dataSet() : (u.dataSet || "");
        const allDataSets = typeof u.allDataSets === "function" ? (u.allDataSets() || []) : (u.allDataSets || []);
        const colors = u.colorsPerDataSet || u.colors || {};

        // initialize counts per bin
        const countsPerBin = bins.map(() => ({ total: 0, datasets: {} }));
        // ensure dataset keys initialized to 0 for consistent ordering
        bins.forEach((b, bi) => {
            allDataSets.forEach(ds => countsPerBin[bi].datasets[ds] = 0);
        });

        data.forEach((d, i) => {
            const value = Number(d[field]);
            const binIdx = bins.findIndex((b, idx) =>
                b.x0 <= value && (value < b.x1 || (idx === bins.length - 1 && value <= b.x1))
            );
            if (binIdx < 0) return;
            const binCounts = countsPerBin[binIdx];
            binCounts.total += 1; // grey background counts all rows

            const isSelected = typeof u.isRowSelected === "function" ? !!u.isRowSelected(i) : !!(u.isRowSelected);

            // increment origin if selected
            if (isSelected && origin) {
                // guard if origin not present in allDataSets
                if (!(origin in binCounts.datasets)) binCounts.datasets[origin] = 0;
                binCounts.datasets[origin] += 1;
            }

            // other datasets from dataSetsOf(i)
            let others = [];
            if (typeof u.dataSetsOf === "function") {
                const res = u.dataSetsOf(i);
                if (Array.isArray(res)) others = res;
            } else if (Array.isArray(u.dataSestOf)) {
                // alternate name
                const res = u.dataSestOf(i);
                if (Array.isArray(res)) others = res;
            } else if (Array.isArray(u.dataSetsOf)) {
                // maybe dataSetsOf passed as array (unlikely)
                others = u.dataSetsOf;
            }

            // normalize and dedupe; include origin if present but avoid double-counting same dataset twice
            const uniqueOthers = Array.from(new Set(others || []));
            uniqueOthers.forEach(ds => {
                if (!(ds in binCounts.datasets)) binCounts.datasets[ds] = 0;
                // if ds === origin and we've already added origin due to isRowSelected, avoid double counting
                if (ds === origin && isSelected) return; // dedupe
                binCounts.datasets[ds] += 1;
            });
        });

        return { countsPerBin, allDataSets, colors, origin };
    }

    // initial render and elements creation
    function initialRender() {
        // compute once to build elements
        const { countsPerBin, allDataSets, colors } = computeCounts();

        // compute y domain using counts
        const maxDatasetCount = d3.max(countsPerBin, bin => d3.max(allDataSets.map(ds => bin.datasets[ds] || 0))) || 0;
        const maxTotal = d3.max(countsPerBin, bin => bin.total) || 0;
        y.domain([0, Math.max(maxDatasetCount, maxTotal)]);

        // y axis
        yAxisG.call(d3.axisLeft(y).ticks(7).tickFormat(customTickFormat));

        // bar groups per bin
        const binGroups = barsG.selectAll("g.bin-group")
            .data(bins)
            .enter()
            .append("g")
            .attr("class", "bin-group")
            .attr("transform", d => `translate(${x(d.x0)},0)`);

        // background grey rect
        binGroups.append("rect")
            .attr("class", "bg-rect")
            .attr("x", 0)
            .attr("width", d => Math.max(1, x(d.x1) - x(d.x0)))
            .attr("y", (d,i) => y(countsPerBin[i].total))
            .attr("height", (d,i) => (height - marginBottom) - y(countsPerBin[i].total))
            .attr("fill", "#e6e6e6")
            .on("mouseover", function(event, d) {
                const i = bins.indexOf(d);
                const binInfo = countsPerBin[i];
                const lines = Object.keys(binInfo.datasets).map(ds => `${ds}: ${binInfo.datasets[ds]}`);
                tooltip.html(`<strong>bin</strong><br/>total: ${binInfo.total}<br/>${lines.join('<br/>')}`)
                    .style("left", (event.pageX + 8) + "px")
                    .style("top", (event.pageY + 8) + "px")
                    .style("display", "block");
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 8) + "px")
                    .style("top", (event.pageY + 8) + "px");
            })
            .on("mouseleave", function() {
                tooltip.style("display", "none");
            });

        // groups for dataset bars inside each bin
        // IMPORTANT: use the already-captured allDataSets and countsPerBin; do NOT call computeCounts() here.
        binGroups.selectAll("g.dataset-bar")
            .data((d, i) => {
                const counts = countsPerBin[i].datasets;
                return allDataSets.map((ds, idx) => ({ name: ds, count: counts[ds] || 0, binIndex: i, idx }));
            })
            .enter()
            .append("g")
            .attr("class", "dataset-bar")
            .each(function(d) {
                const g = d3.select(this);
                g.append("rect").attr("class", "bar-rect");
            });

        // legend
        renderLegend(allDataSets, colors);
    }

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
        // .style("display", "none");

    // Render or update legend items
    function renderLegend(allDataSets, colors) {
        const outer = d3.select(plotDiv);
        outer.style("position", "relative");

        // Remove any old legend overlay on the host element
        outer.selectAll(".legend-overlay").remove();

        // Position legend on the left, below marginTop
        const legendDiv = outer
            .append("div")
            .attr("class", "legend-overlay")
            .style("position", "absolute")
            .style("right", utils().allDataSets().length +10 + "px")
            .style("top", -25 + "px")
            .style("display", "flex")
            // .style("flex-direction", "column") // vertical stacking
            .style("gap", "6px") // matches gap from second function
            .style("z-index", 9999)
            .style("pointer-events", "auto");

        const swatchSize = 16;
        const itemHeight = 18; // keep spacing consistent with second function

        const items = legendDiv.selectAll("div.legend-item")
            .data(allDataSets, d => d);

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

                tooltip.style("left", (rect.left + scrollLeft + swatchSize + 8) + "px")
                    .style("top", (rect.top + scrollTop) + "px");
            })
            .on("mouseleave", function() {
                tooltip.style("opacity", 0)
                    .on("transitionend", function(event) {
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
                updateHistogram();
            });

        enter.append("div")
            .attr("class", "legend-swatch")
            .style("width", swatchSize + "px")
            .style("height", swatchSize + "px")
            .style("border-radius", "7px") // rounder
            .style("border", "1px solid #ccc");

        enter.merge(items)
            .select(".legend-swatch")
            .style("background-color", d => colors[d] || fallbackColor(d))
            .style("opacity", d => hiddenDatasets.has(d) ? 0.25 : 1);
    }


    // update loop: recompute counts and update DOM with transitions
    function updateHistogram() {
        const { countsPerBin, allDataSets, colors } = computeCounts();

        // ensure legend is in sync
        renderLegend(allDataSets, colors);

        // recompute y domain
        const maxDatasetCount = d3.max(countsPerBin, bin => d3.max(allDataSets.map(ds => bin.datasets[ds] || 0))) || 0;
        const maxTotal = d3.max(countsPerBin, bin => bin.total) || 0;
        const yMax = Math.max(maxDatasetCount, maxTotal);
        y.domain([0, yMax]);

        yAxisG.transition().duration(transitionMs).call(d3.axisLeft(y).ticks(7).tickFormat(customTickFormat));

        // update background rects
        const binGroups = barsG.selectAll("g.bin-group").data(bins);

        // update bg rect
        binGroups.selectAll("rect.bg-rect")
            .data((d, i) => [countsPerBin[i]])
            .join(
                enter => enter,
                update => update.transition().duration(transitionMs)
                    .attr("y", (c) => y(c.total))
                    .attr("height", (c) => (height - marginBottom) - y(c.total))
            );

        // update dataset rects inside each bin
        binGroups.each(function(bin, bi) {
            const g = d3.select(this);
            const binWidth = Math.max(1, x(bin.x1) - x(bin.x0));
            const dsList = allDataSets;
            const N = dsList.length || 1;
            const innerWidth = Math.max(0, (binWidth - (N - 1) * barInnerPadding) / N);

            // prepare data for bind
            const dsData = dsList.map((ds, idx) => ({ name: ds, count: countsPerBin[bi].datasets[ds] || 0, idx }));

            const dsG = g.selectAll("g.dataset-bar").data(dsData, d => d.name);

            // update existing rects
            dsG.selectAll("rect.bar-rect")
                .data(d => [d])
                .join("rect")
                .attr("class", "bar-rect")
                .attr("x", d => d.idx * (innerWidth + barInnerPadding))
                .attr("width", innerWidth)
                .on("mouseover", function(event, d) {
                    tooltip.html(
                        `<strong>${d.name}</strong><br/>count: ${d.count}<br/>total: ${countsPerBin[d.binIndex].total}`
                    )
                        .style("left", (event.pageX + 8) + "px")
                        .style("top", (event.pageY + 8) + "px")
                        .style("display", "block");
                })
                .on("mousemove", function(event) {
                    tooltip
                        .style("left", (event.pageX + 8) + "px")
                        .style("top", (event.pageY + 8) + "px");
                })
                .on("mouseleave", function() {
                    tooltip.style("display", "none");
                })
                .transition()
                .duration(transitionMs)
                .attr("y", d => y(d.count))
                .attr("height", d => (height - marginBottom) - y(d.count))
                .style("fill", d => colors[d.name] || fallbackColor(d.name))
                .style("opacity", d => hiddenDatasets.has(d.name) ? 0 : 1);


            // enter selection for new datasets (if any)
            const dsEnter = dsG.enter().append("g").attr("class", "dataset-bar");
            dsEnter.append("rect").attr("class", "bar-rect")
                .attr("x", d => d.idx * (innerWidth + barInnerPadding))
                .attr("width", innerWidth)
                .attr("y", d => y(d.count))
                .attr("height", d => (height - marginBottom) - y(d.count))
                .style("fill", d => colors[d.name] || fallbackColor(d.name))
                .style("opacity", d => hiddenDatasets.has(d.name) ? 0 : 1)
                .on("mouseover", function(event, d) {
                    tooltip.html(`<strong>${d.name}</strong><br/>count: ${d.count}<br/>total: ${countsPerBin[bi].total}`)
                        .style("left", (event.pageX + 8) + "px")
                        .style("top", (event.pageY + 8) + "px")
                        .style("display", "block");
                })
                .on("mousemove", function(event) { tooltip.style("left", (event.pageX + 8) + "px").style("top", (event.pageY + 8) + "px"); })
                .on("mouseleave", function() { tooltip.style("display", "none"); });

            dsG.exit().remove();
        });

    }

    // initial draw
    initialRender();

    // Brush behavior
    function handleSelection({ selection }) {
        let selectRanges;
        if (selection) {
            const [x0, x1] = selection;
            let xRange = [x.invert(x0), x.invert(x1)];
            selectRanges = [ { range: xRange, field: field, type: "numerical" } ];
        } else {
            selectRanges = [];
        }
        updatePlotsFun(selectRanges);
    }

    const throttledHandleSelection = throttle(handleSelection, brushThrottleMs);
    svg.call(
        d3.brushX()
            .extent([
                [marginLeft, marginTop],
                [width - marginRight, height - marginBottom],
            ])
            .on("start brush end", throttledHandleSelection),
    );

    // Return updater
    return function updateHistogramWrapper() {
        // each update must re-check utils() per spec
        updateHistogram();
    };
}
