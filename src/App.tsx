import './App.scss';
import * as BABYLON from "@babylonjs/core";
import MapWith3DModel from "./Scene/BabylonScene";
import { useEffect, useState } from "react";
import mapboxgl from 'mapbox-gl';

type TDimensions = "x" | "y" | "z";

function App() {
  const [map, setMap] = useState<mapboxgl.Map>();
  const [box, setBox] = useState<BABYLON.Mesh>();
  const [scene, setScene] = useState<BABYLON.Scene>();
  const [material, setMaterial] = useState<BABYLON.Material>();
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
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
  };

  const handleEditMode = () => {
    setIsEditMode(prev => !prev)
  }

  return (
    <div>
      <MapWith3DModel map={map} scene={scene} isEdit={isEditMode} setMap={handleSetMap} setBox={handleSetBox} setScene={handleSetScene} />
      <div>
        <button onClick={() => changeObjectSize("x", 10)}>расширь по X</button>
        <button onClick={() => changeObjectSize("x", -10)}>уменьши по X</button>
      </div>
      <div>
        <button onClick={() => changeObjectSize("y", 10)}>расширь по Y</button>
        <button onClick={() => changeObjectSize("y", -10)}>уменьши по Y</button>
      </div>
      <div>
        <button onClick={() => changeObjectSize("z", 10)}>расширь по Z</button>
        <button onClick={() => changeObjectSize("z", -10)}>уменьши по Z</button>
      </div>
      <div>
        <button onClick={() => moveObject("x", 10)}>Двигать по X</button>
        <button onClick={() => moveObject("x", -10)}>Двигать по -X</button>
      </div>
      <div>
        <button onClick={() => moveObject("y", 10)}>Двигать по Y</button>
        <button onClick={() => moveObject("y", -10)}>Двигать по -Y</button>
      </div>
      <div>
        <button onClick={() => moveObject("z", 10)}>Двигать по Z</button>
        <button onClick={() => moveObject("z", -10)}>Двигать по -Z</button>
      </div>
      <div>
        <button onClick={handleEditMode}>{isEditMode ? "Выключить редактирование" : "Включить редактирование"}</button>
      </div>
    </div>
  );
}

export default App;
