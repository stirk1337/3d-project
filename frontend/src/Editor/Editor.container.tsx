import { FC, useEffect, useState } from "react";
import { TBabylonObjectData, TEditorContainer } from "./Editor.types";
import MapWith3DModel from "./Scene/BabylonScene";
import * as BABYLON from "@babylonjs/core";
import { createExtrudedPolygon, filterMapBuildings, getClippedPolygon, getPolygonCorners } from "./Editor.services";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";
import earcut from "earcut";
import { TBabylonObject, TBabylonObjectPlayground } from "../VisualEditor/VisualEditor.types";
import { useAppDispatch } from "../Redux/hooks";
import { create3DObject } from "../Redux/store/api-actions/post-actions";
import { edit3DObject } from "../Redux/store/api-actions/patch-actions";

export const worldOrigin = [60.6122, 56.8519];
export const worldAltitude = 0;
export const worldRotate = [Math.PI / 2, 0, 0];

// Calculate mercator coordinates and scale
export const worldOriginMercator = mapboxgl.MercatorCoordinate.fromLngLat(
    worldOrigin,
    worldAltitude
);
export const worldScale = worldOriginMercator.meterInMercatorCoordinateUnits();

const EditorContainer: FC<TEditorContainer> = (props) => {
    const { isEditMode, isDrawMode, currentElement, draw, map, scene, babylonObjectsData } = props;

    const dispatch = useAppDispatch();

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

        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                handleDrawEvent();
            }
        };

        map.on('draw.create', handleDrawEvent);
        // Добавляем прослушивание события нажатия клавиши
        window.addEventListener('keydown', handleKeyPress);

        return () => {
            if (map) {
                map.off('draw.create', handleDrawEvent);
                map.off('draw.delete', () => console.log("удалил"));
                map.off('draw.update', handleDrawEvent);
            }

            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [map, draw, isDrawingZone, babylonObjectsData, playground, currentElement]);

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

    function handleSetBuilding(polygonData: TBabylonObject) {
        if (!babylonObjectsData) {
            const defaultObjectData: TBabylonObjectData = {
                playground: polygonData,
                buildings: []
            }

            props.handleBabylonObjectsDataChange(defaultObjectData);
            setDrawingZone(false);
            return;
        };

        props.handleBabylonObjectsDataChange({
            ...babylonObjectsData,
            buildings: [...babylonObjectsData.buildings, polygonData]
        });
    }

    async function handleUpdateArea(currentDraw: MapboxDraw, isDrawingZone: boolean, playground?: TBabylonObjectPlayground) {
        if (!currentDraw || !map) return;

        const polygonCorners = getPolygonCorners(currentDraw, playground);

        if (!polygonCorners || polygonCorners?.length === 0) return;

        const polygon = new BABYLON.PolygonMeshBuilder("polytri", polygonCorners, scene, earcut);

        const polygonHeight = isDrawingZone ? 0.1 : 3

        const extrudedPolygon = polygon.build(true, polygonHeight);
        extrudedPolygon.position.y = polygonHeight;
        extrudedPolygon.material = new BABYLON.StandardMaterial("material", scene);
        extrudedPolygon.material.backFaceCulling = false;

        extrudedPolygon.actionManager = new BABYLON.ActionManager(scene);

        const id = await dispatch(create3DObject({ isPlayground: isDrawingZone, object3D: polygonCorners })).unwrap();

        const polygonData: TBabylonObject = {
            id,
            mesh: extrudedPolygon,
            coordinates: polygonCorners,
            floors: 1,
            floorsHeight: polygonHeight
        };

        extrudedPolygon.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => props.handleCurrentElement(polygonData)));

        if (isDrawingZone) filterMapBuildings(currentDraw, map)

        map.removeControl(currentDraw);
        props.handleDraw()

        if (!isDrawingZone) props.handleCurrentElement(polygonData)

        handleSetBuilding(polygonData);
    }

    function handleClickMesh(polygonData: TBabylonObject) {
        if (!draw || !map) return;
        props.handleCurrentElement(polygonData);
    }

    function handleEditPolygon(currentDraw: MapboxDraw, currentElement: TBabylonObject, playground?: TBabylonObjectPlayground) {
        if (!map || !babylonObjectsData) return;

        const mesh = currentElement.mesh;
        const meshHeight = currentElement.floors && currentElement.floorsHeight ? currentElement.floors * currentElement.floorsHeight : 0.1;

        const { meshData, isPlayground } = findMeshData(babylonObjectsData, mesh);
        if (!meshData) return;

        const polygonCorners = getPolygonCorners(currentDraw, !isPlayground ? playground : undefined);
        if (!polygonCorners) return;

        const extrudedPolygon = createExtrudedPolygon(polygonCorners, isPlayground ? 0.1 : meshHeight, scene);
        setPolygonClickAction(extrudedPolygon, polygonCorners, meshData as TBabylonObject);

        let updatedBuildings = babylonObjectsData.buildings;
        if (isPlayground) {
            updatedBuildings = updatePlaygroundBuildings(updatedBuildings, polygonCorners);
            setPlayground({ ...currentElement, coordinates: polygonCorners, mesh: extrudedPolygon });
            filterMapBuildings(currentDraw, map)
        }

        const newBabylonObjectsData = updateBabylonObjectsState(isPlayground, mesh, extrudedPolygon, polygonCorners, updatedBuildings);
        if (newBabylonObjectsData) props.handleBabylonObjectsDataChange(newBabylonObjectsData)

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
            if (!buildingCorners || buildingCorners.length === 0 || !buildingData.floors || !buildingData.floorsHeight) return buildingData;

            const updatedPolygon = createExtrudedPolygon(buildingCorners, buildingData.floors * buildingData.floorsHeight, scene);

            setPolygonClickAction(updatedPolygon, buildingCorners, buildingData);

            buildingData.mesh.dispose();

            dispatch(edit3DObject({ isPlayground: false, object3D: { ...buildingData, coordinates: buildingCorners } }))

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
    ): TBabylonObjectData | undefined {

        if (!babylonObjectsData) return;

        if (isPlayground) {
            return {
                ...babylonObjectsData,
                playground: { ...babylonObjectsData.playground, mesh: extrudedPolygon, coordinates: polygonCorners },
                buildings: updatedBuildings,
            };
        } else {
            return {
                ...babylonObjectsData,
                buildings: babylonObjectsData.buildings.map(building =>
                    building.mesh.uniqueId === currentElement.uniqueId
                        ? { ...building, mesh: extrudedPolygon, coordinates: polygonCorners }
                        : building
                ),
            };
        }
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
