import { createAction } from "@reduxjs/toolkit";
import { TObjectData } from "../../Editor/Editor.types";

export const setCurrentProjectData = createAction<TObjectData>('project/setCurrentProjectData');