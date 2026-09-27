export function applyTheme(id: string) {
  document.documentElement.dataset.theme = id;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const colors: Record<string, string> = { paper: '#f4ead6', meadow: '#e6ecd6', dusk: '#d8dde8', terracotta: '#ecd7c3' };
  if (meta) meta.content = colors[id] ?? '#f4ead6';
}
