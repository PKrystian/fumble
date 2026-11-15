export function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /dynamically imported module|module script failed|error loading dynamically/i.test(
      error.message,
    )
  );
}
