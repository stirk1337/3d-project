import earcut from "earcut";
import { TPoint, TProjectObject } from "../Editor/Editor.types";
import * as BABYLON from "@babylonjs/core";
import { TBabylonObject, TBabylonObjectPlayground } from "./VisualEditor.types";

export function calculateBasePolygonArea(coordinates: { x: number, y: number }[]): number {
    if (coordinates.length < 3) {
        throw new Error("Полигон должен содержать как минимум три точки");
    }

    let area = 0;

    for (let i = 0; i < coordinates.length; i++) {
        const { x: x1, y: y1 } = coordinates[i];
        const { x: x2, y: y2 } = coordinates[(i + 1) % coordinates.length];

        area += x1 * y2 - y1 * x2;
    }

    return Math.abs(area / 2);
}

export function getBabylonMeshFromCoordinates(
    projectObject: TProjectObject,
    scene: BABYLON.Scene,
    handleCurrentElement: (polygonData: TBabylonObject) => void,
    isPlayground: boolean = false
): [BABYLON.Mesh, BABYLON.Vector2[]] {
    let polygonCorners: BABYLON.Vector2[] = []

    const coordinates = projectObject.coordinates;
    const depth = projectObject.floors && projectObject.floorsHeight ? projectObject.floors * projectObject.floorsHeight : 0.1;

    coordinates.forEach((point) => {
        const { x, y } = point;

        polygonCorners.push(new BABYLON.Vector2(x, y))
    })

    const polygon = new BABYLON.PolygonMeshBuilder("polytry", polygonCorners, scene, earcut);
    const extrudedPolygon = polygon.build(true, depth);

    extrudedPolygon.position.y = depth;

    extrudedPolygon.actionManager = new BABYLON.ActionManager(scene);

    const polygonData: TBabylonObject | TBabylonObjectPlayground = {
        mesh: extrudedPolygon,
        coordinates: polygonCorners,
        ...(isPlayground ? {} : { floors: projectObject.floors, floorsHeight: projectObject.floorsHeight }),
    };

    extrudedPolygon.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => handleCurrentElement(polygonData)));

    return [extrudedPolygon, polygonCorners];
}