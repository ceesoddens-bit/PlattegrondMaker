import type { FloorPlan } from "../shared/floorplan.js";

export function createMockFloorPlan(hints = ""): FloorPlan {
  const hintWarning = hints.trim()
    ? [`Hints verwerkt als context: "${hints.trim().slice(0, 120)}"`]
    : ["Demo gegenereerd zonder plattegrondtekening en foto's te analyseren. Voeg een API-key toe voor echte AI-analyse."];

  return {
    title: "Conceptplattegrond Restaurant",
    canvas: {
      width: 1100,
      height: 1450,
      orientation: "portrait",
      scaleLabel: "Concept, niet op schaal"
    },
    areas: [
      {
        id: "terrace",
        kind: "terrace",
        label: "Terras",
        color: "#f2e2bf",
        points: [
          { x: 88, y: 960 },
          { x: 1012, y: 960 },
          { x: 1012, y: 1345 },
          { x: 88, y: 1345 }
        ]
      },
      {
        id: "dining-main",
        kind: "dining",
        label: "Restaurantzaal",
        color: "#e9ece7",
        points: [
          { x: 104, y: 315 },
          { x: 980, y: 315 },
          { x: 980, y: 930 },
          { x: 104, y: 930 }
        ]
      },
      {
        id: "bar-kitchen",
        kind: "bar",
        label: "Bar en keuken",
        color: "#d9dee2",
        points: [
          { x: 520, y: 105 },
          { x: 980, y: 105 },
          { x: 980, y: 465 },
          { x: 520, y: 465 }
        ]
      },
      {
        id: "restrooms",
        kind: "restrooms",
        label: "Toiletten",
        color: "#d3d8dd",
        points: [
          { x: 105, y: 105 },
          { x: 505, y: 105 },
          { x: 505, y: 285 },
          { x: 105, y: 285 }
        ]
      }
    ],
    walls: [
      {
        id: "outer-main",
        thickness: 16,
        points: [
          { x: 96, y: 100 },
          { x: 990, y: 100 },
          { x: 990, y: 940 },
          { x: 96, y: 940 },
          { x: 96, y: 100 }
        ]
      },
      {
        id: "restroom-wall",
        thickness: 10,
        points: [
          { x: 105, y: 285 },
          { x: 505, y: 285 },
          { x: 505, y: 105 }
        ]
      },
      {
        id: "service-wall",
        thickness: 10,
        points: [
          { x: 520, y: 105 },
          { x: 520, y: 465 },
          { x: 980, y: 465 }
        ]
      }
    ],
    fixtures: [
      { id: "bar", kind: "bar", label: "Bar", x: 694, y: 270, width: 330, height: 88, rotation: -20 },
      { id: "counter", kind: "counter", label: "Uitgifte", x: 565, y: 512, width: 330, height: 88, rotation: 38 },
      { id: "kitchen", kind: "kitchen", label: "Keuken", x: 700, y: 160, width: 260, height: 70, rotation: 0 },
      { id: "toilet-1", kind: "restroom", label: "WC", x: 160, y: 155, width: 62, height: 84, rotation: 0 },
      { id: "toilet-2", kind: "restroom", label: "WC", x: 252, y: 155, width: 62, height: 84, rotation: 0 },
      { id: "toilet-3", kind: "restroom", label: "WC", x: 344, y: 155, width: 62, height: 84, rotation: 0 },
      { id: "tree-1", kind: "plant", label: "Boom", x: 650, y: 690, width: 170, height: 170, rotation: 0 },
      { id: "tree-2", kind: "plant", label: "Boom", x: 540, y: 1165, width: 160, height: 160, rotation: 0 },
      { id: "host", kind: "host", label: "Ontvangst", x: 342, y: 420, width: 105, height: 70, rotation: 0 }
    ],
    tables: [],
    warnings: [
      ...hintWarning,
      "Schone basisplattegrond zonder tafeloverlay. Tafels kunnen later door reserveringssoftware worden geplaatst.",
      "Controleer looproutes, nooduitgangen en exacte maatvoering handmatig."
    ]
  };
}
