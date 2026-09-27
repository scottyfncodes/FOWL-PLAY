import { writeFileSync } from 'node:fs';
import { BREEDS } from '../src/data/breeds';
import { genotypeFromSpec } from '../src/genetics/loci';
import { computePhenotype } from '../src/genetics/phenotype';
import { chickenSvg, eggSvg } from '../src/ui/chickenSvg';

let html = '<html><body style="background:#f4ead6;font-family:sans-serif;margin:0;padding:8px"><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px">';
for (const b of BREEDS) {
  const p = computePhenotype(genotypeFromSpec(b.genotype), 7);
  html += `<div style="background:#fff;border-radius:8px;padding:4px;text-align:center"><div style="width:150px;height:150px;margin:auto">${chickenSvg(p, 7, { uid: b.id })}</div><div style="font-size:11px">${b.name}</div><div style="width:24px;height:28px;margin:auto">${eggSvg(p.eggColor, p.eggSpeckled, p.eggSize)}</div></div>`;
}
html += '</div></body></html>';
writeFileSync(process.argv[2] ?? 'gallery.html', html);
