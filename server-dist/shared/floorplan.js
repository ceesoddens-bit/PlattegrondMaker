export const floorPlanJsonSchema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "canvas", "areas", "walls", "fixtures", "tables", "warnings"],
    properties: {
        title: { type: "string" },
        canvas: {
            type: "object",
            additionalProperties: false,
            required: ["width", "height", "orientation", "scaleLabel"],
            properties: {
                width: { type: "number", minimum: 600, maximum: 1800 },
                height: { type: "number", minimum: 600, maximum: 2200 },
                orientation: { type: "string", enum: ["portrait", "landscape"] },
                scaleLabel: { type: "string" }
            }
        },
        areas: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "kind", "label", "points", "color"],
                properties: {
                    id: { type: "string" },
                    kind: { type: "string", enum: ["dining", "bar", "kitchen", "restrooms", "terrace", "storage", "entry", "other"] },
                    label: { type: "string" },
                    points: {
                        type: "array",
                        minItems: 3,
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["x", "y"],
                            properties: {
                                x: { type: "number" },
                                y: { type: "number" }
                            }
                        }
                    },
                    color: { type: "string" }
                }
            }
        },
        walls: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "points", "thickness"],
                properties: {
                    id: { type: "string" },
                    points: {
                        type: "array",
                        minItems: 2,
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["x", "y"],
                            properties: {
                                x: { type: "number" },
                                y: { type: "number" }
                            }
                        }
                    },
                    thickness: { type: "number" }
                }
            }
        },
        fixtures: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "kind", "label", "x", "y", "width", "height", "rotation"],
                properties: {
                    id: { type: "string" },
                    kind: { type: "string", enum: ["bar", "counter", "kitchen", "restroom", "plant", "door", "window", "host", "service", "other"] },
                    label: { type: "string" },
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                    rotation: { type: "number" }
                }
            }
        },
        tables: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "label", "x", "y", "width", "height", "shape", "capacity", "rotation", "zone"],
                properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                    shape: { type: "string", enum: ["round", "square", "rect"] },
                    capacity: { type: "number", minimum: 1, maximum: 20 },
                    rotation: { type: "number" },
                    zone: { type: "string" }
                }
            }
        },
        warnings: {
            type: "array",
            items: { type: "string" }
        }
    }
};
