import { PlotCoordinator } from "./js/plotCoordinator.js";
import * as d3 from "d3";

async function loadCSV(pathToCsv) {
    return await d3.csv(pathToCsv, function (data) {
        return data;
    });
}

let data = await loadCSV("../local_data/athlete_events_1000.csv");
let pc = new PlotCoordinator();
pc.init(data);

let fields = ["Height", "Weight", "Age"];

// for (let f1 of fields){
//     for(let f2 of fields){
//         if(f1===f2){
//             createScatterPlot(f1, f2, pc.newPlotId());
//         }else{
//             createHistogram(f1,pc.newPlotId());
//         }
//     }
// }

createScatterPlot("Height", "Weight", pc.newPlotId());
createScatterPlot("Height", "Weight", pc.newPlotId());
createHistogram("Height", pc.newPlotId());

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
        .attr("cx", (d) => x(d[xField]))
        .attr("cy", (d) => y(d[yField]))
        .attr("r", 3) // radius
        .attr("fill", selectedColor) // Dot color
        .attr("fill-opacity", 0.3) // Transparency
        .attr("stroke", "none"); // border

    // Create the brush behavior.
    svg.call(
        d3
            .brush()
            .extent([
                [marginLeft, marginTop],
                [width - marginRight, height - marginBottom],
            ])
            .on("start brush end", ({ selection }) => {
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
            })
    );

    pc.addPlot(id, function updateScatterPlot() {
        dot.each(function (d, i) {
            const isSelected = !pc.isSelected(i); // Check if index i is in the selection array

            d3.select(this).style("fill", isSelected ? unselectedColor : selectedColor);
            // .style("opacity", isSelected ? 1 : 0.5);  // Adjust opacity for selected points
        });
    });
}

function createHistogram(field, id) {

}
