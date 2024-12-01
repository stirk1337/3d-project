import { createAsyncThunk } from "@reduxjs/toolkit";
import { AppDispatch, State } from "..";
import { AxiosInstance } from "axios";
import { Vector2 } from "@babylonjs/core";

export const create3DObject = createAsyncThunk<
    number,
    { isPlayground: boolean; object3D: Vector2[] },
    {
        dispatch: AppDispatch;
        state: State;
        extra: AxiosInstance;
    }
>(
    'project/create-object-3d',
    async (data, { extra: api }) => {
        const { object3D, isPlayground } = data;

        const transformedCoordinates = object3D.map(({ x, y }) => ({ x: Math.round(x), y: Math.round(y) }));

        const { data: id } = await api.post(`/project/create-${isPlayground ? "playground" : "building"}`, {
            coordinates: transformedCoordinates,
            project_id: 1
        });

        return id.building_id;
    },
);
