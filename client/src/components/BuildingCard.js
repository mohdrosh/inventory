// client/src/components/BuildingCard.js
import React from "react";
import { motion } from "framer-motion";

/*
 Booking-like building card
 props:
  - building: { id, name, image, rating, total, assets, lat, lon }
  - highlighted: boolean
  - onHover(isOver)
  - onShowOnMap()
*/

export default function BuildingCard({ building, highlighted, onHover = ()=>{}, onShowOnMap = ()=>{} }) {
  const thumbnail = building.image || `https://source.unsplash.com/600x400/?building,${encodeURIComponent(building.name)}`;

  return (
    <motion.div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`bg-white rounded-lg shadow-md border ${highlighted ? "ring-2 ring-blue-200" : ""}`}
    >
      <div className="flex">
        <img src={thumbnail} alt={building.name} className="w-48 h-36 object-cover rounded-l-lg" />
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-semibold text-slate-800">{building.name}</h3>
              <div className="text-right">
                <div className="inline-flex items-center bg-slate-100 px-2 py-1 rounded">
                  <span className="text-sm text-slate-700 font-semibold mr-2">{building.rating}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffd166"><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.402 8.168L12 18.897l-7.336 3.867 1.402-8.168L.132 9.21l8.2-1.192z"/></svg>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-600 mt-2 line-clamp-2">
              {building.total} tracked assets • {building.assets?.length ?? 0} inventory items
            </p>

            <div className="mt-3 text-sm text-slate-600">
              <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded text-xs mr-2">Available</span>
              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">Floors: { new Set((building.assets||[]).map(a=>a.floor)).size }</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => onShowOnMap(building.id)} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Show on map</button>
              <button className="px-3 py-2 border rounded-md text-sm hover:bg-slate-50">View details</button>
            </div>
            <div>
              <button className="p-2 rounded-full hover:bg-slate-100">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>favorite_border</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
