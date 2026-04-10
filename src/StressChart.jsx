import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";

function StressChart({ data = [], title, yRange}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

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
            min: yRange ? yRange[0] : undefined,
            max: yRange ? yRange[1] : undefined
          }
        }
      }
    });
  }, [data, title, yRange]);

  return (
    <div style={{ width: "650px", height: "300px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default StressChart;
