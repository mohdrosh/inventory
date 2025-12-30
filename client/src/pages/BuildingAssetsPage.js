// client/src/pages/BuildingAssetsPage.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE_URL } from '../config';

export default function BuildingAssetsPage() {
  const { buildingName } = useParams();
  const decodedName = decodeURIComponent(buildingName); // ✅ decode %20 → space
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/assets?building=${encodeURIComponent(decodedName)}`
        );
        const data = await response.json();
        setAssets(data);
      } catch (error) {
        console.error("Error fetching assets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [decodedName]);

  if (loading) return <div className="p-10 text-gray-500">Loading assets...</div>;

  if (!assets || assets.length === 0) {
    return (
      <div className="p-10 text-center text-gray-600">
        <h2 className="text-xl font-semibold mb-4">
          Building not found or no assets available
        </h2>
        <Link
          to="/"
          className="text-blue-600 hover:text-blue-800 font-medium underline"
        >
          Go Back
        </Link>
      </div>
    );
  }

  // Group by floor → then room
  const floors = {};
  assets.forEach((a) => {
    if (!floors[a.floor]) floors[a.floor] = {};
    if (!floors[a.floor][a.room]) floors[a.floor][a.room] = [];
    floors[a.floor][a.room].push(a);
  });

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        🏢 {decodedName}
      </h1>

      {Object.entries(floors).map(([floor, rooms]) => (
        <div key={floor} className="mb-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">{floor}</h2>
          {Object.entries(rooms).map(([room, roomAssets]) => (
            <div key={room} className="mb-6">
              <h3 className="text-lg text-gray-600 font-medium mb-3">
                Room {room}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {roomAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-white p-4 rounded-lg shadow hover:shadow-md transition"
                  >
                    <img
                      src={asset.image || "https://via.placeholder.com/200x150"}
                      alt={asset.name}
                      className="w-full h-40 object-cover rounded mb-3"
                    />
                    <div className="font-semibold text-gray-800 text-lg mb-1">
                      {asset.name}
                    </div>
                    <div className="text-base text-gray-500 mb-2">
                      ID: {asset.id}
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Type: {asset.type}</span>
                      <span>Status: {asset.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
