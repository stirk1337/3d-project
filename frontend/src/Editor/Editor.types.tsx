import * as BABYLON from "@babylonjs/core";
import { TBabylonObject, TBabylonObjectPlayground } from "../VisualEditor/VisualEditor.types";

export type TEditorContainer = {
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
    playground: TProjectObjectPlayground | null;
    buildings: TProjectObject[];
}

export type TProjectObject = {
    id: number;
    coordinates: TPoint[];
    floors?: number;
    floorsHeight?: number;
    projectId: number;
}

export type TProjectObjectPlayground = Omit<TProjectObject, 'floors' | 'floorsHeight'>;

export type TPoint = {
    x: number;
    y: number;
}

export type TDimensions = "x" | "y" | "z";

export type TBabylonObjectData = {
    playground: TBabylonObjectPlayground;
    buildings: TBabylonObject[];
}