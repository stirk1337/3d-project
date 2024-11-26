import { FC, useEffect, useState } from "react";
import { TBabylonObjectData, TEditorContainer } from "./Editor.types";
import MapWith3DModel from "./Scene/BabylonScene";
import * as BABYLON from "@babylonjs/core";
import { createExtrudedPolygon, getBabylonMeshFromCoordinates, getClippedPolygon, getPolygonCorners } from "./Editor.services";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";
import earcut from "earcut";
import { TBabylonObject, TBabylonObjectPlayground } from "../VisualEditor/VisualEditor.types";

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
    const { objectsData, isEditMode, isDrawMode, currentElement, draw, map, scene } = props;

    const [babylonObjectsData, setBabylonObjectsData] = useState<TBabylonObjectData>();
    const [playground, setPlayground] = useState<TBabylonObjectPlayground>()
    const [isDrawingZone, setDrawingZone] = useState(true);

    console.log(babylonObjectsData)

    const handleDrawEvent = () => {
        if (!draw) return;

        console.log(isDrawMode)

        currentElement ? handleEditPolygon(draw, currentElement, playground) : handleUpdateArea(draw, isDrawingZone, playground);
    }

    useEffect(() => {
        if (!isDrawMode) return;

        props.handleDraw(new MapboxDraw({
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
            props.handleDraw()
        }

    }, [draw, isDrawMode])

    useEffect(() => {
        if (!scene) return;

        if (isEditMode) scene.attachControl();
        else scene.detachControl();

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
    }, [map, draw, isDrawingZone, babylonObjectsData, playground, currentElement]);

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

    function handleSetScene(scene: BABYLON.Scene) {
        props.handleScene(scene);

        const defaultMaterial = new BABYLON.StandardMaterial("defaultMaterial", scene);
        defaultMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        const currentMaterial = new BABYLON.StandardMaterial("boxMaterial", scene);
        currentMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        props.handleMaterial([defaultMaterial, currentMaterial]);
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
            buildings: [...babylonObjectsData.buildings, { mesh: box, coordinates, floors: 1, floorsHeight: 10 }]
        });
    }

    function handleUpdateArea(currentDraw: MapboxDraw, isDrawingZone: boolean, playground?: TBabylonObjectPlayground) {
        if (!currentDraw || !map) return;

        const polygonCorners = getPolygonCorners(currentDraw, playground);

        if (!polygonCorners || polygonCorners?.length === 0) return;

        const polygon = new BABYLON.PolygonMeshBuilder("polytri", polygonCorners, scene, earcut);

        const polygonHeight = isDrawingZone ? 0.1 : 10

        const extrudedPolygon = polygon.build(true, polygonHeight);
        extrudedPolygon.position.y = polygonHeight;
        extrudedPolygon.material = new BABYLON.StandardMaterial("material", scene);
        extrudedPolygon.material.backFaceCulling = false;

        extrudedPolygon.actionManager = new BABYLON.ActionManager(scene);

        const polygonData: TBabylonObject = {
            mesh: extrudedPolygon,
            coordinates: polygonCorners,
            floors: 1,
            floorsHeight: polygonHeight
        }

        extrudedPolygon.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => props.handleCurrentElement(polygonData)));

        map.removeControl(currentDraw);
        props.handleDraw()

        if (!isDrawingZone) props.handleCurrentElement(polygonData)

        handleSetBuilding(extrudedPolygon, polygonCorners);
    }

    function handleClickMesh(polygonData: TBabylonObject) {
        if (!draw || !map) return;
        props.handleCurrentElement(polygonData);
    }

    function handleEditPolygon(currentDraw: MapboxDraw, currentElement: TBabylonObject, playground?: TBabylonObjectPlayground) {
        if (!map || !babylonObjectsData) return;

        const mesh = currentElement.mesh;
        const meshHeight = currentElement.floors * currentElement.floorsHeight;

        const { meshData, isPlayground } = findMeshData(babylonObjectsData, mesh);
        if (!meshData) return;

        const polygonCorners = getPolygonCorners(currentDraw, !isPlayground ? playground : undefined);
        if (!polygonCorners) return;

        const extrudedPolygon = createExtrudedPolygon(polygonCorners, isPlayground ? 0.1 : meshHeight, scene);
        setPolygonClickAction(extrudedPolygon, polygonCorners, meshData as TBabylonObject);

        let updatedBuildings = babylonObjectsData.buildings;
        if (isPlayground) {
            updatedBuildings = updatePlaygroundBuildings(updatedBuildings, polygonCorners);
            setPlayground({ coordinates: polygonCorners, mesh: extrudedPolygon });
        }

        updateBabylonObjectsState(isPlayground, mesh, extrudedPolygon, polygonCorners, updatedBuildings);
        props.handleCurrentElement({ ...currentElement, mesh: extrudedPolygon, coordinates: polygonCorners })
        disposeCurrentMesh(mesh);

        cleanupDrawControl(map, currentDraw);
    }

    function findMeshData(babylonObjectsData: TBabylonObjectData, currentElement: BABYLON.Mesh) {
        let isPlayground = false;
        let meshData: TBabylonObject | TBabylonObjectPlayground | null = null;

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

    function setPolygonClickAction(polygon: BABYLON.Mesh, corners: BABYLON.Vector2[], buildingData: TBabylonObject) {
        polygon.actionManager = new BABYLON.ActionManager(scene);
        polygon.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => handleClickMesh({ ...buildingData, mesh: polygon, coordinates: corners }))
        );
    }

    function updatePlaygroundBuildings(buildings: TBabylonObject[], playgroundCorners: BABYLON.Vector2[]) {
        return buildings.map(buildingData => {
            const buildingCorners = getClippedPolygon(buildingData.coordinates, playgroundCorners);
            if (!buildingCorners || buildingCorners.length === 0) return buildingData;

            const updatedPolygon = createExtrudedPolygon(buildingCorners, 10, scene);

            setPolygonClickAction(updatedPolygon, buildingCorners, buildingData);

            buildingData.mesh.dispose();

            return {
                ...buildingData,
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
    }

    function cleanupDrawControl(map: mapboxgl.Map, currentDraw: MapboxDraw) {
        map.removeControl(currentDraw);
        props.handleDraw()
    }


    return (
        <MapWith3DModel worldOriginMercator={worldOriginMercator} worldScale={worldScale} worldRotate={worldRotate} setMap={props.handleMap} setScene={handleSetScene} />
    );
}

export { EditorContainer };
