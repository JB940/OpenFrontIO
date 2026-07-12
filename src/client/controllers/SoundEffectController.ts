import { EventBus } from "../../core/EventBus";
import { GameUpdateType } from "../../core/game/GameUpdates";
import { Controller } from "../Controller";
import { PlaySoundEffectEvent, SoundEffect } from "../sound/Sounds";
import { GameView, UnitView } from "../view";

export class SoundEffectController implements Controller {
  constructor(
    private readonly game: GameView,
    private readonly eventBus: EventBus,
  ) {}

  tick(): void {
    const updates = this.game.updatesSinceLastTick();
    if (!updates) return;

    for (const u of updates[GameUpdateType.Unit] ?? []) {
      const unit = this.game.unit(u.id);
      if (unit === undefined) continue;
      this.handleUnit(unit);
    }

    const myPlayer = this.game.myPlayer();
    if (myPlayer === null) return;
    for (const c of updates[GameUpdateType.ConquestEvent] ?? []) {
      if (c.conquerorId === myPlayer.id()) {
        this.emit("ka-ching");
      }
    }
  }

  private handleUnit(unit: UnitView): void {
    if (unit.isActive() && unit.createdAt() === this.game.ticks()) {
      this.onCreated(unit);
    }
    switch (unit.type()) {
      case "AtomBomb":
      case "MIRVWarhead":
        this.onNukeDetonation(unit, "atom-hit");
        break;
      case "HydrogenBomb":
        this.onNukeDetonation(unit, "hydrogen-hit");
        break;
    }
  }

  private onCreated(unit: UnitView): void {
    const myPlayer = this.game.myPlayer();
    switch (unit.type()) {
      case "AtomBomb":
        this.emit("atom-launch");
        break;
      case "HydrogenBomb":
        this.emit("hydrogen-launch");
        break;
      case "MIRV":
        this.emit("mirv-launch");
        break;
      case "Warship":
        if (unit.owner() === myPlayer) this.emit("build-warship");
        break;
      case "City":
        if (unit.owner() === myPlayer) this.emit("build-city");
        break;
      case "Port":
        if (unit.owner() === myPlayer) this.emit("build-port");
        break;
      case "DefensePost":
        if (unit.owner() === myPlayer) this.emit("build-defense-post");
        break;
      case "SAMLauncher":
        if (unit.owner() === myPlayer) this.emit("sam-built");
        break;
    }
  }

  private onNukeDetonation(unit: UnitView, sound: SoundEffect): void {
    if (unit.isActive()) return;
    if (!unit.reachedTarget()) return;
    this.emit(sound);
  }

  private emit(sound: SoundEffect): void {
    this.eventBus.emit(new PlaySoundEffectEvent(sound));
  }
}
