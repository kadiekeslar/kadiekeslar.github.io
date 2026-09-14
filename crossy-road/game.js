// ============================================================
// 412 CROSSY ROAD
// FULL PITTSBURGH VERSION
// ============================================================

const TILE = 4;

const WORLD_WIDTH = 52;
const HALF_WORLD = WORLD_WIDTH / 2;

const PGH_YELLOW = 0xffc72c;
const PGH_BLACK = 0x161616;

const ROAD = 0x444a52;
const SIDEWALK = 0x7d8288;
const PLAZA = 0xa28d76;
const WATER = 0x267fae;


// ============================================================
// THREE.JS SETUP
// ============================================================

const scene = new THREE.Scene();

scene.background =
  new THREE.Color(0x8fd0ed);

scene.fog =
  new THREE.Fog(
    0x8fd0ed,
    65,
    145
  );


const renderer =
  new THREE.WebGLRenderer({
    antialias: true
  });

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio,
    1.25
  )
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.shadowMap.enabled = false;

document.body.appendChild(
  renderer.domElement
);


// ============================================================
// CAMERA
// ============================================================

const CAMERA_SIZE = 25;

const camera =
  new THREE.OrthographicCamera();


function resizeCamera() {

  const aspect =
    window.innerWidth /
    window.innerHeight;

  camera.left =
    -(CAMERA_SIZE * aspect) / 2;

  camera.right =
    (CAMERA_SIZE * aspect) / 2;

  camera.top =
    CAMERA_SIZE / 2;

  camera.bottom =
    -CAMERA_SIZE / 2;

  camera.near = 0.1;
  camera.far = 230;

  camera.updateProjectionMatrix();
}

resizeCamera();


// ============================================================
// LIGHTING
// ============================================================

scene.add(
  new THREE.HemisphereLight(
    0xffffff,
    0x626a72,
    1.45
  )
);


const sun =
  new THREE.DirectionalLight(
    0xffffff,
    0.85
  );

sun.position.set(
  -25,
  40,
  20
);

scene.add(sun);


// ============================================================
// MATERIAL / GEOMETRY CACHE
// ============================================================

const materials =
  new Map();

const geometries =
  new Map();


function mat(color) {

  if (
    !materials.has(color)
  ) {

    materials.set(
      color,
      new THREE.MeshLambertMaterial({
        color
      })
    );
  }

  return materials.get(color);
}


function geo(
  w,
  h,
  d
) {

  const key =
    `${w}-${h}-${d}`;

  if (
    !geometries.has(key)
  ) {

    geometries.set(
      key,
      new THREE.BoxGeometry(
        w,
        h,
        d
      )
    );
  }

  return geometries.get(key);
}


function box(
  w,
  h,
  d,
  color,
  x = 0,
  y = 0,
  z = 0
) {

  const object =
    new THREE.Mesh(
      geo(w, h, d),
      mat(color)
    );

  object.position.set(
    x,
    y,
    z
  );

  return object;
}


// ============================================================
// PITTSBURGH SKYLINE
// ============================================================

const skyline =
  new THREE.Group();

scene.add(skyline);


function skylineBuilding(
  x,
  width,
  height,
  color,
  pointed = false
) {

  skyline.add(
    box(
      width,
      height,
      5,
      color,
      x,
      height / 2,
      0
    )
  );


  for (
    let y = 2.5;
    y < height - 1;
    y += 3
  ) {

    skyline.add(
      box(
        width * 0.6,
        0.28,
        0.12,
        0xb6d8e5,
        x,
        y,
        -2.56
      )
    );
  }


  if (pointed) {

    const roof =
      new THREE.Mesh(
        new THREE.ConeGeometry(
          width * 0.36,
          4.5,
          4
        ),
        mat(0x4d6875)
      );

    roof.position.set(
      x,
      height + 2.2,
      0
    );

    roof.rotation.y =
      Math.PI / 4;

    skyline.add(roof);
  }
}


// Downtown skyline

skylineBuilding(
  -18,
  5,
  12,
  0x63686c
);

skylineBuilding(
  -12,
  6,
  19,
  0x30353a
);

skylineBuilding(
  -5,
  5,
  11,
  0x8c7767
);

skylineBuilding(
  2,
  6,
  16,
  0x425c68,
  true
);

skylineBuilding(
  9,
  5,
  13,
  0x666d72
);

skylineBuilding(
  16,
  6,
  21,
  0x282c30
);


// ============================================================
// MT. WASHINGTON + INCLINE
// ============================================================

const hill =
  box(
    25,
    8,
    8,
    0x3f6c3a,
    18,
    1,
    5
  );

hill.rotation.z =
  -0.16;

skyline.add(hill);


for (
  const offset of [-0.45, 0.45]
) {

  const track =
    box(
      15,
      0.14,
      0.14,
      0xd5d5d5,
      17 + offset,
      5,
      -0.2
    );

  track.rotation.z =
    0.42;

  skyline.add(track);
}


const incline =
  box(
    2.2,
    1.6,
    1.8,
    0xc93338,
    17,
    6.2,
    -0.5
  );

incline.rotation.z =
  0.42;

skyline.add(incline);


// ============================================================
// CHICKEN + PITTSBURGH JERSEYS
// ============================================================

const chicken =
  new THREE.Group();

const jerseyGroup =
  new THREE.Group();

chicken.add(jerseyGroup);


// ============================================================
// JERSEY TEXTURE CREATION
// ============================================================

function jerseyCanvas(
  team,
  side
) {

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = 512;
  canvas.height = 512;

  const ctx =
    canvas.getContext("2d");


  // ----------------------------------------------------------
  // STEELERS
  // ----------------------------------------------------------

  if (
    team === "steelers"
  ) {

    ctx.fillStyle =
      "#111111";

    ctx.fillRect(
      0,
      0,
      512,
      512
    );


    if (
      side === "back"
    ) {

      ctx.font =
        "bold 52px Arial";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.fillStyle =
        "#FFFFFF";

      ctx.fillText(
        "POLAMALU",
        256,
        72
      );


      ctx.font =
        "bold 245px Arial";

      ctx.lineWidth = 5;

      ctx.strokeStyle =
        "#111111";

      ctx.fillStyle =
        "#FFFFFF";

      ctx.strokeText(
        "43",
        256,
        315
      );

      ctx.fillText(
        "43",
        256,
        315
      );
    }


    else {

      ctx.font =
        "bold 235px Arial";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.fillStyle =
        "#FFFFFF";

      ctx.fillText(
        "43",
        256,
        300
      );


      // Steelers-style chest badge

      ctx.beginPath();

      ctx.arc(
        115,
        105,
        52,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        "#FFFFFF";

      ctx.fill();

      ctx.lineWidth = 7;

      ctx.strokeStyle =
        "#B6B6B6";

      ctx.stroke();


      ctx.font =
        "bold 18px Arial";

      ctx.fillStyle =
        "#111111";

      ctx.fillText(
        "STEELERS",
        115,
        105
      );


      function diamond(
        x,
        y,
        color
      ) {

        ctx.save();

        ctx.translate(
          x,
          y
        );

        ctx.rotate(
          Math.PI / 4
        );

        ctx.fillStyle =
          color;

        ctx.fillRect(
          -11,
          -11,
          22,
          22
        );

        ctx.restore();
      }


      diamond(
        85,
        72,
        "#FFC72C"
      );

      diamond(
        145,
        72,
        "#E31B23"
      );

      diamond(
        145,
        133,
        "#005EB8"
      );
    }
  }


  // ----------------------------------------------------------
  // PIRATES
  // ----------------------------------------------------------

  else if (
    team === "pirates"
  ) {

    ctx.fillStyle =
      "#F8F8F5";

    ctx.fillRect(
      0,
      0,
      512,
      512
    );


    ctx.fillStyle =
      "#FDB827";

    ctx.fillRect(
      0,
      0,
      512,
      18
    );


    if (
      side === "back"
    ) {

      ctx.font =
        "bold 50px Georgia";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.lineWidth = 8;

      ctx.strokeStyle =
        "#FDB827";

      ctx.fillStyle =
        "#111111";

      ctx.strokeText(
        "CLEMENTE",
        256,
        75
      );

      ctx.fillText(
        "CLEMENTE",
        256,
        75
      );


      ctx.font =
        "bold 225px Georgia";

      ctx.lineWidth = 12;

      ctx.strokeStyle =
        "#FDB827";

      ctx.fillStyle =
        "#111111";

      ctx.strokeText(
        "21",
        256,
        305
      );

      ctx.fillText(
        "21",
        256,
        305
      );
    }


    else {

      ctx.font =
        "bold 78px Georgia";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.lineWidth = 9;

      ctx.strokeStyle =
        "#FDB827";

      ctx.fillStyle =
        "#111111";

      ctx.strokeText(
        "PIRATES",
        256,
        145
      );

      ctx.fillText(
        "PIRATES",
        256,
        145
      );


      ctx.font =
        "bold 135px Georgia";

      ctx.lineWidth = 9;

      ctx.strokeStyle =
        "#FDB827";

      ctx.fillStyle =
        "#111111";

      ctx.strokeText(
        "21",
        335,
        315
      );

      ctx.fillText(
        "21",
        335,
        315
      );


      // Button line

      ctx.strokeStyle =
        "#D5D5D5";

      ctx.lineWidth = 4;

      ctx.beginPath();

      ctx.moveTo(
        256,
        25
      );

      ctx.lineTo(
        256,
        500
      );

      ctx.stroke();


      for (
        let y = 80;
        y < 470;
        y += 70
      ) {

        ctx.beginPath();

        ctx.arc(
          256,
          y,
          6,
          0,
          Math.PI * 2
        );

        ctx.fillStyle =
          "#CCCCCC";

        ctx.fill();
      }
    }
  }


  // ----------------------------------------------------------
  // PENGUINS
  // ----------------------------------------------------------

  else {

    ctx.fillStyle =
      "#111111";

    ctx.fillRect(
      0,
      0,
      512,
      512
    );


    if (
      side === "back"
    ) {

      ctx.font =
        "bold 54px Arial";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.fillStyle =
        "#FFFFFF";

      ctx.fillText(
        "CROSBY",
        256,
        70
      );


      ctx.font =
        "bold 225px Arial";

      ctx.lineWidth = 15;

      ctx.strokeStyle =
        "#FCB514";

      ctx.fillStyle =
        "#FFFFFF";

      ctx.strokeText(
        "87",
        256,
        305
      );

      ctx.fillText(
        "87",
        256,
        305
      );
    }


    else {

      // Gold triangle

      ctx.beginPath();

      ctx.moveTo(
        256,
        70
      );

      ctx.lineTo(
        100,
        380
      );

      ctx.lineTo(
        410,
        380
      );

      ctx.closePath();

      ctx.fillStyle =
        "#FCB514";

      ctx.fill();


      // Penguin body

      ctx.beginPath();

      ctx.ellipse(
        255,
        240,
        80,
        120,
        -0.15,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        "#111111";

      ctx.fill();


      // White belly

      ctx.beginPath();

      ctx.ellipse(
        260,
        255,
        43,
        75,
        -0.1,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        "#FFFFFF";

      ctx.fill();


      // Head

      ctx.beginPath();

      ctx.arc(
        225,
        150,
        48,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        "#111111";

      ctx.fill();


      // Beak

      ctx.beginPath();

      ctx.moveTo(
        178,
        153
      );

      ctx.lineTo(
        135,
        170
      );

      ctx.lineTo(
        180,
        182
      );

      ctx.closePath();

      ctx.fillStyle =
        "#FCB514";

      ctx.fill();


      // Hockey stick

      ctx.strokeStyle =
        "#FFFFFF";

      ctx.lineWidth = 17;

      ctx.beginPath();

      ctx.moveTo(
        315,
        130
      );

      ctx.lineTo(
        218,
        365
      );

      ctx.lineTo(
        150,
        365
      );

      ctx.stroke();
    }
  }


  const texture =
    new THREE.CanvasTexture(
      canvas
    );

  texture.anisotropy =
    renderer.capabilities
      .getMaxAnisotropy();

  texture.needsUpdate =
    true;

  return texture;
}


// ============================================================
// JERSEY PANEL
// ============================================================

function jerseyPanel(
  team,
  side
) {

  const texture =
    jerseyCanvas(
      team,
      side
    );


  const material =
    new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    });


  const panel =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        2.45,
        2.05
      ),
      material
    );


  panel.position.y =
    1.5;


  if (
    side === "front"
  ) {

    panel.position.z =
      -1.255;

    panel.rotation.y =
      Math.PI;
  }


  else {

    panel.position.z =
      1.255;
  }


  return panel;
}


// ============================================================
// APPLY JERSEY
// ============================================================

function applyJersey(
  team
) {

  while (
    jerseyGroup.children.length
  ) {

    const child =
      jerseyGroup.children[0];

    jerseyGroup.remove(
      child
    );

    if (
      child.material &&
      child.material.map
    ) {

      child.material.map.dispose();
      child.material.dispose();
    }
  }


  let baseColor;


  if (
    team === "steelers"
  ) {

    baseColor =
      0x111111;
  }


  else if (
    team === "pirates"
  ) {

    baseColor =
      0xf7f7f3;
  }


  else {

    baseColor =
      0x111111;
  }


  // Main torso

  jerseyGroup.add(
    box(
      2.65,
      1.55,
      2.45,
      baseColor,
      0,
      1.5,
      0
    )
  );


  // Sleeves

  jerseyGroup.add(
    box(
      0.55,
      1.35,
      1.6,
      baseColor,
      -1.52,
      1.55,
      0
    )
  );


  jerseyGroup.add(
    box(
      0.55,
      1.35,
      1.6,
      baseColor,
      1.52,
      1.55,
      0
    )
  );


  // ----------------------------------------------------------
  // Steelers sleeve stripes
  // ----------------------------------------------------------

  if (
    team === "steelers"
  ) {

    for (
      const x of [-1.83, 1.83]
    ) {

      jerseyGroup.add(
        box(
          0.1,
          0.20,
          1.7,
          PGH_YELLOW,
          x,
          1.82,
          0
        )
      );


      jerseyGroup.add(
        box(
          0.1,
          0.15,
          1.7,
          0xffffff,
          x,
          1.57,
          0
        )
      );


      jerseyGroup.add(
        box(
          0.1,
          0.20,
          1.7,
          PGH_YELLOW,
          x,
          1.32,
          0
        )
      );
    }
  }


  // ----------------------------------------------------------
  // Pirates trim
  // ----------------------------------------------------------

  else if (
    team === "pirates"
  ) {

    for (
      const x of [-1.83, 1.83]
    ) {

      jerseyGroup.add(
        box(
          0.1,
          0.14,
          1.7,
          PGH_YELLOW,
          x,
          1.36,
          0
        )
      );


      jerseyGroup.add(
        box(
          0.1,
          0.1,
          1.7,
          PGH_BLACK,
          x,
          1.18,
          0
        )
      );
    }
  }


  // ----------------------------------------------------------
  // Penguins stripes
  // ----------------------------------------------------------

  else {

    for (
      const x of [-1.83, 1.83]
    ) {

      jerseyGroup.add(
        box(
          0.1,
          0.22,
          1.7,
          PGH_YELLOW,
          x,
          1.82,
          0
        )
      );


      jerseyGroup.add(
        box(
          0.1,
          0.16,
          1.7,
          0xffffff,
          x,
          1.55,
          0
        )
      );


      jerseyGroup.add(
        box(
          0.1,
          0.22,
          1.7,
          PGH_YELLOW,
          x,
          1.28,
          0
        )
      );
    }
  }


  // Front / back graphics

  jerseyGroup.add(
    jerseyPanel(
      team,
      "front"
    )
  );


  jerseyGroup.add(
    jerseyPanel(
      team,
      "back"
    )
  );
}


// ============================================================
// CHICKEN BODY
// ============================================================

// Main body underneath jersey

chicken.add(
  box(
    2.55,
    2.15,
    2.35,
    0xf1e5d1,
    0,
    1.45,
    0
  )
);


// Head

chicken.add(
  box(
    1.8,
    1.8,
    1.8,
    0xf1e5d1,
    0,
    3.15,
    -0.75
  )
);


// Beak

chicken.add(
  box(
    0.95,
    0.55,
    0.85,
    0xffa621,
    0,
    3.05,
    -1.92
  )
);


// Comb

chicken.add(
  box(
    0.6,
    0.75,
    0.6,
    0xdd3636,
    0,
    4.35,
    -0.65
  )
);


// Eyes

chicken.add(
  box(
    0.27,
    0.27,
    0.16,
    PGH_BLACK,
    -0.5,
    3.38,
    -1.62
  )
);


chicken.add(
  box(
    0.27,
    0.27,
    0.16,
    PGH_BLACK,
    0.5,
    3.38,
    -1.62
  )
);


// Feet

chicken.add(
  box(
    0.34,
    0.8,
    0.34,
    PGH_YELLOW,
    -0.55,
    0.25,
    0
  )
);


chicken.add(
  box(
    0.34,
    0.8,
    0.34,
    PGH_YELLOW,
    0.55,
    0.25,
    0
  )
);


chicken.scale.set(
  1.15,
  1.15,
  1.15
);

scene.add(chicken);


// Default jersey

applyJersey(
  "steelers"
);


// Dropdown

const jerseySelect =
  document.getElementById(
    "jerseySelect"
  );

if (
  jerseySelect
) {

  jerseySelect.addEventListener(
    "change",
    event => {

      applyJersey(
        event.target.value
      );
    }
  );
}


// ============================================================
// GAME STATE
// ============================================================

const lanes = [];

let score = 0;

let highestLane = 0;

let currentLaneIndex = 0;

let currentGridX = 0;

let gameOver = false;


// ============================================================
// CITY BUILDINGS
// ============================================================

const buildingColors = [
  0x4b5157,
  0x696f75,
  0x826f63,
  0x525d65,
  0x75685d,
  0x343a40
];


function cityBuilding(
  group,
  z,
  side
) {

  const width =
    4 +
    Math.random() * 2;


  const height =
    7 +
    Math.random() * 9;


  const color =
    buildingColors[
      Math.floor(
        Math.random() *
        buildingColors.length
      )
    ];


  // Visible inside camera view

  const x =
    side *
    (
      17.5 +
      Math.random() * 1.5
    );


  group.add(
    box(
      width,
      height,
      5.5,
      color,
      x,
      height / 2,
      z
    )
  );


  // Windows

  for (
    let y = 2;
    y < height - 1;
    y += 2.4
  ) {

    group.add(
      box(
        width * 0.55,
        0.28,
        0.1,
        0xa6d2df,
        x,
        y,
        z - 2.8
      )
    );
  }


  // Pittsburgh gold roof detail

  if (
    Math.random() < 0.3
  ) {

    group.add(
      box(
        width,
        0.35,
        5.6,
        PGH_YELLOW,
        x,
        height + 0.15,
        z
      )
    );
  }
}


// ============================================================
// STREET LAMP
// ============================================================

function lamp(
  group,
  x,
  z
) {

  group.add(
    box(
      0.18,
      3,
      0.18,
      PGH_BLACK,
      x,
      1.35,
      z
    )
  );


  group.add(
    box(
      0.7,
      0.35,
      0.7,
      PGH_YELLOW,
      x,
      2.9,
      z
    )
  );
}


// ============================================================
// PLAZA
// ============================================================

function makePlaza(
  lane
) {

  const g =
    lane.group;


  g.add(
    box(
      WORLD_WIDTH,
      0.6,
      TILE,
      PLAZA,
      0,
      -0.45,
      lane.z
    )
  );


  // Decorative center strip

  g.add(
    box(
      26,
      0.08,
      0.18,
      0xc1ac92,
      0,
      -0.1,
      lane.z
    )
  );


  cityBuilding(
    g,
    lane.z,
    -1
  );


  cityBuilding(
    g,
    lane.z,
    1
  );


  if (
    lane.index % 2 === 0
  ) {

    lamp(
      g,
      -13,
      lane.z
    );


    lamp(
      g,
      13,
      lane.z
    );
  }


  lane.blocked =
    new Set();
}


// ============================================================
// VEHICLES
// ============================================================

const carColors = [
  PGH_YELLOW,
  PGH_BLACK,
  0xffffff,
  0x3c78a8,
  0x8a3434
];


function vehicle(
  direction
) {

  const car =
    new THREE.Group();


  const bus =
    Math.random() < 0.16;


  const length =
    bus
      ? 7
      : 5;


  const color =
    carColors[
      Math.floor(
        Math.random() *
        carColors.length
      )
    ];


  car.add(
    box(
      length,
      1.35,
      2.3,
      color,
      0,
      0.9,
      0
    )
  );


  car.add(
    box(
      bus
        ? 5
        : 2.5,
      0.9,
      1.9,
      0x9dcbd8,
      direction * 0.35,
      1.85,
      0
    )
  );


  // Wheels

  car.add(
    box(
      length - 1,
      0.4,
      0.3,
      PGH_BLACK,
      0,
      0.2,
      -1.1
    )
  );


  car.add(
    box(
      length - 1,
      0.4,
      0.3,
      PGH_BLACK,
      0,
      0.2,
      1.1
    )
  );


  car.userData.length =
    length;

  car.userData.direction =
    direction;


  return car;
}


// ============================================================
// STREET
// ============================================================

function makeStreet(
  lane
) {

  const g =
    lane.group;


  g.add(
    box(
      WORLD_WIDTH,
      0.5,
      TILE,
      ROAD,
      0,
      -0.5,
      lane.z
    )
  );


  // Sidewalk edges

  g.add(
    box(
      WORLD_WIDTH,
      0.2,
      0.45,
      SIDEWALK,
      0,
      -0.2,
      lane.z - 1.75
    )
  );


  g.add(
    box(
      WORLD_WIDTH,
      0.2,
      0.45,
      SIDEWALK,
      0,
      -0.2,
      lane.z + 1.75
    )
  );


  // Dashed road marks

  for (
    let x = -20;
    x <= 20;
    x += 9
  ) {

    g.add(
      box(
        3,
        0.06,
        0.13,
        0xe2e2e2,
        x,
        -0.23,
        lane.z
      )
    );
  }


  cityBuilding(
    g,
    lane.z,
    -1
  );


  cityBuilding(
    g,
    lane.z,
    1
  );


  lane.direction =
    Math.random() < 0.5
      ? -1
      : 1;


  lane.speed =
    3.8 +
    Math.random() * 1.3;


  lane.objects = [];


  // Easier traffic

  for (
    let i = 0;
    i < 2;
    i++
  ) {

    const car =
      vehicle(
        lane.direction
      );


    car.position.set(
      -HALF_WORLD +
      i * 26 +
      Math.random() * 4,
      0,
      lane.z
    );


    car.userData.speed =
      lane.speed;


    scene.add(car);

    lane.objects.push(
      car
    );
  }
}


// ============================================================
// RIVER
// ============================================================

function makeRiver(
  lane
) {

  lane.group.add(
    box(
      WORLD_WIDTH,
      0.4,
      TILE,
      WATER,
      0,
      -0.7,
      lane.z
    )
  );


  lane.direction =
    Math.random() < 0.5
      ? -1
      : 1;


  lane.speed =
    1.5 +
    Math.random() * 0.6;


  lane.objects = [];


  for (
    let i = 0;
    i < 4;
    i++
  ) {

    const length =
      14;


    const log =
      new THREE.Group();


    log.add(
      box(
        length,
        0.75,
        2.8,
        0x82512e
      )
    );


    log.position.set(
      -HALF_WORLD +
      i * 15,
      0,
      lane.z
    );


    log.userData.length =
      length;

    log.userData.speed =
      lane.speed;

    log.userData.direction =
      lane.direction;


    scene.add(log);

    lane.objects.push(
      log
    );
  }
}


// ============================================================
// PITTSBURGH YELLOW BRIDGE
// ============================================================

function bridgeBeam(
  group,
  x1,
  y1,
  x2,
  y2,
  z
) {

  const dx =
    x2 - x1;

  const dy =
    y2 - y1;


  const length =
    Math.hypot(
      dx,
      dy
    );


  const beam =
    box(
      length,
      0.28,
      0.28,
      PGH_YELLOW
    );


  beam.position.set(
    (x1 + x2) / 2,
    (y1 + y2) / 2,
    z
  );


  beam.rotation.z =
    Math.atan2(
      dy,
      dx
    );


  group.add(beam);
}


function makeBridge(
  lane
) {

  const g =
    lane.group;


  // Water below bridge

  g.add(
    box(
      WORLD_WIDTH,
      0.4,
      TILE,
      WATER,
      0,
      -0.82,
      lane.z
    )
  );


  // Bridge road deck

  g.add(
    box(
      WORLD_WIDTH,
      0.5,
      TILE - 0.55,
      ROAD,
      0,
      -0.25,
      lane.z
    )
  );


  // Yellow center lines

  for (
    let x = -21;
    x <= 21;
    x += 9
  ) {

    g.add(
      box(
        3.2,
        0.07,
        0.15,
        PGH_YELLOW,
        x,
        0.04,
        lane.z
      )
    );
  }


  // Bridge sides

  for (
    const side of [-1, 1]
  ) {

    const z =
      lane.z +
      side * 1.7;


    // Lower rail

    g.add(
      box(
        WORLD_WIDTH,
        0.3,
        0.3,
        PGH_YELLOW,
        0,
        0.75,
        z
      )
    );


    // Towers

    for (
      const towerX of [-13, 13]
    ) {

      g.add(
        box(
          0.65,
          5,
          0.55,
          PGH_YELLOW,
          towerX,
          2.5,
          z
        )
      );


      g.add(
        box(
          3,
          0.45,
          0.55,
          PGH_YELLOW,
          towerX,
          4.7,
          z
        )
      );
    }


    // Suspension beams

    bridgeBeam(
      g,
      -26,
      1,
      -13,
      4.6,
      z
    );


    bridgeBeam(
      g,
      -13,
      4.6,
      0,
      1.3,
      z
    );


    bridgeBeam(
      g,
      0,
      1.3,
      13,
      4.6,
      z
    );


    bridgeBeam(
      g,
      13,
      4.6,
      26,
      1,
      z
    );


    // Vertical cables

    for (
      let x = -22;
      x <= 22;
      x += 5.5
    ) {

      g.add(
        box(
          0.18,
          1.5,
          0.18,
          PGH_YELLOW,
          x,
          1.45,
          z
        )
      );
    }
  }


  // Buildings near bridge entrance

  cityBuilding(
    g,
    lane.z,
    -1
  );


  cityBuilding(
    g,
    lane.z,
    1
  );


  // Only one slower vehicle

  lane.direction =
    Math.random() < 0.5
      ? -1
      : 1;


  lane.speed =
    3;


  lane.objects = [];


  const car =
    vehicle(
      lane.direction
    );


  car.position.set(
    -18,
    0,
    lane.z
  );


  car.userData.speed =
    lane.speed;


  scene.add(car);

  lane.objects.push(
    car
  );
}


// ============================================================
// LANE GENERATION
// ============================================================

function createLane(
  index
) {

  const lane = {

    index,

    z:
      -index * TILE,

    type:
      "plaza",

    objects: [],

    blocked:
      new Set(),

    group:
      new THREE.Group()

  };


  scene.add(
    lane.group
  );


  // Safe start

  if (
    index < 3
  ) {

    lane.type =
      "plaza";
  }


  // Frequent Pittsburgh bridges

  else if (
    index % 8 === 5
  ) {

    lane.type =
      "bridge";
  }


  else {

    const r =
      Math.random();


    if (
      r < 0.35
    ) {

      lane.type =
        "plaza";
    }


    else if (
      r < 0.80
    ) {

      lane.type =
        "street";
    }


    else {

      lane.type =
        "river";
    }
  }


  if (
    lane.type === "plaza"
  ) {

    makePlaza(lane);
  }


  else if (
    lane.type === "street"
  ) {

    makeStreet(lane);
  }


  else if (
    lane.type === "bridge"
  ) {

    makeBridge(lane);
  }


  else {

    makeRiver(lane);
  }


  lanes[index] =
    lane;
}


// Initial world

for (
  let i = 0;
  i < 26;
  i++
) {

  createLane(i);
}


// ============================================================
// MOVEMENT
// ============================================================

let hopping = false;

let queuedMove = null;

let hopStart = 0;

const HOP_TIME =
  0.15;


let startX = 0;
let startZ = 0;

let targetX = 0;
let targetZ = 0;

let targetGridX = 0;
let targetLaneIndex = 0;


function tryMove(
  dx,
  laneMove
) {

  if (
    gameOver
  ) {

    return;
  }


  if (
    hopping
  ) {

    queuedMove = {
      dx,
      laneMove
    };

    return;
  }


  const nextX =
    currentGridX +
    dx;


  const nextLane =
    currentLaneIndex +
    laneMove;


  // Keeps player near middle,
  // buildings remain visible

  if (
    Math.abs(nextX) > 3
  ) {

    return;
  }


  if (
    nextLane < 0
  ) {

    return;
  }


  while (
    nextLane >=
    lanes.length
  ) {

    createLane(
      lanes.length
    );
  }


  startX =
    chicken.position.x;

  startZ =
    chicken.position.z;


  targetX =
    nextX * TILE;

  targetZ =
    -nextLane * TILE;


  targetGridX =
    nextX;

  targetLaneIndex =
    nextLane;


  hopping =
    true;


  hopStart =
    performance.now() /
    1000;


  // Rotate chicken

  if (
    laneMove === 1
  ) {

    chicken.rotation.y =
      0;
  }


  else if (
    laneMove === -1
  ) {

    chicken.rotation.y =
      Math.PI;
  }


  else if (
    dx === 1
  ) {

    chicken.rotation.y =
      Math.PI / 2;
  }


  else {

    chicken.rotation.y =
      -Math.PI / 2;
  }
}


// ============================================================
// ARROW KEYS ONLY
// ============================================================

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key.startsWith(
        "Arrow"
      )
    ) {

      event.preventDefault();
    }


    if (
      gameOver
    ) {

      if (
        event.key ===
        "ArrowUp"
      ) {

        location.reload();
      }

      return;
    }


    if (
      event.key ===
      "ArrowUp"
    ) {

      tryMove(
        0,
        1
      );
    }


    else if (
      event.key ===
      "ArrowDown"
    ) {

      tryMove(
        0,
        -1
      );
    }


    else if (
      event.key ===
      "ArrowLeft"
    ) {

      tryMove(
        -1,
        0
      );
    }


    else if (
      event.key ===
      "ArrowRight"
    ) {

      tryMove(
        1,
        0
      );
    }
  }
);


// ============================================================
// FINISH HOP
// ============================================================

function finishHop() {

  chicken.position.set(
    targetX,
    0,
    targetZ
  );


  currentGridX =
    targetGridX;


  currentLaneIndex =
    targetLaneIndex;


  hopping =
    false;


  if (
    currentLaneIndex >
    highestLane
  ) {

    highestLane =
      currentLaneIndex;


    score =
      highestLane;


    document.getElementById(
      "score"
    ).textContent =
      score;


    while (
      lanes.length <
      highestLane + 24
    ) {

      createLane(
        lanes.length
      );
    }
  }


  checkLanding();


  if (
    queuedMove &&
    !gameOver
  ) {

    const next =
      queuedMove;


    queuedMove =
      null;


    tryMove(
      next.dx,
      next.laneMove
    );
  }
}


// ============================================================
// LOG DETECTION
// ============================================================

function getLog(
  lane
) {

  for (
    const log of
    lane.objects
  ) {

    if (
      Math.abs(
        log.position.x -
        chicken.position.x
      )

      <

      log.userData.length /
      2 +
      0.2
    ) {

      return log;
    }
  }


  return null;
}


// ============================================================
// WATER CHECK
// ============================================================

function checkLanding() {

  const lane =
    lanes[
      currentLaneIndex
    ];


  if (
    lane &&
    lane.type === "river" &&
    !getLog(lane)
  ) {

    lose();
  }
}


// ============================================================
// VEHICLE COLLISION
// ============================================================

function checkCars() {

  const lane =
    lanes[
      currentLaneIndex
    ];


  if (
    !lane
  ) {

    return;
  }


  if (
    lane.type !== "street" &&
    lane.type !== "bridge"
  ) {

    return;
  }


  for (
    const car of
    lane.objects
  ) {

    if (
      Math.abs(
        chicken.position.x -
        car.position.x
      )

      <

      car.userData.length /
      2 +
      0.3
    ) {

      lose();

      return;
    }
  }
}


// ============================================================
// GAME OVER
// ============================================================

function lose() {

  if (
    gameOver
  ) {

    return;
  }


  gameOver =
    true;


  document.getElementById(
    "finalScore"
  ).textContent =
    `Score: ${score}`;


  document.getElementById(
    "gameOver"
  ).style.display =
    "flex";
}


// ============================================================
// MOVING OBJECTS
// ============================================================

function updateObjects(
  delta
) {

  const start =
    Math.max(
      0,
      currentLaneIndex - 7
    );


  const end =
    Math.min(
      lanes.length,
      currentLaneIndex + 16
    );


  for (
    let i = start;
    i < end;
    i++
  ) {

    const lane =
      lanes[i];


    if (
      !lane
    ) {

      continue;
    }


    for (
      const object of
      lane.objects
    ) {

      object.position.x +=
        object.userData.direction *
        object.userData.speed *
        delta;


      if (
        object.position.x >
        HALF_WORLD + 10
      ) {

        object.position.x =
          -HALF_WORLD - 10;
      }


      else if (
        object.position.x <
        -HALF_WORLD - 10
      ) {

        object.position.x =
          HALF_WORLD + 10;
      }
    }
  }
}


// ============================================================
// PLAYER RIDES LOG
// ============================================================

function updateRiverPlayer(
  delta
) {

  if (
    hopping ||
    gameOver
  ) {

    return;
  }


  const lane =
    lanes[
      currentLaneIndex
    ];


  if (
    !lane ||
    lane.type !== "river"
  ) {

    return;
  }


  const log =
    getLog(lane);


  if (
    !log
  ) {

    lose();

    return;
  }


  chicken.position.x +=
    log.userData.direction *
    log.userData.speed *
    delta;
}


// ============================================================
// CAMERA
// ============================================================

let cameraZ = 0;


function updateCamera() {

  const progress =
    Math.max(
      0,
      highestLane - 3
    );


  const target =
    -progress *
    TILE;


  cameraZ =
    THREE.MathUtils.lerp(
      cameraZ,
      target,
      0.035
    );


  camera.position.set(
    8,
    16,
    cameraZ + 15
  );


  camera.lookAt(
    0,
    0,
    cameraZ - 7
  );


  // Pittsburgh skyline stays ahead

  skyline.position.z =
    cameraZ - 58;
}


camera.position.set(
  8,
  16,
  15
);


camera.lookAt(
  0,
  0,
  -7
);


// ============================================================
// GAME LOOP
// ============================================================

let previous =
  performance.now() /
  1000;


function animate() {

  requestAnimationFrame(
    animate
  );


  const now =
    performance.now() /
    1000;


  const delta =
    Math.min(
      now - previous,
      0.05
    );


  previous =
    now;


  // Hop

  if (
    hopping
  ) {

    const t =
      Math.min(
        (
          now -
          hopStart
        ) /
        HOP_TIME,
        1
      );


    chicken.position.x =
      THREE.MathUtils.lerp(
        startX,
        targetX,
        t
      );


    chicken.position.z =
      THREE.MathUtils.lerp(
        startZ,
        targetZ,
        t
      );


    chicken.position.y =
      Math.sin(
        t *
        Math.PI
      ) *
      1.2;


    if (
      t >= 1
    ) {

      finishHop();
    }
  }


  if (
    !gameOver
  ) {

    updateObjects(
      delta
    );


    updateRiverPlayer(
      delta
    );


    checkCars();
  }


  updateCamera();


  renderer.render(
    scene,
    camera
  );
}


animate();


// ============================================================
// RESIZE
// ============================================================

window.addEventListener(
  "resize",
  () => {

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );


    resizeCamera();
  }
);