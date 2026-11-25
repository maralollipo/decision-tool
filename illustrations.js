/* Jetzt. — Illustrationen
   Flache, ruhige Zeichnungen aus den Design-Tokens, damit sie in Hell und Dunkel funktionieren.
   ILLU(name, label) liefert ein inline-SVG. */
(() => {
'use strict';
const f = t => `style="fill:var(--${t})"`;
const s = (t, w = 2) => `fill="none" style="stroke:var(--${t})" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const blob = `<path d="M36 156C14 112 44 46 118 38c50-6 76 14 120 12 44-2 70 34 54 78-14 40-52 46-112 46S52 192 36 156z" ${f('illu-bg')}/>`;
const spark = (x, y, r = 5, c = 'now') => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z" ${f(c)}/>`;

const SCENES = {
  /* Schreibtisch: frischer Start */
  desk: () => `${blob}
    <rect x="200" y="34" width="74" height="60" rx="10" ${f('surface')}/>
    <path d="M202 92c12-12 22-14 34-6 12-10 24-10 36 2v2h-70z" ${f('i-sage')} opacity=".45"/>
    <rect x="200" y="34" width="74" height="60" rx="10" ${s('line-2')}/>
    <path d="M237 34v60M200 64h74" ${s('line-2')}/>
    <circle cx="256" cy="49" r="7" ${f('now-2')}/>
    <path d="M92 90L70 146h66z" ${f('now-2')} opacity=".22"/>
    <path d="M62 150V100l24-24" ${s('ink-2', 4)}/>
    <path d="M78 66l27 8-9 20-28-9z" ${f('i-lav')}/>
    <rect x="34" y="150" width="252" height="9" rx="4.5" ${f('ink-2')}/>
    <path d="M54 159v28M266 159v28" ${s('ink-2', 5)}/>
    <rect x="122" y="96" width="82" height="52" rx="6" ${f('ink')}/>
    <rect x="128" y="102" width="70" height="40" rx="3" ${f('i-sky')}/>
    <path d="M136 112h30M136 120h44M136 128h22" fill="none" style="stroke:var(--surface)" stroke-width="3" stroke-linecap="round" opacity=".85"/>
    <path d="M108 148h110a4 4 0 01-4 4H112a4 4 0 01-4-4z" ${f('ink-2')}/>
    <circle cx="200" cy="96" r="13" ${f('grow')}/>
    <path d="M194 96l4 4 8-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="224" y="126" width="22" height="24" rx="5" ${f('now')}/>
    <path d="M246 132h3a5 5 0 010 10h-3" ${s('now', 3.5)}/>
    <path d="M230 118c-4-5 4-7 0-12M239 118c-4-5 4-7 0-12" ${s('ink-3')}/>
    <path d="M262 150l-3-20h22l-3 20z" ${f('i-clay')}/>
    <path d="M270 130c-2-14-12-20-20-20 2 10 8 18 20 20z" ${f('i-sage')}/>
    <path d="M270 130c2-16 10-26 22-28-2 14-10 24-22 28z" ${f('grow')}/>
    ${spark(110, 52, 6)}${spark(292, 118, 4, 'i-lav')}`,

  /* Gipfel: alles erledigt */
  summit: () => `${blob}
    <circle cx="240" cy="62" r="30" ${f('now-2')} opacity=".3"/>
    <circle cx="240" cy="62" r="18" ${f('now-2')}/>
    <path d="M24 176L112 74l38 40 30-28 118 90z" ${f('i-lav')} opacity=".35"/>
    <path d="M44 176l86-78 26 20 40-48 104 106z" ${f('i-sage')} opacity=".6"/>
    <path d="M196 70l-15 18 9-2 6 7 6-8 10 3z" ${f('surface')}/>
    <path d="M196 72V34" ${s('ink', 3)}/>
    <path d="M196 35l26 8-26 9z" ${f('now')}/>
    <path d="M78 172c18-18 38-12 56-26s30-10 44-24" fill="none" style="stroke:var(--surface)" stroke-width="3" stroke-dasharray="1 8" stroke-linecap="round"/>
    <path d="M50 66a10 10 0 0118-6 8 8 0 0114 6z" ${f('surface')}/>
    <path d="M262 112a8 8 0 0114-5 7 7 0 0112 5z" ${f('surface')}/>
    <rect x="24" y="172" width="276" height="7" rx="3.5" ${f('soil')} opacity=".7"/>
    ${spark(160, 44, 6)}${spark(92, 104, 4, 'i-sky')}`,

  /* Nacht: Feierabend */
  night: () => `<defs><clipPath id="cp-night"><rect x="10" y="10" width="300" height="180" rx="24"/></clipPath></defs>
    <g clip-path="url(#cp-night)">
    <rect x="10" y="10" width="300" height="180" ${f('illu-night')}/>
    ${[[40, 40], [72, 70], [110, 30], [150, 58], [190, 26], [280, 96], [266, 30], [128, 86], [300, 60], [56, 104]].map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="${k % 3 ? 1.4 : 2.2}" fill="#fff" opacity="${k % 2 ? .45 : .8}"/>`).join('')}
    <circle cx="232" cy="62" r="24" ${f('now-2')}/>
    <circle cx="243" cy="53" r="21" ${f('illu-night')}/>
    <path d="M0 150c50-28 96-28 146-10s104 10 174-16v80H0z" fill="#fff" opacity=".07"/>
    <path d="M0 168c60-20 120-16 170-4s100 8 150-6v50H0z" ${f('i-teal')} opacity=".35"/>
    <circle cx="116" cy="130" r="28" ${f('now')} opacity=".16"/>
    <path d="M88 160v-36l28-22 28 22v36z" fill="#fff" opacity=".14"/>
    <path d="M82 126l34-28 34 28" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="106" y="126" width="20" height="16" rx="2" ${f('now')}/>
    <path d="M116 126v16M106 134h20" fill="none" style="stroke:var(--illu-night)" stroke-width="2"/>
    <path d="M206 164l16-40 16 40z" fill="#fff" opacity=".12"/>
    <path d="M226 164l12-30 12 30z" fill="#fff" opacity=".09"/>
    </g>`,

  /* Kiste: Später */
  box: () => `${blob}
    <g transform="rotate(-12 132 66)"><rect x="110" y="44" width="44" height="36" rx="5" ${f('surface')}/><rect x="110" y="44" width="44" height="36" rx="5" ${s('line-2')}/><path d="M118 56h28M118 64h20M118 72h24" ${s('surface-3', 3)}/></g>
    <g transform="rotate(10 186 50)"><rect x="166" y="30" width="42" height="38" rx="5" ${f('surface')}/><rect x="166" y="30" width="42" height="38" rx="5" ${s('line-2')}/><rect x="166" y="30" width="42" height="8" rx="4" ${f('i-sky')}/><path d="M174 48h26M174 56h18" ${s('surface-3', 3)}/></g>
    <path d="M228 54c-10-2-16 4-16 12 10 0 16-4 16-12z" ${f('i-sage')}/>
    <path d="M104 112h112l-8-14H112z" ${f('ink')} opacity=".2"/>
    <path d="M96 110h128v62a6 6 0 01-6 6H102a6 6 0 01-6-6z" ${f('i-sand')}/>
    <path d="M96 110l-28 20 12 6 16-14z" ${f('i-sand')} opacity=".75"/>
    <path d="M224 110l28 20-12 6-16-14z" ${f('i-sand')} opacity=".75"/>
    <rect x="150" y="110" width="20" height="68" ${f('surface')} opacity=".35"/>
    <path d="M110 148h22" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>
    ${spark(84, 76, 5, 'i-lav')}${spark(250, 92, 6)}`,

  /* Sonnenaufgang: Willkommen zurück / Neustart / Morgen */
  sunrise: () => `<defs><clipPath id="cp-sun"><rect x="10" y="12" width="300" height="176" rx="26"/></clipPath></defs>
    <g clip-path="url(#cp-sun)">
    <rect x="10" y="12" width="300" height="176" ${f('illu-bg')}/>
    <circle cx="160" cy="132" r="64" ${f('now-2')} opacity=".22"/>
    <circle cx="160" cy="132" r="40" ${f('now-2')}/>
    ${[-70, -45, -20, 20, 45, 70].map(a => { const r = Math.PI * (a - 90) / 180; return `<path d="M${(160 + Math.cos(r) * 52).toFixed(1)} ${(132 + Math.sin(r) * 52).toFixed(1)}L${(160 + Math.cos(r) * 64).toFixed(1)} ${(132 + Math.sin(r) * 64).toFixed(1)}" ${s('now', 3)}/>`; }).join('')}
    <path d="M0 140c40-26 84-30 124-14s92 18 196-20v94H0z" ${f('i-sky')} opacity=".35"/>
    <path d="M0 160c56-24 110-22 160-8s110 12 160-10v60H0z" ${f('i-sage')} opacity=".7"/>
    <path d="M150 200c4-20 30-28 54-34s40-12 60-24" fill="none" style="stroke:var(--surface)" stroke-width="4" stroke-linecap="round" opacity=".8"/>
    <path d="M80 62q6-6 12 0q6-6 12 0M222 48q5-5 10 0q5-5 10 0" ${s('ink-2', 2)}/>
    </g>`,

  /* Wege: Initiativen */
  paths: () => `<defs><clipPath id="cp-paths"><rect x="10" y="12" width="300" height="176" rx="26"/></clipPath></defs>
    <g clip-path="url(#cp-paths)">
    <rect x="10" y="12" width="300" height="176" ${f('illu-bg')}/>
    ${[['M160 200C160 150 84 142 74 78', 'i-sky', 74, 78], ['M160 200C160 140 132 112 128 52', 'i-lav', 128, 52], ['M160 200C162 142 196 112 202 60', 'i-sage', 202, 60], ['M160 200C164 152 250 142 256 92', 'i-sand', 256, 92]].map(([d, c, x, y]) =>
      `<path d="${d}" ${s(c, 6)} opacity=".85"/><circle cx="${x}" cy="${y}" r="14" ${f('surface')}/><circle cx="${x}" cy="${y}" r="14" ${s(c, 4)}/><circle cx="${x}" cy="${y}" r="5" ${f(c)}/>`).join('')}
    <path d="M128 38V14" ${s('ink', 2.5)}/><path d="M128 15l18 6-18 6z" ${f('now')}/>
    <circle cx="160" cy="186" r="10" ${f('now')}/>
    ${spark(44, 40, 5)}${spark(282, 44, 4, 'i-clay')}
    </g>`,

  /* Gedankenwolke wird zu Karten: Brain-Dump */
  dump: () => `${blob}
    <path d="M40 116a24 24 0 0122-32 32 32 0 0161-6 22 22 0 0110 43H54a20 20 0 01-14-5z" ${f('surface')}/>
    <path d="M40 116a24 24 0 0122-32 32 32 0 0161-6 22 22 0 0110 43H54a20 20 0 01-14-5z" ${s('line-2')}/>
    <path d="M60 100c6-10 12 8 18-2s10 8 16-2 10 8 16 0M62 112c8-6 14 4 22-2s12 4 20-2" ${s('ink-3', 2)}/>
    <path d="M150 104h34" ${s('now', 4)}/><path d="M176 94l10 10-10 10" ${s('now', 4)}/>
    ${[['i-sky', 52], ['i-lav', 92], ['i-sage', 132]].map(([c, y], k) => `<rect x="204" y="${y}" width="88" height="30" rx="9" ${f('surface')}/><rect x="204" y="${y}" width="88" height="30" rx="9" ${s('line-2')}/><rect x="212" y="${y + 9}" width="12" height="12" rx="4" ${f(c)}/><path d="M232 ${y + 15}h${k === 1 ? 30 : 44}" ${s('surface-3', 4)}/>`).join('')}
    ${spark(126, 52, 5, 'i-lav')}`,

  /* Glocke: Erinnerungen */
  bell: () => `${blob}
    <path d="M110 76a60 60 0 000 64M94 62a82 82 0 000 92" ${s('now', 3)} opacity=".45"/>
    <path d="M210 76a60 60 0 010 64M226 62a82 82 0 010 92" ${s('now', 3)} opacity=".45"/>
    <circle cx="160" cy="42" r="7" ${f('now')}/>
    <path d="M160 46c-24 0-38 18-38 40v28l-10 14h96l-10-14V86c0-22-14-40-38-40z" ${f('now')}/>
    <path d="M140 72c4-9 10-13 18-14" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>
    <circle cx="160" cy="138" r="10" ${f('ink-2')}/>
    <path d="M238 46c-12-2-18 6-18 14 12 0 18-6 18-14z" ${f('i-sage')}/>
    ${spark(80, 50, 5, 'i-lav')}`,

  /* Trittsteine: Routinen */
  steps: () => `${blob}
    <path d="M56 160C96 150 104 124 140 118s60-24 74-52 44-30 60-28" fill="none" style="stroke:var(--ink-3)" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/>
    ${[[60, 160, 'i-sky'], [104, 138, 'i-lav'], [148, 118, 'i-sage'], [192, 94, 'i-sand'], [232, 62, 'now']].map(([x, y, c], k) => `<ellipse cx="${x}" cy="${y + 5}" rx="24" ry="8" ${f('ink')} opacity=".08"/><ellipse cx="${x}" cy="${y}" rx="24" ry="9" ${f(c)}/><ellipse cx="${x - 4}" cy="${y - 3}" rx="10" ry="3" fill="#fff" opacity=".35"/>${k < 4 ? `<circle cx="${x}" cy="${y - 20}" r="9" ${f('surface')}/><path d="M${x - 4} ${y - 20}l3 3 5-6" ${s('grow', 2.5)}/>` : ''}`).join('')}
    <path d="M232 54V22" ${s('ink', 2.5)}/><path d="M232 23l20 7-20 7z" ${f('now')}/>
    ${spark(276, 104, 6, 'i-lav')}`,
};

let n = 0;
window.ILLU = (name, label = '') => {
  if (!SCENES[name]) return '';
  const k = ++n; // eindeutige IDs, auch wenn dieselbe Zeichnung zweimal im DOM steht
  return `<svg class="illu illu-${name}" viewBox="0 0 320 200" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${SCENES[name]().replace(/cp-(\w+)/g, `cp-$1-${k}`)}</svg>`;
};
})();
