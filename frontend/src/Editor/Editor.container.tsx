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
    const { objectsData } = props;

    const [babylonObjectsData, setBabylonObjectsData] = useState<TBabylonObjectData>();
    const [map, setMap] = useState<mapboxgl.Map>();
    const [scene, setScene] = useState<BABYLON.Scene>();
    const [material, setMaterial] = useState<BABYLON.Material>();
    const [isDrawingZone, setDrawingZone] = useState(true);

    const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
            polygon: true,
            trash: true
        },
        defaultMode: 'draw_polygon'
    });

    const handleDrawEvent = () => {
        handleUpdateArea(draw, isDrawingZone);
    }

    useEffect(() => {
        if (!map) return;

        if (babylonObjectsData?.playground && babylonObjectsData?.buildings.length > 0 && material) {
            const playground = babylonObjectsData.playground.coordinates
            const building = babylonObjectsData.buildings[0].coordinates
            const polygonCorners = getClippedPolygon(building, playground)
            console.log(polygonCorners)
            const polygon = new BABYLON.PolygonMeshBuilder("polytri", polygonCorners, scene, earcut);
            const extrudedPolygon = polygon.build(true, 30);
            extrudedPolygon.position.y = 60;
            extrudedPolygon.material = material;
            extrudedPolygon.material.backFaceCulling = false;
        }

        map.addControl(draw);

        map.on('draw.create', handleDrawEvent);
        map.on('draw.delete', handleDrawEvent);
        map.on('draw.update', handleDrawEvent);

        return () => {
            map.off('draw.create', handleDrawEvent);
            map.off('draw.delete', handleDrawEvent);
            map.off('draw.update', handleDrawEvent);
        };
    }, [map, isDrawingZone, babylonObjectsData]);

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
        setDrawingZone(!!!babylonObjectsData.playground);
    }, [babylonObjectsData]);

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
        console.log(babylonObjectsData);
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

    function handleUpdateArea(currentDraw: MapboxDraw, isDrawingZone: boolean) {
        if (!currentDraw || !map) return;

        console.log("В фунции", isDrawingZone);

        const data = currentDraw.getAll();

        const geometry = data.features[0].geometry as GeoJSON.Polygon;
        const coordinates = geometry.coordinates[0];
        if (coordinates[0] === null) return;

        const polygonCorners: BABYLON.Vector2[] = [];

        coordinates.forEach((point) => {
            console.trace();
            const [x, y] = point;

            const clickedMercator = mapboxgl.MercatorCoordinate.fromLngLat([x, y], worldAltitude);

            const babylonX = -(clickedMercator.x - worldOriginMercator.x) / worldScale;
            const babylonZ = (clickedMercator.y - worldOriginMercator.y) / worldScale;

            polygonCorners.push(new BABYLON.Vector2(babylonX + 0.5, babylonZ + 49));
        });

        console.log(polygonCorners)

        const polygon = new BABYLON.PolygonMeshBuilder("polytri", polygonCorners, scene, earcut);

        const extrudedPolygon = polygon.build(true, isDrawingZone ? 0.1 : 10);
        extrudedPolygon.position.y = isDrawingZone ? 0.1 : 10;
        extrudedPolygon.material = new BABYLON.StandardMaterial("material", scene);
        extrudedPolygon.material.backFaceCulling = false;

        extrudedPolygon.actionManager = new BABYLON.ActionManager(scene);
        extrudedPolygon.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function () {
            //props.setBox(extrudedPolygon);
        }));

        map.removeControl(currentDraw);

        handleSetBuilding(extrudedPolygon, polygonCorners);
    }

    return (
        <MapWith3DModel worldOriginMercator={worldOriginMercator} worldScale={worldScale} worldRotate={worldRotate} setMap={handleSetMap} setScene={handleSetScene} />
    );
}

export { EditorContainer };
