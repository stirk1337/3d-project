import { createReducer } from "@reduxjs/toolkit"
import { TObjectData } from "../../Editor/Editor.types"
import { setCurrentProjectData } from "./actions"

type TInitialState = {
    projects: TObjectData[]
    currentProject: TObjectData;
}

const initialState: TInitialState = {
    projects: [],
    currentProject: {
        buildings: [],
        playground: null
    }
}

export const reducer = createReducer(initialState, (builder) => {
    builder
        .addCase(setCurrentProjectData, (state, action) => {
            state.currentProject = action.payload;
        })
})