import * as BABYLON from "@babylonjs/core";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { ChangeEvent } from "react";

export type TVisualEditorView = {
    isEditMode: boolean;
    isDrawMode: boolean;
    currentElement: BABYLON.Mesh | undefined;
    draw: MapboxDraw | undefined;
    scene: BABYLON.Scene | undefined;
    map: mapboxgl.Map | undefined;
    floorsCount: number;
    floorsHeight: number;

    handleScene: (scene: BABYLON.Scene) => void;
    handleMap: (map: mapboxgl.Map) => void;
    handleMaterial: (material: BABYLON.Material[]) => void;
    handleEditMode: () => void;
    handleDrawMode: () => void;
    handleCurrentElement: (polygonData: TBabylonObject) => void;
    clearCurrentElement: () => void;
    handleEditCurrentElement: () => void;
    handleDraw: (draw?: MapboxDraw) => void;
    handleFloorsCount: (event: ChangeEvent<HTMLInputElement>) => void
    handleFloorsHeight: (event: ChangeEvent<HTMLInputElement>) => void;
}

export type TBabylonObject = {
    mesh: BABYLON.Mesh;
    coordinates: BABYLON.Vector2[];
    floors: number;
    floorsHeight: number;
}

export type TBabylonObjectPlayground = Omit<TBabylonObject, 'floors' | 'floorsHeight'>;