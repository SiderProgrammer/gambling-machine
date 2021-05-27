import config from "./config";
export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }
  preload() {
    // could be in preloader scene if needed
    this.load.image("machine", "src/assets/machine.png");
    this.load.image("btn_spin", "src/assets/btn_spin.png");
    this.load.image("symbols", "src/assets/symbols.png");
    this.load.image("mask", "src/assets/mask.png");
    this.load.image("star", "src/assets/star.png");
  }

  create() {
    this.paylines = config.paylines;
    this.payvalues = config.payValues;
    this.credits = config.credits;
    this.betValue = config.betValue;

    this.wildIndex = 0; // wild image index
    this.GW = this.renderer.width;
    this.GH = this.renderer.height;
    this.canSpin = true;

    this.itemsSlots = []; // columns
    this.middleRowIndexes = [];
    this.paylinesGraphics = [];

    this.itemsMarginY = 55;
    this.itemsAmount = 13;
    this.slotsGap = 170;
    this.itemHeight = 134;
    this.leftSlotX = this.GW / 2 - this.slotsGap * 2;

    this.createMachineBackground();
    this.createCreditsText();

    this.createItemsSlots();

    this.createSpinButton();
  }

  spin() {
    this.refresh();

    //this.middleRowIndexes = [3, 1, 1, 3, 3]; // predefine middle indexes
    // or
    this.drawMiddleRow(); // draw middle indexes

    for (let i = 0; i < 5; i++) {
      this.initSlotAnimation(this.itemsSlots[i]);
    }
  }
  refresh() {
    if (this.star) this.star.destroy();
    this.paylinesGraphics.forEach((g) => g.destroy());
    clearInterval(this.paylinesInterval); // could be phaser timer

    this.credits -= this.betValue;
    this.creditsText.update();
  }
  createCreditsText() {
    this.creditsText = this.add
      .text(this.GW / 2, 0, `Credits ${this.credits}`, {
        font: "40px Arial ",
        color: "#fff",
      })
      .setOrigin(0.5, 0);

    this.creditsText.update = () => {
      this.creditsText.setText(`Credits ${this.credits}`);
    };
  }

  createMachineBackground() {
    this.add.image(this.GW / 2, this.GH / 2, "machine");
  }
  createItemsSlots() {
    const mask = new Phaser.Display.Masks.BitmapMask(
      this,
      this.add
        .sprite(800, this.GH / 2 + this.itemsMarginY, "mask")
        .setVisible(false)
    );

    for (let i = 0; i < 5; i++) {
      const slotItems = this.add.tileSprite(
        this.leftSlotX + this.slotsGap * i,
        this.GH / 2 +
          this.itemsMarginY +
          this.itemHeight * Math.round(7 * Math.random()),
        this.itemHeight,
        5226, // 3*symbols height // could be taken variable from config
        "symbols"
      );

      slotItems.id = i;
      slotItems.setMask(mask);
      this.itemsSlots.push(slotItems);
    }
  }

  createSpinButton() {
    this.add
      .image(this.GW / 2, this.GH, "btn_spin")
      .setOrigin(0.5, 1)
      .setScale(0.7)
      .setInteractive()
      .on("pointerdown", () => {
        if (!this.canSpin) return;
        this.canSpin = false;
        this.spin();
      });
  }
  drawMiddleRow() {
    for (let i = 0; i < 5; i++) {
      this.middleRowIndexes[i] = Math.floor(10 * Math.random());
    }
  }

  initSlotAnimation(slot) {
    this.tweens.add({
      targets: slot,
      y: "+=400",
      duration: 800,
      ease: "Back.easeIn",
      onComplete: () => {
        this.animateTheSlot(slot);
      },
    });
  }

  animateTheSlot(slot) {
    slot.y = this.itemHeight;

    this.tweens.add({
      targets: slot,
      y: 1474,
      duration: 500,
      ease: "Linear",
      loop: 2,
      onComplete: () => {
        slot.y = this.getCorrectSlotY("start", slot.id);

        this.tweens.add({
          targets: slot,
          y: "+=500",
          duration: 800,
          ease: "Back.easeOut",
          onComplete: () => {
            if (slot.id == 4) {
              this.checkForWinningCombinations();
              this.canSpin = true;
            }
          },
        });
      },
    });
  }

  getCorrectSlotY(instruction, column) {
    let y =
      -(
        (
          this.GH / 2 +
          this.itemHeight * this.middleRowIndexes[column] -
          this.itemsMarginY / 1.5 +
          (3 * this.itemHeight) / 2
        ) // fix Y; worked with 10 items, when I changed to 13, I had to add this line
      ) +
      this.itemHeight * this.itemsAmount;

    if (instruction === "start") {
      y -= 500;
    }

    return y;
  }

  checkForWinningCombinations() {
    const winningCombinations = [];
    const winningPaylinesIndexes = [];
    const winningIndexes = [];

    this.paylines.forEach((payline, k) => {
      // check each payline

      winningCombinations[k] = [];

      for (let i = 0; i < this.itemsAmount; i++) {
        // check each item index

        const indexToMatch = i;
        let amount = 0;

        for (let j = 0; j < 5; j++) {
          // check each column

          let indexToCompare = this.middleRowIndexes[j];

          const coordRow = payline[j][0]; // row coordinate

          if (coordRow == 0) {
            indexToCompare--;
            if (indexToCompare < 0) indexToCompare = this.itemsAmount - 1;
          } else if (coordRow == 2) {
            indexToCompare++;
            if (indexToCompare > this.itemsAmount - 1) indexToCompare = 0;
          }

          if (
            indexToCompare != indexToMatch &&
            indexToCompare != this.wildIndex
          ) {
            // pay values starts from > 2 correct positions
            if (amount <= 2) winningCombinations[k] = []; // reset winning combinations
            break;
          }

          winningCombinations[k][j] = payline[j];
          amount++;
        }

        // pay values starts from > 2 correct positions
        if (amount > 2) {
          winningIndexes.push({ i, amount });
          winningPaylinesIndexes.push(k);

          break; // if payline has matching index then stop checking it
        }
      }
    });
    this.updateCredits(winningIndexes);
    this.indicateWinningCombinations(winningCombinations);
    this.indicateWinningPaylines(winningPaylinesIndexes);
  }
  updateCredits(winningIndexes) {
    winningIndexes.forEach((index) => {
      const { amount, i } = index;

      this.credits += this.payvalues[i][amount - 1] * this.betValue;
    });

    this.creditsText.update();
  }
  calculateItemGapByCoordRow(coordRow) {
    if (coordRow == 0) {
      return -this.itemHeight;
    } else if (coordRow == 2) {
      return this.itemHeight;
    } else {
      return 0;
    }
  }
  indicateWinningCombinations(winningCombinations) {
    this.star = this.add.particles("star");

    winningCombinations.forEach((comb) => {
      comb.forEach((coord) => {
        this.createCombinationIndication(coord);
      });
    });
  }

  createCombinationIndication(coord) {
    // coord stands for coordinates
    const [coordRow, coordColumn] = coord;

    let x = this.leftSlotX + this.slotsGap * coordColumn - 47; // 47 is margin to fit
    let y = this.GH / 2; // 31 is margin to fit

    y += this.calculateItemGapByCoordRow(coordRow);

    const particlesArea = new Phaser.Geom.Rectangle(x, y, 94, 94);

    this.star.createEmitter({
      lifespan: 900,
      speed: {
        min: 10,
        max: 30,
      },
      scale: {
        start: 1,
        end: 0,
      },
      emitZone: {
        type: "edge",
        source: particlesArea,
        quantity: 60,
      },
      blendMode: "ADD",
    });
  }

  indicateWinningPaylines(winningPaylinesIndexes) {
    const winningPaylines = winningPaylinesIndexes.map(
      (index) => this.paylines[index]
    );

    this.paylinesGraphics = [];

    winningPaylines.forEach((comb) => {
      // check each combination
      this.paylinesGraphics.push(this.createPaylineIndication(comb));
    });

    this.handleWinningPaylinesVisibility(this.paylinesGraphics);
  }

  createPaylineIndication(comb) {
    const graphics = this.add.graphics().setVisible(false);
    graphics.lineStyle(10, 0x2ecc40);
    graphics.beginPath();

    let isFirstIteration = true;

    comb.forEach((coord) => {
      const [coordRow, coordColumn] = coord;

      let x = this.leftSlotX + this.slotsGap * coordColumn;
      let y = this.GH / 2;

      y += this.calculateItemGapByCoordRow(coordRow);

      if (isFirstIteration) graphics.moveTo(x, y + 50);
      isFirstIteration = false;
      graphics.lineTo(x, y + 50);
    });

    graphics.strokePath();

    return graphics;
  }
  handleWinningPaylinesVisibility(paylines) {
    let i = 0;
    let isShown = false; // needed when there is only one winning combination

    const handleOneWinningCombination = () => {
      if (isShown) {
        paylines[0].setVisible(false);
        isShown = false;
      } else {
        paylines[0].setVisible(true);
        isShown = true;
      }
    };

    if (paylines.length > 0) {
      //could be phaser timer
      this.paylinesInterval = setInterval(() => {
        paylines[i].setVisible(true);
        if (paylines[i - 1]) paylines[i - 1].setVisible(false);
        if (i - 1 < 0) paylines[paylines.length - 1].setVisible(false); // check if exists and hide previous payline
        i++;
        if (i > paylines.length - 1) i = 0; // start from beggining

        if (paylines.length == 1) {
          handleOneWinningCombination();
        }
      }, 1000);
    }
  }
}
