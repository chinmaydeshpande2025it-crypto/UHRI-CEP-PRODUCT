# UHRI Landslide Early Warning System & Citizen Mobile Alert

> **A Fused Static–Dynamic Machine Learning Framework for Real-Time Landslide Early Warning with Offline-First Alert Delivery**  
> *Authors: Chinmay Deshpande, Vanita Gadekar (Marathwada Mitra Mandal’s College of Engineering, Pune)*

---

## 🏛 System Architecture Overview

The system architecture implements the end-to-end multi-tier pipeline published in Figure 2 of the research paper:

```
[Weather Data]      [Terrain Data]       [Historical Records]   [Live Sensors & Satellite]
(rainfall,temp,hum) (DEM,slope,soil)     (Landslide records)    (tilt, soil moist, radar)
          \               |                     |               /
           \              |                     |              /
            v             v                     v             v
                [ Ingestion Pipeline (Kafka / Celery / Worker) ]
                                  |
            +---------------------+---------------------+
            |                     |                     |
     [TimescaleDB]        [PostgreSQL + PostGIS]     [Redis]
 (sensor time-series)       (spatial / map data)   (live dashboard cache)
            |                     |                     |
            +----------+----------+                     |
                       |                                |
            +----------+----------+                     |
            |                     |                     |
     [XGBoost Model]       [Bi-LSTM Model]              |
  (static susceptibility) (dynamic time-series)         |
            |                     |                     |
            +----------+----------+                     |
                       v                                |
                [ Fusion Engine ]                       |
          (UHRI = α·S_static + (1-α)·S_dynamic)         |
                       |                                |
        +--------------+--------------+                 |
        |                             |                 |
        v                             v                 v
   [Alert Tiers]             [Authority Dashboard]  [Offline Citizen App]
 (Green/Yellow/Orange/Red)      (live GIS map)       (+ SMS Fallback)
```

---

## 💾 Triple-Database Layer

1. **TimescaleDB (`sensor_telemetry` Hypertable)**:
   - Partitions time-series telemetry into 7-day chunks.
   - Stores 1h, 24h, and 72h antecedent precipitation, TDR volumetric soil moisture saturation, borehole inclinometer displacement rate ($mm/hr$), and pore water pressure ($kPa$).
   - Continuous aggregates enable rolling temporal queries for the Bi-LSTM model.

2. **PostgreSQL + PostGIS (Spatial Engine)**:
   - EPSG:4326 (WGS 84) GIS geometries for mountain slope polygons, fault lines, roads, and high-ground shelters.
   - R-Tree GIST spatial indexing for real-time proximity calculations and evacuation routing.

3. **Redis In-Memory State Cache & Pub/Sub**:
   - Ultra-low latency cache for active UHRI scores and alert states.
   - Pub/Sub message broker powering zero-latency dual-window synchronization and mobile push alerts.

---

## 🌐 Live Data Source Ingestion (Static & Dynamic $\to$ UHRI)

On the **Main Screen**, data is fetched from live APIs and converted to UHRI:
- **Weather Data**: Open-Meteo Global NWP Models (ECMWF & GFS) calculates rolling 1h, 24h, and 72h precipitation accumulation, temperature, and relative humidity.
- **Soil Moisture**: Satellite Hydrology model provides root-zone soil volumetric moisture saturation %.
- **Terrain DEM**: SRTM 30m Digital Elevation Model computes slope gradient angle, curvature, and elevation.
- **Historical Records**: GSI Bhu-Sanket and NASA Landslide Inventory provide historical scar counts and failure precedents.
- **Geotechnical Telemetry**: Live IoT inclinometer streams tracking sub-surface creep velocity.

### Fusion Formula
$$\text{UHRI} = \alpha \cdot S_{\text{static}} + (1 - \alpha) \cdot S_{\text{dynamic}}, \quad \text{with } \alpha = 0.30$$

- **$S_{\text{static}}$**: Positive-Unlabeled (PU) XGBoost gradient-boosted tree on terrain features.
- **$S_{\text{dynamic}}$**: Bidirectional LSTM (Bi-LSTM) on rolling 24h/72h rainfall & soil moisture sequences.
- **TreeSHAP**: Feature attribution decomposing real-time factor percentages.

### Alert Tiers
- **GREEN (0.00 – 0.35)**: Normal Monitoring
- **YELLOW (0.36 – 0.60)**: Watch (Pre-positioning)
- **ORANGE (0.61 – 0.79)**: Warning (Mobilization & Road Restrictions)
- **RED (0.80 – 1.00)**: Danger (Imminent Slope Failure & Mandatory Evacuation)

---

## 🪟 Interactive Simulation Sandbox (Separate Window)

Click **"Sim Window"** in the top navigation bar to open the standalone simulation cockpit in a separate window:
- Move sliders for 72h rainfall, soil saturation, borehole tilt rate, and slope angle.
- Instant 1-click presets: *28 Sept Gandaki Deluge (RED)*, *Wayanad Tea Slope Surge (RED)*, *Monsoon Warning (ORANGE)*, *Clear Sky Baseline (GREEN)*.
- **Zero-Latency Cross-Window Sync**: Dragging sliders instantly updates the Main Screen GIS map, radial gauges, and triggers mobile alarms!

---

## 📱 Android Mobile App (.apk)

The Android APK is compiled and signed with a matching dark theme (`#020617` / `#0f172a`), matching alert tiers, and full offline lifeline capabilities.

### How to Install the APK on Your Mobile Phone:
1. **Download**: Click **"Mobile APK"** in the top navbar and click **"Download Android APK File (.apk)"** (or download from `/uhri-landslide-alert.apk`).
2. **Transfer / Open**: Open the file on your Android mobile device.
3. **Allow Unknown Apps**: If prompted by Android security, tap **Settings** and toggle **"Allow from this source"**.
4. **Install**: Tap **Install**. Open the app to receive real-time alerts whenever simulation sandbox readings or live hazard levels change!

### Mobile App Features:
- **Instant Alert Sync**: Receives updates from the PC simulation window in real-time.
- **Acoustic Siren Synthesizer**: Web Audio multi-frequency siren that blares even without external audio files.
- **Phone Haptic Vibration**: Vibrates the mobile device during Orange and Red danger alerts.
- **Nearest High-Ground Shelters**: Offline walking directions and evacuation compass guidance.
- **2G GSM SMS Broadcast Fallback**: Allows residents to broadcast distress SMS alerts when cellular data (4G/5G) is down.

---

## 🚀 Running the Project

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev

# 3. Build production bundle
npm run build

# 4. Generate signed Android APK
npm run build:apk
```
