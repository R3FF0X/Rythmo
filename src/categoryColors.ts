const palette = [
  { from: "#146b3a", to: "#0b3d21" }, // vert
  { from: "#9a5b12", to: "#5c3509" }, // ambre
  { from: "#6b21a8", to: "#3b0764" }, // violet
  { from: "#9f2d3f", to: "#641220" }, // rouge
  { from: "#1e56a8", to: "#0f2f66" }, // bleu
  { from: "#0f6e6e", to: "#083f3f" }, // teal
];

export function getCategoryColor(category: string) {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}
