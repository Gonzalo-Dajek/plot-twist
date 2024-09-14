export function createButtons(container, pc, id, addSelectionType = true) {
    // Add a div at the top for the buttons
    const buttonDiv = container
        .append("div")
        .attr("class", "plot-button-container");

    // Add the delete button
    buttonDiv
        .append("button")
        .text("Delete Plot")
        .on("click", () => {
            pc.removePlot(id);
            // Remove the entire scatter plot container
            container.remove();
        });

    let setActiveButton = () => {};
    if (addSelectionType) {
        // Add a wrapper for the AND and NOT buttons
        const rightButtons = buttonDiv
            .append("div")
            .attr("class", "right-buttons");

        // Track the currently active button (starts as null)
        let activeButton = "AND";

        // Add the button for AND
        const ANDbtn = rightButtons
            .append("button")
            .text("AND")
            .on("click", function () {
                if (activeButton === "AND") {
                    // Do nothing if this button is already active
                    return;
                }
                // Set this button as active
                setActiveButton("AND");

                pc.changeSelectionMode(id, "AND");
            });

        // Add the button for NOT
        const NOTbtn = rightButtons
            .append("button")
            .text("NOT")
            .on("click", function () {
                if (activeButton === "NOT") {
                    // Do nothing if this button is already active
                    return;
                }
                // Set this button as active
                setActiveButton("NOT");

                pc.changeSelectionMode(id, "NOT");
            });

        // Helper function to set the active button
        setActiveButton = function (type) {
            // If there's an active button, remove its 'active' class
            if (type === "AND") {
                ANDbtn.classed("active", false).classed("disabled", true);
                NOTbtn.classed("active", true).classed("disabled", false);
            }
            if (type === "NOT") {
                ANDbtn.classed("active", true).classed("disabled", false);
                NOTbtn.classed("active", false).classed("disabled", true);
            }
            activeButton = type;
        };

        setActiveButton("AND");
    }

    return { setActiveButton };
}
