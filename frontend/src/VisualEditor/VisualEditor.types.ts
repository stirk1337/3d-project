import * as BABYLON from "@babylonjs/core";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

export type TVisualEditorView = {
    isEditMode: boolean;
    isDrawMode: boolean;
    currentElement: BABYLON.Mesh | undefined;
    draw: MapboxDraw | undefined;
    map: mapboxgl.Map | undefined;

    handleMap: (map: mapboxgl.Map) => void;
    handleMaterial: (material: BABYLON.Material) => void;
    handleEditMode: () => void;
    handleDrawMode: () => void;
    handleCurrentElement: (polygonData: TBabylonObject) => void;
    handleEditCurrentElement: () => void;
    handleDraw: (draw?: MapboxDraw) => void;
}

export type TBabylonObject = {
    mesh: BABYLON.Mesh;
    coordinates: BABYLON.Vector2[];
    floors: number;
    floorsHeight: number;
}

export type TBabylonObjectPlayground = Omit<TBabylonObject, 'floors' | 'floorsHeight'>;