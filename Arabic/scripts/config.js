const gameConfig = {
    INCORRECT_DELAY: 1000, // Delay for incorrect answer jiggle
    MODAL_DELAY: 1000,     // Delay for modal transitions
    TTS_VOICE: 'Arabic Female', // Text-to-speech voice ***Need to concurrently change on dashboard??***
    TTS_SPEED: 0.9,          // Text-to-speech speed
    SENTENCE_GAME_DATA: 'ara.txt', // Game Data 1
    WORD_GAME_1_DATA: 'FSTU.csv', // Game Data 2
    QURAN_VERBS_DATA: 'Quran Verbs.csv' // Game Data 3
};

window.gameConfig = gameConfig;