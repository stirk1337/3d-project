import earcut from "earcut";
import * as BABYLON from "@babylonjs/core";
import { Vector2 } from "@babylonjs/core";
import mapboxgl from "mapbox-gl";
import { worldAltitude, worldOriginMercator, worldScale } from "./Editor.container";
import * as turf from '@turf/turf';
import { TBabylonObjectPlayground } from "../VisualEditor/VisualEditor.types";
import { handleEraser } from "../VisualEditor/VisualEditor.service";

export function getPolygonCorners(currentDraw: MapboxDraw, playground?: TBabylonObjectPlayground | undefined): BABYLON.Vector2[] | undefined {
    const data = currentDraw.getAll();

    const geometry = data.features[0].geometry as GeoJSON.Polygon;
    const coordinates = geometry.coordinates[0];
    if (coordinates[0] === null) return;

    let polygonCorners: BABYLON.Vector2[] = [];

    coordinates.forEach((point) => {
        const [x, y] = point;

        const clickedMercator = mapboxgl.MercatorCoordinate.fromLngLat([x, y], worldAltitude);

        const babylonX = -(clickedMercator.x - worldOriginMercator.x) / worldScale;
        const babylonZ = (clickedMercator.y - worldOriginMercator.y) / worldScale;

        polygonCorners.push(new BABYLON.Vector2(babylonX + 0.5, babylonZ + 49));
    });

    let clippedCorners: BABYLON.Vector2[] = []

    if (playground) clippedCorners = getClippedPolygon(polygonCorners, playground.coordinates)

    return clippedCorners.length !== 0 ? clippedCorners : polygonCorners;
}

export function getClippedPolygon(subjectPolygon: Vector2[], clipPolygon: Vector2[]): Vector2[] {
    const subjectCoords = subjectPolygon.map(point => [point.x, point.y]);
    const clipCoords = clipPolygon.map(point => [point.x, point.y]);

    const subjectFeature = turf.polygon([subjectCoords]);
    const clipFeature = turf.polygon([clipCoords]);

    const featureCollection = turf.featureCollection([subjectFeature, clipFeature]);

    const intersection = turf.intersect(featureCollection);

    if (!intersection) {
        console.log("Полигон не пересекается с отсекателем.");
        return [];
    }

    const clippedCoords = intersection.geometry.coordinates[0] as [number, number][];
    return clippedCoords.map(([x, y]) => new Vector2(x, y));
}

export function createExtrudedPolygon(corners: BABYLON.Vector2[], height: number, scene: BABYLON.Scene | undefined) {
    const polygon = new BABYLON.PolygonMeshBuilder("polytri", corners, scene, earcut);
    const extrudedPolygon = polygon.build(true, height);
    extrudedPolygon.position.y = height;
    extrudedPolygon.material = new BABYLON.StandardMaterial("material", scene);
    extrudedPolygon.material.backFaceCulling = false;

    return extrudedPolygon;
}

export function filterMapBuildings(currentDraw: MapboxDraw, map: mapboxgl.Map) {
    const data = currentDraw.getAll();
    const geometry = data.features[0].geometry as GeoJSON.Polygon;
    const coordinates = geometry.coordinates[0];

    handleEraser(map, coordinates)
}
