import { AxiosInstance } from "axios";
import { AppDispatch, State } from "..";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { TObjectData } from "../../../Editor/Editor.types";
import { setCurrentProjectData } from "../actions";
import { toCamelCase } from "./service";

export const getProjectData = createAsyncThunk<void, number, {
    dispatch: AppDispatch;
    state: State;
    extra: AxiosInstance;
}>(
    'project/get-project-details',
    async (id, { dispatch, extra: api }) => {
        try {
            const { data } = await api.get<TObjectData>('/project/project-details', { params: { project_id: id } });

            const transformedData = toCamelCase(data);

            dispatch(setCurrentProjectData(transformedData));
        } catch (error) {
            console.error('Ошибка при получении данных проекта:', error);
        }
    },
);