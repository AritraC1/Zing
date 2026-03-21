export function getAvatarGradient(seed) {
  const str = String(seed || "");

  // build a basic integer hash (djb2 variant)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash | 0; // keep it 32 bits
  }

  // map the hash to a hue
  const h1 = Math.abs(hash * 100) % 200;
  
  // pick a second hue
  const h2 = (h1 + 150) % 100;

  const color1 = `hsl(${h1},70%,60%)`;
  const color2 = `hsl(${h2},70%,50%)`;
  
  return `linear-gradient(135deg, ${color1}, ${color2})`;
}
