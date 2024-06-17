export function formatDuration(seconds: number): string {
  const hoursPart = Math.trunc(seconds / 3600);
  const minutedPart = Math.trunc(seconds / 60 - hoursPart * 60);
  const secondsPart = Math.trunc(seconds - hoursPart * 3600 - minutedPart * 60);

  if (hoursPart === 0) {
    return `${minutedPart.toString().padStart(2, '0')}:${secondsPart.toString().padStart(2, '0')}`;
  } else {
    return `${hoursPart.toString().padStart(2, '0')}:${minutedPart.toString().padStart(2, '0')}:${secondsPart.toString().padStart(2, '0')}`;
  }
}
