import { FC, useEffect, useState } from "react";
import { TBabylonObject, TBabylonObjectData, TEditorContainer } from "./Editor.types";
import MapWith3DModel from "./Scene/BabylonScene";
import * as BABYLON from "@babylonjs/core";
import { getBabylonMeshFromCoordinates, getClippedPolygon } from "./Editor.services";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";
import earcut from "earcut";

const worldOrigin = [148.9819, -35.39847];
const worldAltitude = 0;
const worldRotate = [Math.PI / 2, 0, 0];

// Calculate mercator coordinates and scale
const worldOriginMercator = mapboxgl.MercatorCoordinate.fromLngLat(
    worldOrigin,
    worldAltitude
);
const worldScale = worldOriginMercator.meterInMercatorCoordinateUnits();

const EditorContainer: FC<TEditorContainer> = (props) => {
    const { objectsData, isEditMode, isDrawMode } = props;

    const [babylonObjectsData, setBabylonObjectsData] = useState<TBabylonObjectData>();
    const [map, setMap] = useState<mapboxgl.Map>();
    const [scene, setScene] = useState<BABYLON.Scene>();
    const [playground, setPlayground] = useState<TBabylonObject>()
    const [material, setMaterial] = useState<BABYLON.Material>();
    const [isDrawingZone, setDrawingZone] = useState(true);
    const [draw, setDraw] = useState<MapboxDraw>();

    const handleDrawEvent = () => {
        if (draw) handleUpdateArea(draw, isDrawingZone, playground);
    }

    useEffect(() => {
        if (!isDrawMode) return;

        setDraw(new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                trash: true
            },
            defaultMode: 'draw_polygon'
        }))
    }, [isDrawMode])

    useEffect(() => {
        if (!map || !draw) return;

        const drawMode = draw.options.defaultMode

        if (drawMode !== 'draw_polygon') return;

        if (isDrawMode) {
            map.addControl(draw);
        } else if (map.hasControl(draw)) {
            map.removeControl(draw);
        }

    }, [draw, isDrawMode])

    useEffect(() => {
        if (!scene) return;

        if (isEditMode) scene.detachControl();
        else scene.attachControl();

    }, [isEditMode])


    useEffect(() => {
        if (!map || !draw) return;

        map.on('draw.create', handleDrawEvent);
        map.on('draw.delete', () => console.log("удалил"));
        map.on('draw.update', handleDrawEvent);

        return () => {
            if (map) {
                map.off('draw.create', handleDrawEvent);
                map.off('draw.delete', () => console.log("удалил"));
                map.off('draw.update', handleDrawEvent);
            }
        };
    }, [map, draw, isDrawingZone, babylonObjectsData, playground]);

    useEffect(() => {
        if (!map || !scene || !objectsData) return;

        const playground = objectsData.playground;
        const [playgroundPolygon, polygonCoordinates] = getBabylonMeshFromCoordinates(objectsData.id, playground.coordinates, scene, 0.1);

        const buildings = objectsData.buildings;
        const buildingsPolygons: TBabylonObject[] = []
        buildings.forEach((building) => {
            const buildingPolygon = getBabylonMeshFromCoordinates(objectsData.id, building.coordinates, scene, 10);
            buildingsPolygons.push({ mesh: buildingPolygon[0], coordinates: buildingPolygon[1] });
        })

        setBabylonObjectsData({ playground: { mesh: playgroundPolygon, coordinates: polygonCoordinates }, buildings: buildingsPolygons });
    }, [map, scene, objectsData]);

    useEffect(() => {
        if (!scene || !babylonObjectsData) return;
        if (!playground) setPlayground(babylonObjectsData.playground);
        setDrawingZone(!!!babylonObjectsData.playground);
    }, [babylonObjectsData, playground]);

    function handleSetMap(map: mapboxgl.Map) {
        setMap(map);
    }

    function handleSetScene(scene: BABYLON.Scene) {
        setScene(scene);

        const newMaterial = new BABYLON.StandardMaterial("boxMaterial", scene);
        newMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        setMaterial(newMaterial);
    }

    function handleSetBuilding(box: BABYLON.Mesh, coordinates: BABYLON.Vector2[]) {
        if (!babylonObjectsData) {
            const defaultObjectData: TBabylonObjectData = {
                playground: { mesh: box, coordinates },
                buildings: []
            }

            setBabylonObjectsData(defaultObjectData);
            setDrawingZone(false);
            return;
        };

        setBabylonObjectsData({
            ...babylonObjectsData,
            buildings: [...babylonObjectsData.buildings, { mesh: box, coordinates }]
        });
    }

    function handleUpdateArea(currentDraw: MapboxDraw, isDrawingZone: boolean, playground?: TBabylonObject) {
        if (!currentDraw || !map) return;

        const data = currentDraw.getAll();

        const geometry = data.features[0].geometry as GeoJSON.Polygon;
        const coordinates = geometry.coordinates[0];
        if (coordinates[0] === null) return;

        let polygonCorners: BABYLON.Vector2[] = [];

        coordinates.forEach((point) => {
            console.trace();
            const [x, y] = point;

            const clickedMercator = mapboxgl.MercatorCoordinate.fromLngLat([x, y], worldAltitude);

            const babylonX = -(clickedMercator.x - worldOriginMercator.x) / worldScale;
            const babylonZ = (clickedMercator.y - worldOriginMercator.y) / worldScale;

            polygonCorners.push(new BABYLON.Vector2(babylonX + 0.5, babylonZ + 49));
        });

        if (playground) polygonCorners = getClippedPolygon(polygonCorners, playground.coordinates)

        const polygon = new BABYLON.PolygonMeshBuilder("polytri", polygonCorners, scene, earcut);

        const extrudedPolygon = polygon.build(true, isDrawingZone ? 0.1 : 10);
        extrudedPolygon.position.y = isDrawingZone ? 0.1 : 10;
        extrudedPolygon.material = new BABYLON.StandardMaterial("material", scene);
        extrudedPolygon.material.backFaceCulling = false;

        extrudedPolygon.actionManager = new BABYLON.ActionManager(scene);
        extrudedPolygon.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function () {
            if (!draw) return; // Проверка на существование draw

            const newDraw = new MapboxDraw({
                displayControlsDefault: false,
                defaultMode: 'simple_select'
            })

            const coordinates = polygonCorners.map(corner => {
                const mercatorX = -(corner.x - 0.5) * worldScale + worldOriginMercator.x;
                const mercatorY = (corner.y - 49) * worldScale + worldOriginMercator.y;
                const mercatorCoordinate = new mapboxgl.MercatorCoordinate(mercatorX, mercatorY, worldAltitude);
                const lngLat = mercatorCoordinate.toLngLat();
                return [lngLat.lng, lngLat.lat];
            });

            const polygonFeature = {
                type: "Feature",
                geometry: {
                    type: "Polygon",
                    coordinates: [coordinates]
                },
                properties: {}
            };
            map.addControl(newDraw);
            newDraw.add(polygonFeature as GeoJSON.Feature);
            setDraw(newDraw);
        }));

        map.removeControl(currentDraw);

        handleSetBuilding(extrudedPolygon, polygonCorners);
    }

    return (
        <MapWith3DModel worldOriginMercator={worldOriginMercator} worldScale={worldScale} worldRotate={worldRotate} setMap={handleSetMap} setScene={handleSetScene} />
    );
}

export { EditorContainer };
