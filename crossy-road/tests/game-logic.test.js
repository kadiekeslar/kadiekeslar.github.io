// Node provides the test runner and assertions that compare actual and expected results.
import { test } from "node:test";
import assert from "node:assert/strict";
// Import the three game rules so they can be tested without opening the browser.
import {
  getMoveTarget,
  findSupportingLog,
  hasVehicleCollision,
} from "../game-logic.js";

//start in column -1, lane 4, moving forward one lane should reach lane 5 in column -1
test("forward movement updates the lane and keeps the column", () => {
  assert.deepEqual(getMoveTarget(-1, 4, 0, 1), { nextX: -1, nextLane: 5 });
});

test("both outer columns are legal destinations", () => {
  // Move from each inner column onto the board edge. Both -3 and 3 must be reachable.
  assert.deepEqual(getMoveTarget(2, 1, 1, 0), { nextX: 3, nextLane: 1 });
  assert.deepEqual(getMoveTarget(-2, 1, -1, 0), { nextX: -3, nextLane: 1 });
});

test("movement beyond either outer column is rejected", () => {
  // From each board edge, another step outward would reach -4 or 4 and must be blocked.
  assert.equal(getMoveTarget(3, 1, 1, 0), null);
  assert.equal(getMoveTarget(-3, 1, -1, 0), null);
});

test("movement behind the starting lane is rejected", () => {
  // Lane 0 is the starting lane. A backward step from there would reach illegal lane -1.
  assert.equal(getMoveTarget(0, 0, 0, -1), null);
});

test("moving backward onto the starting lane is allowed", () => {
  // Moving from lane 1 back to lane 0 is valid, which checks the exact lower boundary.
  assert.deepEqual(getMoveTarget(0, 1, 0, -1), { nextX: 0, nextLane: 0 });
});

test("a river with no logs offers no support", () => {
  // An empty array represents a river with no logs. The function should return null.
  assert.equal(findSupportingLog(0, []), null);
});

test("log support includes the existing margin on both sides", () => {
  // A log of length 2 reaches 1 unit from its center, plus the existing 0.2 support margin.
  // Positions -1.19 and 1.19 are just inside that support range.
  const log = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(findSupportingLog(1.19, [log]), log);
  assert.equal(findSupportingLog(-1.19, [log]), log);
});

test("a player exactly at or beyond the log threshold is unsupported", () => {
  // The support rule requires a distance strictly below 1.2. Check the exact edge
  // on both sides and a point just outside it.
  const log = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(findSupportingLog(1.2, [log]), null);
  assert.equal(findSupportingLog(-1.2, [log]), null);
  assert.equal(findSupportingLog(1.21, [log]), null);
});

test("log search skips distant logs and returns the first supporting object", () => {
  // The player at x = 4 must be supported by the second log. The third also overlaps,
  // so checking object identity confirms the first matching log is returned.
  const distant = { position: { x: -10 }, userData: { length: 2 } };
  const supporting = { position: { x: 4 }, userData: { length: 2 } };
  const overlapping = { position: { x: 4.1 }, userData: { length: 2 } };
  const logs = [distant, supporting, overlapping];
  assert.equal(findSupportingLog(4, logs), supporting);
});

test("gaps between logs offer no support", () => {
  // The player at x = 0 is between the logs at -4 and 4, outside both support ranges.
  const logs = [
    { position: { x: -4 }, userData: { length: 2 } },
    { position: { x: 4 }, userData: { length: 2 } },
  ];
  assert.equal(findSupportingLog(0, logs), null);
});

test("vehicle collisions are detected on streets and bridges", () => {
  // Place the player at the same x position as a car. Check both lane types that carry traffic.
  const car = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(hasVehicleCollision(0, { type: "street", objects: [car] }), true);
  assert.equal(hasVehicleCollision(0, { type: "bridge", objects: [car] }), true);
});

test("a missing lane and empty traffic are safe", () => {
  // No lane, a null lane, and a street with zero cars should each report no collision.
  assert.equal(hasVehicleCollision(0, undefined), false);
  assert.equal(hasVehicleCollision(0, null), false);
  assert.equal(hasVehicleCollision(0, { type: "street", objects: [] }), false);
});

test("objects on plazas and rivers are not treated as vehicles", () => {
  // Even an object at the player position should report no vehicle collision on these lane types.
  const object = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(hasVehicleCollision(0, { type: "plaza", objects: [object] }), false);
  assert.equal(hasVehicleCollision(0, { type: "river", objects: [object] }), false);
});

test("vehicle collision includes the margin on both sides", () => {
  // A car of length 2 has a collision threshold of 1 + 0.3 = 1.3.
  // Positions -1.29 and 1.29 are just inside that threshold.
  const lane = {
    type: "street",
    objects: [{ position: { x: 0 }, userData: { length: 2 } }],
  };
  assert.equal(hasVehicleCollision(1.29, lane), true);
  assert.equal(hasVehicleCollision(-1.29, lane), true);
});

test("a player exactly at or beyond the car threshold is safe", () => {
  // The collision rule uses a strict comparison. At distance 1.3, or farther away,
  // the function should return false.
  const lane = {
    type: "street",
    objects: [{ position: { x: 0 }, userData: { length: 2 } }],
  };
  assert.equal(hasVehicleCollision(1.3, lane), false);
  assert.equal(hasVehicleCollision(-1.3, lane), false);
  assert.equal(hasVehicleCollision(1.31, lane), false);
});

test("collision search checks vehicles after the first one", () => {
  // The first car is far away. The player at x = 5 hits the second car,
  // while the player at x = 10 is clear of both cars.
  const lane = {
    type: "bridge",
    objects: [
      { position: { x: -10 }, userData: { length: 2 } },
      { position: { x: 5 }, userData: { length: 2 } },
    ],
  };
  assert.equal(hasVehicleCollision(5, lane), true);
  assert.equal(hasVehicleCollision(10, lane), false);
});

test("queries preserve their input objects", () => {
  // Freeze the input and its nested objects so attempted writes throw in this module.
  // Check both queries still return the expected answers and retain the input data.
  const object = Object.freeze({
    position: Object.freeze({ x: 3 }),
    userData: Object.freeze({ length: 2 }),
  });
  const objects = Object.freeze([object]);
  const lane = Object.freeze({ type: "bridge", objects });
  assert.equal(findSupportingLog(3, objects), object);
  assert.equal(hasVehicleCollision(3, lane), true);
  assert.equal(object.position.x, 3);
  assert.equal(object.userData.length, 2);
  assert.equal(lane.objects, objects);
});
