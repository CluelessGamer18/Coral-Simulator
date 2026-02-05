import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";

function StressChart({ data }) {
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
        labels: data.map((_, i) => i),
        datasets: [
          {
            label: "Stress",
            data,
            borderColor: "rgb(0, 0, 0)",
            tension: 0.25
          }
        ]
      },
      options: {
        responsive: true,
        animation: false
      }
    });
  }, [data]);

  return <canvas ref={canvasRef} />;
}

export default StressChart;
