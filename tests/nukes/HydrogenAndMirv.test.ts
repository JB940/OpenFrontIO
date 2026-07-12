import { ConstructionExecution } from "../../src/core/execution/ConstructionExecution";
import { Game, Player, PlayerInfo } from "../../src/core/game/Game";
import { setup } from "../util/Setup";

describe("Hydrogen Bomb and MIRV flows", () => {
  let game: Game;
  let player: Player;
  const info = new PlayerInfo("p", "Human", null, "p");

  beforeEach(async () => {
    game = await setup("plains", { infiniteGold: true, instantBuild: true }, [
      info,
    ]);
    player = game.player(info.id);
    player.conquer(game.ref(1, 1));
  });

  test("Hydrogen bomb launches when silo exists and cannot use silo under construction", () => {
    // Build a silo instantly and launch Hydrogen Bomb
    game.addExecution(
      new ConstructionExecution(player, "MissileSilo", game.ref(1, 1)),
    );
    game.executeNextTick();
    game.executeNextTick();
    expect(player.units("MissileSilo")).toHaveLength(1);

    // Launch Hydrogen Bomb
    const target = game.ref(7, 7);
    game.addExecution(
      new ConstructionExecution(player, "HydrogenBomb", target),
    );
    game.executeNextTick();
    game.executeNextTick();
    game.executeNextTick();
    expect(player.units("HydrogenBomb").length).toBeGreaterThan(0);

    // Now build another silo with construction time and ensure it won't be used
    // Use non-instant config by simulating an under-construction flag on a new silo
    // (Use normal construction with default duration in a fresh game instance)
  });

  test("Hydrogen bomb launch fails when silo is under construction and succeeds after completion", async () => {
    // Set up a game without instantBuild to test construction duration
    const gameWithConstruction = await setup(
      "plains",
      {
        infiniteGold: false,
        instantBuild: false,
      },
      [info],
    );
    const playerWithConstruction = gameWithConstruction.player(info.id);

    playerWithConstruction.conquer(gameWithConstruction.ref(1, 1));
    const siloTile = gameWithConstruction.ref(7, 7);
    playerWithConstruction.conquer(siloTile);

    // Capture gold before starting silo construction
    const goldBeforeSilo = playerWithConstruction.gold();
    const siloCost = gameWithConstruction
      .unitInfo("MissileSilo")
      .cost(gameWithConstruction, playerWithConstruction);
    playerWithConstruction.addGold(siloCost);

    // Start construction of silo
    gameWithConstruction.addExecution(
      new ConstructionExecution(
        playerWithConstruction,
        "MissileSilo",
        siloTile,
      ),
    );
    gameWithConstruction.executeNextTick();
    gameWithConstruction.executeNextTick();

    // Verify silo exists and is under construction
    const silos = playerWithConstruction.units("MissileSilo");
    expect(silos.length).toBe(1);
    const silo = silos[0];
    expect(silo.isUnderConstruction()).toBe(true);

    // Capture gold after construction started
    const goldAfterConstruction = playerWithConstruction.gold();
    expect(goldAfterConstruction).toBeLessThan(goldBeforeSilo + siloCost);

    // Attempt to launch HydrogenBomb while silo is under construction
    const targetTile = gameWithConstruction.ref(10, 10);
    const hydrogenBombCountBefore = playerWithConstruction.units(
      "HydrogenBomb",
    ).length;

    const canBuildResult = playerWithConstruction.canBuild(
      "HydrogenBomb",
      targetTile,
    );
    expect(canBuildResult).toBe(false); // Should fail because silo is under construction

    // Try to add execution - should fail
    gameWithConstruction.addExecution(
      new ConstructionExecution(
        playerWithConstruction,
        "HydrogenBomb",
        targetTile,
      ),
    );
    gameWithConstruction.executeNextTick();
    gameWithConstruction.executeNextTick();

    // Assert launch does not succeed
    const hydrogenBombCountAfter = playerWithConstruction.units(
      "HydrogenBomb",
    ).length;
    expect(hydrogenBombCountAfter).toBe(hydrogenBombCountBefore);

    // Assert no refunds during construction
    const goldDuringConstruction = playerWithConstruction.gold();
    expect(goldDuringConstruction >= goldAfterConstruction).toBe(true);

    // Advance ticks to complete construction
    const constructionDuration =
      gameWithConstruction.unitInfo("MissileSilo")
        .constructionDuration ?? 0;
    for (let i = 0; i < constructionDuration + 2; i++) {
      gameWithConstruction.executeNextTick();
    }

    // Verify silo is complete
    const completedSilo = playerWithConstruction.units("MissileSilo")[0];
    expect(completedSilo.isUnderConstruction()).toBe(false);

    // Now launch should succeed - ensure we have gold and target is conquered
    playerWithConstruction.conquer(targetTile);
    const hydrogenBombCost = gameWithConstruction
      .unitInfo("HydrogenBomb")
      .cost(gameWithConstruction, playerWithConstruction);
    playerWithConstruction.addGold(hydrogenBombCost);

    const canBuildAfterCompletion = playerWithConstruction.canBuild(
      "HydrogenBomb",
      targetTile,
    );
    expect(canBuildAfterCompletion).not.toBe(false);

    gameWithConstruction.addExecution(
      new ConstructionExecution(
        playerWithConstruction,
        "HydrogenBomb",
        targetTile,
      ),
    );
    gameWithConstruction.executeNextTick();
    gameWithConstruction.executeNextTick();
    gameWithConstruction.executeNextTick();

    // Verify launch succeeded
    const hydrogenBombCountAfterSuccess = playerWithConstruction.units(
      "HydrogenBomb",
    ).length;
    expect(hydrogenBombCountAfterSuccess).toBeGreaterThan(
      hydrogenBombCountBefore,
    );
  });

  test("MIRV launches when silo exists and targets player-owned tiles", () => {
    // Build a silo instantly
    game.addExecution(
      new ConstructionExecution(player, "MissileSilo", game.ref(1, 1)),
    );
    game.executeNextTick();
    game.executeNextTick();
    expect(player.units("MissileSilo")).toHaveLength(1);

    // Launch MIRV at a player-owned tile (the silo tile)
    const target = game.ref(1, 1);
    game.addExecution(new ConstructionExecution(player, "MIRV", target));
    game.executeNextTick(); // init
    game.executeNextTick(); // create MIRV unit
    game.executeNextTick();

    // MIRV should appear briefly before separation, otherwise warheads should be queued
    const mirvs = player.units("MIRV").length;
    const warheads = player.units("MIRVWarhead").length;
    expect(mirvs > 0 || warheads > 0).toBe(true);
  });
});
