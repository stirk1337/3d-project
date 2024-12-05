import { ChangeEvent, FC, useEffect, useState } from "react"
import { VisualEditorView } from "./VisualEditor.view";
import * as BABYLON from "@babylonjs/core";
import { TBabylonObject } from "./VisualEditor.types";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import earcut from "earcut";
import { calculateBasePolygonArea, convertBabylonCoordinatesToMapBox, getBabylonMeshFromCoordinates, handleEraser } from "./VisualEditor.service";
import { TBabylonObjectData } from "../Editor/Editor.types";
import { useAppDispatch, useAppSelector } from "../Redux/hooks";
import { getProjectData } from "../Redux/store/api-actions/get-actions";
import { edit3DObject } from "../Redux/store/api-actions/patch-actions";

const VisualEditorContainer: FC = (props) => {
    const dispatch = useAppDispatch()
    const projectData = useAppSelector(store => store.currentProject)

    const [scene, setScene] = useState<BABYLON.Scene>();
    const [map, setMap] = useState<mapboxgl.Map>()
    const [material, setMaterial] = useState<BABYLON.Material[]>();
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDrawMode, setIsDrawMode] = useState(true);
    const [babylonObjectsData, setBabylonObjectsData] = useState<TBabylonObjectData>();
    const [currentElement, setCurrentElement] = useState<TBabylonObject>();
    const [draw, setDraw] = useState<MapboxDraw>();
    const [floorsCount, setFloorsCount] = useState(0);
    const [floorsHeight, setFloorsHeight] = useState(0);
    const [currentSquare, setCurrentSquare] = useState(0);

    useEffect(() => {
        dispatch(getProjectData(1))
    }, [])

    useEffect(() => {
        console.log("alo", babylonObjectsData)
    }, [babylonObjectsData])

    useEffect(() => {
        if (!map || !scene || !projectData) return;

        const playground = projectData.playground;

        if (!playground) return;

        const polygonCorners = playground.coordinates

        const coordinates = convertBabylonCoordinatesToMapBox(polygonCorners)

        handleEraser(map, coordinates)

        const [playgroundPolygon, polygonCoordinates] = getBabylonMeshFromCoordinates(playground, scene, handleCurrentElement, true);

        const buildings = projectData.buildings;
        const buildingsPolygons: TBabylonObject[] = []
        if (buildings) {
            buildings.forEach((building) => {
                const [buildingPolygon, buildingCoordinates] = getBabylonMeshFromCoordinates(building, scene, handleCurrentElement);
                buildingsPolygons.push({ ...building, mesh: buildingPolygon, coordinates: buildingCoordinates });
            })
        }

        handleBabylonObjectsDataChange({ playground: { id: playground.id, mesh: playgroundPolygon, coordinates: polygonCoordinates }, buildings: buildingsPolygons });
    }, [map, scene, projectData]);

    console.log(babylonObjectsData);

    const handleScene = (scene: BABYLON.Scene) => {
        setScene(scene)
    }

    const handleMap = (map: mapboxgl.Map) => {
        setMap(map)
    }

    const handleMaterial = (material: BABYLON.Material[]) => {
        setMaterial(material)
    }

    const handleEditMode = () => {
        setIsEditMode(prev => !prev)
    }

    const handleDrawMode = () => {
        setIsDrawMode(prev => !prev)
    }

    const handleBabylonObjectsDataChange = (babylonObjectsData: TBabylonObjectData) => {
        setBabylonObjectsData(babylonObjectsData)
    }

    const handleCurrentElement = (polygonData: TBabylonObject) => {
        if (currentElement && material) currentElement.mesh.material = material[0];

        dispatch(edit3DObject({ isPlayground: !(polygonData.floors && polygonData.floorsHeight), object3D: polygonData }))

        setIsDrawMode(false);
        setCurrentElement(polygonData)
        if (polygonData.floors && polygonData.floorsHeight) {
            setFloorsCount(polygonData.floors)
            setFloorsHeight(polygonData.floorsHeight)
        }
        setCurrentSquare(calculateBasePolygonArea(polygonData.coordinates))
    }

    const handleFloorsCount = (event: ChangeEvent<HTMLInputElement>) => {
        if (!currentElement || !currentElement.floorsHeight) return;

        const floors = Number(event.target.value)

        setFloorsCount(floors)

        changeCurrentPolygonHeight(floors, currentElement.floorsHeight)
    }

    const handleFloorsHeight = (event: ChangeEvent<HTMLInputElement>) => {
        if (!currentElement || !currentElement.floors) return;

        const floorsHeight = Number(event.target.value)
        console.log(floorsHeight)

        setFloorsHeight(floorsHeight)

        changeCurrentPolygonHeight(currentElement.floors, floorsHeight)
    }

    function changeCurrentPolygonHeight(floors: number, height: number) {
        if (!currentElement) return;

        currentElement.mesh.dispose()

        const polygon = new BABYLON.PolygonMeshBuilder("polytri", currentElement.coordinates, scene, earcut);
        const extrudedPolygon = polygon.build(true, height * floors);
        extrudedPolygon.position.y = height * floors;
        extrudedPolygon.material = new BABYLON.StandardMaterial("material", scene);
        extrudedPolygon.material.backFaceCulling = false;

        extrudedPolygon.actionManager = new BABYLON.ActionManager(scene);
        extrudedPolygon.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => setCurrentElement({ ...currentElement, mesh: extrudedPolygon }))
        );

        extrudedPolygon.uniqueId = currentElement.mesh.uniqueId;

        currentElement.mesh.dispose();

        dispatch(edit3DObject({ isPlayground: false, object3D: { ...currentElement, floors, floorsHeight: height } }))

        setCurrentElement({ ...currentElement, mesh: extrudedPolygon, floors, floorsHeight: height })
    }

    const clearCurrentElement = () => {
        if (!currentElement || !material) return;

        currentElement.mesh.material = material[0];

        setBabylonObjectsData(prevState => {
            if (!prevState) return prevState;

            if (prevState.playground.mesh.uniqueId === currentElement.mesh.uniqueId) {
                return {
                    ...prevState,
                    playground: { ...currentElement },
                };
            } else {
                return {
                    ...prevState,
                    buildings: prevState.buildings.map(building =>
                        building.mesh.uniqueId === currentElement.mesh.uniqueId
                            ? { ...currentElement }
                            : building
                    ),
                };
            }
        });

        setCurrentElement(undefined);
    }

    const handleEditCurrentElement = () => {
        if (!currentElement || !map) return;

        const newDraw = new MapboxDraw({
            displayControlsDefault: false,
            defaultMode: 'simple_select'
        })

        const polygonCorners = currentElement.coordinates

        const coordinates = convertBabylonCoordinatesToMapBox(polygonCorners)

        const polygonFeature = {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [coordinates]
            },
            properties: {}
        };
        map.addControl(newDraw);
        newDraw.add(polygonFeature as GeoJSON.Feature);
        setDraw(newDraw);
    }

    const handleDraw = (draw?: MapboxDraw) => {
        setDraw(draw);
    }

    useEffect(() => {
        if (!currentElement || !material) return;

        currentElement.mesh.material = material[1];

    }, [currentElement]);

    return (
        <VisualEditorView
            isDrawMode={isDrawMode}
            isEditMode={isEditMode}
            babylonObjectsData={babylonObjectsData}
            currentElement={currentElement}
            draw={draw}
            scene={scene}
            map={map}
            floorsCount={floorsCount}
            floorsHeight={floorsHeight}
            currentSquare={currentSquare}
            handleScene={handleScene}
            handleMap={handleMap}
            handleMaterial={handleMaterial}
            handleCurrentElement={handleCurrentElement}
            clearCurrentElement={clearCurrentElement}
            handleBabylonObjectsDataChange={handleBabylonObjectsDataChange}
            handleEditCurrentElement={handleEditCurrentElement}
            handleDraw={handleDraw}
            handleEditMode={handleEditMode}
            handleDrawMode={handleDrawMode}
            handleFloorsCount={handleFloorsCount}
            handleFloorsHeight={handleFloorsHeight}
        />
    )
}

export { VisualEditorContainer }