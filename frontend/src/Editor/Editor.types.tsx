import * as BABYLON from "@babylonjs/core";

export type TEditorContainer = {
    objectsData?: TObjectData;
    isEditMode: boolean;
    isDrawMode: boolean;
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
    playground: TBabylonObject;
    buildings: TBabylonObject[];
}

export type TBabylonObject = {
    mesh: BABYLON.Mesh;
    coordinates: BABYLON.Vector2[];
}