import { FC, useEffect, useState } from "react";
import { TBabylonObject, TBabylonObjectData, TEditorContainer } from "./Editor.types";
import MapWith3DModel from "./Scene/BabylonScene";
import * as BABYLON from "@babylonjs/core";
import { getBabylonMeshFromCoordinates, getClippedPolygon, getPolygonCorners } from "./Editor.services";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";
import earcut from "earcut";

export const worldOrigin = [148.9819, -35.39847];
export const worldAltitude = 0;
export const worldRotate = [Math.PI / 2, 0, 0];

// Calculate mercator coordinates and scale
export const worldOriginMercator = mapboxgl.MercatorCoordinate.fromLngLat(
    worldOrigin,
    worldAltitude
);
export const worldScale = worldOriginMercator.meterInMercatorCoordinateUnits();

const EditorContainer: FC<TEditorContainer> = (props) => {
    const { objectsData, isEditMode, isDrawMode } = props;

    const [babylonObjectsData, setBabylonObjectsData] = useState<TBabylonObjectData>();
    const [map, setMap] = useState<mapboxgl.Map>();
    const [scene, setScene] = useState<BABYLON.Scene>();
    const [playground, setPlayground] = useState<TBabylonObject>()
    const [material, setMaterial] = useState<BABYLON.Material>();
    const [isDrawingZone, setDrawingZone] = useState(true);
    const [draw, setDraw] = useState<MapboxDraw>();
    const [currentElement, setCurrentElement] = useState<BABYLON.Mesh>();

    console.log(babylonObjectsData)

    const handleDrawEvent = () => {
        if (!draw) return;

        currentElement ? handleEditPolygon(draw, currentElement, playground) : handleUpdateArea(draw, isDrawingZone, playground);
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
            setDraw(undefined)
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

        const polygonCorners = getPolygonCorners(currentDraw, playground);

        if (!polygonCorners || polygonCorners?.length === 0) return;

        const polygon = new BABYLON.PolygonMeshBuilder("polytri", polygonCorners, scene, earcut);

        const extrudedPolygon = polygon.build(true, isDrawingZone ? 0.1 : 10);
        extrudedPolygon.position.y = isDrawingZone ? 0.1 : 10;
        extrudedPolygon.material = new BABYLON.StandardMaterial("material", scene);
        extrudedPolygon.material.backFaceCulling = false;

        extrudedPolygon.actionManager = new BABYLON.ActionManager(scene);
        extrudedPolygon.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => handleClickMesh(polygonCorners, extrudedPolygon)));

        map.removeControl(currentDraw);
        setDraw(undefined);

        handleSetBuilding(extrudedPolygon, polygonCorners);
    }

    function handleClickMesh(polygonCorners: BABYLON.Vector2[], polygon: BABYLON.Mesh) {
        if (!draw || !map) return;

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
        setCurrentElement(polygon)
    }

    function handleEditPolygon(currentDraw: MapboxDraw, currentElement: BABYLON.Mesh, playground?: TBabylonObject) {
        if (!map || !babylonObjectsData) return;

        const { meshData, isPlayground } = findMeshData(babylonObjectsData, currentElement);
        if (!meshData) return;

        const polygonCorners = getPolygonCorners(currentDraw, !isPlayground ? playground : undefined);
        if (!polygonCorners) return;

        const extrudedPolygon = createExtrudedPolygon(polygonCorners, isPlayground ? 0.1 : 10);
        setPolygonClickAction(extrudedPolygon, polygonCorners);

        let updatedBuildings = babylonObjectsData.buildings;
        if (isPlayground) {
            updatedBuildings = updatePlaygroundBuildings(updatedBuildings, polygonCorners);
            setPlayground({ coordinates: polygonCorners, mesh: extrudedPolygon });
        }

        updateBabylonObjectsState(isPlayground, currentElement, extrudedPolygon, polygonCorners, updatedBuildings);
        disposeCurrentMesh(currentElement);

        cleanupDrawControl(map, currentDraw);
    }

    function findMeshData(babylonObjectsData: TBabylonObjectData, currentElement: BABYLON.Mesh) {
        let isPlayground = false;
        let meshData: TBabylonObject | null = null;

        if (babylonObjectsData.playground.mesh.uniqueId === currentElement.uniqueId) {
            meshData = babylonObjectsData.playground;
            isPlayground = true;
        } else {
            for (const building of babylonObjectsData.buildings) {
                if (building.mesh.uniqueId === currentElement.uniqueId) {
                    meshData = building;
                    break;
                }
            }
        }
        return { meshData, isPlayground };
    }

    function createExtrudedPolygon(corners: BABYLON.Vector2[], height: number) {
        const polygon = new BABYLON.PolygonMeshBuilder("polytri", corners, scene, earcut);
        const extrudedPolygon = polygon.build(true, height);
        extrudedPolygon.position.y = height;
        extrudedPolygon.material = new BABYLON.StandardMaterial("material", scene);
        extrudedPolygon.material.backFaceCulling = false;
        return extrudedPolygon;
    }

    function setPolygonClickAction(polygon: BABYLON.Mesh, corners: BABYLON.Vector2[]) {
        polygon.actionManager = new BABYLON.ActionManager(scene);
        polygon.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => handleClickMesh(corners, polygon))
        );
    }

    function updatePlaygroundBuildings(buildings: TBabylonObject[], playgroundCorners: BABYLON.Vector2[]) {
        return buildings.map(buildingData => {
            const buildingCorners = getClippedPolygon(buildingData.coordinates, playgroundCorners);
            if (!buildingCorners || buildingCorners.length === 0) return buildingData;

            const updatedPolygon = createExtrudedPolygon(buildingCorners, 10);
            setPolygonClickAction(updatedPolygon, buildingCorners);

            buildingData.mesh.dispose();

            return {
                coordinates: buildingCorners,
                mesh: updatedPolygon,
            };
        });
    }

    function updateBabylonObjectsState(
        isPlayground: boolean,
        currentElement: BABYLON.Mesh,
        extrudedPolygon: BABYLON.Mesh,
        polygonCorners: BABYLON.Vector2[],
        updatedBuildings: TBabylonObject[]
    ) {
        setBabylonObjectsData(prevState => {
            if (!prevState) return prevState;

            if (isPlayground) {
                return {
                    ...prevState,
                    playground: { ...prevState.playground, mesh: extrudedPolygon, coordinates: polygonCorners },
                    buildings: updatedBuildings,
                };
            } else {
                return {
                    ...prevState,
                    buildings: prevState.buildings.map(building =>
                        building.mesh.uniqueId === currentElement.uniqueId
                            ? { ...building, mesh: extrudedPolygon, coordinates: polygonCorners }
                            : building
                    ),
                };
            }
        });
    }

    function disposeCurrentMesh(mesh: BABYLON.Mesh) {
        mesh.dispose();
        setCurrentElement(undefined);
    }

    function cleanupDrawControl(map: mapboxgl.Map, currentDraw: MapboxDraw) {
        map.removeControl(currentDraw);
        setDraw(undefined);
    }


    return (
        <MapWith3DModel worldOriginMercator={worldOriginMercator} worldScale={worldScale} worldRotate={worldRotate} setMap={handleSetMap} setScene={handleSetScene} />
    );
}

export { EditorContainer };
