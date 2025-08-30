import * as d3 from "d3";
import throttle from "lodash-es/throttle.js";
import { customTickFormat } from "./plotsUtils/tickFormat.js";

export const histogram = {
    plotName: "Histogram",
    fields: [
        {
            isRequired: true,
            fieldName: "bin-variable",
            fieldType: "numerical",
        },
    ],
    options: ["y-axis log scale"],
    height: 1,
    width: 1,
    createPlotFunction: createHistogram,
};

export function createHistogram(fields, options, plotDiv, data, updatePlotsFun, utils) {
    const field = fields.get("bin-variable");
    const isLogSelected = options.get("y-axis log scale");

    const container = d3.select(plotDiv);
    // keep container positioned for legend overlay
    container.style("position", "relative");

    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const marginTop = 10;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 40;

    const brushThrottleMs = 50;
    const barInnerPadding = 2; // px between group bars

    // Build x scale & bins (same static bins as before)
    let [min, max] = d3.extent(data, (d) => Number(d[field]));
    if (min === max) { min -= 0.5; max += 0.5; }

    const x = d3
        .scaleLinear()
        .domain([min, max])
        .range([marginLeft, width - marginRight]);

    const binGenerator = d3.bin()
        .domain(x.domain())
        .thresholds(x.ticks());

    const rawBins = binGenerator(data.map(d => Number(d[field])));
    let bins = rawBins.map(b => ({ x0: b.x0, x1: b.x1 }));

    const fallbackColor = d3.scaleOrdinal(d3.schemeCategory10);

    // Scales for y (set domain after computing counts)
    const yLinear = d3.scaleLinear().range([height - marginBottom, marginTop]);
    const yLogLike = d3.scaleSymlog().constant(1).range([height - marginBottom, marginTop]);
    let y = isLogSelected ? yLogLike : yLinear;

    // Create canvas (pixel ratio aware)
    const dpr = window.devicePixelRatio || 1;
    const canvas = container.append('canvas')
        .attr('style', `width:${width}px;height:${height}px;display:block;`)
        .node();

    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale drawing to CSS pixels

    // Overlay SVG for brush handling (we keep d3.brush for selection behaviour)
    const overlaySvg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('position', 'absolute')
        .style('left', '0')
        .style('top', '0')
        .style('pointer-events', 'all')
        .style('width', width + 'px')
        .style('height', height + 'px');

    // Note: tooltip removed per request; no hover tooltips.

    // Legend overlay (HTML) -- similar to original but without hover tooltips
    const hiddenDatasets = new Set();

    function computeCounts() {
        const u = utils();
        const origin = typeof u.dataSet === 'function' ? u.dataSet() : (u.dataSet || '');
        const allDataSets = typeof u.allDataSets === 'function' ? (u.allDataSets() || []) : (u.allDataSets || []);
        const colors = u.colorsPerDataSet || u.colors || {};

        const countsPerBin = bins.map(() => ({ total: 0, datasets: {} }));
        bins.forEach((b, bi) => {
            allDataSets.forEach(ds => countsPerBin[bi].datasets[ds] = 0);
        });

        data.forEach((d, i) => {
            const value = Number(d[field]);
            const binIdx = bins.findIndex((b, idx) =>
                b.x0 <= value && (value < b.x1 || (idx === bins.length - 1 && value <= b.x1))
            );
            if (binIdx < 0) return;
            const binCounts = countsPerBin[binIdx];
            binCounts.total += 1;

            const isSelected = typeof u.isRowSelected === 'function' ? !!u.isRowSelected(i) : !!(u.isRowSelected);
            if (isSelected && origin) {
                if (!(origin in binCounts.datasets)) binCounts.datasets[origin] = 0;
                binCounts.datasets[origin] += 1;
            }

            let others = [];
            if (typeof u.dataSetsOf === 'function') {
                const res = u.dataSetsOf(i);
                if (Array.isArray(res)) others = res;
            } else if (Array.isArray(u.dataSestOf)) {
                const res = u.dataSestOf(i);
                if (Array.isArray(res)) others = res;
            } else if (Array.isArray(u.dataSetsOf)) {
                others = u.dataSetsOf;
            }

            const uniqueOthers = Array.from(new Set(others || []));
            uniqueOthers.forEach(ds => {
                if (!(ds in binCounts.datasets)) binCounts.datasets[ds] = 0;
                if (ds === origin && isSelected) return;
                binCounts.datasets[ds] += 1;
            });
        });

        return { countsPerBin, allDataSets, colors, origin };
    }

    // Draw everything on canvas given counts
    function drawAll(countsPerBin, allDataSets, colors) {
        // clear canvas
        ctx.clearRect(0, 0, width, height);

        // compute y domain and set y scale
        const maxDatasetCount = d3.max(countsPerBin, bin => d3.max(allDataSets.map(ds => bin.datasets[ds] || 0))) || 0;
        const maxTotal = d3.max(countsPerBin, bin => bin.total) || 0;
        let yMax = Math.max(maxDatasetCount, maxTotal);
        if (isLogSelected) {
            if (yMax < 1) yMax = 1;
            y = yLogLike.domain([0, yMax]);
        } else {
            y = yLinear.domain([0, yMax]);
        }

        // draw grid (x grid at bottom and y grid lines)
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 0.5;

        // y grid lines
        const yTicks = y.ticks ? y.ticks(7) : d3.ticks(0, yMax, 7);
        yTicks.forEach(t => {
            const yy = y(t);
            ctx.beginPath();
            ctx.moveTo(marginLeft, yy + 0.5);
            ctx.lineTo(width - marginRight, yy + 0.5);
            ctx.stroke();
        });

        // x grid lines (vertical grid based on x ticks)
        const xTicks = x.ticks ? x.ticks(5) : d3.ticks(min, max, 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        xTicks.forEach(t => {
            const xx = x(t);
            ctx.beginPath();
            ctx.moveTo(xx + 0.5, marginTop);
            ctx.lineTo(xx + 0.5, height - marginBottom);
            ctx.stroke();
        });

        ctx.restore();

        // draw axes (tick labels and domain lines)
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // x axis labels
        xTicks.forEach(t => {
            const xx = x(t);
            ctx.fillStyle = '#000';
            ctx.fillText(customTickFormat(t), xx, height - marginBottom + 6);
        });

        // y axis labels (left)
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const yTickValues = y.ticks ? y.ticks(7) : d3.ticks(0, yMax, 7);
        yTickValues.forEach(t => {
            const yy = y(t);
            ctx.fillStyle = '#000';
            ctx.fillText(customTickFormat(t), marginLeft - 8, yy);
        });

        // axis lines
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath();
        // x axis baseline
        ctx.moveTo(marginLeft, height - marginBottom + 0.5);
        ctx.lineTo(width - marginRight, height - marginBottom + 0.5);
        ctx.stroke();
        // y axis baseline
        ctx.beginPath();
        ctx.moveTo(marginLeft - 0.5, marginTop);
        ctx.lineTo(marginLeft - 0.5, height - marginBottom);
        ctx.stroke();

        ctx.restore();

        // title (top-right)
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(field, width - marginRight, marginTop + 5);
        ctx.restore();

        // draw bars per bin
        bins.forEach((bin, bi) => {
            const binX = x(bin.x0);
            const binWidth = Math.max(1, x(bin.x1) - x(bin.x0));

            // background gray rect for total
            const total = countsPerBin[bi].total;
            const bgY = y(total);
            const bgHeight = (height - marginBottom) - bgY;
            ctx.fillStyle = '#e6e6e6';
            ctx.fillRect(binX, bgY, binWidth, bgHeight);

            // dataset bars
            const dsList = allDataSets;
            const N = dsList.length || 1;
            const innerWidth = Math.max(0, (binWidth - (N - 1) * barInnerPadding) / N);

            dsList.forEach((ds, idx) => {
                const count = countsPerBin[bi].datasets[ds] || 0;
                const barX = binX + idx * (innerWidth + barInnerPadding);
                const barY = y(count);
                const barHeight = (height - marginBottom) - barY;
                ctx.fillStyle = colors[ds] || fallbackColor(ds);
                ctx.globalAlpha = hiddenDatasets.has(ds) ? 0 : 1;
                ctx.fillRect(barX, barY, innerWidth, barHeight);
                ctx.globalAlpha = 1;
            });
        });
    }

    // Legend rendering (HTML overlay) - adapted from original without hover tooltips
    function renderLegend(allDataSets, colors) {
        // Remove any old legend overlay
        container.selectAll('.legend-overlay').remove();

        const legendDiv = container
            .append('div')
            .attr('class', 'legend-overlay')
            .style('position', 'absolute')
            .style('right', (utils().allDataSets ? utils().allDataSets().length + 10 : 10) + 'px')
            .style('top', -25 + 'px')
            .style('display', 'flex')
            .style('gap', '6px')
            .style('z-index', 9999)
            .style('pointer-events', 'auto');

        const swatchSize = 16;
        const itemHeight = 18;

        const items = legendDiv.selectAll('div.legend-item')
            .data(allDataSets, d => d);

        items.exit().remove();

        const enter = items.enter()
            .append('div')
            .attr('class', 'legend-item')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('cursor', 'pointer')
            .style('height', itemHeight + 'px')
            .on('click', function(event, d) {
                if (hiddenDatasets.has(d)) hiddenDatasets.delete(d); else hiddenDatasets.add(d);
                renderLegend(allDataSets, colors);
                updateHistogram();
            });

        enter.append('div')
            .attr('class', 'legend-swatch')
            .style('width', swatchSize + 'px')
            .style('height', swatchSize + 'px')
            .style('border-radius', '7px')
            .style('border', '1px solid #ccc');

        enter.merge(items)
            .select('.legend-swatch')
            .style('background-color', d => colors[d] || fallbackColor(d))
            .style('opacity', d => hiddenDatasets.has(d) ? 0.25 : 1);
    }

    // Brush behavior using d3.brush on overlaySvg
    function handleSelection({ selection }) {
        let selectRanges;
        if (selection) {
            const [x0, x1] = selection;
            let xRange = [x.invert(x0), x.invert(x1)];
            selectRanges = [ { range: xRange, field: field, type: 'numerical' } ];
        } else {
            selectRanges = [];
        }
        updatePlotsFun(selectRanges);
    }
    // const throttledHandleSelection = throttle(handleSelection, brushThrottleMs);
    const throttledHandleSelection = handleSelection;

    overlaySvg.call(
        d3.brushX()
            .extent([
                [marginLeft, marginTop],
                [width - marginRight, height - marginBottom]
            ])
            .on('start brush end', throttledHandleSelection)
    );

    // Main update function
    function updateHistogram() {
        const { countsPerBin, allDataSets, colors } = computeCounts();
        renderLegend(allDataSets, colors);
        drawAll(countsPerBin, allDataSets, colors);
    }

    // initial draw
    updateHistogram();

    // Return updater
    return function updateHistogramWrapper() {
        updateHistogram();
    };
}
