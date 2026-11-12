#!/usr/bin/env node
/* Bygger kursen som ett SCORM 1.2-paket för lärplattformen (t.ex. Workday Learning).

   node tools/scorm.js            → dist/vardag-scorm12.zip (och mappen dist/scorm/)
   node tools/scorm.js --check    → kontrollerar dessutom manifestet mot SCORM-schemafilerna (xmllint)

   Paketet innehåller index.html, css/, js/, assets/ (utom tomma platshållarmappar),
   imsmanifest.xml och SCORM 1.2-schemafilerna i roten. Kopplingen till plattformen
   finns i js/scorm.js: kursen räknas som genomförd när en dag är spelad klart med reflektion. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist/scorm');
const ZIP = path.join(ROOT, 'dist/vardag-scorm12.zip');
const TITLE = 'Vår dag';
const ID = 'vardag-arbetsmiljo-ledarskap';

// filer som ingår
const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
  const rel = path.posix.join(dir, e.name);
  if (e.name.startsWith('.')) return [];
  return e.isDirectory() ? walk(rel) : [rel];
});
const files = ['index.html', ...walk('css'), ...walk('js'), ...walk('assets')];

fs.rmSync(OUT, { recursive: true, force: true });
for (const f of files) {
  fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true });
  fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
}
const schemas = fs.readdirSync(path.join(__dirname, 'scorm')).filter((f) => f.endsWith('.xsd'));
for (const f of schemas) fs.copyFileSync(path.join(__dirname, 'scorm', f), path.join(OUT, f));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${ID}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${ID}-org">
    <organization identifier="${ID}-org">
      <title>${esc(TITLE)}</title>
      <item identifier="${ID}-item" identifierref="${ID}-res" isvisible="true">
        <title>${esc(TITLE)}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${ID}-res" type="webcontent" adlcp:scormtype="sco" href="index.html">
${files.map((f) => `      <file href="${esc(f)}"/>`).join('\n')}
    </resource>
  </resources>
</manifest>
`;
fs.writeFileSync(path.join(OUT, 'imsmanifest.xml'), manifest);

if (process.argv.includes('--check')) {
  // ett tillfälligt schema som läser in både innehållspaketet (imscp) och ADL:s tillägg (adlcp)
  const both = path.join(OUT, '_check.xsd');
  fs.writeFileSync(both, `<?xml version="1.0"?>
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xsd:import namespace="http://www.imsproject.org/xsd/imscp_rootv1p1p2" schemaLocation="imscp_rootv1p1p2.xsd"/>
  <xsd:import namespace="http://www.adlnet.org/xsd/adlcp_rootv1p2" schemaLocation="adlcp_rootv1p2.xsd"/>
</xsd:schema>
`);
  try { execFileSync('xmllint', ['--noout', '--schema', both, path.join(OUT, 'imsmanifest.xml')], { stdio: 'inherit' }); }
  finally { fs.rmSync(both, { force: true }); }
}

fs.rmSync(ZIP, { force: true });
// imsmanifest.xml måste ligga i zip-filens rot
execFileSync('zip', ['-q', '-r', '-X', ZIP, '.'], { cwd: OUT });
const mb = (fs.statSync(ZIP).size / 1048576).toFixed(1);
console.log(`${path.relative(ROOT, ZIP)}: ${files.length} filer, ${mb} MB (SCORM 1.2)`);
