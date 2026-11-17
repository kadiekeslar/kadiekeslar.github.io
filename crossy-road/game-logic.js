export function getMoveTarget(currentGridX, currentLaneIndex, dx, laneMove) {
  const nextX = currentGridX + dx;
  const nextLane = currentLaneIndex + laneMove;

  // Keep the player near the middle so the buildings stay visible.
  if (Math.abs(nextX) > 3 || nextLane < 0) {
    return null;
  }

  return { nextX, nextLane };
}

export function findSupportingLog(playerX, logs) {
  for (const log of logs) {
    if (Math.abs(log.position.x - playerX) < log.userData.length / 2 + 0.2) {
      return log;
    }
  }

  return null;
}

export function hasVehicleCollision(playerX, lane) {
  if (!lane || (lane.type !== "street" && lane.type !== "bridge")) {
    return false;
  }

  for (const car of lane.objects) {
    if (Math.abs(playerX - car.position.x) < car.userData.length / 2 + 0.3) {
      return true;
    }
  }

  return false;
}
