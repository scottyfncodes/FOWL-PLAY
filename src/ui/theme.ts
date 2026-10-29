export function applyTheme(id: string) {
  document.documentElement.dataset.theme = id;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const colors: Record<string, string> = { paper: '#f2e8d0', meadow: '#e4ead0', dusk: '#dcdfe6', terracotta: '#ecd6c0' };
  if (meta) meta.content = colors[id] ?? '#f2e8d0';
}
