import * as d3 from "d3";
import { customTickFormat } from "./plotsUtils/tickFormat.js";

export const barPlot = {
    plotName: "Bar Plot",
    fields: [
        {
            isRequired: true,
            fieldName: "bin-variable",
            fieldType: "categorical",
        },
    ],
    options: [],
    height: 1,
    width: 1,
    createPlotFunction: createBarPlot,
};

// TODO: change the bar plot so it scrolls and can handle arbitrary amoounts of bars
export function createBarPlot(fields, options, plotDiv, data, updatePlotsFun, isSelectedFun) {

    let field = fields.get("bin-variable")

    const container = d3.select(plotDiv);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const marginTop = 10;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 40;

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

    // Define a color scale for the categories
    const categoriesColor = ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6", "Category 7", "Category 8", "Category 9", "Category 10"];

    const colorScale = d3.scaleOrdinal()
        .domain(categoriesColor)
        .range(categoriesColor.map((d, i) => d3.hsl(((i + 2) * 360 / categories.length) % 360, 0.44, 0.56).toString()));

    // Create the SVG container.
    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .property("value", []);

    // Add a transparent rectangle to capture clicks on the background
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent")
        .on("click", function() {
            // Handle click event on the background
            handleBackgroundClick();
        });

    // Add x-axis
    const xAxisGroup = svg
        .append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x));

    xAxisGroup.selectAll("text").attr("class", "x-axis-label"); // Add a class to each x-axis label

    // Add y-axis
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).ticks(7).tickFormat(customTickFormat));  // Use custom tick format

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


    // Add grey lines parallel to the bars, connecting with the y-axis labels
    const yTickValues = y.ticks(7); // Get the tick values for the y-axis

    svg.append("g")
        .selectAll("line")
        .data(yTickValues)
        .enter()
        .append("line")
        .attr("x1", marginLeft) // Starting from the left (y-axis labels)
        .attr("x2", width - marginRight) // Extend across the plot
        .attr("y1", (d) => y(d)) // Align with y-axis tick values
        .attr("y2", (d) => y(d)) // Ensure line stays parallel
        .attr("stroke", "grey") // Color of the line
        .style("stroke-width", 0.5)
        .style("stroke-opacity", 0.3);

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
        .attr("y", (d) => y(d.unselected))
        .attr("height", (d) => height - marginBottom - y(d.unselected))
        .attr("fill", unselectedColor)
        .on("click", function(event, d) {
            const clickedCategory = d.category;

            // Check if Ctrl (or Meta on macOS) is pressed
            if (event.ctrlKey || event.metaKey) {
                handleMultiClick(clickedCategory);
            } else {
                handleSingleClick(clickedCategory);
            }
        });

    // Add selected rect
    bar.append("rect")
        .attr("x", 1)
        .attr("width", x.bandwidth() - 1)
        .attr("y", (d) => y(d.selected + d.unselected))
        .attr("height", (d) => height - marginBottom - y(d.selected))
        .attr("fill", (d) => colorScale(d.category))
        .on("click", function(event, d) {
            const clickedCategory = d.category;

            // Check if Ctrl (or Meta on macOS) is pressed
            if (event.ctrlKey || event.metaKey) {
                handleMultiClick(clickedCategory);
            } else {
                handleSingleClick(clickedCategory);
            }
        });

    let selectedCategories = [];

    // Handle multi-click event for the bars
    function handleMultiClick(clickedCategory) {
        const index = selectedCategories.indexOf(clickedCategory);

        // If category is already selected, deselect it
        if (index > -1) {
            selectedCategories.splice(index, 1);
        } else {
            // Otherwise, add it to the selected categories
            selectedCategories.push(clickedCategory);
        }

        updateSelection();
    }

    // Handle single-click event (without Ctrl)
    function handleSingleClick(clickedCategory) {
        // Reset to only the clicked category
        selectedCategories = [clickedCategory];

        updateSelection();
    }

    // Handle click event for the background
    function handleBackgroundClick() {
        selectedCategories = [];
        updateSelection();
    }

    // Function to update the view with selected categories
    function updateSelection() {
        let selected;
        if (selectedCategories.length === 0) {
            selected = [];
        } else {
            selected = [
                {
                    categories: selectedCategories,
                    field: field,
                    type: "categorical",
                },
            ];
        }

        // console.log(selectedCategories);
        // Update the font weight of the x-axis labels based on selection
        svg.selectAll(".x-axis-label").style("font-weight", function() {
            const labelText = d3.select(this).text();
            return selectedCategories.includes(labelText) ? "bolder" : "normal";
        })
            .style("font-size", function() {
                const labelText = d3.select(this).text();
                return selectedCategories.includes(labelText) ? "12px" : "10px"; // Adjust sizes as needed
            });

        // Update the plot view with new selections
        updatePlotsFun(selected);
    }

    // Update the bar plot on selection
    return function updateBarPlot() {
        bins.forEach((bin) => {
            bin.selected = 0;
            bin.unselected = 0;
        });

        data.forEach((d, i) => {
            const bin = bins.find((b) => b.category === d[field]);
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
            const unselectedRect = d3
                .select(this)
                .selectAll("rect")
                .filter(function() {
                    return d3.select(this).attr("fill") === unselectedColor;
                });

            const selectedRect = d3
                .select(this)
                .selectAll("rect")
                .filter(function() {
                    return d3.select(this).attr("fill") !== unselectedColor;
                });

            // Update the selected rect first so it's drawn below the unselected
            selectedRect
                .attr("height", height - marginBottom - y(bin.selected))
                .attr("y", y(bin.selected));
            // Position based on selected + unselected height
            // Now update the unselected rect on top of the selected
            unselectedRect
                .attr("height", height - marginBottom - y(bin.unselected))
                .attr("y", y(bin.unselected + bin.selected)); // Positioned based on only unselected height
        });
    }
}
