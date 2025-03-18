
/**
 * initializes the sticky top bar scroll effect
 */
export function initTopBarScroll() {
    const topBar = document.querySelector(".top-bar");
    const topBarFixedRectangle = document.querySelector(".top-bar-fixedRectangle");

    document.addEventListener("scroll", function() {
        const scrollPosition = window.scrollY;

        if (topBarFixedRectangle) {
            if (scrollPosition > 0) {
                topBarFixedRectangle.style.top = `-${scrollPosition}px`;
            } else {
                topBarFixedRectangle.style.top = "0";
            }
        }

        if (scrollPosition > 10) {
            topBar.classList.add("scrolled");
        } else {
            topBar.classList.remove("scrolled");
        }
    });
}
