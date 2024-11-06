import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from "@babylonjs/core";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import "./map.scss";
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import earcut from 'earcut';

type TMapProps = {
    scene: undefined | BABYLON.Scene;
    map: undefined | mapboxgl.Map;
    isEdit: boolean;

    setMap: (map: mapboxgl.Map) => void;
    setScene: (scene: BABYLON.Scene) => void;
    setBox: (box: BABYLON.Mesh) => void;
};

const MapWith3DModel: React.FC<TMapProps> = (props) => {
    const mapContainer = useRef<HTMLDivElement | null>(null);

    const { map, scene, isEdit } = props;

    const [engine, setEngine] = useState<BABYLON.Engine>();

    const worldOrigin = [148.9819, -35.39847];
    const worldAltitude = 0;
    const worldRotate = [Math.PI / 2, 0, 0];

    // Calculate mercator coordinates and scale
    const worldOriginMercator = mapboxgl.MercatorCoordinate.fromLngLat(
        worldOrigin,
        worldAltitude
    );
    const worldScale = worldOriginMercator.meterInMercatorCoordinateUnits();

    useEffect(() => {
        if (!mapContainer.current) return;

        mapboxgl.accessToken = "pk.eyJ1Ijoic3RpcmsxMzM3IiwiYSI6ImNtMmtveDQ2YzAzN2UyaXJ6OThxZ2Z6MXQifQ.Nrk1UIvUc9Ff5POTTkveTg";

        const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            zoom: 18,
            center: [148.9819, -35.3981],
            pitch: 60,
            antialias: true, // enable MSAA antialiasing
        });

        const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                trash: true
            },
            defaultMode: 'draw_polygon'
        });
        map.addControl(draw);

        map.on('draw.create', updateArea);
        map.on('draw.delete', updateArea);
        map.on('draw.update', updateArea);

        function updateArea(e) {
            const data = draw.getAll();
            const geometry = data.features[0].geometry as GeoJSON.Polygon;
            const coordinates = geometry.coordinates[0];

            console.log(coordinates)

            const polygonCorners: BABYLON.Vector2[] = []

            coordinates.forEach((point) => {
                const [x, y] = point;

                const clickedMercator = mapboxgl.MercatorCoordinate.fromLngLat(
                    [x, y],
                    worldAltitude
                );

                const babylonX = -(clickedMercator.x - worldOriginMercator.x) / worldScale;
                const babylonZ = (clickedMercator.y - worldOriginMercator.y) / worldScale;

                polygonCorners.push(new BABYLON.Vector2(babylonX + 1, babylonZ + 50))
            })

            const polygon = new BABYLON.PolygonMeshBuilder("polytri", polygonCorners, scene, earcut);
            const extrudedPolygon = polygon.build(true, 10);
            extrudedPolygon.position.y = 10;

            extrudedPolygon.actionManager = new BABYLON.ActionManager(scene);
            extrudedPolygon.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function () {
                props.setBox(extrudedPolygon);
            }));

            props.setBox(extrudedPolygon);
        }

        props.setMap(map)

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

        const customLayer: mapboxgl.CustomLayerInterface = {
            id: '3d-model',
            type: 'custom' as const, // Указываем строгий литерал "custom"
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

                this.map = map;
            },
            render: function (gl: WebGLRenderingContext, matrix: number[]) {
                const cameraMatrix = BABYLON.Matrix.FromArray(matrix);
                const wvpMatrix = worldMatrix.multiply(cameraMatrix);

                this.camera.freezeProjectionMatrix(wvpMatrix);
                this.scene.render(true);
                this.map.triggerRepaint();
            },
        };

        map.on('style.load', function () {
            const layers = map.getStyle()?.layers;
            if (!layers) return;

            const labelLayerId = layers.find(
                (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
            )?.id;

            map.addLayer({
                id: 'add-3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                filter: ['==', 'extrude', 'true'],
                type: 'fill-extrusion',
                minzoom: 15,
                paint: {
                    'fill-extrusion-color': '#aaa',
                    'fill-extrusion-height': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        15.05,
                        ['get', 'height']
                    ],
                    'fill-extrusion-base': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        15.05,
                        ['get', 'min_height']
                    ],
                    'fill-extrusion-opacity': 0.6
                }
            },
                labelLayerId);

            map.addLayer(customLayer);
        });

        return () => {
            map.remove();
        };
    }, []);

    useEffect(() => {
        if (!map || !scene) return;

        if (isEdit) {
            scene.attachControl()
        }
        else {
            scene.detachControl()
        }

        return () => {
        };
    }, [isEdit, scene, map])

    window.addEventListener('resize', function () {
        if (engine) {
            engine.resize();
        }
    })

    return <div ref={mapContainer} id="map" style={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }} />;
};

export default MapWith3DModel;