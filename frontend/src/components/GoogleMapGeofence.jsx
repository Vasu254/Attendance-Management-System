import { useEffect, useRef, useState } from "react";
import { FiCrosshair, FiExternalLink, FiMapPin, FiSearch, FiLayers, FiCompass } from "react-icons/fi";

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function GoogleMapGeofence({
  mode = "picker", // "picker" | "viewer"
  latitude,
  longitude,
  radiusMeters = 300,
  locationName = "",
  studentLatitude = null,
  studentLongitude = null,
  onChange, // ({ latitude, longitude, radius_meters, location_name })
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const studentMarkerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locating, setLocating] = useState(false);
  const [viewType, setViewType] = useState("interactive"); // "interactive" | "google_embed"

  const latNum = parseFloat(latitude) || null;
  const lngNum = parseFloat(longitude) || null;
  const radNum = parseFloat(radiusMeters) || 300;
  const studLatNum = parseFloat(studentLatitude) || null;
  const studLngNum = parseFloat(studentLongitude) || null;

  const distance =
    latNum && lngNum && studLatNum && studLngNum
      ? calculateDistance(latNum, lngNum, studLatNum, studLngNum)
      : null;

  const isWithinRadius = distance !== null ? distance <= radNum : null;

  // ─── Initialize Leaflet Map ──────────────────────────────────────────────────
  useEffect(() => {
    if (viewType !== "interactive" || !mapContainerRef.current) return;
    const L = window.L;
    if (!L) return;

    const initialLat = latNum || 20.5937;
    const initialLng = lngNum || 78.9629;
    const initialZoom = latNum && lngNum ? 16 : 5;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      if (mode === "picker" && onChange) {
        map.on("click", (e) => {
          const newLat = e.latlng.lat.toFixed(6);
          const newLng = e.latlng.lng.toFixed(6);
          onChange({
            latitude: newLat,
            longitude: newLng,
            radius_meters: radNum,
            location_name: locationName,
          });
        });
      }

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Update center marker & geofence circle
    if (latNum && lngNum) {
      if (markerRef.current) {
        markerRef.current.setLatLng([latNum, lngNum]);
      } else {
        const pinIcon = L.divIcon({
          className: "custom-map-pin",
          html: `<div style="background-color:#dc2626;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">📍</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        markerRef.current = L.marker([latNum, lngNum], {
          icon: pinIcon,
          draggable: mode === "picker",
        }).addTo(map);

        if (mode === "picker" && onChange) {
          markerRef.current.on("dragend", (e) => {
            const pos = e.target.getLatLng();
            onChange({
              latitude: pos.lat.toFixed(6),
              longitude: pos.lng.toFixed(6),
              radius_meters: radNum,
              location_name: locationName,
            });
          });
        }
      }

      if (circleRef.current) {
        circleRef.current.setLatLng([latNum, lngNum]);
        circleRef.current.setRadius(radNum);
      } else {
        circleRef.current = L.circle([latNum, lngNum], {
          radius: radNum,
          color: "#0d9488",
          fillColor: "#14b8a6",
          fillOpacity: 0.2,
          weight: 2,
          dashArray: "6, 6",
        }).addTo(map);
      }

      map.setView([latNum, lngNum], Math.max(map.getZoom(), 16));
    }

    // Student location marker
    if (studLatNum && studLngNum) {
      if (studentMarkerRef.current) {
        studentMarkerRef.current.setLatLng([studLatNum, studLngNum]);
      } else {
        const studentIcon = L.divIcon({
          className: "custom-student-pin",
          html: `<div style="background-color:#2563eb;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,0.4);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        studentMarkerRef.current = L.marker([studLatNum, studLngNum], {
          icon: studentIcon,
        }).addTo(map);
      }
    }
  }, [latNum, lngNum, radNum, studLatNum, studLngNum, mode, viewType]);

  // Clean up map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
        studentMarkerRef.current = null;
      }
    };
  }, []);

  // ─── Search Location via OpenStreetMap Geocoding ─────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const newLat = parseFloat(first.lat).toFixed(6);
        const newLng = parseFloat(first.lon).toFixed(6);
        const newName = first.display_name.split(",")[0] || searchQuery;
        if (onChange) {
          onChange({
            latitude: newLat,
            longitude: newLng,
            radius_meters: radNum,
            location_name: newName,
          });
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 17);
        }
      } else {
        setSearchError("Location not found. Try entering city or landmark.");
      }
    } catch {
      setSearchError("Search service unavailable.");
    } finally {
      setSearching(false);
    }
  };

  // ─── Use Current Location (GPS) ──────────────────────────────────────────────
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setSearchError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude.toFixed(6);
        const newLng = pos.coords.longitude.toFixed(6);
        if (onChange) {
          onChange({
            latitude: newLat,
            longitude: newLng,
            radius_meters: radNum,
            location_name: locationName || "My Current Location",
          });
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 17);
        }
        setLocating(false);
      },
      (err) => {
        setSearchError("Unable to acquire GPS position. Please check location permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const googleMapsUrl =
    latNum && lngNum
      ? `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`
      : "https://maps.google.com";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* ─── Top Control Bar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <FiMapPin className="text-red-600" size={16} />
          <span className="font-black text-slate-800">
            Google Maps Geofence Permission ({radNum}m Radius)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewType(viewType === "interactive" ? "google_embed" : "interactive")}
            className="flex items-center gap-1 font-bold text-slate-600 hover:text-brand"
          >
            <FiLayers size={13} />
            {viewType === "interactive" ? "Google Maps Embed" : "Interactive Map"}
          </button>
          {latNum && lngNum && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 font-bold text-blue-600 hover:underline"
            >
              Google Maps <FiExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* ─── Picker Toolbar (Search & Preset Radii) ───────────────────────── */}
      {mode === "picker" && (
        <div className="space-y-3 border-b border-slate-100 p-3 bg-white">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campus address, landmark or city..."
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:border-brand focus:outline-none"
              />
              <FiSearch className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search Map"}
            </button>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <FiCrosshair size={13} />
              {locating ? "GPS..." : "Use My Location"}
            </button>
          </form>

          {searchError && <p className="text-xs font-bold text-red-600">{searchError}</p>}

          {/* Quick Radius Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-500">Allowed Radius:</span>
            {[50, 100, 150, 200, 300].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() =>
                  onChange &&
                  onChange({
                    latitude,
                    longitude,
                    radius_meters: String(r),
                    location_name: locationName,
                  })
                }
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  Number(radNum) === r
                    ? "bg-teal-600 text-white ring-2 ring-teal-600 ring-offset-1"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {r}m {r === 300 ? "(Standard/Max)" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Map Rendering Container ────────────────────────────────────────── */}
      <div className="relative h-64 w-full bg-slate-100">
        {viewType === "interactive" ? (
          <div ref={mapContainerRef} className="h-full w-full z-0" />
        ) : latNum && lngNum ? (
          <iframe
            title="Google Maps"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={`https://maps.google.com/maps?q=${latNum},${lngNum}&z=16&output=embed`}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
            <FiCompass size={36} className="mb-2 text-slate-300" />
            <p className="text-xs font-bold">No location selected yet.</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Search an address or click "Use My Location" to define the 300m radius geofence.
            </p>
          </div>
        )}

        {/* Floating Distance Badge in Viewer Mode */}
        {mode === "viewer" && distance !== null && (
          <div
            className={`absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black shadow-md backdrop-blur-md ${
              isWithinRadius
                ? "bg-teal-900/90 text-teal-200 border border-teal-500/50"
                : "bg-red-900/90 text-red-200 border border-red-500/50"
            }`}
          >
            <span>{isWithinRadius ? "🟢 Inside Radius" : "🔴 Outside Radius"}</span>
            <span>·</span>
            <span>
              {distance}m from session location ({radNum}m max)
            </span>
          </div>
        )}
      </div>

      {/* ─── Footer Details ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
        <div>
          <span className="font-bold text-slate-800">
            {locationName || "Session Location"}
          </span>
          {latNum && lngNum && (
            <span className="ml-2 font-mono text-[11px] text-slate-500">
              ({latNum}, {lngNum})
            </span>
          )}
        </div>
        <div className="font-bold text-teal-700">Geofence Radius: {radNum} meters</div>
      </div>
    </div>
  );
}
