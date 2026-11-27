/**
 * A URL for a file in public/ that respects Vite's base path, so assets still resolve on nested routes or when the
 * game is hosted under a sub-path (such as GitHub Pages).
 * @param {string} path relative to public/, e.g. "warning.svg"
 */
export const asset = (path) => import.meta.env.BASE_URL + path.replace(/^\.?\//, "");
