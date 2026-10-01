import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";

function StressChart({ data = [], title, yRange}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  // Use the numbers, not the array, as dependencies: callers pass a new [min, max] array on every render,
  // which would otherwise rebuild the chart each time the parent re-renders
  const [yMin, yMax] = yRange ?? [];

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: data.map((_, i) => 2026 + i),
        datasets: [
          {
            data,
            borderColor: "#FFFFFF",
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,

        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: title,
            color: "#FFFFFF",
            font: {
              size: 24,
              weight: "bold"
            },
            padding: { top: 10, bottom: 20 }
          }
        },

        scales: {
          x: {
            title: {
                display: true,
                text: "Year",
                color: "#FFFFFF",
                font: {
                  size: 16,
                  weight: "bold"
                }
              },
            ticks: { color: "#FFFFFF" },
            grid: { color: "rgba(255,255,255,0.2)" },
          },
          y: {
            ticks: { color: "#FFFFFF" },
            grid: { color: "rgba(255,255,255,0.2)" },
            min: yMin,
            max: yMax
          }
        }
      }
    });

    // Runs before the next rebuild and when the chart is removed, so Chart.js releases the canvas and its listeners
    return () => {
      chartRef.current.destroy();
      chartRef.current = null;
    };
  }, [data, title, yMin, yMax]);

  return (
    <div style={{ width: "650px", height: "300px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default StressChart;
