import { useEffect, useRef } from "react";
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, Tooltip } from "chart.js";

// Only the parts a line chart needs, rather than "chart.js/auto", which brings in every chart type
Chart.register(LineController, LineElement, PointElement, LinearScale, Title, Tooltip);

const START_YEAR = 2026;
const GAME_YEARS = 10;

// Shades the summers that brought a bleaching heatwave behind the line, so the peaks can be matched to their cause
const bleachingSummers = {
  id: "bleachingSummers",
  beforeDatasetsDraw(chart, _args, { years = [] }) {
    const { ctx, chartArea, scales } = chart;
    ctx.save();
    ctx.fillStyle = "rgba(255, 122, 89, 0.28)";
    for (const year of years) {
      const left = scales.x.getPixelForValue(START_YEAR + year - 1);
      const right = scales.x.getPixelForValue(START_YEAR + year - 0.5);
      ctx.fillRect(left, chartArea.top, right - left, chartArea.height);
    }
    ctx.restore();
  },
};

// One line over the ten years of the game. years[i] is how far into the game values[i] was recorded (0 to 10),
// and bleachingYears are the calendar years (1 to 10) whose summers are shaded.
function StressChart({ years, values, title, yRange, bleachingYears }) {
  const canvasRef = useRef(null);
  // Use the numbers, not the array, as dependencies: callers pass a new [min, max] array on every render,
  // which would otherwise rebuild the chart each time the parent re-renders
  const [yMin, yMax] = yRange ?? [];

  useEffect(() => {
    if (!canvasRef.current) return;

    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        datasets: [
          {
            data: values.map((value, i) => ({ x: START_YEAR + years[i], y: value })),
            borderColor: "#FFFFFF",
            borderWidth: 2.5,
            tension: 0.2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHitRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "nearest", intersect: false },

        plugins: {
          bleachingSummers: { years: bleachingYears },
          title: {
            display: true,
            text: title,
            color: "#FFFFFF",
            font: {
              size: 24,
              weight: "bold"
            },
            padding: { top: 10, bottom: 20 }
          },
          tooltip: {
            callbacks: {
              title: (items) => `Year ${Math.min(Math.floor(items[0].parsed.x - START_YEAR) + 1, GAME_YEARS)}`,
              label: (item) => `${title}: ${Math.round(item.parsed.y * 10) / 10}`,
            }
          }
        },

        scales: {
          x: {
            type: "linear",
            min: START_YEAR,
            max: START_YEAR + GAME_YEARS,
            title: {
                display: true,
                text: "Year",
                color: "#FFFFFF",
                font: {
                  size: 16,
                  weight: "bold"
                }
              },
            ticks: { color: "#FFFFFF", stepSize: 1, callback: (value) => value },
            grid: { color: "rgba(255,255,255,0.2)" },
          },
          y: {
            ticks: { color: "#FFFFFF" },
            grid: { color: "rgba(255,255,255,0.2)" },
            min: yMin,
            max: yMax
          }
        }
      },
      plugins: [bleachingSummers],
    });

    // Runs before the next rebuild and when the chart is removed, so Chart.js releases the canvas and its listeners
    return () => chart.destroy();
  }, [years, values, title, yMin, yMax, bleachingYears]);

  return (
    <div style={{ width: "650px", height: "300px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default StressChart;
