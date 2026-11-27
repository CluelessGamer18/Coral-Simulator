import { useEffect, useRef } from "react";
import { Chart, LinearScale, LineController, LineElement, PointElement, Title, Tooltip } from "chart.js";
import { GAME_YEARS, START_YEAR } from "../game/gameConfig.js";
import "../styles/HistoryChart.css";

// Only the parts a line chart needs, rather than "chart.js/auto", which brings in every chart type
Chart.register(LineController, LineElement, PointElement, LinearScale, Title, Tooltip);

const WHITE = "#ffffff";
const GRID = "rgba(255, 255, 255, 0.2)";

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

/**
 * One line over the ten years of the game.
 * @param {object} props
 * @param {number[]} props.years how far into the game each value was recorded (0 to GAME_YEARS)
 * @param {number[]} props.values
 * @param {string} props.title
 * @param {[number, number]} [props.yRange]
 * @param {number[]} props.bleachingYears the calendar years (1 to GAME_YEARS) whose summers are shaded
 */
function HistoryChart({ years, values, title, yRange, bleachingYears }) {
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
                        borderColor: WHITE,
                        borderWidth: 2.5,
                        tension: 0.2,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHitRadius: 8,
                    },
                ],
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
                        color: WHITE,
                        font: { size: 24, weight: "bold" },
                        padding: { top: 10, bottom: 20 },
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) =>
                                `Year ${Math.min(Math.floor(items[0].parsed.x - START_YEAR) + 1, GAME_YEARS)}`,
                            label: (item) => `${title}: ${Math.round(item.parsed.y * 10) / 10}`,
                        },
                    },
                },
                scales: {
                    x: {
                        type: "linear",
                        min: START_YEAR,
                        max: START_YEAR + GAME_YEARS,
                        title: { display: true, text: "Year", color: WHITE, font: { size: 16, weight: "bold" } },
                        // Returns the number as it is: Chart.js would otherwise format the years for the locale,
                        // as "2,026"
                        ticks: { color: WHITE, stepSize: 1, callback: (value) => value },
                        grid: { color: GRID },
                    },
                    y: {
                        ticks: { color: WHITE },
                        grid: { color: GRID },
                        min: yMin,
                        max: yMax,
                    },
                },
            },
            plugins: [bleachingSummers],
        });

        // Runs before the next rebuild and when the chart is removed, so Chart.js releases the canvas and its listeners
        return () => chart.destroy();
    }, [years, values, title, yMin, yMax, bleachingYears]);

    return (
        <div className="HistoryChart">
            <canvas ref={canvasRef} />
        </div>
    );
}

export default HistoryChart;
