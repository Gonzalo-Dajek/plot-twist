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

export function createBarPlot(fields, options, plotDiv, data, updatePlotsFun, utils) {
    const field = fields.get("bin-variable");
    const container = d3.select(plotDiv).style("position", "relative");
    const containerWidth = container.node().clientWidth;
    const height = container.node().clientHeight;

    // layout
    const marginTop = 10;
    const marginRight = 20;
    const marginBottom = 40; // leave extra for rotated labels
    const marginLeft = 60; // space reserved for pinned y-axis

    const transitionMs = 150;
    const innerPadding = 2;
    const fallbackColor = d3.scaleOrdinal(d3.schemeCategory10);
    const minBinWidth = 40; // minimal width per category

    // Hide arrow buttons and make scrollbar minimal — injected CSS scoped to this container
    const uid = `barplot-${Math.random().toString(36).slice(2,9)}`;
    container.attr("data-barplot-id", uid);
    const style = `
        [data-barplot-id="${uid}"] .bp-scroll { overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; }
        [data-barplot-id="${uid}"] .bp-scroll::-webkit-scrollbar { height: 10px; }
        [data-barplot-id="${uid}"] .bp-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 6px; }
        [data-barplot-id="${uid}"] .bp-scroll::-webkit-scrollbar-button { display: none; height: 0; }
        [data-barplot-id="${uid}"] .bp-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.2) transparent; }
        [data-barplot-id="${uid}"] .bp-left { position: absolute; left: 0; top: 0; bottom: 0; width: ${marginLeft}px; pointer-events: none; }
        [data-barplot-id="${uid}"] .bp-right { position: absolute; left: ${marginLeft}px; top: 0; right: 0; bottom: 0; }
        [data-barplot-id="${uid}"] .bp-title { position: absolute; right: ${marginRight}px; top: ${marginTop}px; pointer-events: none; font-family: sans-serif; font-weight: 700; font-size: 12px; }
        [data-barplot-id="${uid}"] .x-label { cursor: default; pointer-events: auto; }
        [data-barplot-id="${uid}"] .legend-overlay { pointer-events: auto; display: flex; gap: 6px; align-items: center; }
        [data-barplot-id="${uid}"] .legend-item { display:flex; align-items:center; cursor:pointer; height:18px; }
        [data-barplot-id="${uid}"] .legend-swatch { width:16px; height:16px; border-radius:7px; border:1px solid #ccc; }
    `;
    // inject style
    container.append("style").text(style);

    // Tooltip (placed inside container)
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

    // categories
    const categories = Array.from(new Set(data.map(d => d[field])));

    // compute widths
    const minTotalWidth = categories.length * minBinWidth;
    const rightPaneWidth = Math.max(containerWidth - marginLeft, minTotalWidth);
    let svgRightWidth = rightPaneWidth;
    const svgHeight = height;

    // create left (pinned y-axis) and right (scrollable plot) panes
    const leftDiv = container.append("div").attr("class", "bp-left");
    const rightDiv = container.append("div").attr("class", "bp-right bp-scroll");

    // pinned title (top-right, pinned not scrolling)
    container.append("div").attr("class", "bp-title").text(field);

    // Left SVG will host y-axis only (pinned)
    const leftSvg = leftDiv.append("svg")
        .attr("width", marginLeft)
        .attr("height", svgHeight)
        .style("display", "block");

    // Right SVG holds bars and x-axis and scrolls horizontally
    const rightSvg = rightDiv.append("svg")
        .attr("width", svgRightWidth)
        .attr("height", svgHeight)
        .style("display", "block");

    // background click capture on rightSvg (so clicking empty area clears)
    rightSvg.append("rect")
        .attr("width", svgRightWidth)
        .attr("height", svgHeight)
        .attr("fill", "transparent")
        .on("click", () => handleBackgroundClick());

    // Scales
    const x = d3.scaleBand()
        .domain(categories)
        .range([0, svgRightWidth - marginRight])
        .padding(0.1);

    const y = d3.scaleLinear().range([svgHeight - marginBottom, marginTop]);

    const yAxisGroup = leftSvg.append("g")
        .attr("transform", `translate(${marginLeft - 8},0)`); // push ticks near right edge of left pane

    const xAxisGroup = rightSvg.append("g")
        .attr("transform", `translate(0,${svgHeight - marginBottom})`)
        .attr("class", "x-axis");

    const gridG = rightSvg.append("g").attr("class", "grid");
    const barsG = rightSvg.append("g").attr("class", "bars-group");

    let hiddenDatasets = new Set();
    let selectedCategories = [];

    function handleMultiClick(clickedCategory) {
        const idx = selectedCategories.indexOf(clickedCategory);
        if (idx > -1) selectedCategories.splice(idx, 1);
        else selectedCategories.push(clickedCategory);
        updateSelection();
    }
    function handleSingleClick(clickedCategory) {
        selectedCategories = [clickedCategory];
        updateSelection();
    }
    function handleBackgroundClick() {
        selectedCategories = [];
        updateSelection();
    }

    function updateSelection() {
        let payload = [];
        if (selectedCategories.length) payload = [{ categories: selectedCategories, field, type: 'categorical' }];
        // style pinned labels (we still create x-axis labels in rightSvg but keep visual emphasis via class)
        xAxisGroup.selectAll('text.x-axis-label')
            .style('font-weight', function(d) { return selectedCategories.includes(d) ? 'bolder' : 'normal'; })
            .style('font-size', function(d) { return selectedCategories.includes(d) ? '12px' : '10px'; });
        updatePlotsFun(payload);
    }

    // attach click + tooltip handlers for a category rect
    function attachBinHandlers(rectSelection, category, infoGetter) {
        rectSelection
            .attr('class', 'bg-rect')
            .attr('x', 0)
            .attr('width', x.bandwidth())
            // .style('cursor', 'pointer')
            .on('click', function(event, d) {
                const clickedCategory = category;
                if (event.ctrlKey || event.metaKey) handleMultiClick(clickedCategory);
                else handleSingleClick(clickedCategory);
            });
            // .on('mouseover', function(event) {
            //     const info = typeof infoGetter === 'function' ? infoGetter() : infoGetter;
            //     if (!info) return;
            //     const lines = Object.keys(info.datasets || {}).map(ds => `${ds}: ${info.datasets[ds]}`);
            //     tooltip.html(`<strong>${category}</strong><br/>total: ${info.total || 0}<br/>${lines.join('<br/>')}`)
            //         .style('left', (event.pageX + 8) + 'px')
            //         .style('top', (event.pageY + 8) + 'px')
            //         .style('display', 'block');
            // })
            // .on('mousemove', function(event) {
            //     tooltip.style('left', (event.pageX + 8) + 'px')
            //         .style('top', (event.pageY + 8) + 'px');
            // })
            // .on('mouseleave', function() {
            //     tooltip.style('display', 'none');
            // });
    }

    // computeCounts unchanged
    function computeCounts() {
        const u = utils();
        const origin = typeof u.dataSet === 'function' ? u.dataSet() : (u.dataSet || '');
        const allDataSets = typeof u.allDataSets === 'function' ? (u.allDataSets() || []) : (u.allDataSets || []);
        const colors = u.colorsPerDataSet || u.colors || {};

        const countsPerCat = categories.map(() => ({ total: 0, datasets: {} }));
        countsPerCat.forEach(c => { allDataSets.forEach(ds => c.datasets[ds] = 0); });

        data.forEach((d, i) => {
            const cat = d[field];
            const ci = categories.indexOf(cat);
            if (ci < 0) return;
            const c = countsPerCat[ci];
            c.total += 1;
            const isSel = typeof u.isRowSelected === 'function' ? !!u.isRowSelected(i) : !!u.isRowSelected;
            if (isSel && origin) {
                if (!(origin in c.datasets)) c.datasets[origin] = 0;
                c.datasets[origin] += 1;
            }
            let others = [];
            if (typeof u.dataSetsOf === 'function') {
                const res = u.dataSetsOf(i);
                if (Array.isArray(res)) others = res;
            }
            const uniqueOthers = Array.from(new Set(others || []));
            uniqueOthers.forEach(ds => {
                if (!(ds in c.datasets)) c.datasets[ds] = 0;
                if (ds === origin && isSel) return; // dedupe
                c.datasets[ds] += 1;
            });
        });

        return { countsPerCat, allDataSets, colors };
    }

    // helper: truncate/fit x labels with rotation and tooltip
    function adjustXAxisLabels(bandwidth) {
        const labels = xAxisGroup.selectAll('text').attr('class', 'x-axis-label x-label').style('font-family', 'sans-serif');
        labels.each(function(d) {
            const txt = d3.select(this);
            const full = String(d);
            let fs = 12;
            txt.style('font-size', fs + 'px').text(full);
            // rotate downwards and set anchor
            txt.attr('transform', `rotate(45, ${txt.attr('x') || 0}, ${txt.attr('y') || 0})`)
                .attr('text-anchor', 'start')
                .attr('dx', '-5px')
                .attr('dy', '10px');

            // shrink font until fits reasonably or reach min size
            const minFs = 8;
            while (fs > minFs && this.getComputedTextLength() > Math.max(8, bandwidth)) {
                fs -= 1;
                txt.style('font-size', fs + 'px');
            }

            // if still too long, truncate by removing chars until it fits
            if (this.getComputedTextLength() > Math.max(8, bandwidth)) {
                let t = full;
                txt.text(t + '...');
                while (t.length > 0 && this.getComputedTextLength() > Math.max(8, bandwidth)) {
                    t = t.slice(0, -1);
                    txt.text(t + '...');
                }
            }
            // add hover tooltip (title)
            txt.selectAll('title').remove();
            txt.append('title').text(full);
        });

        // ensure pointer events on labels (for hover title)
        labels.style('pointer-events', 'auto');
    }

    // Render or update legend items — only swatches, labels on hover (tooltip), like histogram
    function renderLegend(allDataSets, colors) {
        const outer = d3.select(plotDiv);
        outer.style("position", "relative");

        // Remove any old legend overlay on the host element
        outer.selectAll(".legend-overlay").remove();
        const swatchSize = 16;
        if (!allDataSets || allDataSets.length === 0) return;

        // Position legend on the right, below marginTop
        const legendDiv = outer
            .append("div")
            .attr("class", "legend-overlay")
            .style("position", "absolute")
            .style("right", allDataSets.length +10 + "px")
            .style("top", -25 + "px")
            .style("z-index", 9999)
            .style("pointer-events", "auto");

        const items = legendDiv.selectAll("div.legend-item")
            .data(allDataSets, d => d);

        items.exit().remove();

        const enter = items.enter()
            .append("div")
            .attr("class", "legend-item")
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

                tooltip.style("left", (rect.left + scrollLeft + swatchSize + 8) + "px")
                    .style("top", (rect.top + scrollTop) + "px");
            })
            .on("mouseleave", function() {
                tooltip.style("opacity", 0)
                    .on("transitionend", function(event) {
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
                updateBarPlot();
            });

        // append only swatch (no text)
        enter.append("div")
            .attr("class", "legend-swatch");

        // merge and set swatch color/opacity
        enter.merge(items)
            .select(".legend-swatch")
            .style("background-color", d => colors[d] || fallbackColor(d))
            .style("opacity", d => hiddenDatasets.has(d) ? 0.25 : 1);
    }

    function initialRender() {
        const { countsPerCat, allDataSets, colors } = computeCounts();
        const maxDatasetCount = d3.max(countsPerCat, c => d3.max(allDataSets.map(ds => c.datasets[ds] || 0))) || 0;
        const maxTotal = d3.max(countsPerCat, c => c.total) || 0;
        y.domain([0, Math.max(maxDatasetCount, maxTotal)]);

        // pinned y axis
        yAxisGroup.call(d3.axisLeft(y).ticks(7).tickFormat(customTickFormat));

        // y-grid lines drawn inside right SVG so they scroll horizontally with bars
        const yTicks = y.ticks(7);
        gridG.selectAll('line').data(yTicks).enter().append('line')
            .attr('x1', 0).attr('x2', svgRightWidth - marginRight)
            .attr('y1', d => y(d)).attr('y2', d => y(d))
            .attr('stroke', '#999').style('stroke-opacity', 0.5).style('stroke-width', 0.5);

        // category groups — positioned in rightSvg using x scale
        const catGroups = barsG.selectAll('g.cat-group')
            .data(categories)
            .enter()
            .append('g')
            .attr('class', 'cat-group')
            .attr('transform', d => `translate(${x(d)},0)`);

        // background grey rect (total) — clipped inside rightSvg so nothing appears left of pinned y-axis
        catGroups.append('rect')
            .attr('fill', '#e6e6e6')
            .each(function(category, i) {
                const infoFn = () => countsPerCat[i];
                const sel = d3.select(this);
                attachBinHandlers(sel, category, infoFn);
                sel.attr('y', y(countsPerCat[i].total))
                    .attr('height', (svgHeight - marginBottom) - y(countsPerCat[i].total))
                    .attr('x', 0)
                    .attr('width', x.bandwidth());
            });

        // dataset bars groups inside each category
        catGroups.selectAll('g.dataset-bar')
            .data((d, i) => allDataSets.map((ds, idx) => ({ name: ds, count: countsPerCat[i].datasets[ds] || 0, idx, catIndex: i, category: d })))
            .enter()
            .append('g')
            .attr('class', 'dataset-bar')
            .each(function(d) { d3.select(this).append('rect').attr('class', 'bar-rect'); });

        // draw x-axis (on rightSvg) — note: x axis labels are created here and adjusted later
        xAxisGroup.call(d3.axisBottom(x).tickSizeOuter(0));
        // adjust labels (size/rotate/truncate/hover)
        adjustXAxisLabels(x.bandwidth());

        // legend
        renderLegend(allDataSets, colors);
    }

    function updateBarPlot() {
        const { countsPerCat, allDataSets, colors } = computeCounts();
        const maxDatasetCount = d3.max(countsPerCat, c => d3.max(allDataSets.map(ds => c.datasets[ds] || 0))) || 0;
        const maxTotal = d3.max(countsPerCat, c => c.total) || 0;
        const yMax = Math.max(maxDatasetCount, maxTotal) || 1;
        y.domain([0, yMax]);

        // Ensure legend is in sync
        renderLegend(allDataSets, colors);

        // Update y axis (pinned)
        yAxisGroup.transition().duration(transitionMs).call(d3.axisLeft(y).ticks(7).tickFormat(customTickFormat));

        // update y grid lines in rightSvg
        const yTicks = y.ticks(7);
        const grid = gridG.selectAll('line').data(yTicks);
        grid.join(
            enter => enter.append('line').attr('x1', 0).attr('x2', svgRightWidth - marginRight).attr('y1', d => y(d)).attr('y2', d => y(d)).attr('stroke', '#999').style('stroke-opacity', 0.12).style('stroke-width', 0.5),
            update => update.transition().duration(transitionMs).attr('y1', d => y(d)).attr('y2', d => y(d)),
            exit => exit.remove()
        );

        // If categories length changed, recompute widths & x range
        const newMinTotalWidth = categories.length * minBinWidth;
        const newRightPaneWidth = Math.max(container.node().clientWidth - marginLeft, newMinTotalWidth);
        svgRightWidth = newRightPaneWidth;
        rightSvg.attr("width", svgRightWidth);
        x.range([0, svgRightWidth - marginRight]);

        // update x axis
        xAxisGroup.call(d3.axisBottom(x).tickSizeOuter(0));
        adjustXAxisLabels(x.bandwidth());

        // update category groups binding
        const catGroups = barsG.selectAll('g.cat-group').data(categories);

        // enter new groups if any — attach bg rect with unified handlers
        catGroups.enter()
            .append('g')
            .attr('class', 'cat-group')
            .attr('transform', d => `translate(${x(d)},0)`)
            .each(function(category, ci) {
                const g = d3.select(this);
                // append the visible grey rect (fill) and attach handlers via helper
                const rect = g.append('rect').attr('fill', '#e6e6e6');
                const infoFn = () => countsPerCat[ci];
                attachBinHandlers(rect, category, infoFn);
                rect.attr('x', 0)
                    .attr('width', x.bandwidth())
                    .attr('y', y(countsPerCat[ci].total))
                    .attr('height', (svgHeight - marginBottom) - y(countsPerCat[ci].total));
            });

        // update background rects (join)
        barsG.selectAll('g.cat-group').attr('transform', d => `translate(${x(d)},0)`);
        barsG.selectAll('g.cat-group').each(function(category, ci) {
            const g = d3.select(this);
            const info = countsPerCat[ci];
            g.selectAll('rect.bg-rect')
                .data([info])
                .join(
                    enter => enter.append('rect').call(sel => {
                        // new rect: style + handlers
                        sel.attr('fill', '#e6e6e6');
                        attachBinHandlers(sel, category, () => countsPerCat[ci]);
                    })
                        .attr('x', 0)
                        .attr('width', x.bandwidth())
                        .attr('y', c => y(c.total))
                        .attr('height', c => (svgHeight - marginBottom) - y(c.total)),

                    update => update
                        .attr('x', 0)
                        .attr('width', x.bandwidth())
                        .transition().duration(transitionMs)
                        .attr('y', c => y(c.total))
                        .attr('height', c => (svgHeight - marginBottom) - y(c.total)),

                    exit => exit.remove()
                );
        });

        // update dataset bars inside each category
        barsG.selectAll('g.cat-group').each(function(category, ci) {
            const g = d3.select(this);
            const catWidth = Math.max(1, x.bandwidth());
            const N = allDataSets.length || 1;
            const innerW = Math.max(0, (catWidth - (N - 1) * innerPadding) / N);
            const dsData = allDataSets.map((ds, idx) => ({ name: ds, count: countsPerCat[ci].datasets[ds] || 0, idx, catIndex: ci, category }));

            const rects = g.selectAll('rect.bar-rect').data(dsData, d => d.name);

            rects.join(
                enter => enter.append('rect').attr('class', 'bar-rect')
                    .attr('x', d => d.idx * (innerW + innerPadding))
                    .attr('width', innerW)
                    .on('click', function(event, d) { const clickedCategory = d.category; if (event.ctrlKey || event.metaKey) handleMultiClick(clickedCategory); else handleSingleClick(clickedCategory); })
                    // .on('mouseover', function(event, d) {
                    //     tooltip.html(`<strong>${d.name}</strong><br/>count: ${d.count}<br/>category: ${d.category}`)
                    //         .style('left', (event.pageX + 8) + 'px').style('top', (event.pageY + 8) + 'px').style('display', 'block');
                    // })
                    // .on('mousemove', function(event) { tooltip.style('left', (event.pageX + 8) + 'px').style('top', (event.pageY + 8) + 'px'); })
                    // .on('mouseleave', function() { tooltip.style('display', 'none'); })
                    .style('fill', d => colors[d.name] || fallbackColor(d.name))
                    .style('opacity', d => hiddenDatasets.has(d.name) ? 0 : 1)
                    .attr('y', d => y(0)).attr('height', 0)
                    .call(ent => ent.transition().duration(transitionMs).attr('y', d => y(d.count)).attr('height', d => (svgHeight - marginBottom) - y(d.count))),

                update => update
                    .attr('x', d => d.idx * (innerW + innerPadding))
                    .attr('width', innerW)
                    .call(sel => sel
                        .on('click', function(event, d) { const clickedCategory = d.category; if (event.ctrlKey || event.metaKey) handleMultiClick(clickedCategory); else handleSingleClick(clickedCategory); })
                        // .on('mouseover', function(event, d) {
                        //     tooltip.html(`<strong>${d.name}</strong><br/>count: ${d.count}<br/>category: ${d.category}`)
                        //         .style('left', (event.pageX + 8) + 'px').style('top', (event.pageY + 8) + 'px').style('display', 'block');
                        // })
                        // .on('mousemove', function(event) { tooltip.style('left', (event.pageX + 8) + 'px').style('top', (event.pageY + 8) + 'px'); })
                        // .on('mouseleave', function() { tooltip.style('display', 'none'); })
                        .transition().duration(transitionMs)
                        .attr('y', d => y(d.count))
                        .attr('height', d => (svgHeight - marginBottom) - y(d.count))
                        .style('fill', d => colors[d.name] || fallbackColor(d.name))
                        .style('opacity', d => hiddenDatasets.has(d.name) ? 0 : 1)
                    ),

                exit => exit.remove()
            );
        });
    }

    // initial draw
    initialRender();
    updateBarPlot();

    // return updater
    return function() {
        // update layout sizes if container resized externally
        const cw = container.node().clientWidth;
        const newRightPaneWidth = Math.max(cw - marginLeft, categories.length * minBinWidth);
        svgRightWidth = newRightPaneWidth;
        rightSvg.attr("width", svgRightWidth);
        x.range([0, svgRightWidth - marginRight]);
        updateBarPlot();
    };
}
