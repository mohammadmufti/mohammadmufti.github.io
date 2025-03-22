
// Fisher-Yates shuffle function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startGame() {
    console.log('Starting game, mode:', state.gameMode);
    console.log('All segments:', state.segments);
    state.dom.sliderContainer.style.display = 'none';
    state.currentLevel = parseInt(state.dom.levelSlider.value);
    console.log('Current level:', state.currentLevel);
    const segment = state.segments[state.currentLevel - 1];
    shuffleArray(segment); // Shuffle the selected segment’s pairs
    console.log('Shuffled segment for level ' + state.currentLevel + ':', segment);
    displayLevel();
}

function displayLevel() {
    const segment = state.segments[state.currentLevel - 1];

    // New reset logic
    state.dom.gameArea.innerHTML = ''; // Clear content first
    state.dom.gameArea.classList.remove('correct-answer', 'incorrect-answer', 'disabled-answer'); // Remove any lingering classes

    console.log('Displaying level:', state.currentLevel, 'Segment:', segment);
    if (!segment || segment.length === 0) {
        console.log('No segment found, ending game');
        return endGame();
    }

    state.dom.levelDisplay.textContent = `Level ${state.currentLevel}/${state.maxLevels}`;
    state.dom.gameArea.style.display = 'block'; // Ensure game area is visible
    displayPair(segment[0], segment); // Start at index 0 of shuffled segment
}

function displayPair(pair, segment) {
    console.log('Displaying pair:', pair);

    state.dom.gameArea.classList.add('reset');
    setTimeout(() => {
        state.dom.gameArea.classList.remove('reset');
    }, 50);
    
    const options = [pair.english];
    const usedEnglish = new Set([pair.english]);

    // Use fixed wrong answers if available
    if (fixedWrongAnswers[pair.english]) {
        // Take up to 3 unique fixed wrong answers
        const fixedWrongSet = [...new Set(fixedWrongAnswers[pair.english])]; // Remove any duplicates in fixed set
        const fixedSet = shuffleArray(fixedWrongSet).slice(0, 3);
        options.push(...fixedSet);
    } else {
        // Get data about the correct answer
        const correctData = state.index.precomputed[pair.english];
        const { tokens, posTags, isQuestion, isToVerb, isOneWordNoun } = correctData;
        const correctLength = tokens.length;
        const isOneWord = correctLength === 1;
        const startsWithTo = pair.english.toLowerCase().startsWith('to ');
        
        // Get all pairs from all segments for broader selection
        const allPairs = state.segments.flat();
        
        // Step 1: Apply essential filters
        let candidates = allPairs.filter(p => {
            // Skip if already used or it's the correct answer
            if (usedEnglish.has(p.english) || p.english === pair.english) return false;
            
            const pData = state.index.precomputed[p.english];
            const candidateStartsWithTo = p.english.toLowerCase().startsWith('to ');
            
            // Rule: Question status must match
            if (isQuestion !== pData.isQuestion) return false;
            
            // Rule: One word answers need one word wrong answers
            if (isOneWord && pData.tokens.length !== 1) return false;
            
            // Rule: "to" verb status must match
            if (startsWithTo !== candidateStartsWithTo) return false;
            
            // Special case for "to verb" forms
            if (isToVerb && !pData.isToVerb) return false;
            
            // Special case for one-word nouns
            if (isOneWordNoun && !pData.isOneWordNoun) return false;
            
            // If the correct answer has no verbs, wrong answers shouldn't have verbs either
            const hasNoVerbs = !posTags.some(tag => tag === 'Verb');
            if (hasNoVerbs && pData.posTags.some(tag => tag === 'Verb')) return false;
            
            return true;
        });
        
        // Step 2: Calculate similarity scores for remaining candidates
        const scoredCandidates = candidates.map(p => {
            const pData = state.index.precomputed[p.english];
            let score = 0;
            
            // Similarity based on token count - prioritize similar length answers
            score += 10 - Math.min(10, Math.abs(pData.tokens.length - correctLength));
            
            // Similar part of speech pattern is good
            let posMatchCount = 0;
            for (let i = 0; i < Math.min(posTags.length, pData.posTags.length); i++) {
                if (posTags[i] === pData.posTags[i]) posMatchCount++;
            }
            score += 5 * (posMatchCount / Math.max(posTags.length, pData.posTags.length));
            
            // Jaccard similarity for word overlap
            const correctSet = new Set(tokens.map(t => t.toLowerCase()));
            const candidateSet = new Set(pData.tokens.map(t => t.toLowerCase()));
            
            // Calculate intersection size
            let intersectionSize = 0;
            for (const word of correctSet) {
                if (candidateSet.has(word)) intersectionSize++;
            }
            
            // Jaccard = intersection / union
            const unionSize = correctSet.size + candidateSet.size - intersectionSize;
            const jaccard = unionSize > 0 ? intersectionSize / unionSize : 0;
            
            // Add Jaccard score, but discourage too-similar answers
            // We want wrong answers that are thematically related but not almost identical
            if (jaccard > 0.8) {
                score += 2; // Too similar, lower score boost
            } else if (jaccard > 0.3) {
                score += 8; // Good similarity range
            } else {
                score += jaccard * 10; // Proportional score for low similarity
            }
            
            return { candidate: p, score: score };
        });
        
        // Sort by score (highest first)
        scoredCandidates.sort((a, b) => b.score - a.score);
        
        // Group candidates by score to randomize equal scores
        const scoreGroups = {};
        scoredCandidates.forEach(item => {
            const scoreKey = Math.round(item.score * 100) / 100; // Round to handle floating point comparison
            if (!scoreGroups[scoreKey]) scoreGroups[scoreKey] = [];
            scoreGroups[scoreKey].push(item);
        });

        // Shuffle each group of identically-scored candidates
        Object.values(scoreGroups).forEach(group => {
            shuffleArray(group); // Using your existing shuffleArray function
        });

        // Reconstruct the array with shuffled equal-score groups
        const shuffledScoredCandidates = [];
        Object.keys(scoreGroups)
            .sort((a, b) => b - a) // Sort score groups highest first
            .forEach(score => {
                shuffledScoredCandidates.push(...scoreGroups[score]);
            });
        
        // Step 3: Take the top N candidates and select randomly from them
        const TOP_CANDIDATES_POOL = 4; // We'll randomly select from top x candidates
        const topCandidates = shuffledScoredCandidates.slice(0, TOP_CANDIDATES_POOL);

        // Randomly select 3 candidates from the top pool
        while (options.length < 4 && topCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * topCandidates.length);
            const selected = topCandidates.splice(randomIndex, 1)[0];
            
            // Double-check that this option isn't already in the list (redundant safety check)
            if (!usedEnglish.has(selected.candidate.english)) {
                options.push(selected.candidate.english);
                usedEnglish.add(selected.candidate.english);
            }
        }
        
        // Fallback if we don't have enough candidates
        if (options.length < 4) {
            console.log('Not enough similar candidates, using fallback selection');
            
            // Get any remaining valid candidates that haven't been used
            const remainingCandidates = allPairs.filter(p => {
                // Skip if already used or it's the correct answer
                if (usedEnglish.has(p.english) || p.english === pair.english) return false;
                
                const pData = state.index.precomputed[p.english];
                const candidateStartsWithTo = p.english.toLowerCase().startsWith('to ');
                
                // Maintain critical rules even in fallback
                return pData.isQuestion === isQuestion && 
                       candidateStartsWithTo === startsWithTo;
            });
            
            while (options.length < 4 && remainingCandidates.length > 0) {
                const randomIndex = Math.floor(Math.random() * remainingCandidates.length);
                const selected = remainingCandidates.splice(randomIndex, 1)[0];
                
                // Double-check for duplicates again
                if (!usedEnglish.has(selected.english)) {
                    options.push(selected.english);
                    usedEnglish.add(selected.english);
                }
            }
        }

        // Final extreme fallback - if we still don't have 4 options somehow
        if (options.length < 4) {
            console.log('Critical fallback: using any available options');
            const lastResortCandidates = allPairs.filter(p => 
                !usedEnglish.has(p.english) && 
                p.english !== pair.english
            );
            
            while (options.length < 4 && lastResortCandidates.length > 0) {
                const randomIndex = Math.floor(Math.random() * lastResortCandidates.length);
                const selected = lastResortCandidates.splice(randomIndex, 1)[0];
                options.push(selected.english);
                usedEnglish.add(selected.english);
            }
        }

        console.log('Final options:', options);
    }

    // Shuffle options for display
    shuffleArray(options);
    
    // Display the question and options
    state.dom.gameArea.innerHTML = `
        <div class="question-container">
            <span dir="rtl">${pair.arabic}</span>
            <span class="spacer"></span>
            <button class="speak-btn" onclick="handleSpeakButtonClick('${pair.arabic}')">
                <i class="bi bi-megaphone"></i>
            </button>
        </div>
        <div class="options-container">
        ${options.map(opt => `<button class="btn btn-outline-primary m-2">${opt}</button>`).join('')}
        </div>
    `;
    
    // Add event listeners to buttons
    state.dom.gameArea.querySelectorAll('button:not(.speak-btn)').forEach(btn => {
        btn.addEventListener('click', () => checkAnswer(btn.textContent, pair, segment));
    });
}

// Function to handle the speak button click with robust fallback
function handleSpeakButtonClick(arabicText) {
    if (arabicText.includes(" ج ")) {
        arabicText = arabicText.split(" ج ")[0].trim();
    }

    function speakWithFallback(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ar-SA'; // Arabic (Saudi Arabia)

            // Get available voices first
            const voices = window.speechSynthesis.getVoices();

            // Determine if we should prioritize a female voice
            const preferFemale = gameConfig.TTS_VOICE.toLowerCase().includes('female');
            let selectedVoice;

            if (preferFemale) {
                console.log("Preferring a female Arabic voice based on TTS_VOICE:", gameConfig.TTS_VOICE);
                selectedVoice = voices.find(voice => 
                    voice.lang.includes('ar') && 
                    (voice.name.toLowerCase().includes('female') || 
                     voice.name.includes('Salma') || 
                     voice.name.includes('Leila') || 
                     voice.name.includes('Laila') || 
                     voice.name.includes('Zainab'))
                );
                if (selectedVoice) {
                    console.log("Selected female Arabic voice for fallback:", selectedVoice.name);
                } else {
                    console.log("No female Arabic voice found, falling back to any Arabic voice.");
                }
            }

            // If no female voice (or not preferring female), use any Arabic voice
            if (!selectedVoice) {
                selectedVoice = voices.find(voice => voice.lang.includes('ar'));
                if (selectedVoice) {
                    console.log("Selected Arabic voice for fallback:", selectedVoice.name);
                } else {
                    console.log("No Arabic voice available, using default voice.");
                }
            }

            if (selectedVoice) utterance.voice = selectedVoice;
            utterance.rate = gameConfig.TTS_SPEED || 1.0;
            utterance.onerror = (event) => console.error("SpeechSynthesis error:", event.error);
            window.speechSynthesis.speak(utterance);
        } else {
            console.log("Web Speech API not supported in this browser.");
        }
    }

    if (typeof responsiveVoice !== 'undefined' && responsiveVoice.voiceSupport()) {
        try {
            let hasPlayed = false;
            let hasFallbackTriggered = false;

            responsiveVoice.speak(arabicText, gameConfig.TTS_VOICE, {
                rate: gameConfig.TTS_SPEED,
                onstart: () => {
                    hasPlayed = true;
                    console.log("ResponsiveVoice started speaking.");
                },
                onend: () => {
                    hasPlayed = true;
                    console.log("ResponsiveVoice finished speaking.");
                },
                onerror: (e) => {
                    console.log("ResponsiveVoice error caught in onerror:", e);
                    console.log("Falling back to Web Speech API.");
                    speakWithFallback(arabicText);
                }
            });

            setTimeout(() => {
                if (!hasPlayed && !hasFallbackTriggered) {
                    console.log("ResponsiveVoice failed to play (likely OpaqueResponseBlocking), falling back to Web Speech API.");
                    responsiveVoice.cancel();
                    hasFallbackTriggered = true;
                    speakWithFallback(arabicText);
                }
            }, 7000); // 6-second delay
        } catch (e) {
            console.log("ResponsiveVoice failed synchronously:", e);
            console.log("Falling back to Web Speech API.");
            speakWithFallback(arabicText);
        }
    } else {
        console.log("ResponsiveVoice not available, using Web Speech API.");
        speakWithFallback(arabicText);
    }
}

// Validates answer selection
function checkAnswer(selected, pair, segment) {
    const isCorrect = selected === pair.english;
    state.answers[isCorrect ? 'correct' : 'incorrect'].push({ arabic: pair.arabic, english: pair.english });
    updateScore();

    const buttons = state.dom.gameArea.querySelectorAll('.btn-outline-primary');
    const clickedButton = Array.from(buttons).find(btn => btn.textContent === selected);
    const correctButton = Array.from(buttons).find(btn => btn.textContent === pair.english);

    if (isCorrect) {
        clickedButton.classList.add('correct-answer');
    } else {
        clickedButton.classList.add('incorrect-answer');
        correctButton.classList.add('correct-answer');
    }

    // Disable all answer buttons after a choice is made
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled-answer'); // For styling
    });

    // Prevent persistent focus on mobile
    if (clickedButton) {
        clickedButton.blur();
    }

    const nextIndex = segment.indexOf(pair) + 1;
    if (nextIndex < segment.length) {
        if (isCorrect) {
            displayPair(segment[nextIndex], segment);
        } else {
            setTimeout(() => {
                displayPair(segment[nextIndex], segment);
            }, gameConfig.INCORRECT_DELAY);
        }
    } else {
        state.currentLevel++;
        if (state.currentLevel > state.maxLevels) {
            if (isCorrect) {
                endGame();
            } else {
                setTimeout(() => {
                    endGame();
                }, gameConfig.INCORRECT_DELAY);
            }
        } else {
            const nextSegment = state.segments[state.currentLevel - 1];
            shuffleArray(nextSegment);
            console.log('Shuffled segment for level ' + state.currentLevel + ':', nextSegment);
            const transitionDelay = isCorrect ? 0 : gameConfig.INCORRECT_DELAY;
            setTimeout(() => {
                anime({
                    targets: '#gameArea',
                    opacity: [0, 1],
                    easing: 'easeInOutQuad',
                    duration: 500,
                    begin: () => {
                        state.dom.nextLevelMessage.textContent = `Congrats! Moving to Level ${state.currentLevel}`;
                        state.dom.nextLevelModal.show();
                    },
                    complete: () => {
                        setTimeout(() => {
                            state.dom.nextLevelModal.hide();
                            displayLevel();
                        }, gameConfig.MODAL_DELAY);
                    }
                });
            }, transitionDelay);
        }
    }
}

function updateScore() {
    state.dom.correctScore.innerText = `Correct: ${state.answers.correct.length}`;
    state.dom.incorrectScore.innerText = `Incorrect: ${state.answers.incorrect.length}`;
}

function endGame() {
    state.dom.correctAnswers.innerHTML = `Correct:<br>${state.answers.correct.map(a => `${a.arabic} → ${a.english}`).join('<br>')}`;
    state.dom.incorrectAnswers.innerHTML = `Incorrect:<br>${state.answers.incorrect.map(a => `${a.arabic} → ${a.english}`).join('<br>')}`;
    state.dom.endGameModal.show();
}

function resetGame() {
    state.gameMode = null;
    state.currentLevel = 1;
    state.segments = [];
    state.answers = { correct: [], incorrect: [] };
    state.dom.sliderContainer.style.display = 'block';
    state.dom.gameArea.innerHTML = '';
    state.dom.modeModal.show();
    state.dom.gameArea.style.display = 'none'; // Hide game area
    // Reset answers
    state.answers.correct = [];
    state.answers.incorrect = [];
    // Update score display
    state.dom.correctScore.innerText = "Correct: 0";
    state.dom.incorrectScore.innerText = "Incorrect: 0";
}

// Expose functions to global scope
window.startGame = startGame;
window.endGame = endGame;
window.resetGame = resetGame;