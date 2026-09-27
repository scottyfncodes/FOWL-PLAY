let counter = 0;

/** Unique, sortable id: base36 timestamp + random + counter. */
export function makeId(prefix: string): string {
  counter = (counter + 1) % 46656;
  const time = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 46656).toString(36).padStart(3, '0');
  return `${prefix}_${time}${rand}${counter.toString(36).padStart(3, '0')}`;
}
