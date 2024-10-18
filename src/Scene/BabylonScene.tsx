import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from "@babylonjs/core";
import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import "./map.scss";
import { MapMouseEvent } from '@maptiler/sdk';

type TMapProps = {
    box: undefined | BABYLON.Mesh;
    scene: undefined | BABYLON.Scene;

    setScene: (scene: BABYLON.Scene) => void;
    setBox: (box: BABYLON.Mesh) => void;
};

const MapWith3DModel: React.FC<TMapProps> = (props) => {
    const mapContainer = useRef<HTMLDivElement | null>(null);

    const { box, scene } = props;

    const [engine, setEngine] = useState<BABYLON.Engine>();
    const [map, setMap] = useState<maptilersdk.Map>();

    const worldOrigin = [148.9819, -35.39847];
    const worldAltitude = 0;
    const worldRotate = [Math.PI / 2, 0, 0];

    // Calculate mercator coordinates and scale
    const worldOriginMercator = maptilersdk.MercatorCoordinate.fromLngLat(
        worldOrigin,
        worldAltitude
    );
    const worldScale = worldOriginMercator.meterInMercatorCoordinateUnits();

    useEffect(() => {
        if (!mapContainer.current) return;

        // Initialize MapTiler SDK
        maptilersdk.config.apiKey = 'IgMTbFvjizOKPAqDj5pd';

        const map = new maptilersdk.Map({
            container: mapContainer.current,
            style: maptilersdk.MapStyle.STREETS,
            zoom: 18,
            center: [148.9819, -35.3981],
            pitch: 60,
            antialias: true, // enable MSAA antialiasing
        });

        setMap(map)

        // Calculate world matrix
        const worldMatrix = BABYLON.Matrix.Compose(
            new BABYLON.Vector3(worldScale, worldScale, worldScale),
            BABYLON.Quaternion.FromEulerAngles(
                worldRotate[0],
                worldRotate[1],
                worldRotate[2]
            ),
            new BABYLON.Vector3(
                worldOriginMercator.x,
                worldOriginMercator.y,
                worldOriginMercator.z
            )
        );

        const customLayer = {
            id: '3d-model',
            type: 'custom',
            renderingMode: '3d',
            onAdd: function (map: any, gl: WebGLRenderingContext) {
                this.engine = new BABYLON.Engine(
                    gl,
                    true,
                    { useHighPrecisionMatrix: true },
                    true
                );
                setEngine(this.engine)
                this.scene = new BABYLON.Scene(this.engine);
                props.setScene(this.scene);
                this.scene.autoClear = false;
                this.scene.detachControl();

                this.scene.beforeRender = () => {
                    this.engine.wipeCaches(true);
                };


                this.camera = new BABYLON.ArcRotateCamera(
                    'Camera',
                    Math.PI / 2,
                    Math.PI / 2,
                    50,
                    new BABYLON.Vector3(0, 0, 0),
                    this.scene
                );

                // Create simple light
                const light = new BABYLON.HemisphericLight(
                    'light1',
                    new BABYLON.Vector3(0, 0, 100),
                    this.scene
                );
                light.intensity = 0.7;

                this.map = map; // Сохраните ссылку на карту
            },
            render: function (gl: WebGLRenderingContext, matrix: number[]) {
                const cameraMatrix = BABYLON.Matrix.FromArray(matrix);
                const wvpMatrix = worldMatrix.multiply(cameraMatrix);

                this.camera.freezeProjectionMatrix(wvpMatrix);
                this.scene.render(true); // Используйте сохраненную сцену
                this.map.triggerRepaint();
            },
        };

        map.on('style.load', function () {
            map.addLayer(customLayer);
        });

        return () => {
            map.remove();
            // Вы можете добавить очистку сцен и других ресурсов здесь
        };
    }, []);

    useEffect(() => {
        if (!map) return;

        map.on("click", handleClickScene)
    }, [scene]);

    function handleClickScene(evt: MapMouseEvent): void {
        if (!scene) return;

        const clickedMercator = maptilersdk.MercatorCoordinate.fromLngLat(
            [evt.lngLat.lng, evt.lngLat.lat],
            worldAltitude
        );

        // Корректируем координаты по масштабированию и смещению
        const x = -(clickedMercator.x - worldOriginMercator.x) / worldScale;
        const z = (clickedMercator.y - worldOriginMercator.y) / worldScale;
        const y = 0;

        const newBox = BABYLON.MeshBuilder.CreateBox('box', {
            width: 10,       // Ширина 100 пикселей
            height: 10,  // Высота из пропсов
            depth: 10,
        }, scene);
        newBox.position = new BABYLON.Vector3(x, y, z + 50); // Устанавливаем новые координаты

        props.setBox(newBox); // Сохраняем новый объект
    }

    window.addEventListener('resize', function () {
        if (engine) {
            engine.resize();
        }
    })

    return <div ref={mapContainer} id="map" style={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }} />;
};

export default MapWith3DModel;