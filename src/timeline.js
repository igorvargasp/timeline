import React from "react";
import { ZoomIn, ZoomOut, Edit2, Check, X } from "react-feather";
import timelineItems from "./timelineItems.js";
import {assignLanes} from "./assignLanes.js";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function daysDiff(start, end) {
  return Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
}

function Timeline() {
  const [items, setItems] = React.useState(timelineItems);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [editingItem, setEditingItem] = React.useState(null);
  const [editName, setEditName] = React.useState('');
  const [draggedItem, setDraggedItem] = React.useState(null);
  const [dragOffset, setDragOffset] = React.useState(0);
  const timelineRef = React.useRef(null);
  
  // Calculate timeline bounds
  const allDates = items.flatMap(item => [item.start, item.end]);
  const minDate = new Date(Math.min(...allDates.map(d => new Date(d))));
  const maxDate = new Date(Math.max(...allDates.map(d => new Date(d))));
  const totalDays = daysDiff(minDate.toISOString().split('T')[0], maxDate.toISOString().split('T')[0]);
  
  // Assign items to lanes
  const lanes = assignLanes(items);
  
  const LANE_HEIGHT = 70;
  const TIMELINE_PADDING = 100;
  const AVAILABLE_WIDTH = 1200; // Base available width for timeline content
  const TIMELINE_WIDTH = (AVAILABLE_WIDTH * zoomLevel) + (TIMELINE_PADDING * 2);
  
  // Convert date to X position - spread across full available width
  const dateToX = React.useCallback((date) => {
    const dayOffset = daysDiff(minDate.toISOString().split('T')[0], date);
    const ratio = dayOffset / Math.max(totalDays, 1);
    return TIMELINE_PADDING + (ratio * AVAILABLE_WIDTH * zoomLevel);
  }, [minDate, totalDays, zoomLevel]);
  
  // Convert X position to date
  const xToDate = React.useCallback((x) => {
    const relativeX = x - TIMELINE_PADDING;
    const ratio = relativeX / (AVAILABLE_WIDTH * zoomLevel);
    const dayOffset = Math.round(ratio * totalDays);
    const newDate = new Date(minDate);
    newDate.setDate(newDate.getDate() + dayOffset);
    return newDate.toISOString().split('T')[0];
  }, [minDate, totalDays, zoomLevel]);
  
  // Handle zoom
  const handleZoom = (delta) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };
  
  // Handle name editing
  const startEditing = (item) => {
    setEditingItem(item.id);
    setEditName(item.name);
  };
  
  const saveEdit = () => {
    setItems(prev => prev.map(item => 
      item.id === editingItem ? { ...item, name: editName } : item
    ));
    setEditingItem(null);
    setEditName('');
  };
  
  const cancelEdit = () => {
    setEditingItem(null);
    setEditName('');
  };
  
  // Handle drag and drop
  const handleMouseDown = (e, item) => {
    if (editingItem) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const itemStart = dateToX(item.start);
    const itemEnd = dateToX(item.end);
    
    setDraggedItem(item);
    setDragOffset(x - itemStart);
    
    const handleMouseMove = (e) => {
      if (!draggedItem) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newStartX = x - dragOffset;
      const newStartDate = xToDate(newStartX);
      const duration = daysDiff(item.start, item.end) - 1;
      
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + duration);
      
      setItems(prev => prev.map(i => 
        i.id === item.id 
          ? { ...i, start: newStartDate, end: newEndDate.toISOString().split('T')[0] }
          : i
      ));
    };
    
    const handleMouseUp = () => {
      setDraggedItem(null);
      setDragOffset(0);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Generate time scale
  const generateTimeScale = () => {
    const scale = [];
    const current = new Date(minDate);
    const stepDays = Math.max(1, Math.floor(totalDays / 10)); // Aim for about 10 markers
    
    while (current <= maxDate) {
      const x = dateToX(current.toISOString().split('T')[0]);
      scale.push({
        x,
        date: current.toISOString().split('T')[0],
        label: formatDate(current.toISOString().split('T')[0])
      });
      current.setDate(current.getDate() + stepDays);
    }
    
    // Always include the end date
    if (scale.length === 0 || scale[scale.length - 1].date !== maxDate.toISOString().split('T')[0]) {
      const x = dateToX(maxDate.toISOString().split('T')[0]);
      scale.push({
        x,
        date: maxDate.toISOString().split('T')[0],
        label: formatDate(maxDate.toISOString().split('T')[0])
      });
    }
    
    return scale;
  };
  
  const timeScale = generateTimeScale();
  
  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Project Timeline</h1>
        <p className="text-gray-600">{items.length} items across {lanes.length} lanes</p>
      </div>
      
      {/* Controls */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-0.2)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <ZoomOut size={16} />
            Zoom Out
          </button>
          <span className="px-3 py-2 bg-gray-100 rounded font-mono text-sm">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.2)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <ZoomIn size={16} />
            Zoom In
          </button>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="border border-gray-200 rounded-lg overflow-auto bg-gray-50">
        <div
          ref={timelineRef}
          className="relative"
          style={{ 
            width: TIMELINE_WIDTH,
            height: lanes.length * LANE_HEIGHT + 80,
            minWidth: TIMELINE_WIDTH
          }}
        >
          {/* Time scale */}
          <div className="absolute top-0 left-0 h-12 bg-white border-b border-gray-200" style={{ width: TIMELINE_WIDTH }}>
            {timeScale.map((tick, index) => (
              <div
                key={index}
                className="absolute flex flex-col items-center"
                style={{ left: tick.x, transform: 'translateX(-50%)' }}
              >
                <div className="w-px h-3 bg-gray-400 mb-1"></div>
                <span className="text-xs text-gray-600 whitespace-nowrap">
                  {tick.label}
                </span>
              </div>
            ))}
          </div>
          
          {/* Grid lines */}
          {timeScale.map((tick, index) => (
            <div
              key={`grid-${index}`}
              className="absolute top-12 w-px bg-gray-200"
              style={{ 
                left: tick.x,
                height: lanes.length * LANE_HEIGHT + 20
              }}
            />
          ))}
          
          {/* Lane items */}
          {lanes.map((lane, laneIndex) => (
            <div key={laneIndex} className="absolute left-0" style={{
              top: 50 + laneIndex * LANE_HEIGHT,
              height: LANE_HEIGHT,
              width: TIMELINE_WIDTH
            }}>
              {lane.map((item) => {
                const startX = dateToX(item.start);
                const endX = dateToX(item.end);
                const duration = daysDiff(item.start, item.end);
                const width = Math.max(endX - startX, 120); // Minimum width for readability
                
                const colors = [
                  'bg-blue-500',
                  'bg-green-500', 
                  'bg-purple-500',
                  'bg-orange-500',
                  'bg-pink-500',
                  'bg-indigo-500',
                  'bg-red-500',
                  'bg-yellow-500'
                ];
                const colorClass = colors[item.id % colors.length];
                
                return (
                  <div
                    key={item.id}
                    className={`absolute ${colorClass} text-white rounded-lg shadow-md cursor-move hover:shadow-lg transition-all duration-200 flex items-center justify-between px-3 py-2 ${
                      draggedItem?.id === item.id ? 'opacity-70 z-10' : ''
                    }`}
                    style={{
                      left: startX,
                      width,
                      height: LANE_HEIGHT - 15,
                      top: 7
                    }}
                    onMouseDown={(e) => handleMouseDown(e, item)}
                    title={`${item.name} (${formatDate(item.start)} - ${formatDate(item.end)})`}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      {editingItem === item.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="bg-white text-gray-800 px-2 py-1 rounded text-sm w-full"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <div className="font-medium text-sm leading-tight mb-1 overflow-hidden">
                            <span className="block truncate">
                              {item.name}
                            </span>
                          </div>
                          <div className="text-xs opacity-90 leading-tight">
                            {duration === 1 
                              ? formatDate(item.start)
                              : `${formatDate(item.start)} - ${formatDate(item.end)}`
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {editingItem === item.id ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(item);
                          }}
                          className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          
          {/* Lane labels */}
          <div className="absolute left-2 top-12">
            {lanes.map((_, laneIndex) => (
              <div
                key={laneIndex}
                className="flex items-center justify-center text-xs font-medium text-gray-500"
                style={{
                  height: LANE_HEIGHT,
                  top: laneIndex * LANE_HEIGHT
                }}
              >
                Lane {laneIndex + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">How to use:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Use zoom controls to adjust timeline scale</li>
          <li>• Click the edit icon on any item to rename it</li>
          <li>• Items are automatically arranged in compact lanes</li>
          <li>• Scroll horizontally to see the full timeline</li>
        </ul>
      </div>
    </div>
  );
}

export default Timeline