import { useEffect, useRef } from "react";
import { CHART_COLORS } from "./reportGrade.js";
import { Chart, LineController, ScatterController, LineElement, PointElement, LinearScale, Tooltip } from "chart.js";

// Only the parts these charts need, rather than "chart.js/auto", which brings in every chart type
Chart.register(LineController, ScatterController, LineElement, PointElement, LinearScale, Tooltip);

const START_YEAR = 2026;
const GAME_YEARS = 10;
const INK = "#FFFFFF";
const INK_SOFT = "#C9E4EA";
const GRID = "rgba(255, 255, 255, 0.14)";

// Shades the summers that brought a heatwave behind the line, so the peaks can be matched to their cause
const heatwaveSummers = {
  id: "heatwaveSummers",
  beforeDatasetsDraw(chart, _args, { years = [] }) {
    const { ctx, chartArea, scales } = chart;
    ctx.save();
    ctx.fillStyle = CHART_COLORS.heatwave;
    for (const year of years) {
      const left = scales.x.getPixelForValue(START_YEAR + year - 1);
      const right = scales.x.getPixelForValue(START_YEAR + year - 0.5);
      ctx.fillRect(left, chartArea.top, right - left, chartArea.height);
    }
    ctx.restore();
  },
};

const gameYear = (x) => Math.min(Math.floor(x - START_YEAR) + 1, GAME_YEARS);

/*
One chart over the ten years of the game, on a shared time axis. series is a list of
{ label, color, points: [{ x, y }], unit, kind: "line" | "marks", shape, sizes } and heatYears are the calendar
years (1 to 10) whose summers are shaded. The small charts under the main one hide their x axis labels (compact).
*/
function ReportChart({ series, yRange, heatYears, height, compact = false, label }) {
  const canvasRef = useRef(null);
  const [yMin, yMax] = yRange;

  useEffect(() => {
    if (!canvasRef.current) return;

    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        datasets: series.map(({ label, color, points, kind = "line", shape = "circle", sizes }) => kind === "line" ? {
          label, data: points, borderColor: color, borderWidth: 2, tension: 0.2,
          pointRadius: 0, pointHoverRadius: 5, pointHitRadius: 8, pointBackgroundColor: color,
        } : {
          type: "scatter", label, data: points, pointStyle: shape, clip: false, // a mark at 100% isn't cut off by the top of the chart
          backgroundColor: color, borderColor: "#0B2E3A", borderWidth: 2, // a ring of the surface colour, so overlapping marks stay separate
          pointRadius: sizes ?? 7, pointHoverRadius: sizes ? sizes.map(size => size + 2) : 9,
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          heatwaveSummers: { years: heatYears },
          tooltip: {
            callbacks: {
              title: (items) => `Year ${gameYear(items[0].parsed.x)}`,
              label: (item) => {
                const { unit = "", describe } = series[item.datasetIndex];
                if (describe) return describe(item.raw);
                return `${item.dataset.label}: ${Math.round(item.parsed.y * 10) / 10}${unit}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            min: START_YEAR,
            max: START_YEAR + GAME_YEARS,
            ticks: { display: !compact, color: INK_SOFT, stepSize: 1, callback: (value) => value, font: { size: 12 } },
            grid: { color: GRID },
            border: { color: GRID },
          },
          y: {
            min: yMin,
            max: yMax,
            ticks: { color: INK_SOFT, maxTicksLimit: compact ? 3 : 6, font: { size: 12 } },
            afterFit: (axis) => { axis.width = 46; }, // the same on every chart, so their years line up
            grid: { color: GRID },
            border: { color: GRID },
          },
        },
      },
      plugins: [heatwaveSummers],
    });

    // Runs before the next rebuild and when the chart is removed, so Chart.js releases the canvas and its listeners
    return () => chart.destroy();
  }, [series, yMin, yMax, heatYears, compact]);

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} role="img" aria-label={label} style={{ color: INK }} />
    </div>
  );
}

export default ReportChart;
