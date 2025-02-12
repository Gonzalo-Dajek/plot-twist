
/**
 * Adjust the css styling of the grid such that if the screen allows it, it is fixed and centered,
 * and if not it properly overflows
 */
export function adjustBodyStyle() {
    const content = document.getElementById("grid-container");
    const body = document.body;

    const contentRect = content.getBoundingClientRect();
    if (contentRect.width > window.innerWidth) {
        body.style.display = "block";
        body.style.flexDirection = "";
        body.style.alignItems = "";
    } else {
        body.style.display = "flex";
        body.style.flexDirection = "column";
        body.style.alignItems = "center";
    }
}

/**
 * Returns the grid width (the number of columns) and height (the number of rows)
 * @returns {{col: number, row: number}}
 */
export function getGridDimensions() {
    const plotsContainer = document.getElementById("plotsContainer");
    const styles = window.getComputedStyle(plotsContainer);

    const cols = styles.getPropertyValue("grid-template-columns").split(" ").length;
    const rows = styles.getPropertyValue("grid-template-rows").split(" ").length;

    return { col: cols, row: rows };
}
