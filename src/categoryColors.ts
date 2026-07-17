const palette = [
  { base: "#145a32", tint: "#1f8a4c" }, // vert
  { base: "#7a4a12", tint: "#a8651c" }, // ambre
  { base: "#4c1d78", tint: "#6c2bb0" }, // violet
  { base: "#7a1f2b", tint: "#a8283a" }, // rouge
  { base: "#16407a", tint: "#1f5aa8" }, // bleu
  { base: "#0f6e6e", tint: "#158f8f" }, // teal
];

export function getCategoryColor(category: string) {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}
