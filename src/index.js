import Phaser from "phaser";
import GameScene from "./main/game";
const config = {
  type: Phaser.AUTO,
  width: 1600,
  height: 720,
  scale: {
    mode: Phaser.Scale.HEIGHT_CONTROLS_WIDTH,
    parent: "game",
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: GameScene,
};

new Phaser.Game(config);
