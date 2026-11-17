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

//move from column 2 to 3 and from -2 to -3, both outer columns should be allowed
test("both outer columns are legal destinations", () => {
  assert.deepEqual(getMoveTarget(2, 1, 1, 0), { nextX: 3, nextLane: 1 });
  assert.deepEqual(getMoveTarget(-2, 1, -1, 0), { nextX: -3, nextLane: 1 });
});

//move outward from columns 3 and -3, both moves should return null because they go past the edges
test("movement beyond either outer column is rejected", () => {
  assert.equal(getMoveTarget(3, 1, 1, 0), null);
  assert.equal(getMoveTarget(-3, 1, -1, 0), null);
});

//move backward from lane 0, the move should return null because lane -1 is behind the start
test("movement behind the starting lane is rejected", () => {
  assert.equal(getMoveTarget(0, 0, 0, -1), null);
});

//move backward from lane 1, the player should reach lane 0 in the same column
test("moving backward onto the starting lane is allowed", () => {
  assert.deepEqual(getMoveTarget(0, 1, 0, -1), { nextX: 0, nextLane: 0 });
});

//give the function an empty log list, it should return null because there is no support
test("a river with no logs offers no support", () => {
  assert.equal(findSupportingLog(0, []), null);
});

//use a log of length 2 with a 0.2 margin, positions 1.19 and -1.19 should both be supported
test("log support includes the existing margin on both sides", () => {
  const log = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(findSupportingLog(1.19, [log]), log);
  assert.equal(findSupportingLog(-1.19, [log]), log);
});

//check positions 1.2, -1.2 and 1.21, each should return null because support requires a distance below 1.2
test("a player exactly at or beyond the log threshold is unsupported", () => {
  const log = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(findSupportingLog(1.2, [log]), null);
  assert.equal(findSupportingLog(-1.2, [log]), null);
  assert.equal(findSupportingLog(1.21, [log]), null);
});

//put the player at x = 4, the function should skip the distant log and return the first log that supports the player
test("log search skips distant logs and returns the first supporting object", () => {
  const distant = { position: { x: -10 }, userData: { length: 2 } };
  const supporting = { position: { x: 4 }, userData: { length: 2 } };
  const overlapping = { position: { x: 4.1 }, userData: { length: 2 } };
  const logs = [distant, supporting, overlapping];
  assert.equal(findSupportingLog(4, logs), supporting);
});

//put logs at -4 and 4 with the player at 0, the gap should leave the player unsupported
test("gaps between logs offer no support", () => {
  const logs = [
    { position: { x: -4 }, userData: { length: 2 } },
    { position: { x: 4 }, userData: { length: 2 } },
  ];
  assert.equal(findSupportingLog(0, logs), null);
});

//put a car and the player at x = 0, both a street and a bridge should report a collision
test("vehicle collisions are detected on streets and bridges", () => {
  const car = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(hasVehicleCollision(0, { type: "street", objects: [car] }), true);
  assert.equal(hasVehicleCollision(0, { type: "bridge", objects: [car] }), true);
});

//check undefined, null and a street with no cars, each should return false
test("a missing lane and empty traffic are safe", () => {
  assert.equal(hasVehicleCollision(0, undefined), false);
  assert.equal(hasVehicleCollision(0, null), false);
  assert.equal(hasVehicleCollision(0, { type: "street", objects: [] }), false);
});

//put an object at the player position on a plaza and a river, both should return false for vehicle collision
test("objects on plazas and rivers are not treated as vehicles", () => {
  const object = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(hasVehicleCollision(0, { type: "plaza", objects: [object] }), false);
  assert.equal(hasVehicleCollision(0, { type: "river", objects: [object] }), false);
});

//use a car of length 2 with a 0.3 margin, positions 1.29 and -1.29 should both report a collision
test("vehicle collision includes the margin on both sides", () => {
  const lane = {
    type: "street",
    objects: [{ position: { x: 0 }, userData: { length: 2 } }],
  };
  assert.equal(hasVehicleCollision(1.29, lane), true);
  assert.equal(hasVehicleCollision(-1.29, lane), true);
});

//check positions 1.3, -1.3 and 1.31, each should return false because a collision requires a distance below 1.3
test("a player exactly at or beyond the car threshold is safe", () => {
  const lane = {
    type: "street",
    objects: [{ position: { x: 0 }, userData: { length: 2 } }],
  };
  assert.equal(hasVehicleCollision(1.3, lane), false);
  assert.equal(hasVehicleCollision(-1.3, lane), false);
  assert.equal(hasVehicleCollision(1.31, lane), false);
});

//put cars at -10 and 5, the player at 5 should hit the second car and the player at 10 should be clear
test("collision search checks vehicles after the first one", () => {
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

//freeze the objects and lists, both functions should give the expected results and keep the input data intact
test("queries preserve their input objects", () => {
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
