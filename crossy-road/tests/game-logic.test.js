import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getMoveTarget,
  findSupportingLog,
  hasVehicleCollision,
} from "../game-logic.js";

test("forward movement updates the lane and keeps the column", () => {
  assert.deepEqual(getMoveTarget(-1, 4, 0, 1), { nextX: -1, nextLane: 5 });
});

test("both outer columns are legal destinations", () => {
  assert.deepEqual(getMoveTarget(2, 1, 1, 0), { nextX: 3, nextLane: 1 });
  assert.deepEqual(getMoveTarget(-2, 1, -1, 0), { nextX: -3, nextLane: 1 });
});

test("movement beyond either outer column is rejected", () => {
  assert.equal(getMoveTarget(3, 1, 1, 0), null);
  assert.equal(getMoveTarget(-3, 1, -1, 0), null);
});

test("movement behind the starting lane is rejected", () => {
  assert.equal(getMoveTarget(0, 0, 0, -1), null);
});

test("moving backward onto the starting lane is allowed", () => {
  assert.deepEqual(getMoveTarget(0, 1, 0, -1), { nextX: 0, nextLane: 0 });
});

test("a river with no logs offers no support", () => {
  assert.equal(findSupportingLog(0, []), null);
});

test("log support includes the existing margin on both sides", () => {
  const log = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(findSupportingLog(1.19, [log]), log);
  assert.equal(findSupportingLog(-1.19, [log]), log);
});

test("a player exactly at or beyond the log threshold is unsupported", () => {
  const log = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(findSupportingLog(1.2, [log]), null);
  assert.equal(findSupportingLog(-1.2, [log]), null);
  assert.equal(findSupportingLog(1.21, [log]), null);
});

test("log search skips distant logs and returns the first supporting object", () => {
  const distant = { position: { x: -10 }, userData: { length: 2 } };
  const supporting = { position: { x: 4 }, userData: { length: 2 } };
  const overlapping = { position: { x: 4.1 }, userData: { length: 2 } };
  const logs = [distant, supporting, overlapping];
  assert.equal(findSupportingLog(4, logs), supporting);
});

test("gaps between logs offer no support", () => {
  const logs = [
    { position: { x: -4 }, userData: { length: 2 } },
    { position: { x: 4 }, userData: { length: 2 } },
  ];
  assert.equal(findSupportingLog(0, logs), null);
});

test("vehicle collisions are detected on streets and bridges", () => {
  const car = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(hasVehicleCollision(0, { type: "street", objects: [car] }), true);
  assert.equal(hasVehicleCollision(0, { type: "bridge", objects: [car] }), true);
});

test("a missing lane and empty traffic are safe", () => {
  assert.equal(hasVehicleCollision(0, undefined), false);
  assert.equal(hasVehicleCollision(0, null), false);
  assert.equal(hasVehicleCollision(0, { type: "street", objects: [] }), false);
});

test("objects on plazas and rivers are not treated as vehicles", () => {
  const object = { position: { x: 0 }, userData: { length: 2 } };
  assert.equal(hasVehicleCollision(0, { type: "plaza", objects: [object] }), false);
  assert.equal(hasVehicleCollision(0, { type: "river", objects: [object] }), false);
});

test("vehicle collision includes the margin on both sides", () => {
  const lane = {
    type: "street",
    objects: [{ position: { x: 0 }, userData: { length: 2 } }],
  };
  assert.equal(hasVehicleCollision(1.29, lane), true);
  assert.equal(hasVehicleCollision(-1.29, lane), true);
});

test("a player exactly at or beyond the car threshold is safe", () => {
  const lane = {
    type: "street",
    objects: [{ position: { x: 0 }, userData: { length: 2 } }],
  };
  assert.equal(hasVehicleCollision(1.3, lane), false);
  assert.equal(hasVehicleCollision(-1.3, lane), false);
  assert.equal(hasVehicleCollision(1.31, lane), false);
});

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
