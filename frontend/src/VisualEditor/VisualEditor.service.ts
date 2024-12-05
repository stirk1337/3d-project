import earcut from "earcut";
import { TPoint, TProjectObject } from "../Editor/Editor.types";
import * as BABYLON from "@babylonjs/core";
import { TBabylonObject, TBabylonObjectPlayground } from "./VisualEditor.types";
import { Position } from "geojson";
import { worldAltitude, worldOriginMercator, worldScale } from "../Editor/Editor.container";
import mapboxgl from "mapbox-gl";

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
    handleCurrentElement: (polygonData: TBabylonObject, isPlayground: boolean) => void,
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

    const polygonData: TBabylonObject = {
        id: projectObject.id,
        mesh: extrudedPolygon,
        coordinates: polygonCorners,
        ...(isPlayground ? {} : { floors: projectObject.floors, floorsHeight: projectObject.floorsHeight }),
    };

    extrudedPolygon.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => handleCurrentElement(polygonData, isPlayground)));

    return [extrudedPolygon, polygonCorners];
}

export function convertBabylonCoordinatesToMapBox(BabylonCoordinates: TPoint[]) {
    return BabylonCoordinates.map(corner => {
        const mercatorX = -(corner.x - 0.5) * worldScale + worldOriginMercator.x;
        const mercatorY = (corner.y - 49) * worldScale + worldOriginMercator.y;
        const mercatorCoordinate = new mapboxgl.MercatorCoordinate(mercatorX, mercatorY, worldAltitude);
        const lngLat = mercatorCoordinate.toLngLat();
        return [lngLat.lng, lngLat.lat];
    });
}

export function handleEraser(map: mapboxgl.Map, coordinates: Position[]) {
    const sourceId = 'eraser';

    const features = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {},
                geometry: {
                    coordinates: [coordinates],
                    type: 'Polygon'
                }
            }
        ]
    } as GeoJSON.GeoJSON;


    if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(features);
    } else {
        map.addSource(sourceId, {
            type: 'geojson',
            data: features,
        });

        map.addLayer({
            id: sourceId,
            type: 'clip',
            source: sourceId,
            layout: {
                'clip-layer-types': ['symbol', 'model']
            },
            maxzoom: 0
        });
    }
}