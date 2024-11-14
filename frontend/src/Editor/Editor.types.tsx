import * as BABYLON from "@babylonjs/core";
import { TBabylonObject, TBabylonObjectPlayground } from "../VisualEditor/VisualEditor.types";

export type TEditorContainer = {
    objectsData?: TObjectData;
    isEditMode: boolean;
    isDrawMode: boolean;
    currentElement: BABYLON.Mesh | undefined;
    draw: MapboxDraw | undefined;
    map: mapboxgl.Map | undefined;

    handleMap: (map: mapboxgl.Map) => void;
    handleMaterial: (material: BABYLON.Material) => void;
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