import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =====================================================
// FOLD — Day 1: All 5 Protein Structures + Parameters
// =====================================================

// ---- RENDERER ----
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ---- SCENE ----
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 40);

// ---- ORBIT CONTROLS ----
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping   = true;
controls.dampingFactor   = 0.06;
controls.minDistance     = 8;
controls.maxDistance     = 120;
controls.autoRotate      = true;
controls.autoRotateSpeed = 0.4;
controls.enabled         = false; // enabled after level select

// ---- LIGHTING ----
const ambientLight = new THREE.AmbientLight(0x111122, 0.9);
scene.add(ambientLight);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(30, 40, 20);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x4466ff, 0.4);
fillLight.position.set(-20, -10, 20);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xff8844, 0.3);
rimLight.position.set(0, -30, -20);
scene.add(rimLight);

// ---- BACKGROUND STARS (lab feel) ----
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(1500*3);
for(let i=0;i<1500;i++){
  starPos[i*3]   = (Math.random()-.5)*400;
  starPos[i*3+1] = (Math.random()-.5)*400;
  starPos[i*3+2] = (Math.random()-.5)*400;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,3));
scene.add(new THREE.Points(starGeo,
  new THREE.PointsMaterial({color:0x334155,size:0.3,transparent:true,opacity:0.5,depthWrite:false})
));

// =====================================================
// PROTEIN BUILDERS
// All proteins are procedurally constructed from
// geometric primitives that represent structural
// features (helices, sheets, loops, subunits)
// Color scheme: red=α-helix, blue=β-sheet,
//               yellow=loop, purple=active site,
//               orange=cofactor
// =====================================================

const HELIX_COLOR   = new THREE.Color(0xef4444);
const SHEET_COLOR   = new THREE.Color(0x60a5fa);
const LOOP_COLOR    = new THREE.Color(0xfbbf24);
const ACTIVE_COLOR  = new THREE.Color(0xa78bfa);
const COFACTOR_COLOR= new THREE.Color(0xf97316);
const DISULFIDE_COLOR=new THREE.Color(0xfde68a);

function makeMat(color, opacity=1, emissive=null) {
  return new THREE.MeshStandardMaterial({
    color, roughness:0.45, metalness:0.1,
    transparent: opacity<1, opacity,
    emissive: emissive || new THREE.Color(color).multiplyScalar(0.18),
    emissiveIntensity: 0.35,
  });
}

// Helper: build a helix segment as a tube along a helical curve
function buildHelix(radius, height, turns, color, position, rotation) {
  const points = [];
  const steps  = turns * 20;
  for (let i=0; i<=steps; i++) {
    const t = i/steps;
    const angle = t * turns * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      t * height - height/2,
      Math.sin(angle) * radius
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh  = new THREE.Mesh(
    new THREE.TubeGeometry(curve, steps, 0.55, 8, false),
    makeMat(color)
  );
  if (position) mesh.position.copy(position);
  if (rotation) mesh.rotation.copy(rotation);
  return mesh;
}

// Helper: build a beta sheet as a flat ribbon
function buildSheet(width, height, color, position, rotation) {
  const geo  = new THREE.BoxGeometry(width, height, 0.4);
  const mesh = new THREE.Mesh(geo, makeMat(color));
  if (position) mesh.position.copy(position);
  if (rotation) mesh.rotation.copy(rotation);
  return mesh;
}

// Helper: build a loop as a curved tube
function buildLoop(from, to, color, sag=0) {
  const mid = from.clone().add(to).multiplyScalar(.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, 12, 0.35, 6, false),
    makeMat(color)
  );
}

// Helper: sphere node
function buildSphere(radius, color, position, opacity=1) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 12),
    makeMat(color, opacity)
  );
  if (position) mesh.position.copy(position);
  return mesh;
}

// =====================================================
// PROTEIN DEFINITIONS
// =====================================================
let currentProtein = null;
let mutationActive = false;
let integrity      = 100;

// ---- HEMOGLOBIN ----
function buildHemoglobin() {
  const group = new THREE.Group();

  // 4 subunits: 2 alpha + 2 beta, arranged as tetramer
  const subunitData = [
    { pos: new THREE.Vector3(-6,  3, 0),  color: 0xef4444, label:'α1' },
    { pos: new THREE.Vector3( 6,  3, 0),  color: 0xff6b6b, label:'α2' },
    { pos: new THREE.Vector3(-6, -3, 0),  color: 0x60a5fa, label:'β1' },
    { pos: new THREE.Vector3( 6, -3, 0),  color: 0x93c5fd, label:'β2' },
  ];

  subunitData.forEach(sub => {
    const su = new THREE.Group();
    // Each subunit has 8 α-helices (A-H helices of globin fold)
    const helixAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    helixAngles.forEach((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      const h   = buildHelix(0.7, 3.5+Math.random(), 1.5+Math.random()*.5,
        sub.color,
        new THREE.Vector3(Math.cos(rad)*3.2, (i%4-1.5)*1.8, Math.sin(rad)*3.2),
        new THREE.Euler(Math.random()*.4-.2, rad, Math.random()*.3-.15)
      );
      su.add(h);
    });
    // Connecting loops
    su.add(buildLoop(
      new THREE.Vector3(-2, 0, 0), new THREE.Vector3(2, 0, 0),
      LOOP_COLOR, 1.5
    ));
    // Heme group (orange flat disk + Fe center)
    const heme = new THREE.Group();
    heme.add(new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.3, 16),
      makeMat(COFACTOR_COLOR)
    ));
    heme.add(buildSphere(0.45, 0xffa500, new THREE.Vector3(0,0.3,0)));
    heme.position.set(0, 0, 0);
    heme.rotation.x = Math.PI/2;
    su.add(heme);

    su.position.copy(sub.pos);
    su.userData.label = sub.label;
    group.add(su);
  });

  // Interface contacts between subunits (dashed lines)
  [
    [subunitData[0].pos, subunitData[2].pos],
    [subunitData[1].pos, subunitData[3].pos],
    [subunitData[0].pos, subunitData[1].pos],
    [subunitData[2].pos, subunitData[3].pos],
  ].forEach(([a,b]) => {
    group.add(buildLoop(a.clone(), b.clone(), ACTIVE_COLOR, 0));
  });

  group.userData = {
    name: 'Hemoglobin',
    level: 'Level 01 · Quaternary Structure',
    mutation: { name:'Val6→Glu (Sickle Cell)', residue:'β-chain Val6', color:0xff0000 },
    info: 'Hemoglobin is a tetramer (α₂β₂) — 4 subunits held together by hydrophobic interactions at the interfaces. Each subunit holds a heme group with an iron (Fe²⁺) atom that binds oxygen. The 8 α-helices (A-H) of the globin fold create a hydrophobic pocket for the heme.',
    popups: [
      { trigger:'start', icon:'🩸', title:'HEMOGLOBIN STRUCTURE', body:'Hemoglobin is a quaternary protein: 4 subunits (2 alpha, 2 beta) working together cooperatively. When one subunit binds O₂, it changes shape and makes the other 3 bind O₂ more easily — this is cooperative binding (allosteric regulation). Without this teamwork, oxygen delivery to tissues would be far less efficient.', src:'Perutz MF, Nature (1970)' },
      { trigger:'mutation', icon:'⚠️', title:'SICKLE CELL MUTATION', body:'A single nucleotide change converts codon 6 of the β-globin gene from GAG (Glu) to GUG (Val). This swaps one charged, hydrophilic amino acid for a nonpolar, hydrophobic one. The Val6 on one hemoglobin molecule fits into a hydrophobic pocket on another — causing chains to polymerize. Red blood cells distort into sickle shapes and block blood vessels.', src:'Ingram VM, Nature (1956)' },
      { trigger:'heat', icon:'🌡️', title:'HEAT DENATURATION', body:'Above ~60°C, the hydrophobic interactions holding hemoglobin\'s subunits together weaken. The quaternary structure dissociates: α and β subunits separate. Helices begin to unfold as hydrogen bonds break. The protein loses its cooperative binding ability — oxygen transport fails.', src:'Privalov PL, Adv Protein Chem (1979)' },
    ]
  };
  return group;
}

// ---- IgG ANTIBODY ----
function buildAntibody() {
  const group = new THREE.Group();

  // Y-shape: 2 Fab arms + Fc stem
  // Heavy chains (blue) + Light chains (red)

  // FC stem (bottom)
  const fc = new THREE.Group();
  fc.add(buildHelix(1, 6, 2, 0x60a5fa, new THREE.Vector3(-1, 0, 0), new THREE.Euler(0,0,0.1)));
  fc.add(buildHelix(1, 6, 2, 0x60a5fa, new THREE.Vector3( 1, 0, 0), new THREE.Euler(0,0,-0.1)));
  fc.add(buildSheet(2, 2, SHEET_COLOR, new THREE.Vector3(0, -2, 0)));
  fc.add(buildSheet(2, 2, SHEET_COLOR, new THREE.Vector3(0, -4, 0)));
  // Disulfide bonds in hinge
  for(let i=0;i<3;i++){
    const ds = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12,0.12,2.1,6),
      makeMat(DISULFIDE_COLOR)
    );
    ds.rotation.z = Math.PI/2;
    ds.position.set(0, 3.2+i*.4, 0);
    fc.add(ds);
  }
  group.add(fc);

  // Left Fab arm
  const fabL = new THREE.Group();
  fabL.add(buildHelix(0.8,4,1.5, 0x60a5fa, new THREE.Vector3(-1,2,0)));
  fabL.add(buildHelix(0.8,3,1.2, 0xef4444, new THREE.Vector3( 0.5,1.5,0)));
  fabL.add(buildSheet(2,1.5,SHEET_COLOR, new THREE.Vector3(0,4,0)));
  // Variable region (antigen binding) — purple
  fabL.add(buildSphere(1.5, ACTIVE_COLOR, new THREE.Vector3(-0.5, 6.5, 0), 0.85));
  fabL.position.set(-5, 4, 0);
  fabL.rotation.z = -0.5;
  group.add(fabL);

  // Right Fab arm
  const fabR = fabL.clone();
  fabR.position.set(5, 4, 0);
  fabR.rotation.z = 0.5;
  group.add(fabR);

  // Connecting loops at Y-junction
  group.add(buildLoop(new THREE.Vector3(0,6,0), new THREE.Vector3(-5,4,0), LOOP_COLOR, -1));
  group.add(buildLoop(new THREE.Vector3(0,6,0), new THREE.Vector3( 5,4,0), LOOP_COLOR, -1));

  // Disulfide in each Fab
  [fabL, fabR].forEach(fab => {
    const ds = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1,0.1,1.5,6),
      makeMat(DISULFIDE_COLOR)
    );
    ds.rotation.z = Math.PI/3;
    ds.position.set(0,2.5,0);
    fab.add(ds);
  });

  group.userData = {
    name: 'Immunoglobulin G (IgG)',
    level: 'Level 02 · Antibody Structure',
    mutation: { name:'CDR Loop Disruption', residue:'Variable Region', color:0xff4444 },
    info: 'IgG is a Y-shaped glycoprotein with 2 heavy chains and 2 light chains linked by disulfide bonds. The two Fab arms contain variable regions (CDRs) that specifically bind antigens. The Fc stem determines immune effector functions. Disulfide bonds are critical — reduce them and the antibody loses structure and function.',
    popups: [
      { trigger:'start', icon:'🛡️', title:'IgG ANTIBODY STRUCTURE', body:'IgG antibodies have a Y-shape formed by 4 polypeptide chains: 2 heavy (blue) and 2 light (red) chains, linked by disulfide bonds (yellow). The two arms (Fab regions) contain hypervariable loops (CDRs) that specifically recognize antigens. The base (Fc region) binds immune cell receptors. The hinge region gives flexibility between Fab arms.', src:'Edelman GM, Science (1969)' },
      { trigger:'mutation', icon:'⚠️', title:'CDR MUTATION EFFECTS', body:'The 6 complementarity-determining regions (CDRs) — 3 per Fab arm — form the antigen-binding site. Even a single amino acid change in a CDR can eliminate antigen binding or change specificity. This is the basis of antibody engineering for cancer immunotherapy — scientists deliberately mutate CDRs to improve binding to tumor antigens.', src:'Chothia C & Lesk AM, J Mol Biol (1987)' },
      { trigger:'heat', icon:'🌡️', title:'ANTIBODY DENATURATION', body:'Antibodies are stabilized by disulfide bonds between cysteines, making them relatively heat-stable compared to most proteins (Tm ~70°C). Above this, even disulfide-linked chains separate. At low pH, disulfide bonds can be disrupted. This is why therapeutic antibodies require cold storage — lose the structure and the drug loses its specificity.', src:'Wang W, Int J Pharm (1999)' },
    ]
  };
  return group;
}

// ---- INSULIN ----
function buildInsulin() {
  const group = new THREE.Group();

  // A-chain (21 residues) — 2 helices
  const aChain = new THREE.Group();
  aChain.add(buildHelix(0.6, 3.5, 1.2, 0xef4444, new THREE.Vector3(-1, 1, 0)));
  aChain.add(buildHelix(0.6, 2.5, 1.0, 0xef4444, new THREE.Vector3( 1,-0.5,0)));
  aChain.add(buildLoop(new THREE.Vector3(-1,1,0), new THREE.Vector3(1,-0.5,0), LOOP_COLOR, 0.8));
  // Intrachain disulfide A6-A11
  const ds1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1,0.1,2,6),
    makeMat(DISULFIDE_COLOR)
  );
  ds1.rotation.z = Math.PI/4;
  ds1.position.set(0, 0.8, 0.5);
  aChain.add(ds1);
  aChain.position.set(-3, 2, 0);
  group.add(aChain);

  // B-chain (30 residues) — 1 major helix + extended strand
  const bChain = new THREE.Group();
  bChain.add(buildHelix(0.7, 5, 1.8, 0x60a5fa, new THREE.Vector3(0, 0, 0)));
  bChain.add(buildSheet(3, 0.8, SHEET_COLOR, new THREE.Vector3(0, -3.5, 0)));
  bChain.add(buildLoop(new THREE.Vector3(0,-1.5,0), new THREE.Vector3(0,-3,0), LOOP_COLOR, 0.5));
  bChain.position.set(3, 0, 0);
  group.add(bChain);

  // Interchain disulfides A7-B7 and A20-B19
  [
    { from:new THREE.Vector3(-1.5, 1.5, 0), to:new THREE.Vector3(2, 1, 0) },
    { from:new THREE.Vector3(-1, -1, 0),    to:new THREE.Vector3(2,-2, 0) },
  ].forEach(({from,to}) => {
    const mid  = from.clone().add(to).multiplyScalar(.5);
    const dist = from.distanceTo(to);
    const ds   = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12,0.12,dist,6),
      makeMat(DISULFIDE_COLOR)
    );
    ds.position.copy(mid);
    ds.lookAt(to);
    ds.rotateX(Math.PI/2);
    group.add(ds);
  });

  // Receptor binding surface (active site)
  group.add(buildSphere(1.2, ACTIVE_COLOR, new THREE.Vector3(0, -1, 1.5), 0.7));

  group.userData = {
    name: 'Insulin',
    level: 'Level 03 · Disulfide Bonds & Hormone Function',
    mutation: { name:'Pro→Leu B28 (Insulin Lispro)', residue:'B28 Pro', color:0xff8800 },
    info: 'Insulin is a small hormone (51 AA) with two chains: A (21 AA, red) and B (30 AA, blue), connected by two interchain disulfide bonds (Cys A7-B7, Cys A20-B19). A third disulfide within the A-chain (Cys A6-A11) locks its conformation. These disulfide bonds are critical — break them and insulin cannot bind its receptor.',
    popups: [
      { trigger:'start', icon:'⚡', title:'INSULIN STRUCTURE', body:'Insulin\'s two chains are held together by two disulfide bonds between cysteine residues. This is tertiary/quaternary structure. The B-chain helix (residues 9-19) and A-chain helices pack against each other. The exposed surface near the A-chain C-terminus and B-chain N-terminus binds the insulin receptor — triggering glucose uptake in cells.', src:'Blundell TL et al, Adv Protein Chem (1972)' },
      { trigger:'mutation', icon:'💊', title:'INSULIN LISPRO (HUMALOG)', body:'In natural insulin, B26-B30 forms a β-strand that promotes insulin hexamer formation, slowing absorption. Swapping Pro28-Lys29 to Lys28-Pro29 disrupts this strand — preventing hexamer formation. The result: insulin lispro absorbs 3x faster, acting within 15 minutes instead of 1-2 hours. This is rational protein engineering using knowledge of structure.', src:'Bakaysa DL et al, Protein Sci (1996)' },
      { trigger:'heat', icon:'🌡️', title:'INSULIN AGGREGATION', body:'Heat causes insulin to form amyloid fibrils — β-sheet rich aggregates that are biologically inactive and toxic. This is why insulin must be refrigerated. The B-chain helix unfolds first, exposing hydrophobic residues that drive fibril nucleation. Insulin aggregation in diabetic patients\' injection sites causes lipodystrophy.', src:'Nielsen L et al, Biochemistry (2001)' },
    ]
  };
  return group;
}

// ---- COLLAGEN ----
function buildCollagen() {
  const group = new THREE.Group();

  // Triple helix — 3 intertwined chains
  const colors = [0xef4444, 0x60a5fa, 0x4ade80];
  for(let c=0;c<3;c++){
    const points = [];
    const offset = (c/3)*Math.PI*2;
    for(let i=0;i<=120;i++){
      const t = i/120;
      const angle = t*Math.PI*8 + offset;
      points.push(new THREE.Vector3(
        Math.cos(angle)*1.5,
        t*24-12,
        Math.sin(angle)*1.5
      ));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    group.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, 120, 0.45, 8, false),
      makeMat(colors[c])
    ));
  }

  // Glycine residues at every 3rd position (interior — purple spheres)
  for(let i=0;i<8;i++){
    const t     = (i+1)/9;
    const angle = t*Math.PI*8;
    group.add(buildSphere(0.5, ACTIVE_COLOR,
      new THREE.Vector3(0, t*24-12, 0)
    ));
  }

  // Hydroxyproline cross-links (yellow bridges between chains)
  for(let i=0;i<6;i++){
    const y = -10 + i*4;
    group.add(buildLoop(
      new THREE.Vector3(-1.5, y, 0),
      new THREE.Vector3(1.5,  y, 0),
      LOOP_COLOR, 0
    ));
  }

  group.userData = {
    name: 'Collagen',
    level: 'Level 04 · Triple Helix Structure',
    mutation: { name:'Gly→Ala (Osteogenesis Imperfecta)', residue:'Every 3rd Gly', color:0xff0000 },
    info: 'Collagen is the most abundant protein in the body. Three polypeptide chains (α-chains) wind around each other in a right-handed triple helix. Every third residue MUST be Glycine — the smallest AA — because it faces inward where there is no space for any side chain. Hydroxyproline residues (modified from Pro by Vitamin C) form H-bonds that stabilize the helix.',
    popups: [
      { trigger:'start', icon:'🧱', title:'COLLAGEN TRIPLE HELIX', body:'Collagen\'s Gly-X-Y repeat (where X is often Pro and Y is often Hydroxyproline) winds three chains into a rope-like triple helix. Glycine (purple) occupies the interior — any other amino acid is physically too large. Hydroxyproline forms H-bonds between chains stabilizing the structure. Vitamin C is required to hydroxylate proline — without it (scurvy), collagen unravels and connective tissue fails.', src:'Ramachandran GN & Kartha G, Nature (1954)' },
      { trigger:'mutation', icon:'🦴', title:'OSTEOGENESIS IMPERFECTA', body:'Osteogenesis Imperfecta ("brittle bone disease") is caused by mutations replacing obligatory Glycines with any other amino acid. Even Gly→Ala (the smallest possible change) disrupts the triple helix because Ala\'s methyl group cannot fit in the interior. The helix cannot form properly — collagen is structurally weakened and bones fracture easily.', src:'Byers PH, Arch Biochem Biophys (2000)' },
      { trigger:'heat', icon:'🌡️', title:'COLLAGEN DENATURATION', body:'Collagen denatures at ~37-39°C — barely above body temperature. The triple helix is actually a thermodynamically marginal structure. Increasing temperature or low pH breaks the interchain H-bonds between hydroxyprolines. The chains separate into random coils — this is gelatin (literally denatured collagen). Cooking meat converts collagen → gelatin, making it tender.', src:'Bailey AJ, Meat Science (1972)' },
    ]
  };
  return group;
}

// ---- PRION ----
function buildPrion() {
  const group = new THREE.Group();

  // Normal PrPC (left): mostly alpha-helices
  const normal = new THREE.Group();
  normal.add(buildHelix(0.8, 4, 1.5, 0xef4444, new THREE.Vector3(-1,3,0)));
  normal.add(buildHelix(0.8, 4, 1.5, 0xef4444, new THREE.Vector3( 1,3,0)));
  normal.add(buildHelix(0.8, 3, 1.2, 0xff8888, new THREE.Vector3( 0,0,1)));
  normal.add(buildSheet(2,1, SHEET_COLOR, new THREE.Vector3(0,-2,0)));
  normal.add(buildLoop(new THREE.Vector3(-1,-1,0), new THREE.Vector3(1,-1,0), LOOP_COLOR, 0.8));
  // Label: normal
  normal.position.set(-8, 0, 0);
  normal.userData.type = 'normal';
  group.add(normal);

  // Misfolded PrPSc (right): converted to beta-sheets, aggregated
  const misfolded = new THREE.Group();
  // β-sheets stacked (aggregated)
  for(let i=0;i<5;i++){
    misfolded.add(buildSheet(4, 1.2, SHEET_COLOR,
      new THREE.Vector3(0, -4+i*1.8, i*.3),
      new THREE.Euler(0, i*.15, 0)
    ));
  }
  // Collapsed helices (remnants)
  misfolded.add(buildSphere(1, 0xef4444, new THREE.Vector3(-1.5, 3.5, 0), 0.5));
  misfolded.add(buildSphere(1, 0xef4444, new THREE.Vector3( 1.5, 3.5, 0), 0.5));
  // Aggregation surface (red glow)
  misfolded.add(buildSphere(2.5, 0xff0000, new THREE.Vector3(0,0,0), 0.12));
  misfolded.position.set(8, 0, 0);
  misfolded.userData.type = 'misfolded';
  group.add(misfolded);

  // Arrow between normal and misfolded
  const arrowGeo = new THREE.CylinderGeometry(0.15,0.15,6,6);
  const arrow    = new THREE.Mesh(arrowGeo, makeMat(0xa78bfa));
  arrow.rotation.z = Math.PI/2;
  arrow.position.set(0, 0, 0);
  group.add(arrow);
  const arrowHead = new THREE.Mesh(
    new THREE.ConeGeometry(0.4,1.2,8),
    makeMat(0xa78bfa)
  );
  arrowHead.rotation.z = -Math.PI/2;
  arrowHead.position.set(3.5, 0, 0);
  group.add(arrowHead);

  group.userData = {
    name: 'Prion Protein (PrP)',
    level: 'Level 05 · Misfolding & Aggregation',
    mutation: { name:'Conformational Change Only', residue:'No sequence change needed', color:0xff0000 },
    info: 'Prions are unique — the same amino acid sequence can fold into two different stable conformations: PrPC (normal, left) is mostly α-helices and is soluble. PrPSc (misfolded, right) is mostly β-sheets and aggregates. The scary part: PrPSc can convert PrPC into PrPSc just by contact — no DNA or RNA involved. Pure protein-mediated infection.',
    popups: [
      { trigger:'start', icon:'☠️', title:'PRION DISEASE MECHANISM', body:'Normal prion protein (PrPC) is 40% α-helix, 3% β-sheet. Misfolded PrPSc is 30% α-helix, 43% β-sheet. The same primary sequence — completely different fold. PrPSc templates normal PrPC to refold into the β-sheet conformation. Aggregates form amyloid plaques that destroy neurons. This causes BSE (mad cow), CJD in humans, and scrapie in sheep.', src:'Prusiner SB, Science (1997) — Nobel Prize 1997' },
      { trigger:'mutation', icon:'🔬', title:'NO MUTATION REQUIRED', body:'Unlike cancer or sickle cell anemia, prion disease requires no genetic mutation. The sequence of PrPC and PrPSc is identical — only the shape differs. This makes prions uniquely dangerous: a misfolded protein is itself the infectious agent. Sterilization with heat (even autoclaving) cannot fully inactivate PrPSc because the protein is not destroyed by temperatures that kill organisms.', src:'Prusiner SB, PNAS (1982)' },
      { trigger:'heat', icon:'🌡️', title:'WHY HEAT CANNOT STOP PRIONS', body:'Normal proteins denature above ~60-100°C (breaking H-bonds and hydrophobic interactions). PrPSc\'s β-sheet core is extraordinarily stable. Even autoclaving at 134°C for 18 minutes may not fully inactivate it. The β-sheet amyloid structure is among the most thermodynamically stable protein conformations known — a major challenge for sterilization of surgical instruments.', src:'Brown P et al, J Infect Dis (2000)' },
    ]
  };
  return group;
}

// =====================================================
// LEVEL MANAGEMENT
// =====================================================
const BUILDERS = {
  hemoglobin: buildHemoglobin,
  antibody:   buildAntibody,
  insulin:    buildInsulin,
  collagen:   buildCollagen,
  prion:      buildPrion,
};

function loadLevel(key) {
  // Clear scene protein objects
  const toRemove = scene.children.filter(c => c.userData.isProtein);
  toRemove.forEach(c => scene.remove(c));

  // Build protein
  const protein = BUILDERS[key]();
  protein.userData.isProtein = true;
  scene.add(protein);
  currentProtein = protein;
  mutationActive = false;
  integrity      = 100;

  // Reset sliders
  document.getElementById('tempSlider').value = 37;
  document.getElementById('pHSlider').value   = 7.4;
  document.getElementById('saltSlider').value  = 150;
  document.getElementById('mutationBtn').textContent = '⚡ APPLY MUTATION';
  document.getElementById('mutationBtn').dataset.active = 'false';
  document.getElementById('mutationBtn').classList.remove('active');
  document.getElementById('mutationInfo').style.display = 'none';

  // Update UI
  document.getElementById('proteinName').textContent = protein.userData.name;
  document.getElementById('levelLabel').textContent  = protein.userData.level;

  // Update protein context panel (new system)
  if (window.updateProteinContext) window.updateProteinContext(key);
  updateIntegrityUI(100, 'Fully Folded');

  // Update mutation button text
  const mut = protein.userData.mutation;
  document.getElementById('mutationBtn').textContent = '⚡ APPLY: ' + mut.name;

  // Enable controls
  controls.enabled    = true;
  controls.autoRotate = true;
  controls.reset();
  camera.position.set(0, 0, 40);

  // Opening popup
  const p = protein.userData.popups.find(p=>p.trigger==='start');
  if (p) setTimeout(()=>window.showSciPopup(p.icon,p.title,p.body,p.src), 800);
}

// Expose loadLevel to HTML
window._loadLevel = loadLevel;

// Reset scene (back button)
window._resetScene = function() {
  controls.enabled = false;
  controls.autoRotate = false;
};

// =====================================================
// PARAMETER SLIDERS
// =====================================================
function calcIntegrity(temp, pH, salt, mutation) {
  let score = 100;

  // Temperature denaturation
  if (temp > 60)  score -= (temp-60)*1.8;
  if (temp > 80)  score -= (temp-80)*2.5;
  if (temp < 10)  score -= (10-temp)*0.8;

  // pH effects
  const phDev = Math.abs(pH-7.4);
  if (phDev > 1) score -= phDev*8;
  if (phDev > 3) score -= phDev*12;

  // Salt
  if (salt > 350) score -= (salt-350)*0.15;
  if (salt < 30)  score -= (30-salt)*0.8;

  // Mutation
  if (mutation) score -= 35;

  return Math.max(0, Math.round(score));
}

function getStatusLabel(score) {
  if (score >= 90) return { text:'Fully Folded',    color:'#4ade80' };
  if (score >= 70) return { text:'Slightly Stressed',color:'#86efac' };
  if (score >= 50) return { text:'Partially Unfolded',color:'#fbbf24' };
  if (score >= 25) return { text:'Severely Denatured',color:'#f97316' };
  return                   { text:'Completely Denatured',color:'#ef4444' };
}

function updateIntegrityUI(score, label, color) {
  const fill = document.getElementById('integrityFill');
  const stat = document.getElementById('integrityStatus');
  fill.style.width      = score+'%';
  fill.style.background = color || getStatusLabel(score).color;
  stat.textContent      = label || getStatusLabel(score).text;
  stat.style.color      = color || getStatusLabel(score).color;
}

function applyParamsToProtein(temp, pH, salt) {
  if (!currentProtein) return;
  const score = calcIntegrity(temp, pH, salt, mutationActive);
  integrity   = score;
  const st    = getStatusLabel(score);
  updateIntegrityUI(score, st.text, st.color);

  // Visual denaturation: scale down, increase wobble, change emissive
  const denatureFrac = Math.max(0, (100-score)/100);
  currentProtein.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.emissiveIntensity = 0.35 + denatureFrac*0.8;
      // Redden everything as it denatures
      if (denatureFrac > 0.3) {
        child.material.emissive.lerp(new THREE.Color(0.8,0.1,0.1), denatureFrac*0.6);
      }
      // Increase transparency as protein unfolds
      child.material.transparent = true;
      child.material.opacity = Math.max(0.3, 1 - denatureFrac*0.5);
    }
  });

  // Drift/expansion effect on denature
  const expansionScale = 1 + denatureFrac*0.35;
  currentProtein.scale.setScalar(expansionScale);

  // Trigger heat popup at threshold
  if (temp > 65 && !currentProtein.userData.heatPopupShown) {
    currentProtein.userData.heatPopupShown = true;
    const p = currentProtein.userData.popups.find(p=>p.trigger==='heat');
    if (p) window.showSciPopup(p.icon, p.title, p.body, p.src);
  }
  if (temp <= 50) currentProtein.userData.heatPopupShown = false;
}

// Expose param and mutation functions to HTML layer
window._applyParams = function(temp, pH, salt) {
  applyParamsToProtein(temp, pH, salt);
};

window._applyMutation = function(btn) {
  if (!currentProtein) return;
  mutationActive = !mutationActive;
  btn.dataset.active = mutationActive;
  btn.classList.toggle('active', mutationActive);
  const mut  = currentProtein.userData.mutation;
  const info = document.getElementById('mutationInfo');
  if (mutationActive) {
    btn.textContent = '↩ REVERT MUTATION';
    info.style.display = 'block';
    info.textContent   = '⚡ Applied: '+mut.name+' at '+mut.residue;
    const p = currentProtein.userData.popups.find(p=>p.trigger==='mutation');
    if (p) setTimeout(()=>window.showSciPopup(p.icon,p.title,p.body,p.src), 300);
  } else {
    btn.textContent    = '⚡ APPLY: '+mut.name;
    info.style.display = 'none';
  }
  const temp = parseInt(document.getElementById('tempSlider').value);
  const pH   = parseFloat(document.getElementById('pHSlider').value);
  const salt = parseInt(document.getElementById('saltSlider').value);
  applyParamsToProtein(temp, pH, salt);
};

// =====================================================
// RESIZE
// =====================================================
window.addEventListener('resize',()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =====================================================
// MAIN LOOP
// =====================================================
const clock = new THREE.Clock();
let fpsA=0,fpsF=0;
let bgColor = new THREE.Color(0x050a14);

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(),.05);
  const time  = clock.getElapsedTime();

  controls.update();

  // Gentle protein wobble based on temperature
  if (currentProtein) {
    const temp    = parseInt(document.getElementById('tempSlider')?.value||37);
    const wobble  = Math.max(0,(temp-40)/60);
    currentProtein.rotation.x += Math.sin(time*2.1)*wobble*.003;
    currentProtein.rotation.z += Math.cos(time*1.7)*wobble*.003;
  }

  // Background color shifts with temperature
  const temp = parseInt(document.getElementById('tempSlider')?.value||37);
  const heatFrac = Math.max(0,(temp-37)/63);
  bgColor.setRGB(0.02+heatFrac*.08, 0.04-heatFrac*.01, 0.08-heatFrac*.04);
  renderer.setClearColor(bgColor,1);
  scene.fog = new THREE.FogExp2(bgColor.getHex(), 0.004);

  renderer.render(scene, camera);

  fpsA+=delta;fpsF++;
  if(fpsA>=.5){
    const el=document.getElementById('fps');
    if(el) el.textContent=Math.round(fpsF/fpsA)+' fps';
    fpsA=0;fpsF=0;
  }
}

animate();
