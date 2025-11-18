const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
// const startGameButton = document.getElementById('startGameButton'); // Removed, difficulty buttons will act as start buttons
const easyBtn = document.getElementById('easyBtn');
const mediumBtn = document.getElementById('mediumBtn');
const hardBtn = document.getElementById('hardBtn');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Image assets
const backgroundImg = new Image();
backgroundImg.src = 'media/back.2.png';
const paddleImg = new Image();
paddleImg.src = 'media/bar.2.jpg';
const ballImg = new Image();
ballImg.src = 'media/planet.2.png';
const spaceshipImg = new Image();
spaceshipImg.src = 'media/spaceship.png';

// Audio assets
const backgroundMusic = new Audio('media/spaceship-arcade-shooter-game-background-soundtrack-318508.mp3');
backgroundMusic.loop = true;
backgroundMusic.preload = 'auto';
backgroundMusic.volume = 0.3;

const winnerSound = new Audio('media/winner.mp3');
winnerSound.preload = 'auto';
const loserSound = new Audio('media/loser.mp3');
loserSound.preload = 'auto';

const playerPointSound = new Audio('media/playerscore.mp3');
playerPointSound.preload = 'auto';
const aiPointSound = new Audio('media/aiscore.mp3');
aiPointSound.preload = 'auto';

const hitSound = new Audio('media/hit.mp3');
hitSound.preload = 'auto';
hitSound.volume = 0.8;

let imagesLoaded = 0;
const totalImages = 4; // Audio files don't need to be in totalImages, they load independently

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        // All images loaded, proceed with initial setup
        canvas.style.display = 'none'; // Hide canvas initially
        startScreen.style.display = 'flex'; // Show start screen
        // Attempt to unlock audio context after a user gesture
        unlockAudio();
        
        // Set initial difficulty and attach event listeners
        setDifficulty('easy'); // Set default difficulty
        easyBtn.addEventListener('click', () => { setDifficulty('easy'); startGame(); });
        mediumBtn.addEventListener('click', () => { setDifficulty('medium'); startGame(); });
        hardBtn.addEventListener('click', () => { setDifficulty('hard'); startGame(); });

        draw(); // Initial draw for start screen text
    }
}

// Function to attempt unlocking audio context
function unlockAudio() {
    // Create a temporary audio element and try to play it
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
        const unlock = () => {
            audioContext.resume().then(() => {
                document.removeEventListener('click', unlock);
                document.removeEventListener('keydown', unlock);
            }).catch(err => console.error("AudioContext resume failed", err));
        };
        document.addEventListener('click', unlock);
        document.addEventListener('keydown', unlock);
    }
    // Also try playing and pausing existing audio elements to ensure they are ready
    const allAudio = [backgroundMusic, winnerSound, loserSound, playerPointSound, aiPointSound, hitSound];
    allAudio.forEach(audio => {
        audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
        }).catch(err => console.warn("Audio playback failed to unlock for", audio.src, err));
    });
}

backgroundImg.onload = imageLoaded;
paddleImg.onload = imageLoaded;
ballImg.onload = imageLoaded;
spaceshipImg.onload = imageLoaded; // Added spaceshipImg to onload listeners

// Paddle properties
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const PADDLE_MARGIN = 20;
let PADDLE_SPEED = 2.5; // Changed to let, as it will be dynamic based on difficulty

// Difficulty levels
const DIFFICULTY_LEVELS = {
    easy: { name: 'easy', speed: 1, completed: false },
    medium: { name: 'medium', speed: 1.75, completed: false },
    hard: { name: 'hard', speed: 2.5, completed: false }
};
let currentDifficulty = DIFFICULTY_LEVELS.easy; // Default difficulty

// Load game progress from localStorage
function loadGameProgress() {
    const savedProgress = localStorage.getItem('pongGameProgress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        DIFFICULTY_LEVELS.easy.completed = progress.easy || false;
        DIFFICULTY_LEVELS.medium.completed = progress.medium || false;
        DIFFICULTY_LEVELS.hard.completed = progress.hard || false;
    }
}

// Save game progress to localStorage
function saveGameProgress() {
    const progress = {
        easy: DIFFICULTY_LEVELS.easy.completed,
        medium: DIFFICULTY_LEVELS.medium.completed,
        hard: DIFFICULTY_LEVELS.hard.completed,
    };
    localStorage.setItem('pongGameProgress', JSON.stringify(progress));
}

// Call loadGameProgress on initial load
loadGameProgress();

// Ball properties
const BALL_SIZE = 16;
const BALL_SPEED = 6;

// Game state
let leftScore = 0;
let rightScore = 0;
const WINNING_SCORE = 3; // Reduced winning score from 5 to 3
let gameRunning = false; // Initially set to false, game starts with start screen

// Left (player) paddle
const leftPaddle = {
    x: PADDLE_MARGIN,
    y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0
};

// Right (AI) paddle
const rightPaddle = {
    x: WIDTH - PADDLE_MARGIN - PADDLE_WIDTH,
    y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0
};

// Ball
const ball = {
    x: WIDTH / 2 - BALL_SIZE / 2,
    y: HEIGHT / 2 - BALL_SIZE / 2,
    size: BALL_SIZE,
    speedX: 0, // Will be set by setBallVelocity
    speedY: 0  // Will be set by setBallVelocity
};

function setBallVelocity(speed, angleRad, directionX) {
    ball.speedX = directionX * speed * Math.cos(angleRad);
    ball.speedY = speed * Math.sin(angleRad);
}

function resetBall() {
    ball.x = WIDTH / 2 - BALL_SIZE / 2;
    ball.y = HEIGHT / 2 - BALL_SIZE / 2;
    // Randomize initial angle and direction
    let angle = Math.random() * (Math.PI / 2) - (Math.PI / 4); // Between -45 and 45 degrees
    let directionX = Math.random() < 0.5 ? 1 : -1;
    setBallVelocity(BALL_SPEED, angle, directionX);
}

// Call resetBall initially to set up ball's starting velocity
// resetBall(); // This will be called by startGame()

// Draw paddles and ball
function draw() {
    // Draw background image
    ctx.drawImage(backgroundImg, 0, 0, WIDTH, HEIGHT);

    // Draw net as starlight/space dust pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // White/light gray stars with some transparency
    const starCount = 100; // Number of stars
    for (let i = 0; i < starCount; i++) {
        const x = WIDTH / 2 - 2 + (Math.random() * 4 - 2); // Random position around the center line
        const y = Math.random() * HEIGHT; // Random y position
        const size = Math.random() * 2 + 0.5; // Random size for stars
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw left paddle image
    ctx.drawImage(paddleImg, leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);

    // Draw right paddle image
    ctx.drawImage(paddleImg, rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);

    // Draw ball image
    ctx.drawImage(ballImg, ball.x, ball.y, ball.size, ball.size);

    // Draw scores
    ctx.font = '30px "Press Start 2P"';
    ctx.textAlign = 'center';
    // Add a subtle glow to the scores
    ctx.shadowColor = '#00f'; // Blue glow
    ctx.shadowBlur = 10;
    ctx.fillText(leftScore, WIDTH / 4, 40);
    ctx.fillText(rightScore, WIDTH * 3 / 4, 40);
    ctx.shadowBlur = 0; // Reset shadow blur
}

// Update game state
function update() {
    if (!gameRunning) return; // Stop update if game is not running

    // Move ball
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Wall collision (top/bottom)
    if (ball.y <= 0) {
        ball.y = 0;
        ball.speedY *= -1;
    }
    if (ball.y + ball.size >= HEIGHT) {
        ball.y = HEIGHT - ball.size;
        ball.speedY *= -1;
    }

    // Paddle collision (left)
    if (
        ball.x <= leftPaddle.x + leftPaddle.width &&
        ball.y + ball.size >= leftPaddle.y &&
        ball.y <= leftPaddle.y + leftPaddle.height
    ) {
        ball.x = leftPaddle.x + leftPaddle.width;
        // Add some "spin"
        let collidePoint = (ball.y + ball.size/2) - (leftPaddle.y + leftPaddle.height/2);
        collidePoint = collidePoint / (leftPaddle.height/2); // Normalize to -1 to 1
        let angle = collidePoint * Math.PI/4;
        setBallVelocity(BALL_SPEED, angle, 1); // Direction 1 for going right
        hitSound.play(); // Play hit sound
    }

    // Paddle collision (right)
    if (
        ball.x + ball.size >= rightPaddle.x &&
        ball.y + ball.size >= rightPaddle.y &&
        ball.y <= rightPaddle.y + rightPaddle.height
    ) {
        ball.x = rightPaddle.x - ball.size;
        // Add some "spin"
        let collidePoint = (ball.y + ball.size/2) - (rightPaddle.y + rightPaddle.height/2);
        collidePoint = collidePoint / (rightPaddle.height/2); // Normalize to -1 to 1
        let angle = collidePoint * Math.PI/4;
        setBallVelocity(BALL_SPEED, angle, -1); // Direction -1 for going left
        hitSound.play(); // Play hit sound
    }

    // Point scored (left or right wall)
    if (ball.x < 0) {
        rightScore++;
        if (rightScore >= WINNING_SCORE) {
            gameOver("right");
        } else {
            aiPointSound.play(); // Play AI score sound
            resetBall();
        }
    } else if (ball.x > WIDTH) {
        leftScore++;
        if (leftScore >= WINNING_SCORE) {
            gameOver("left");
        }
        else {
            playerPointSound.play(); // Play player score sound
            resetBall();
        }
    }

    // AI paddle movement (simple follow)
    if (ball.y + ball.size/2 > rightPaddle.y + rightPaddle.height/2) {
        rightPaddle.y += PADDLE_SPEED;
    } else if (ball.y + ball.size/2 < rightPaddle.y + rightPaddle.height/2) {
        rightPaddle.y -= PADDLE_SPEED;
    }
    // Prevent AI from going out of bounds
    rightPaddle.y = Math.max(0, Math.min(HEIGHT - rightPaddle.height, rightPaddle.y));
}

function gameOver(winner) {
    gameRunning = false;
    // Display game over screen (will be implemented in game.html and css/game.css)
    const gameOverScreen = document.getElementById('gameOverScreen');
    const winnerText = document.getElementById('winnerText');
    const finalScoreDisplay = document.getElementById('finalScore');
    
    winnerText.textContent = (winner === "left" ? "You" : "AI") + " Win(s)!";
    finalScoreDisplay.textContent = `Final Score: ${leftScore} - ${rightScore}`;
    gameOverScreen.style.display = 'flex';

    // If player 1 won, mark current difficulty as completed
    if (winner === "left") {
        currentDifficulty.completed = true;
        saveGameProgress();
        updateDifficultyButtons(); // Update buttons to show checkmark
        winnerSound.play(); // Play winner sound
    } else {
        loserSound.play(); // Play loser sound
    }
    backgroundMusic.pause(); // Pause background music on game over
}

// Get the Play Again button element
const playAgainButton = document.getElementById('playAgainButton');
const backToStartButton = document.getElementById('backToStartButton');

// Add event listener to the Play Again button
playAgainButton.addEventListener('click', startGame);

// Add event listener for the "Back to Start" button
backToStartButton.addEventListener('click', () => {
    // Hide game over screen and canvas
    const gameOverScreen = document.getElementById('gameOverScreen');
    gameOverScreen.style.display = 'none';
    canvas.style.display = 'none';

    // Show start screen
    startScreen.style.display = 'flex';

    // Reset game state (optional, can be done when starting a new game)
    leftScore = 0;
    rightScore = 0;
    leftPaddle.y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    rightPaddle.y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    resetBall();
    gameRunning = false; // Ensure game loop is stopped

    // Pause music when returning to start screen
    backgroundMusic.pause();

    // Draw the start screen text
    draw();
});

// Function to set the game difficulty
function setDifficulty(level) {
    currentDifficulty = DIFFICULTY_LEVELS[level];
    PADDLE_SPEED = currentDifficulty.speed;

    updateDifficultyButtons(); // Update buttons to show checkmark
}

// Function to update the visual state of difficulty buttons
function updateDifficultyButtons() {
    document.querySelectorAll('.difficulty-button').forEach(button => {
        button.classList.remove('active');
        const difficultyName = button.getAttribute('data-difficulty');
        if (DIFFICULTY_LEVELS[difficultyName].completed) {
            button.classList.add('completed');
        } else {
            button.classList.remove('completed');
        }
    });
    document.getElementById(`${currentDifficulty.name}Btn`).classList.add('active');
}

// Mouse control for left paddle
canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    let mouseY = e.clientY - rect.top;
    leftPaddle.y = mouseY - leftPaddle.height / 2;
    // Prevent paddle from going out of bounds
    if (leftPaddle.y < 0) leftPaddle.y = 0;
    if (leftPaddle.y + leftPaddle.height > HEIGHT) leftPaddle.y = HEIGHT - leftPaddle.height;
});

// Game loop
function gameLoop() {
    if (gameRunning) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// Function to start or restart the game
function startGame() {
    // Hide start screen and game over screen, show canvas
    startScreen.style.display = 'none';
    const gameOverScreen = document.getElementById('gameOverScreen');
    gameOverScreen.style.display = 'none';
    canvas.style.display = 'block';

    // Reset game state
    leftScore = 0;
    rightScore = 0;
    leftPaddle.y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    rightPaddle.y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    resetBall();
    gameRunning = true;

    // Play background music
    backgroundMusic.play();

    // Start the game loop if it's not already running
    gameLoop();
}

// Initial setup
// canvas.style.display = 'none'; // Hide canvas initially - handled by imageLoaded
// startScreen.style.display = 'flex'; // Show start screen - handled by imageLoaded
// startGameButton.addEventListener('click', startGame); - handled by imageLoaded

// Ensure initial draw for start screen - handled by imageLoaded
// draw();

