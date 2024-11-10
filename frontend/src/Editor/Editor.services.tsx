import earcut from "earcut";
import { TPoint } from "./Editor.types";
import * as BABYLON from "@babylonjs/core";
import { Vector2 } from "@babylonjs/core";

export function getBabylonMeshFromCoordinates(id: number, coordinates: TPoint[], scene: BABYLON.Scene, depth: number): [BABYLON.Mesh, BABYLON.Vector2[]] {
    const polygonCorners: BABYLON.Vector2[] = []

    coordinates.forEach((point) => {
        const { x, y } = point;

        polygonCorners.push(new BABYLON.Vector2(x, y))
    })

    const polygon = new BABYLON.PolygonMeshBuilder(String(id), polygonCorners, scene, earcut);
    const extrudedPolygon = polygon.build(true, depth);

    extrudedPolygon.metadata = { id: id };

    extrudedPolygon.position.y = depth;

    extrudedPolygon.actionManager = new BABYLON.ActionManager(scene);
    extrudedPolygon.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function () {
        //props.setBox(extrudedPolygon);
    }));

    return [extrudedPolygon, polygonCorners];
}

// Проверяем, находится ли точка внутри полигона (плоскости)
export function isPointInsidePolygon(point: Vector2, polygon: Vector2[]): boolean {
    let intersects = 0;
    for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];

        if (((a.y > point.y) !== (b.y > point.y)) &&
            (point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x)) {
            intersects++;
        }
    }
    return intersects % 2 === 1; // Точка внутри, если число пересечений нечетное
}

// Алгоритм Сазерленда-Ходжмана для отсечения полигона объектом по границе плоскости
export function getClippedPolygon(subjectPolygon: Vector2[], clipPolygon: Vector2[]): Vector2[] {
    let outputList = [...subjectPolygon];

    for (let i = 0; i < clipPolygon.length; i++) {
        const clipEdgeStart = clipPolygon[i];
        const clipEdgeEnd = clipPolygon[(i + 1) % clipPolygon.length];

        if (clipEdgeStart.x === clipEdgeEnd.x && clipEdgeStart.y === clipEdgeEnd.y)
            continue;

        const inputList = [...outputList];
        outputList = [];

        let prevPoint = inputList[inputList.length - 1];
        for (const point of inputList) {
            if (isInsideClipEdge(point, clipEdgeStart, clipEdgeEnd)) {
                if (!isInsideClipEdge(prevPoint, clipEdgeStart, clipEdgeEnd)) {
                    const crossPoint = intersect(prevPoint, point, clipEdgeStart, clipEdgeEnd)
                    if (crossPoint) outputList.push(crossPoint);
                }
                outputList.push(point);
            } else if (isInsideClipEdge(prevPoint, clipEdgeStart, clipEdgeEnd)) {
                const crossPoint = intersect(prevPoint, point, clipEdgeStart, clipEdgeEnd)
                if (crossPoint) outputList.push(crossPoint);
            }
            prevPoint = point;
        }
    }
    return outputList;
}

// Проверка, находится ли точка внутри текущей стороны отсечения
export function isInsideClipEdge(point: Vector2, edgeStart: Vector2, edgeEnd: Vector2): boolean {
    if (edgeStart.x === edgeEnd.x && edgeStart.y === edgeEnd.y) return false;
    return (
        (edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) >
        (edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x)
    );
}

// Функция нахождения точки пересечения двух отрезков
function intersect(p1: Vector2, p2: Vector2, clipStart: Vector2, clipEnd: Vector2): Vector2 | null {
    const dc = { x: clipStart.x - clipEnd.x, y: clipStart.y - clipEnd.y };
    const dp = { x: p1.x - p2.x, y: p1.y - p2.y };
    const n1 = clipStart.x * clipEnd.y - clipStart.y * clipEnd.x;
    const n2 = p1.x * p2.y - p1.y * p2.x;
    const denom = dc.x * dp.y - dc.y * dp.x;

    if (denom === 0) return null;

    const intersectX = (n1 * dp.x - n2 * dc.x) / denom;
    const intersectY = (n1 * dp.y - n2 * dc.y) / denom;
    return new Vector2(intersectX, intersectY);
}