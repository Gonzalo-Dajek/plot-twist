/**
 * Returns a div with a delete button that removes the corresponding plot
 */
export function createButtons(container, pc, id) {
    // Add a div at the top for the buttons
    const buttonDiv = container
        .append("div")
        .attr("class", "plot-button-container");

    // Add the delete button
    buttonDiv
        .append("button")
        .text("Delete")
        .attr("class", "delete-plot")
        .on("click", () => {
            pc.removePlot(id);
            container.remove();
        });
}
