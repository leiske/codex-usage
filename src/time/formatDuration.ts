export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0s";

  const s = Math.floor(totalSeconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (days > 0) {
    if (hours > 0) return `${days}d ${hours}h`;
    return `${days}d`;
  }

  if (hours > 0) {
    if (minutes > 0) return `${hours}h ${minutes}m`;
    return `${hours}h`;
  }

  if (minutes > 0) {
    if (seconds > 0) return `${minutes}m ${seconds}s`;
    return `${minutes}m`;
  }

  return `${seconds}s`;
}
