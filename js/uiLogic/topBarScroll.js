
/**
 * initializes the sticky top bar scroll effect
 */
export function initTopBarScroll() {

    const topBar = document.querySelector(".top-bar-fixedRectangle");

    window.addEventListener("scroll", function() {
        if (window.scrollY > 0) {
            topBar.style.top = `-${window.scrollY}px`; // Move with scroll
        } else {
            topBar.style.top = "0"; // Reset top position
        }
    });

    window.addEventListener("scroll", function() {
        const topBar = document.querySelector(".top-bar");
        const scrollPosition = window.scrollY;

        if (scrollPosition > 10) { // Adjust when the effect starts
            topBar.classList.add("scrolled");
        } else {
            topBar.classList.remove("scrolled");
        }
    });
}
