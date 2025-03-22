// Add new function to parse Quran Verbs CSV
function parseQuranVerbs(text) {
    const lines = text.trim().split('\n');
    return lines.map(line => {
        const [arabic, english] = line.split(',');
        if (!arabic || !english) {
            console.error('Invalid line in quran_verbs.csv:', line);
            return null;
        }
        return {
            arabic: arabic.trim(),
            english: english.trim()
        };
    }).filter(pair => pair !== null);
}

// Modify the loadData function
async function loadData(mode) {
    const url = mode === 'sentence' ? gameConfig.SENTENCE_GAME_DATA :
                mode === 'word' ? gameConfig.WORD_GAME_1_DATA :
                mode === 'quran_verbs' ? gameConfig.QURAN_VERBS_DATA : null;
    if (!url) throw new Error('Invalid mode specified');
    console.log(`Fetching ${url} for mode: ${mode}`);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
        const text = await response.text();
        //console.log(`Raw data from ${url}:`, text);
        const pairs = mode === 'sentence' ? parseSentences(text) :
                      mode === 'word' ? parseWords(text) :
                      mode === 'quran_verbs' ? parseQuranVerbs(text) : [];
        //console.log('Parsed pairs:', pairs);
        state.segments = segmentPairs(pairs);
        console.log('Segments:', state.segments);

        state.index = { byPos: {}, byLength: {}, contentWords: {}, precomputed: {} };
        pairs.forEach(pair => {
            const doc = nlp(pair.english);
            const tokens = doc.terms().out('array');
            const length = tokens.length;
            const termsData = doc.terms().json();
            const posTags = termsData.map(term => (term.tags && term.tags.length > 0) ? term.tags[0] : 'Unknown');
            const contentWord = doc.nouns().length > 0 ? doc.nouns().out('text') :
                              doc.verbs().length > 0 ? doc.verbs().out('text') :
                              doc.adjectives().length > 0 ? doc.adjectives().out('text') : tokens[0];
            const normalizedContent = contentWord.toLowerCase();
            const primaryPos = posTags.some(tag => tag === 'Verb') ? 'verbs' :
                             posTags.some(tag => tag === 'Noun') ? 'nouns' :
                             posTags.some(tag => tag === 'Adjective') ? 'adjectives' : 'other';

            if (!state.index.byPos[primaryPos]) state.index.byPos[primaryPos] = [];
            state.index.byPos[primaryPos].push(pair);

            if (!state.index.byLength[length]) state.index.byLength[length] = [];
            state.index.byLength[length].push(pair);

            if (!state.index.contentWords[normalizedContent]) state.index.contentWords[normalizedContent] = [];
            state.index.contentWords[normalizedContent].push(pair);

            // Add precomputed data
            state.index.precomputed[pair.english] = {
                tokens: tokens,
                posTags: posTags,
                names: doc.people().out('array'),
                isQuestion: doc.questions().length > 0,
                isToVerb: mode === 'word' || mode === 'quran_verbs' && doc.match('to *').length > 0,
                isOneWordNoun: mode === 'word' || mode === 'quran_verbs' && length === 1 && posTags.some(tag => tag === 'Noun')
            };
        });
        console.log('NLP Index created:', state.index);
    } catch (error) {
        console.error('Load data error:', error);
        throw error;
    }
}

// [arabic]<tab>[English]<tab>...<tab> in txt
function parseSentences(text) {
    const lines = text.trim().split('\n');
    return lines.map(line => {
        const parts = line.split('\t');
        if (parts.length < 2) {
            console.error('Invalid line in ara.txt:', line);
            return null;
        }
        const [english, arabic] = parts;
        return {
            english: english.replace(/^"|"$/g, '').replace(/""/g, '"'), // Remove outer quotes, fix escaped quotes
            arabic: arabic.replace(/^"|"$/g, '').replace(/""/g, '"')   // Same for Arabic
        };
    }).filter(pair => pair !== null);
}

// [arabic]<br/>[English] in csv
function parseWords(text) {
    const lines = text.trim().split('\n');
    const pairs = [];
    for (let i = 0; i < lines.length; i += 2) {
        //console.log('Arabic:', lines[i], 'English:', lines[i + 1]);
        pairs.push({
            arabic: lines[i].trim().replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'),
            english: lines[i + 1].replace(/[\r\n]+/g, '').replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')
        });
    }
    return pairs;
}

// [arabic],[english] in csv
function parseQuranVerbs(text) {
    const lines = text.trim().split('\n');
    return lines.map(line => {
        const [arabic, english] = line.split(',');
        if (!arabic || !english) {
            console.error('Invalid line in quran_verbs.csv:', line);
            return null;
        }
        return {
            arabic: arabic.trim().replace(/^"|"$/g, '').replace(/""/g, '"'), // Match parseSentences cleanup
            english: english.trim().replace(/^"|"$/g, '').replace(/""/g, '"') // Match parseSentences cleanup
        };
    }).filter(pair => pair !== null);
}

function segmentPairs(pairs) {
    const total = pairs.length;
    const baseSize = Math.floor(total / 10);
    const remainder = total % 10;
    const segments = [];
    let start = 0;

    for (let i = 0; i < 10; i++) {
        const size = baseSize + (i < remainder ? 1 : 0);
        segments.push(pairs.slice(start, start + size));
        start += size;
    }
    console.log('Total pairs:', total, 'Segments:', segments); // Debug
    return segments;
}