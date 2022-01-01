var config = {
    type: Phaser.AUTO,
    parent: "phaser-example",
    width: 800,
    height: 600,
    backgroundColor: "#3a2e3f",
    physics: {
        default: "arcade",
        arcade: {
            debug: false,
            gravity: { y: 0 },
        },
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
};
var game = new Phaser.Game(config);
function preload() {
    this.load.image("ship", "assets/enemyBlack3.png");
    this.load.image("otherPlayer", "assets/enemyBlack1.png");
    this.load.image("meteor", "assets/meteorBrown_big4.png");
    this.load.image("star1", "assets/effects/star1.png");
    this.load.image("star2", "assets/effects/star2.png");
    this.load.image("star3", "assets/effects/star3.png");
}
function create() {
    var self = this;
    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.socket.on("currentPlayers", function (players) {
        Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayers(self, players[id]);
            }
        });
    });
    this.socket.on("newPlayer", function (playerInfo) {
        addOtherPlayers(self, playerInfo);
    });
    this.socket.on("disconnect", function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });

    this.cursors = this.input.keyboard.createCursorKeys();

    this.socket.on("playerMoved", function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
            }
        });
    });

    this.blueScoreText = this.add.text(16, 16, "", {
        fontSize: "32px",
        fill: "#0000FF",
    });
    this.redScoreText = this.add.text(584, 16, "", {
        fontSize: "32px",
        fill: "#FF0000",
    });

    this.socket.on("scoreUpdate", function (scores) {
        self.blueScoreText.setText("Blue: " + scores.blue);
        self.redScoreText.setText("Red: " + scores.red);
    });

    this.socket.on("meteorLocation", function (meteorLocation) {
        if (self.meteor) self.meteor.destroy();
        self.meteor = self.physics.add.image(
            meteorLocation.x,
            meteorLocation.y,
            "meteor"
        );
        self.physics.add.overlap(
            self.ship,
            self.meteor,
            function () {
                this.socket.emit("meteorCollected");
            },
            null,
            self
        );
    });

    createStarsBG(this);
}
function update() {
    if (this.ship) {
        if (this.cursors.left.isDown) {
            this.ship.setAngularVelocity(-150);
        } else if (this.cursors.right.isDown) {
            this.ship.setAngularVelocity(150);
        } else {
            this.ship.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
            this.physics.velocityFromRotation(
                this.ship.rotation + 1.5,
                100,
                this.ship.body.acceleration
            );
        } else {
            this.ship.setAcceleration(0);
        }

        this.physics.world.wrap(this.ship, 5);

        // emit player movement
        var x = this.ship.x;
        var y = this.ship.y;
        var r = this.ship.rotation;
        if (
            this.ship.oldPosition &&
            (x !== this.ship.oldPosition.x ||
                y !== this.ship.oldPosition.y ||
                r !== this.ship.oldPosition.rotation)
        ) {
            this.socket.emit("playerMovement", {
                x: this.ship.x,
                y: this.ship.y,
                rotation: this.ship.rotation,
            });
        }
        // save old position data
        this.ship.oldPosition = {
            x: this.ship.x,
            y: this.ship.y,
            rotation: this.ship.rotation,
        };
    }
}

function addPlayer(self, playerInfo) {
    self.ship = self.physics.add
        .image(playerInfo.x, playerInfo.y, "ship")
        .setOrigin(0.5, 0.5)
        .setDisplaySize(53, 40);
    if (playerInfo.team === "blue") {
        self.ship.setTint(0x03adfc, 0x0380fc, 0x034afc, 0x0314fc);
    } else {
        self.ship.setTint(0xfc036f, 0xfc032d, 0xfc3103, 0xfc5603);
    }
    self.ship.setDrag(100);
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.add
        .sprite(playerInfo.x, playerInfo.y, "otherPlayer")
        .setOrigin(0.5, 0.5)
        .setDisplaySize(53, 40);
    if (playerInfo.team === "blue") {
        otherPlayer.setTint(0x03adfc, 0x0380fc, 0x034afc, 0x0314fc);
    } else {
        otherPlayer.setTint(0xfc036f, 0xfc032d, 0xfc3103, 0xfc5603);
    }
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}

function createStarsBG(self) {
    const numberOfStars = 40;
    for (let i = 0; i < numberOfStars; i++) {
        const randomStarNumber = Math.random();
        let randomStar;
        if (randomStarNumber > 0.666) randomStar = "star1";
        else if (randomStarNumber > 0.333) randomStar = "star2";
        else randomStar = "star3";

        const randomX = Math.random() * 800;
        const randomY = Math.random() * 600;
        const star = self.add.image(randomX, randomY, randomStar).setScale(.5).setAlpha(0.1);
        if(randomStar === "star3") star.setScale(0.25);
    }
}
