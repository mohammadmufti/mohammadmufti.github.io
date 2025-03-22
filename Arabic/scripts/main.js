window.addEventListener('load', () => {
    const modeModalElement = document.getElementById('modeModal');
    if (!modeModalElement) {
        console.error('Mode modal element not found');
        return;
    }

    state.dom = {
        modeModal: new bootstrap.Modal(modeModalElement, {
            backdrop: 'static', // Prevents closing on backdrop click
            keyboard: false     // Prevents closing with ESC key
        }),        
        levelDisplay: document.getElementById('levelDisplay'),
        scoreDisplay: document.getElementById('scoreDisplay'),
        correctScore: document.getElementById('correctScore'),
        incorrectScore: document.getElementById('incorrectScore'), 
        sliderContainer: document.getElementById('sliderContainer'),
        levelSlider: document.getElementById('levelSlider'),
        levelLabel: document.getElementById('levelLabel'),
        levelDescription: document.getElementById('levelDescription'),
        gameArea: document.getElementById('gameArea'),
        doneButton: document.getElementById('doneButton'),
        sentenceMode: document.getElementById('sentenceMode'),
        wordMode: document.getElementById('wordMode'),
        quranVerbsMode: document.getElementById('quranVerbsMode'),
        nextLevelModal: new bootstrap.Modal(document.getElementById('nextLevelModal')),
        nextLevelMessage: document.getElementById('nextLevelMessage'),
        continueButton: document.getElementById('continueButton'),
        endGameModal: new bootstrap.Modal(document.getElementById('endGameModal')),
        correctAnswers: document.getElementById('correctAnswers'),
        incorrectAnswers: document.getElementById('incorrectAnswers'),
        playAgainButton: document.getElementById('playAgainButton'),
        startButton: document.getElementById('startButton'),
        loadingMessage: document.getElementById('loadingMessage')
    };

    state.dom.modeModal.show();

    state.dom.sentenceMode.addEventListener('click', () => {
        console.log('Sentence Mode clicked');
        state.gameMode = 'sentence';
        state.dom.loadingMessage.style.opacity = '0';
        state.dom.loadingMessage.style.display = 'block';
        setTimeout(() => { state.dom.loadingMessage.style.opacity = '1'; }, 10);
        loadData('sentence').then(() => {
            console.log('Sentence data loaded');
            state.dom.loadingMessage.style.opacity = '0';
            setTimeout(() => {
                state.dom.loadingMessage.style.display = 'none';
                state.dom.modeModal.hide();
                console.log('Modal hidden after sentence load');
                // Ensure slider is visible
                state.dom.sliderContainer.style.display = 'block';
            }, 300);
        }).catch(err => {
            console.error('Error loading sentence data:', err);
            state.dom.loadingMessage.style.opacity = '0';
            setTimeout(() => { 
                state.dom.loadingMessage.style.display = 'none'; 
                console.log('Modal hidden after sentence error');
            }, 300);
        });
    });
    
    state.dom.wordMode.addEventListener('click', () => {
        console.log('Word Mode clicked');
        state.gameMode = 'word';
        state.dom.loadingMessage.style.opacity = '0';
        state.dom.loadingMessage.style.display = 'block';
        setTimeout(() => { state.dom.loadingMessage.style.opacity = '1'; }, 10);
        loadData('word').then(() => {
            console.log('Word data loaded');
            state.dom.loadingMessage.style.opacity = '0';
            setTimeout(() => {
                state.dom.loadingMessage.style.display = 'none';
                state.dom.modeModal.hide();
                console.log('Modal hidden after word load');
                // Ensure slider is visible
                state.dom.sliderContainer.style.display = 'block';
            }, 300);
        }).catch(err => {
            console.error('Error loading word data:', err);
            state.dom.loadingMessage.style.opacity = '0';
            setTimeout(() => { 
                state.dom.loadingMessage.style.display = 'none'; 
                console.log('Modal hidden after word error');
            }, 300);
        });
    });

    state.dom.quranVerbsMode.addEventListener('click', () => {
        console.log('Quran Verbs Mode clicked');
        state.gameMode = 'quran_verbs';
        state.dom.loadingMessage.style.opacity = '0';
        state.dom.loadingMessage.style.display = 'block';
        setTimeout(() => { state.dom.loadingMessage.style.opacity = '1'; }, 10);
        loadData('quran_verbs').then(() => {
            console.log('Quran Verbs data loaded');
            state.dom.loadingMessage.style.opacity = '0';
            setTimeout(() => {
                state.dom.loadingMessage.style.display = 'none';
                state.dom.modeModal.hide();
                console.log('Modal hidden after Quran Verbs load');
                state.dom.sliderContainer.style.display = 'block';
            }, 300);
        }).catch(err => {
            console.error('Error loading Quran Verbs data:', err);
            state.dom.loadingMessage.style.opacity = '0';
            setTimeout(() => { 
                state.dom.loadingMessage.style.display = 'none'; 
                console.log('Modal hidden after Quran Verbs error');
            }, 300);
        });
    });

    state.dom.startButton.addEventListener('click', () => {
        console.log('Start button clicked, level:', state.dom.levelSlider.value);
        startGame();
        state.dom.gameArea.style.display = 'block'; // Use cached DOM reference
        state.dom.scoreDisplay.style.visibility = 'visible'; // Show scoreboard
        state.dom.doneButton.style.visibility = 'visible'; // Show button
    });

    state.dom.doneButton.addEventListener('click', endGame);

    state.dom.playAgainButton.addEventListener('click', () => {
        state.dom.endGameModal.hide();
        resetGame();
    });

    // Level slider
    state.dom.levelSlider.addEventListener('input', () => {
        const level = state.dom.levelSlider.value;
        state.dom.levelLabel.innerHTML = `Select Starting Level (1-10): <span class="level-number">${level}</span>`;
        
        let description;
        if (level <= 2) description = "Beginner";
        else if (level <= 4) description = "Elementary";
        else if (level <= 6) description = "Intermediate";
        else if (level <= 8) description = "Advanced";
        else description = "Expert";
        state.dom.levelDescription.innerText = description;
    });
});