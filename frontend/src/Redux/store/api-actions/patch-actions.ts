import { createAsyncThunk } from "@reduxjs/toolkit";
import { TBabylonObject } from "../../../VisualEditor/VisualEditor.types";
import { AppDispatch, State } from "..";
import { AxiosInstance } from "axios";

export const edit3DObject = createAsyncThunk<
    void,
    { isPlayground: boolean; object3D: TBabylonObject },
    {
        dispatch: AppDispatch;
        state: State;
        extra: AxiosInstance;
    }
>(
    'project/create-object-3d',
    async (data, { extra: api }) => {
        const { object3D, isPlayground } = data;

        await api.post(`/project/update-${isPlayground ? "playground" : "building"}`, {
            coordinates: object3D.coordinates,
            ...(isPlayground ? { playground_id: object3D.id, } : { building_id: object3D.id, floors: object3D.floors, floors_height: object3D.floorsHeight }),
        });
    },
);
