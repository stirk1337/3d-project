import { ChangeEvent, FC, useEffect, useState } from "react"
import { VisualEditorView } from "./VisualEditor.view";
import * as BABYLON from "@babylonjs/core";
import { TBabylonObject } from "./VisualEditor.types";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { worldAltitude, worldOriginMercator, worldScale } from "../Editor/Editor.container";
import mapboxgl from "mapbox-gl";
import { createExtrudedPolygon } from "../Editor/Editor.services";
import earcut from "earcut";

const VisualEditorContainer: FC = (props) => {
    const [scene, setScene] = useState<BABYLON.Scene>();
    const [map, setMap] = useState<mapboxgl.Map>()
    const [material, setMaterial] = useState<BABYLON.Material[]>();
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDrawMode, setIsDrawMode] = useState(true);
    const [currentElement, setCurrentElement] = useState<TBabylonObject>();
    const [draw, setDraw] = useState<MapboxDraw>();
    const [floorsCount, setFloorsCount] = useState(0);
    const [floorsHeight, setFloorsHeight] = useState(0);

    const handleScene = (scene: BABYLON.Scene) => {
        setScene(scene)
    }

    const handleMap = (map: mapboxgl.Map) => {
        setMap(map)
    }

    const handleMaterial = (material: BABYLON.Material[]) => {
        setMaterial(material)
    }

    const handleEditMode = () => {
        setIsEditMode(prev => !prev)
    }

    const handleDrawMode = () => {
        setIsDrawMode(prev => !prev)
    }

    const handleCurrentElement = (polygonData: TBabylonObject) => {
        if (currentElement && material) currentElement.mesh.material = material[0];

        setIsDrawMode(false);
        setCurrentElement(polygonData)
        setFloorsCount(polygonData.floors)
        setFloorsHeight(polygonData.floorsHeight)
    }

    const handleFloorsCount = (event: ChangeEvent<HTMLInputElement>) => {
        if (!currentElement) return;

        const floors = Number(event.target.value)

        setFloorsCount(floors)

        changeCurrentPolygonHeight(floors, currentElement.floorsHeight)
    }

    const handleFloorsHeight = (event: ChangeEvent<HTMLInputElement>) => {
        if (!currentElement) return;

        const floorsHeight = Number(event.target.value)

        setFloorsHeight(floorsHeight)

        changeCurrentPolygonHeight(currentElement.floors, floorsHeight)
    }

    function changeCurrentPolygonHeight(floors: number, height: number) {
        if (!currentElement) return;

        currentElement.mesh.dispose()

        const polygon = new BABYLON.PolygonMeshBuilder("polytri", currentElement.coordinates, scene, earcut);
        const extrudedPolygon = polygon.build(true, height * floors);
        extrudedPolygon.position.y = height * floors;
        extrudedPolygon.material = new BABYLON.StandardMaterial("material", scene);
        extrudedPolygon.material.backFaceCulling = false;

        extrudedPolygon.actionManager = new BABYLON.ActionManager(scene);
        extrudedPolygon.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => setCurrentElement({ ...currentElement, mesh: extrudedPolygon }))
        );

        setCurrentElement({ ...currentElement, mesh: extrudedPolygon, floors, floorsHeight: height })
    }

    const clearCurrentElement = () => {
        if (!currentElement || !material) return;

        currentElement.mesh.material = material[0];
        setCurrentElement(undefined);
    }

    const handleEditCurrentElement = () => {
        if (!currentElement || !map) return;

        const newDraw = new MapboxDraw({
            displayControlsDefault: false,
            defaultMode: 'simple_select'
        })

        const polygonCorners = currentElement.coordinates

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
    }

    const handleDraw = (draw?: MapboxDraw) => {
        setDraw(draw);
    }

    useEffect(() => {
        if (!currentElement || !material) return;

        currentElement.mesh.material = material[1];

    }, [currentElement]);

    return (
        <VisualEditorView
            isDrawMode={isDrawMode}
            isEditMode={isEditMode}
            currentElement={currentElement?.mesh}
            draw={draw}
            scene={scene}
            map={map}
            floorsCount={floorsCount}
            floorsHeight={floorsHeight}
            handleScene={handleScene}
            handleMap={handleMap}
            handleMaterial={handleMaterial}
            handleCurrentElement={handleCurrentElement}
            clearCurrentElement={clearCurrentElement}
            handleEditCurrentElement={handleEditCurrentElement}
            handleDraw={handleDraw}
            handleEditMode={handleEditMode}
            handleDrawMode={handleDrawMode}
            handleFloorsCount={handleFloorsCount}
            handleFloorsHeight={handleFloorsHeight}
        />
    )
}

export { VisualEditorContainer }