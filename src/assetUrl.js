// Builds a URL for a file in /public that respects Vite's base path,
// so assets still resolve on nested routes or when deployed under a sub-path (e.g. GitHub Pages).
export const asset = (path) => import.meta.env.BASE_URL + path.replace(/^\.?\//, '');
