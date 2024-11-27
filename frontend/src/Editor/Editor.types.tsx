import * as BABYLON from "@babylonjs/core";
import { TBabylonObject, TBabylonObjectPlayground } from "../VisualEditor/VisualEditor.types";

export type TEditorContainer = {
    objectsData?: TObjectData;
    isEditMode: boolean;
    isDrawMode: boolean;
    babylonObjectsData: TBabylonObjectData | undefined
    currentElement: TBabylonObject | undefined;
    draw: MapboxDraw | undefined;
    scene: BABYLON.Scene | undefined;
    map: mapboxgl.Map | undefined;

    handleScene: (scene: BABYLON.Scene) => void;
    handleMap: (map: mapboxgl.Map) => void;
    handleMaterial: (material: BABYLON.Material[]) => void;
    handleBabylonObjectsDataChange: (babylonObjectsData: TBabylonObjectData) => void
    handleCurrentElement: (polygonData: TBabylonObject) => void;
    handleDraw: (draw?: MapboxDraw) => void;
}

export type TObjectData = {
    id: number;
    playground: TPlayground;
    buildings: TBuilding[];
}

export type TPlayground = {
    coordinates: TPoint[];
}

export type TBuilding = {
    id: number;
    type: string;
    coordinates: TPoint[];
    floors: TFloor[];
}

export type TFloor = {
    height: number;
}

export type TPoint = {
    x: number;
    y: number;
}

export type TDimensions = "x" | "y" | "z";

export type TBabylonObjectData = {
    playground: TBabylonObjectPlayground;
    buildings: TBabylonObject[];
}