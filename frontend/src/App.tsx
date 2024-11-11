import './App.scss';
import * as BABYLON from "@babylonjs/core";
import MapWith3DModel from "./Editor/Scene/BabylonScene";
import { useEffect, useState } from "react";
import Editor from './Editor';

type TDimensions = "x" | "y" | "z";

function App() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(true);

  /*useEffect(() => {
    if (box && material) {
      box.material = material;
    }
  }, [box, material]);

  function handleSetMap(map: mapboxgl.Map) {
    setMap(map);
  }

  function handleSetBox(newBox: BABYLON.Mesh) {
    setBox((prevBox) => {
      if (prevBox) {
        const grayMaterial = new BABYLON.StandardMaterial("grayMaterial", prevBox.getScene());
        grayMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Gray color
        prevBox.material = grayMaterial;
      }

      return newBox;
    });
  }

  function handleSetScene(scene: BABYLON.Scene) {
    setScene(scene);

    const newMaterial = new BABYLON.StandardMaterial("boxMaterial", scene);
    newMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    setMaterial(newMaterial);
  }

  function changeObjectSize(dimension: TDimensions, delta: number) {
    if (!box) return;
    box.scaling[dimension] += delta;

    //box.position[dimension] = Math.round(box.scaling[dimension] / 2);
  }

  const moveObject = (dimension: TDimensions, shift: number) => {
    if (!box) return;

    box.position[dimension] += shift;
  };*/

  const handleEditMode = () => {
    setIsEditMode(prev => !prev)
  }

  const handleDrawMode = () => {
    setIsDrawMode(prev => !prev)
  }

  return (
    <div>
      <Editor isEditMode={isEditMode} isDrawMode={isDrawMode} />
      <div>
        <button onClick={handleEditMode}>{isEditMode ? "Выключить редактирование" : "Включить редактирование"}</button>
        <button onClick={handleDrawMode}>{isDrawMode ? "Выключить режим рисования полигона" : "Включить режим рисования полигона"}</button>
      </div>
    </div>
  );
}

export default App;
