"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { fetchFloodPrediction, WardPrediction } from "@/services/api";

interface MapboxViewProps {
    rainfallIntensity: number;
    liveReports?: any[];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// URLs
const WARDS_DATA_URL = "/data/delhi-wards.geojson";
const HOTSPOTS_DATA_URL = "/data/hotspots.json"; // Keep hotspots
const BASIN_FILES = [
    "/data/delhi_drains/najafgarh_basin.json",
    "/data/delhi_drains/barapullah_basin.json",
    "/data/delhi_drains/shadara_yamuna_basin.json"
];

const MAX_RAINFALL = 120;

// Build a map from Ward_No to ward_id for feature-state lookups
let wardNoToIdMap: Record<string, string> = {};

export function MapboxView({ rainfallIntensity, liveReports }: MapboxViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const popup = useRef<mapboxgl.Popup | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [predictions, setPredictions] = useState<WardPrediction[]>([]);
    const [apiOnline, setApiOnline] = useState(true);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const predictionsRef = useRef<WardPrediction[]>(predictions);

    // Keep predictionsRef in sync with state for event handlers
    useEffect(() => {
        predictionsRef.current = predictions;
    }, [predictions]);

    // 1. Convert liveReports to GeoJSON for Clustering
    const reportsGeoJson = {
        type: "FeatureCollection",
        features: (liveReports || []).map((report) => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [report.coordinates.lng, report.coordinates.lat],
            },
            properties: {
                id: report.id,
                location: report.location,
                severity: report.ai_analysis.severity,
                depth: report.ai_analysis.estimated_depth,
                confidence: report.ai_analysis.confidence,
                admin_status: report.admin_status,
                is_fully_verified: report.admin_status === "approved"
            },
        })),
    };

    // Update Source Data when reports change
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        const source = map.current.getSource("reports-cluster") as mapboxgl.GeoJSONSource;
        if (source) {
            source.setData(reportsGeoJson as any);
        }
    }, [liveReports, mapLoaded]);

    // Fetch predictions from API (debounced) - PRESERVED Logic
    const fetchPredictions = useCallback(async (rainfall: number) => {
        try {
            const data = await fetchFloodPrediction(rainfall);
            if (data.length > 0) {
                setPredictions(data);
                setApiOnline(true);
                // Build ward_no to ward_id mapping
                data.forEach(pred => {
                    if (pred.ward_no) {
                        wardNoToIdMap[String(pred.ward_no)] = String(pred.ward_id);
                    }
                });
            } else {
                setApiOnline(false);
            }
        } catch (error) {
            console.error("Failed to fetch predictions:", error);
            setApiOnline(false);
        }
    }, []);

    // Debounce API calls
    useEffect(() => {
        (window as any).__currentRainfallIntensity = rainfallIntensity;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            fetchPredictions(rainfallIntensity);
        }, 300);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [rainfallIntensity, fetchPredictions]);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;
        if (!MAPBOX_TOKEN) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/standard",
            center: [77.2090, 28.6139],
            zoom: 11,
            pitch: 45, // Reduced pitch (User request: "see map better (less 'wall' effect)")
            bearing: 0,
            antialias: true,
        });

        popup.current = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            className: 'ward-popup'
        });

        map.current.on("load", () => {
            if (!map.current) return;
            const m = map.current;
            m.resize();
            setMapLoaded(true);

            // --- 1. Base Terrain ---
            m.addSource("mapbox-dem", {
                type: "raster-dem",
                url: "mapbox://mapbox.mapbox-terrain-dem-v1",
                tileSize: 512,
                maxzoom: 14,
            });
            m.setTerrain({ source: "mapbox-dem", exaggeration: 1 }); // Reduced exaggeration

            // --- 2. Wards (Water Risk) ---
            m.addSource("delhi-wards", {
                type: "geojson",
                data: WARDS_DATA_URL,
                promoteId: "Ward_No" // Key for feature-state
            });

            m.addLayer({
                id: "delhi-wards-risk",
                type: "fill-extrusion",
                source: "delhi-wards",
                paint: {
                    "fill-extrusion-color": "#c084fc",
                    "fill-extrusion-height": 0,
                    "fill-extrusion-base": 0,
                    "fill-extrusion-opacity": 0.5, // Reduced opacity
                    "fill-extrusion-height-transition": { duration: 500, delay: 0 },
                    "fill-extrusion-color-transition": { duration: 500, delay: 0 },
                },
            });

            m.addLayer({
                id: "ward-outline",
                type: "line",
                source: "delhi-wards",
                paint: {
                    "line-color": "#ffffff",
                    "line-width": 1, // Thinner lines
                    "line-opacity": 0.3,
                },
            });

            // --- 3. Drains (Basins) ---
            BASIN_FILES.forEach((file, index) => {
                const sourceId = `basin-${index}`;
                m.addSource(sourceId, { type: "geojson", data: file });
                m.addLayer({
                    id: `drain-lines-${index}`,
                    type: "line",
                    source: sourceId,
                    paint: { "line-color": "#06b6d4", "line-width": 1.5, "line-opacity": 0.6 },
                });
            });

            // --- 4. CLUSTERED REPORTS ---
            m.addSource("reports-cluster", {
                type: "geojson",
                data: reportsGeoJson as any,
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50
            });

            m.addLayer({
                id: "clusters",
                type: "circle",
                source: "reports-cluster",
                filter: ["has", "point_count"],
                paint: {
                    "circle-color": [
                        "step", ["get", "point_count"],
                        "#51bbd6", 10,
                        "#f1f075", 30,
                        "#f28cb1"
                    ],
                    "circle-radius": [
                        "step", ["get", "point_count"],
                        15, 10, 20, 30, 25
                    ],
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#fff"
                }
            });

            m.addLayer({
                id: "cluster-count",
                type: "symbol",
                source: "reports-cluster",
                filter: ["has", "point_count"],
                layout: {
                    "text-field": "{point_count_abbreviated}",
                    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                    "text-size": 12
                }
            });

            m.addLayer({
                id: "unclustered-point",
                type: "circle",
                source: "reports-cluster",
                filter: ["!", ["has", "point_count"]],
                paint: {
                    "circle-color": [
                        "case",
                        ["==", ["get", "is_fully_verified"], true],
                        "#10b981", // Green (Admin)
                        "#ef4444"  // Red (AI)
                    ],
                    "circle-radius": 8,
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#fff"
                }
            });

            // --- 5. HOTSPOTS (Custom Markers - Preserved) ---
            // --- 5. HOTSPOTS (Custom Markers - Preserved) ---
            fetch(HOTSPOTS_DATA_URL)
                .then(async (res) => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const text = await res.text();
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        console.warn("Hotspots JSON parse failed:", e);
                        return null; // Handle invalid JSON gracefully
                    }
                })
                .then(data => {
                    if (data && data.features) {
                        data.features.forEach((feature: any) => {
                            const type = feature.properties.type || 'chronic';
                            // Simple marker styling
                            const el = document.createElement('div');
                            el.className = 'w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer';
                            el.style.backgroundColor = type === 'chronic' ? '#f59e0b' : '#3b82f6'; // Amber or Blue

                            const markerPopup = new mapboxgl.Popup({ offset: 25 })
                                .setHTML(`
                                    <div style="color:black; padding:5px;">
                                        <h3 style="font-weight:bold;">${feature.properties.name}</h3>
                                        <p style="font-size:12px;">${feature.properties.description}</p>
                                    </div>
                                `);

                            new mapboxgl.Marker({ element: el })
                                .setLngLat(feature.geometry.coordinates)
                                .setPopup(markerPopup)
                                .addTo(m);
                        });
                    }
                })
                .catch(err => console.error("Failed to load hotspots", err));


            // --- Interactions ---
            m.on("click", "clusters", (e) => {
                const features = m.queryRenderedFeatures(e.point, { layers: ["clusters"] });
                const clusterId = features[0].properties?.cluster_id;
                (m.getSource("reports-cluster") as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
                    clusterId,
                    (err, zoom) => {
                        if (err || !map.current) return;
                        map.current.easeTo({ center: (features[0].geometry as any).coordinates, zoom: zoom });
                    }
                );
            });

            m.on("click", "unclustered-point", (e) => {
                if (!e.features || !e.features[0]) return;
                const props = e.features[0].properties;
                const coordinates = (e.features[0].geometry as any).coordinates.slice();
                if (!props) return;

                const badgeColor = props.is_fully_verified ? "#10b981" : "#0ea5e9";
                const badgeText = props.is_fully_verified ? "Verified by AI & Admin" : "Verified using AI only";

                new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(`
                         <div style="color:black; padding:5px; max-width:200px;">
                            <span style="background:${badgeColor}; color:white; font-size:10px; padding:2px 5px; border-radius:3px;">${badgeText}</span>
                            <h4 style="font-weight:bold; margin:5px 0;">Waterlogging</h4>
                            <p style="font-size:12px;">${props.location}</p>
                            <div style="font-size:11px; color:#555; margin-top:5px;">
                                Depth: <b>${props.depth}</b><br/>
                                Severity: <b>${props.severity}</b>
                            </div>
                        </div>
                    `)
                    .addTo(m);
            });

            // Cursor
            const pointerLayers = ['clusters', 'unclustered-point', 'delhi-wards-risk'];
            pointerLayers.forEach(layer => {
                m.on('mouseenter', layer, () => { m.getCanvas().style.cursor = 'pointer'; });
                m.on('mouseleave', layer, () => { m.getCanvas().style.cursor = ''; });
            });

            // Ward Click Logic (Preserved + Tamed)
            m.on('click', 'delhi-wards-risk', (e) => {
                if (!e.features || e.features.length === 0) return;
                const props = e.features[0].properties || {};
                const wardName = props.Ward_Name || `Ward ${props.Ward_No || 'Unknown'}`;
                const wardNo = props.Ward_No;

                const currentRainfall = (window as any).__currentRainfallIntensity || 0;

                // Find prediction
                const wardId = wardNoToIdMap[String(wardNo)];
                const currentPredictions = predictionsRef.current; // Use Ref to get latest state
                const prediction = currentPredictions.find(p =>
                    String(p.ward_id) === wardId || String(p.ward_no) === String(wardNo)
                );

                const psi = prediction?.predicted_psi ?? 0;

                popup.current?.setLngLat(e.lngLat)
                    .setHTML(`
                        <div style="padding: 8px; color: black; min-width:180px;">
                            <strong>${wardName}</strong><br/>
                            <span style="font-size:12px; color:#666;">Rainfall: ${currentRainfall} mm/hr</span>
                            <hr style="margin:4px 0; border-color:#eee;"/>
                             <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size:12px;">AI Severity:</span>
                                <span style="font-weight: bold; font-size: 14px; color: ${psi >= 8 ? '#ef4444' : psi >= 5 ? '#f97316' : psi >= 2 ? '#facc15' : '#51bbd6'};">${psi.toFixed(1)}/10</span>
                            </div>
                        </div>
                    `)
                    .addTo(m);
            });
        });

        const handleResize = () => map.current?.resize();
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update Extrusion and Colors based on Rain + Predictions
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        const m = map.current;
        if (!m.getLayer("delhi-wards-risk")) return;

        const intensityFactor = rainfallIntensity / MAX_RAINFALL;

        // --- MERGED LOGIC: AI Data + Tamed Visuals ---
        if (apiOnline && predictions.length > 0) {
            // Apply predictions to feature states
            predictions.forEach(pred => {
                const wardNo = pred.ward_no || pred.ward_id;
                try {
                    m.setFeatureState(
                        { source: 'delhi-wards', id: wardNo },
                        { psi: pred.predicted_psi }
                    );
                } catch (e) { /* ignore */ }
            });

            // Tamed Heights for AI: 0 -> 120 max (Reduced to let buildings "pop out")
            const heightExpr: mapboxgl.Expression = [
                "interpolate", ["linear"], ["coalesce", ["feature-state", "psi"], 0],
                0, 0,
                2, 20,   // Low risk
                5, 50,  // Med risk
                8, 90,  // High risk
                10, 120  // Overflow (Max height lower than typical buildings)
            ];
            m.setPaintProperty("delhi-wards-risk", "fill-extrusion-height", heightExpr);

            // Colors for AI (Purple -> Light Blue -> Yellow -> Orange -> Red)
            const colorExpr: mapboxgl.Expression = [
                "interpolate", ["linear"], ["coalesce", ["feature-state", "psi"], 0],
                0, "#c084fc",  // Safe (Purple)
                2, "#51bbd6",  // Low (Light Blue)
                4, "#facc15",  // Moderate (Yellow)
                6, "#f97316",  // High (Orange)
                8, "#ef4444"   // Overflow (Red)
            ];
            m.setPaintProperty("delhi-wards-risk", "fill-extrusion-color", colorExpr);

        } else {
            // FALLBACK Logic (if API offline)
            // Height = Rainfall * 3 (Tamed)
            const waterHeight: mapboxgl.Expression = [
                "*",
                ["min", 10, ["max", 1, ["round", ["*", 10, ["/", ["get", "Shape_Area"], 0.05]]]]],
                rainfallIntensity * 3
            ];
            m.setPaintProperty("delhi-wards-risk", "fill-extrusion-height", waterHeight);

            // Color = Rainfall-based
            const riskColor: mapboxgl.Expression = [
                "interpolate", ["linear"], ["literal", intensityFactor],
                0, "#c084fc",
                0.5, "#fbbf24",
                1.0, "#ef4444"
            ];
            m.setPaintProperty("delhi-wards-risk", "fill-extrusion-color", riskColor);
        }

        // Opacity using newer smoother logic
        const opacityExpression: mapboxgl.Expression = [
            "interpolate", ["linear"], ["literal", intensityFactor],
            0, 0,
            0.2, 0.4,
            1.0, 0.7
        ];
        m.setPaintProperty("delhi-wards-risk", "fill-extrusion-opacity", opacityExpression);

    }, [rainfallIntensity, mapLoaded, predictions, apiOnline]);

    return (
        <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-background" />
    );
}
