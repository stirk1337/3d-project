import { FC, useEffect, useState } from "react"
import { VisualEditorView } from "./VisualEditor.view";
import * as BABYLON from "@babylonjs/core";
import { TBabylonObject } from "./VisualEditor.types";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { worldAltitude, worldOriginMercator, worldScale } from "../Editor/Editor.container";
import mapboxgl from "mapbox-gl";

const VisualEditorContainer: FC = (props) => {
    const [map, setMap] = useState<mapboxgl.Map>()
    const [material, setMaterial] = useState<BABYLON.Material>();
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDrawMode, setIsDrawMode] = useState(true);
    const [currentElement, setCurrentElement] = useState<TBabylonObject>();
    const [draw, setDraw] = useState<MapboxDraw>();
    const [floorsCount, setFloorsCount] = useState(0);
    const [floorsHeight, setFloorsHeight] = useState(0);

    const handleMap = (map: mapboxgl.Map) => {
        setMap(map)
    }

    const handleMaterial = (material: BABYLON.Material) => {
        setMaterial(material)
    }

    const handleEditMode = () => {
        setIsEditMode(prev => !prev)
    }

    const handleDrawMode = () => {
        setIsDrawMode(prev => !prev)
    }

    const handleCurrentElement = (polygonData: TBabylonObject) => {
        setCurrentElement(polygonData)
        setFloorsCount(polygonData.floors)
        setFloorsHeight(polygonData.floorsHeight)
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

        currentElement.mesh.material = material;

    }, [currentElement]);

    return (
        <VisualEditorView
            isDrawMode={isDrawMode}
            isEditMode={isEditMode}
            currentElement={currentElement?.mesh}
            draw={draw}
            map={map}
            handleMap={handleMap}
            handleMaterial={handleMaterial}
            handleCurrentElement={handleCurrentElement}
            handleEditCurrentElement={handleEditCurrentElement}
            handleDraw={handleDraw}
            handleEditMode={handleEditMode}
            handleDrawMode={handleDrawMode}
        />
    )
}

export { VisualEditorContainer }