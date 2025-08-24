import * as d3 from "d3";
import throttle from "lodash-es/throttle.js";
import { customTickFormat } from "./plotsUtils/tickFormat.js";

export const parallelCoordinates = {
    plotName: "Parallel Coordinates",
    fields: [
        { fieldType: "numerical", isRequired: true, fieldName: "1st axis" },
        { fieldType: "numerical", isRequired: true, fieldName: "2nd axis" },
        { fieldType: "numerical", isRequired: false, fieldName: "3rd axis" },
        { fieldType: "numerical", isRequired: false, fieldName: "4th axis" },
        { fieldType: "numerical", isRequired: false, fieldName: "5th axis" },
        { fieldType: "numerical", isRequired: false, fieldName: "6th axis" },
        { fieldType: "numerical", isRequired: false, fieldName: "7th axis" },
        { fieldType: "numerical", isRequired: false, fieldName: "8th axis" }
    ],
    options: [],
    height: 2,
    width: 1,
    createPlotFunction: createParallelCoordinates,
};

export function createParallelCoordinates(fields, options, plotDiv, data, updatePlotsFun, utils) {
    const keys = parallelCoordinates.fields
        .map(field => fields.get(field.fieldName))
        .filter(value => value !== "");

    // color-by categorical dataset (same approach as scatter)
    const container = d3.select(plotDiv);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const marginTop = 20;
    const marginRight = 15;
    const marginBottom = 30;
    const marginLeft = 15;

    const unselectedColor = "grey";
    const fallbackColor = d3.scaleOrdinal(d3.schemeCategory10);

    // horizontal x scale per key (ensure safe domains)
    const x = new Map(
        Array.from(keys, (key) => {
            let extent = d3.extent(data, (d) => {
                const v = Number(d[key]);
                return Number.isFinite(v) ? v : null;
            });
            if (extent[0] == null || extent[1] == null) extent = [0, 1];
            if (extent[0] === extent[1]) { extent[0] -= 0.5; extent[1] += 0.5; }
            return [
                key,
                d3.scaleLinear().domain(extent).nice().range([marginLeft, width - marginRight]).unknown(marginLeft)
            ];
        })
    );

    // y layout for axes
    const y = d3.scalePoint().domain(keys).range([marginTop, height - marginBottom]);

    // Keep track of hidden datasets like scatter
    const hiddenDatasets = new Set();

    // tooltip for legend (copied style from scatter)
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

    // helper for dataset membership of a row
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

        const origin = typeof u.dataSet === "function" ? u.dataSet() : (u.dataSet || "");
        const isSelected = typeof u.isRowSelected === "function" ? !!u.isRowSelected(i) : !!u.isRowSelected;
        if (isSelected && origin) others.push(origin);

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
            .style("right", utils().allDataSets ? (utils().allDataSets().length + 10 + "px") : "10px")
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
                updateParallel();
            });

        enter.append("div").attr("class", "legend-swatch")
            .style("width", swatchSize + "px")
            .style("height", swatchSize + "px")
            .style("border-radius", "7px")
            .style("border", "1px solid #ccc");

        enter.merge(items).select(".legend-swatch")
            .style("background-color", d => colors[d] || fallbackColor(d))
            .style("opacity", d => hiddenDatasets.has(d) ? 0.25 : 1);
    }

    // SVG container
    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .property("value", []);

    // line generator
    const line = d3.line()
        .defined(([, value]) => value != null)
        .x(([key, value]) => x.get(key)(value))
        .y(([key]) => y(key));

    // group for data paths
    const pathsG = svg.append("g")
        .attr("fill", "none")
        .attr("class", "data-paths")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.4);

    const pathSelection = pathsG.selectAll("path")
        .data(data)
        .join("path")
        .attr("d", (d) => line(keys.map((key) => [key, d[key]])))
        // initial stroke based on first axis continuous fallback (this will be overridden by updateParallel immediately)
        .attr("stroke", unselectedColor)
        .append("title")
        .text((d) => d.name);

    // axes
    const axes = svg.append("g")
        .selectAll("g")
        .data(keys)
        .join("g")
        .attr("transform", (d) => `translate(0,${y(d)})`)
        .each(function (d) {
            d3.select(this).call(d3.axisBottom(x.get(d)).ticks(5).tickFormat(customTickFormat));
        })
        .call((g) =>
            g.append("text")
                .attr("x", marginLeft)
                .attr("y", -6)
                .attr("text-anchor", "start")
                .attr("fill", "currentColor")
                .text((d) => d)
        )
        .call((g) =>
            g.selectAll("text")
                .clone(true)
                .lower()
                .attr("fill", "none")
                .attr("stroke-width", 5)
                .attr("stroke-linejoin", "round")
                .attr("stroke", "white")
        );

    // Brush behaviour (per-axis) — keep original semantics but wire to updatePlotsFun
    const selectionsFromAxis = new Map();

    function handleSelection(event, fieldSelected) {
        const selection = event.selection;
        if (selection === null) {
            selectionsFromAxis.delete(fieldSelected);
        } else {
            // convert pixels -> domain values
            const vals = selection.map(v => x.get(fieldSelected).invert(v));
            selectionsFromAxis.set(fieldSelected, vals);
        }

        const selectRanges = Array.from(
            selectionsFromAxis,
            ([field, [min, max]]) => ({
                range: [min, max],
                field: field,
                type: "numerical",
            })
        );

        updatePlotsFun(selectRanges);
    }

    const throttledHandleSelection = throttle((event, field) => handleSelection(event, field), 50);

    const brushHeight = 50;
    const brush = d3.brushX()
        .extent([[marginLeft, -(brushHeight / 2)], [width - marginRight, brushHeight / 2]]);

    // attach a brush per axis g; pass datum (the key) into handler
    axes.call(g => g.call(brush.on("start brush end", function(event, d) { throttledHandleSelection(event, d); })));

    // initial legend render using utils
    const initialUtils = utils();
    const initialAllDataSets = typeof initialUtils.allDataSets === "function" ? (initialUtils.allDataSets() || []) : (initialUtils.allDataSets || []);
    const initialColors = initialUtils.colorsPerDataSet || initialUtils.colors || {};
    renderLegend(initialAllDataSets, initialColors);

    // main updater that matches scatter logic for visibility and coloring
    function updateParallel() {
        const u = utils();
        let allDataSets = typeof u.allDataSets === "function" ? (u.allDataSets() || []) : (u.allDataSets || []);
        const colors = u.colorsPerDataSet || u.colors || {};
        const visibleDatasets = new Set(allDataSets.filter(ds => !hiddenDatasets.has(ds)));

        // update legend to reflect current state (use latest arrays)
        renderLegend(allDataSets, colors);

        // update every path based on dataset membership and row selection
        pathsG.selectAll("path").each(function(d, i) {
            const dsList = dataSetsOfRow(i);
            // pick first non-hidden dataset (matching scatter logic)
            let chosen = null;
            for (let j = 0; j < dsList.length; j++) {
                if (visibleDatasets.has(dsList[j])) { chosen = dsList[j]; break; }
            }

            const dsColor = chosen ? (colors[chosen] || fallbackColor(chosen)) : unselectedColor;
            const isRowSel = chosen;

            d3.select(this)
                .interrupt()
                .attr("stroke", dsColor)
                // preserve original parallel stroke-width/opacity behavior
                .attr("stroke-width", isRowSel ? 0.8 : 0.08)
                .attr("stroke-opacity", 1);
                // .attr("stroke-opacity", isRowSel ? 0.7 : 0.05);
        });
    }

    // initial call to style things correctly
    updateParallel();

    // Return updater for external calls (same contract as original)
    return function () {
        updateParallel();
    };
}
