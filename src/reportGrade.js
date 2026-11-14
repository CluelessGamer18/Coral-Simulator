// One to three stars from how much of the reef is still alive at the end. A lost game earns none.
export function getStars({ survived, coralsAlive, coralsTotal }) {
    if (!survived) return 0;
    const alive = coralsAlive / coralsTotal;
    return alive >= 0.9 ? 3 : alive >= 0.75 ? 2 : alive >= 0.5 ? 1 : 0;
}

// The colours of the report card's charts and their legend
export const CHART_COLORS = {
    stress: "#FFFFFF", pops: "#7FE3C4", deaths: "#FF5D5D", temp: "#FF8A70", light: "#FFC857",
    heatwave: "rgba(255, 138, 112, 0.2)",
};
