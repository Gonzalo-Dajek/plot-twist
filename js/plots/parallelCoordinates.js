import * as d3 from "d3";
import throttle from "lodash-es/throttle.js";
import { customTickFormat } from "./plotsUtils/tickFormat.js";

export const parallelCoordinates = {
    plotName: "Parallel Coordinates",
    fields: [
        {
            fieldType: "numerical",
            isRequired: true,
            fieldName: "1st axis"
        },
        {
            fieldType: "numerical",
            isRequired: true,
            fieldName: "2nd axis"
        },
        {
            fieldType: "numerical",
            isRequired: false,
            fieldName: "3rd axis"
        },
        {
            fieldType: "numerical",
            isRequired: false,
            fieldName: "4th axis"
        },
        {
            fieldType: "numerical",
            isRequired: false,
            fieldName: "5th axis"
        },
        {
            fieldType: "numerical",
            isRequired: false,
            fieldName: "6th axis"
        },
        {
            fieldType: "numerical",
            isRequired: false,
            fieldName: "7th axis"
        },
        {
            fieldType: "numerical",
            isRequired: false,
            fieldName: "8th axis"
        }
    ],
    options: [],
    height: 2,
    width: 1,
    createPlotFunction: createParallelCoordinates,
};

export function createParallelCoordinates(fields, options, plotDiv, data, updatePlotsFun, isSelectedFun){

    const keys = parallelCoordinates.fields
        .map(field => fields.get(field.fieldName))
        .filter(value => value !== "");

    const keyz = fields.get("1st axis")

    const container = d3.select(plotDiv);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const marginTop = 20;
    const marginRight = 15;
    const marginBottom = 30;
    const marginLeft = 15;

    const unselectedColor = "grey";

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
        .interpolator(
            d3.interpolateViridis
        );

    // Create the SVG container.
    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .property("value", []);

    // Line generator function
    const line = d3
        .line()
        .defined(([, value]) => value != null)
        .x(([key, value]) => x.get(key)(value))
        .y(([key]) => y(key));

    // Append lines
    svg
        .append("g")
        .attr("fill", "none")
        .attr("class", `data-paths`)
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
            d3.select(this).call(d3.axisBottom(x.get(d)).ticks(5).tickFormat(customTickFormat));
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

    function handleSelection({ selection }, fieldSelected) {
        if (selection === null) {
            selectionsFromAxis.delete(fieldSelected);
        } else {
            selectionsFromAxis.set(
                fieldSelected,
                selection.map(x.get(fieldSelected).invert)
            );
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

    const throttledHandleSelection = throttle(handleSelection, 50);

    const brushHeight = 50;
    const brush = d3
        .brushX()
        .extent([
            [marginLeft, -(brushHeight / 2)],
            [width - marginRight, brushHeight / 2],
        ])
        .on("start brush end", throttledHandleSelection);

    axes.call(brush);

    return function () {
        svg.selectAll(`.data-paths path`)
            .attr("stroke", (d, i) =>
                isSelectedFun(i) ? color(d[keyz]) : unselectedColor
            )
            .attr("stroke-width", (d, i) => (isSelectedFun(i) ? 1.3 : 0.3))
            .attr("stroke-opacity", (d, i) => (isSelectedFun(i) ? 0.7 : 0.05));
    }
}
