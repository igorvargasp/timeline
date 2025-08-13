/**
 * Takes an array of items and assigns them to lanes based on start/end dates.
 * @returns an array of arrays containing items.
 */

export function assignLanes(items) {
  const sortedItems = items.sort((a, b) => new Date(a.start) - new Date(b.start));
  const lanes = [];
  
  function canFitInLane(item, lane) {
    if (lane.length === 0) return true;
    const lastItem = lane[lane.length - 1];
    const endDate = new Date(lastItem.end);
    const startDate = new Date(item.start);
    // Add buffer - items must be at least 1 day apart
    return startDate > endDate;
  }
  
  function assignItemToLane(item) {
    // Try to find the first available lane
    for (let i = 0; i < lanes.length; i++) {
      if (canFitInLane(item, lanes[i])) {
        lanes[i].push(item);
        return;
      }
    }
    // If no lane works, create a new one
    lanes.push([item]);
  }
  
  for (const item of sortedItems) {
    assignItemToLane(item);
  }
  
  return lanes;
}
