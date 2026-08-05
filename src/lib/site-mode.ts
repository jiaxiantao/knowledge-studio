/** Client/server: true for GitHub Pages static export builds. */
export function isGhPagesBuild() {
  return process.env.GH_PAGES === "1";
}

export function isStaticSite() {
  return (
    process.env.GH_PAGES === "1" ||
    process.env.NEXT_PUBLIC_STATIC_EXPORT === "1"
  );
}
