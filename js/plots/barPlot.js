import * as d3 from "d3";
import { createButtons } from "./plotsUtils/plotButtons.js";

export function createBarPlot(field, id, data, pc, gridPos) {
    const divId = `barplot_${id}_${field}`;
    d3.select("#plotsContainer")
        .append("div")
        .attr("id", divId)
        .attr("class", "plot gridBox")
        .style("grid-column", gridPos.col)
        .style("grid-row", gridPos.row);

    const container = d3.select(`#${divId}`);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight-40;
    // const marginTop = 30;
    const marginTop = 15;
    const marginRight = 20;
    const marginBottom = 25;
    const marginLeft = 30;

    let unselectedColor = "grey";

    let btns = createButtons(container, pc, id, false);
    let setActiveButton = btns.setActiveButton;

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
    const colorScale = d3
        .scaleOrdinal(d3.schemeCategory10) // Or any color scheme you prefer
        .domain(categories);

    // Add svg element
    const svg = d3
        .select(`#${divId}`)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Add a transparent rectangle to capture clicks on the background
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent")
        .on("click", function (event) {
            // Handle click event on the background
            handleBackgroundClick();
        });

    // Add x-axis
    const xAxisGroup = svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x));

    xAxisGroup.selectAll("text")
        .attr("class", "x-axis-label"); // Add a class to each x-axis label

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

    // Add grey lines parallel to the bars, connecting with the y-axis labels
    const yTickValues = y.ticks(); // Get the tick values for the y-axis

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
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4"); // Optional: dashed line for better visibility

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
        .attr("transform", (d) => `translate(${x(d.category)},0)`);

    // Add unselected rect (drawn first, so it's behind)
    bar.append("rect")
        .attr("x", 1)
        .attr("width", x.bandwidth() - 1)
        .attr("y", (d) => y(d.unselected)) // Start at the top of the unselected area
        .attr("height", (d) => height - marginBottom - y(d.unselected)) // Height based on unselected count
        .attr("fill", unselectedColor)
        // .attr("stroke", "black") // Grey outline for unselected bars
        // .attr("stroke-width", 1) // Add a thinner outline for unselected
        .on("click", function (event, d) {
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
        .attr("y", (d) => y(d.selected + d.unselected)) // Start from the top of selected + unselected
        .attr("height", (d) => height - marginBottom - y(d.selected)) // Height based on selected count
        .attr("fill", (d) => colorScale(d.category)) // Use the color scale for selected bars
        // .attr("stroke", "black") // Grey outline for unselected bars
        // .attr("stroke-width", 1) // Add a thinner outline for unselected
        .on("click", function (event, d) {
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
        setActiveButton("AND");
        pc.changeSelectionMode(id, "AND");
        updateSelection();
    }

    // Function to update the view with selected categories
    function updateSelection() {
        let selected;
        if(selectedCategories.length===0){
            selected = [];
        }else{
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
        svg.selectAll(".x-axis-label")
            .style("font-weight", function () {
                const labelText = d3.select(this).text();
                return selectedCategories.includes(labelText) ? "bold" : "normal";
            });

        // Update the plot view with new selections

        pc.updatePlotsView(id, selected);
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
                .attr("y", y(bin.selected));
            // Position based on selected + unselected height
            // Now update the unselected rect on top of the selected
            unselectedRect
                .attr("height", height - marginBottom - y(bin.unselected))
                .attr("y", y(bin.unselected + bin.selected)); // Positioned based on only unselected height

        });
    }
}
