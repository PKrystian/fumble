export function focusRollResult(): void {
  requestAnimationFrame(() => {
    const title =
      document.getElementById('latest-roll-title') ??
      document.getElementById('dock-roll-title');
    title?.focus();
  });
}
