import { Game, Player, PlayerInfo } from "../src/core/game/Game";
import type { UnitType } from "../src/core/game/Game";
import { setup } from "./util/Setup";

let game: Game;
let player: Player;
let other: Player;

describe("PlayerImpl", () => {
  beforeEach(async () => {
    game = await setup("plains", { instantBuild: true }, [
      new PlayerInfo("player", "Human", null, "player_id"),
      new PlayerInfo("other", "Human", null, "other_id"),
    ]);

    player = game.player("player_id");
    other = game.player("other_id");

    player.conquer(game.ref(0, 0));
    other.conquer(game.ref(50, 50));
    player.addGold(BigInt(1000000));

    game.config().structureMinDist = () => 10;
  });

  test("City can be upgraded", () => {
    const city = player.buildUnit("City", game.ref(0, 0), {});
    const buCity = player
      .buildableUnits(game.ref(0, 0))
      .find((bu) => bu.type === "City");
    expect(buCity).toBeDefined();
    expect(buCity!.canUpgrade).toBe(city.id());
  });

  test("DefensePost cannot be upgraded", () => {
    player.buildUnit("DefensePost", game.ref(0, 0), {});
    const buDefensePost = player
      .buildableUnits(game.ref(0, 0))
      .find((bu) => bu.type === "DefensePost");
    expect(buDefensePost).toBeDefined();
    expect(buDefensePost!.canUpgrade).toBeFalsy();
  });

  test("City can be upgraded from another city", () => {
    const city = player.buildUnit("City", game.ref(0, 0), {});
    const cityToUpgrade = player.findUnitToUpgrade(
      "City",
      game.ref(0, 1),
    );
    expect(cityToUpgrade).toBeTruthy();
    if (cityToUpgrade === false) {
      return;
    }
    expect(cityToUpgrade.id()).toBe(city.id());
  });
  test("City cannot be upgraded when too far away", () => {
    player.buildUnit("City", game.ref(0, 0), {});
    const cityToUpgrade = player.findUnitToUpgrade(
      "City",
      game.ref(50, 50),
    );
    expect(cityToUpgrade).toBe(false);
  });
  test("Unit cannot be upgraded when not enough gold", () => {
    player.buildUnit("City", game.ref(0, 0), {});
    player.removeGold(BigInt(1000000));
    const cityToUpgrade = player.findUnitToUpgrade(
      "City",
      game.ref(0, 1),
    );
    expect(cityToUpgrade).toBe(false);
  });

  describe("units() type filtering", () => {
    beforeEach(() => {
      player.buildUnit("City", game.ref(0, 0), {});
      player.buildUnit("DefensePost", game.ref(11, 0), {});
      player.buildUnit("City", game.ref(0, 11), {});
      player.buildUnit("MissileSilo", game.ref(11, 11), {});
    });

    // Reference implementation: filter _units preserving insertion order.
    function expected(...types: UnitType[]) {
      const ts = new Set(types);
      return player.units().filter((u) => ts.has(u.type()));
    }

    test("single type returns matching units in insertion order", () => {
      expect(player.units("City")).toEqual(expected("City"));
      expect(player.units("City")).toHaveLength(2);
    });

    test("returns a fresh array, not the internal or shared buffer", () => {
      const a = player.units("City");
      const b = player.units("City");
      expect(a).not.toBe(b);
      expect(a).not.toBe(player.units());
      // Mutating one result must not affect a later query.
      a.length = 0;
      expect(player.units("City")).toHaveLength(2);
    });

    test("two and three types return the union in insertion order", () => {
      expect(player.units("City", "MissileSilo")).toEqual(
        expected("City", "MissileSilo"),
      );
      expect(
        player.units("City", "DefensePost", "MissileSilo"),
      ).toEqual(
        expected("City", "DefensePost", "MissileSilo"),
      );
      // Duplicate types don't duplicate results.
      expect(player.units("City", "City")).toEqual(
        expected("City"),
      );
    });

    test("array of types (Set path) and no match", () => {
      expect(
        player.units([
          "City",
          "DefensePost",
          "MissileSilo",
          "Port",
        ]),
      ).toEqual(
        expected("City", "DefensePost", "MissileSilo"),
      );
      expect(player.units("Port")).toEqual([]);
    });
  });

  test("Can't send alliance requests when dead", () => {
    // conquer other
    const otherTiles = other.tiles();
    for (const tile of otherTiles) {
      player.conquer(tile);
    }
    expect(other.canSendAllianceRequest(player)).toBe(false);
  });
});
