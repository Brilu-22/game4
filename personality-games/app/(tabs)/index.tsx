import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, 
  Modal, Platform, TextInput, Animated, Dimensions, 
  KeyboardAvoidingView, Image, ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

// --- 1. AESTHETIC CONFIGURATION ---
const COLUMNS = 4;
const SCREEN_WIDTH = Dimensions.get('window').width;
const IS_DESKTOP = SCREEN_WIDTH > 768;

const THEME = {
  bg: '#F7F5F2',
  glass: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.9)',
  text: '#1A1A1A',
  subText: '#666666',
  accent: '#FF8C42',
  darkGlass: 'rgba(20, 25, 20, 0.90)',
  shadow: {
    shadowColor: "#5E5045",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  }
};

// --- 2. DATA & ASSETS ---
const PLAYLIST = [
  { title: "Peace", artist: "HAVEN", cover: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80", source: require('../../assets/I run.mp3') },
  { title: "Dream", artist: "Metro Boomin", cover: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80", source: require('../../assets/dream.mp3') },
  { title: "Unwind", artist: "South Arcade", cover: "https://images.unsplash.com/photo-1620641788421-7f1c33850486?w=800&q=80", source: require('../../assets/2005.mp3') },
  { title: "Zen", artist: "Kaytranada", cover: "https://images.unsplash.com/photo-1545231027-637d2f6210f8?w=800&q=80", source: require('../../assets/One.mp3') },
  { title: "Change", artist: "TKandz", cover: "https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=800&q=80", source: require('../../assets/Now.mp3') },

];

const PROFILES = [
  { id: 'mwape', name: 'MWAPE', img: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop" },
  { id: 'brilu', name: 'BRILU', img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop" },
  { id: 'ngozi', name: 'NGOZI', img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop" },
  { id: 'kurt',  name: 'KURT',  img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop" },
];

const QUOTES = [
  "The only way to do great work is to love what you do.",
  "Emotional intelligence is the ability to sense, understand, and apply the power of emotions.",
  "Your vibe attracts your tribe.",
  "Creativity is intelligence having fun.",
];

// --- 3. GLOBAL MUSIC CONTEXT ---
interface MusicContextType {
  isPlaying: boolean;
  trackIndex: number;
  currentTrack: any;
  isLoading: boolean;
  volume: number;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  changeVolume: (delta: number) => void;
}

const MusicContext = createContext<MusicContextType>({} as MusicContextType);

const MusicProvider = ({ children }: { children: React.ReactNode }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(1.0);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }, []);

  const loadAndPlay = async (index: number, shouldPlay = true) => {
    try {
      setIsLoading(true);
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync(
        PLAYLIST[index].source,
        { shouldPlay: shouldPlay, isLooping: true, volume: volume }
      );
      setSound(newSound);
      setTrackIndex(index);
      setIsPlaying(shouldPlay);
    } catch (e) { console.log(e); } 
    finally { setIsLoading(false); }
  };

  const togglePlay = async () => {
    if (!sound) { await loadAndPlay(trackIndex, true); return; }
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) { await sound.pauseAsync(); setIsPlaying(false); } 
      else { await sound.playAsync(); setIsPlaying(true); }
    }
  };

  const changeVolume = async (delta: number) => {
    const newVol = Math.min(Math.max(volume + delta, 0), 1);
    setVolume(newVol);
    if (sound) await sound.setVolumeAsync(newVol);
  };

  return (
    <MusicContext.Provider value={{
      isPlaying, trackIndex, currentTrack: PLAYLIST[trackIndex], isLoading, volume,
      togglePlay, 
      nextTrack: () => loadAndPlay((trackIndex + 1) % PLAYLIST.length, true),
      prevTrack: () => loadAndPlay(trackIndex === 0 ? PLAYLIST.length - 1 : trackIndex - 1, true),
      changeVolume
    }}>
      {children}
    </MusicContext.Provider>
  );
};

// --- 4. TRIVIA DATA WITH 10 QUESTIONS PER CATEGORY ---
type GameKey = 'mwape' | 'brilu' | 'ngozi' | 'kurt';
interface TriviaQuestion { q: string; options: string[]; correct: number; }
interface HighScore { name: string; score: number; isEQMaster?: boolean; }

const TRIVIA_DATA: Record<GameKey, TriviaQuestion[]> = {
  mwape: [
    { q: "Standard House Music BPM?", options: ["80", "124", "160", "200"], correct: 1 },
    { q: "What DAW is known for its loop-based workflow?", options: ["Pro Tools", "Ableton Live", "Logic Pro", "FL Studio"], correct: 1 },
    { q: "Which frequency range typically contains bass?", options: ["20-250Hz", "250-500Hz", "2-4kHz", "8-16kHz"], correct: 0 },
    { q: "What is sidechain compression commonly used for?", options: ["Vocals", "Drums", "Creating pumping effect", "Mastering"], correct: 2 },
    { q: "Which is NOT a type of synthesis?", options: ["Subtractive", "Additive", "FM", "Digital Compression"], correct: 3 },
    { q: "What does LFO stand for?", options: ["Low Frequency Oscillator", "Linear Frequency Output", "Live Filter Option", "Loop Frequency Organizer"], correct: 0 },
    { q: "Which plugin is famous for vocal tuning?", options: ["Waves SSL", "Auto-Tune", "FabFilter Pro-Q", "Serum"], correct: 1 },
    { q: "What is the Nyquist frequency?", options: ["Sample rate/2", "Bit depth x2", "44.1kHz", "Maximum audible frequency"], correct: 0 },
    { q: "Which microphone type is best for studio vocals?", options: ["Dynamic", "Condenser", "Ribbon", "Lavalier"], correct: 1 },
    { q: "What does MIDI stand for?", options: ["Musical Instrument Digital Interface", "Music Input Digital Instrument", "Main Instrument Data Input", "Musical Interface Digital Input"], correct: 0 }
  ],
  brilu: [
    { q: "What charges the battery?", options: ["Alternator", "Starter", "Piston", "Turbo"], correct: 0 },
    { q: "V8 means?", options: ["8 Valves", "8 Gears", "8 Cylinders", "8 Doors"], correct: 2 },
    { q: "Fix for overheating?", options: ["More Gas", "Coolant", "Oil", "Brake Fluid"], correct: 1 },
    { q: "What does ECU stand for?", options: ["Engine Control Unit", "Electronic Car Update", "Energy Conversion Unit", "Emission Control Unit"], correct: 0 },
    { q: "Which is NOT part of the ignition system?", options: ["Spark plugs", "Coil packs", "Fuel injectors", "Distributor"], correct: 2 },
    { q: "What is turbo lag caused by?", options: ["Low fuel pressure", "Exhaust backpressure", "Inertia of turbo components", "Weak battery"], correct: 2 },
    { q: "Which engine layout is most common in F1?", options: ["V6 Turbo", "V8", "V10", "V12"], correct: 0 },
    { q: "What does DOHC stand for?", options: ["Double Overhead Cam", "Direct Oil Heat Control", "Dual Output Horsepower Calibration", "Digital Oxygen Heat Converter"], correct: 0 },
    { q: "Which material is used for brake rotors in performance cars?", options: ["Cast iron", "Carbon ceramic", "Aluminum", "Steel"], correct: 1 },
    { q: "What is the purpose of a limited-slip differential?", options: ["Improve fuel economy", "Reduce tire wear", "Transfer power to wheel with traction", "Increase top speed"], correct: 2 }
  ],
  ngozi: [
    { q: "Complementary to Blue?", options: ["Green", "Red", "Orange", "Purple"], correct: 2 },
    { q: "Silhouette refers to?", options: ["Color", "Shape", "Fabric", "Price"], correct: 1 },
    { q: "Primary colors?", options: ["R/G/B", "R/Y/B", "C/M/Y", "B/W/G"], correct: 1 },
    { q: "Which fashion house is known for the 'Chanel Suit'?", options: ["Dior", "Chanel", "Versace", "Prada"], correct: 1 },
    { q: "What year did Coco Chanel introduce the Little Black Dress?", options: ["1920", "1926", "1935", "1945"], correct: 1 },
    { q: "Which fabric is known as the 'king of fabrics'?", options: ["Cotton", "Silk", "Wool", "Linen"], correct: 1 },
    { q: "What is 'haute couture'?", options: ["Mass production", "High fashion custom fitting", "Vintage clothing", "Streetwear"], correct: 1 },
    { q: "Which designer revolutionized fashion with the 'New Look' in 1947?", options: ["Coco Chanel", "Christian Dior", "Yves Saint Laurent", "Hubert de Givenchy"], correct: 1 },
    { q: "What is the 'golden ratio' in design approximately?", options: ["1:1.618", "1:2", "2:3", "3:5"], correct: 0 },
    { q: "Which color is considered the most 'energetic'?", options: ["Blue", "Green", "Red", "Purple"], correct: 2 }
  ],
  kurt: [
    { q: "Knot for tie-in?", options: ["Square", "Figure 8", "Slipknot", "Granny"], correct: 1 },
    { q: "Device to descend?", options: ["Ascender", "Belay", "Carabiner", "Rappel"], correct: 1 },
    { q: "Climbing communication?", options: ["On Belay?", "Hello?", "Help!", "Go?"], correct: 0 },
    { q: "What is the Yosemite Decimal System used for?", options: ["Grading climbs", "Measuring distances", "Rating equipment", "Timing ascents"], correct: 0 },
    { q: "Which climbing technique uses opposing pressure?", options: ["Smearing", "Mantling", "Stemming", "Crimping"], correct: 2 },
    { q: "What does 'redpoint' mean in climbing?", options: ["First ascent", "Free climb with prior practice", "Climb without ropes", "Speed climb"], correct: 1 },
    { q: "Which mountain is known as the 'Matterhorn of America'?", options: ["Mount Rainier", "Grand Teton", "Half Dome", "Mount Whitney"], correct: 1 },
    { q: "What is the hardest grade in the YDS?", options: ["5.9", "5.10", "5.15", "There is no hardest"], correct: 3 },
    { q: "Which climbing hold is typically smallest?", options: ["Jug", "Sloper", "Crimp", "Pinch"], correct: 2 },
    { q: "What does 'beta' mean in climbing?", options: ["Strength training", "Information about a climb", "Climbing shoes", "Safety equipment"], correct: 1 }
  ]
};

// --- 5. UI COMPONENTS ---

// BIG AESTHETIC PLAYER (For Home Screen)
const BigMusicPlayer = () => {
  const { isPlaying, togglePlay, nextTrack, prevTrack, currentTrack, changeVolume, volume } = useContext(MusicContext);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if(isPlaying) {
      const interval = setInterval(() => setProgress(p => (p >= 100 ? 0 : p + 0.5)), 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  return (
    <View style={styles.bigPlayerCard}>
      <Image source={{ uri: currentTrack.cover }} style={styles.bigAlbumArt} />
      <View style={styles.trackMeta}>
        <Text style={styles.trackTitle}>{currentTrack.title}</Text>
        <Text style={styles.artistName}>{currentTrack.artist}</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.controlsRow}>
         <TouchableOpacity onPress={prevTrack}><Text style={styles.controlIconSecondary}>⏮</Text></TouchableOpacity>
         <TouchableOpacity onPress={togglePlay} style={styles.playBtnLarge}>
           <Text style={styles.playIconLarge}>{isPlaying ? "⏸" : "▶"}</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={nextTrack}><Text style={styles.controlIconSecondary}>⏭</Text></TouchableOpacity>
      </View>
      <View style={styles.volumeRow}>
        <TouchableOpacity onPress={() => changeVolume(-0.1)}><Text style={styles.volText}>-</Text></TouchableOpacity>
        <Text style={styles.volLabel}>VOL {Math.round(volume * 100)}%</Text>
        <TouchableOpacity onPress={() => changeVolume(0.1)}><Text style={styles.volText}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
};

// MINI PLAYER (For Inside Games)
const MiniMusicControl = () => {
  const { isPlaying, togglePlay, nextTrack, currentTrack } = useContext(MusicContext);
  return (
    <View style={styles.miniPlayerCard}>
      <View style={{flex:1}}>
        <Text style={styles.miniLabel}>NOW PLAYING</Text>
        <Text style={styles.miniTitle}>{currentTrack.title}</Text>
      </View>
      <View style={{flexDirection:'row', gap:10}}>
        <TouchableOpacity onPress={togglePlay} style={styles.miniPlayBtn}>
          <Text style={styles.miniPlayIcon}>{isPlaying ? "⏸" : "▶"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={nextTrack} style={styles.miniNextBtn}>
          <Text style={styles.miniNextIcon}>⏭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- 6. PUZZLE GAME COMPONENT WITH EQ MASTER SYSTEM ---
const PuzzleGame = ({ gameKey, onExit }: { gameKey: GameKey, onExit: () => void }) => {
  const [tiles, setTiles] = useState<number[]>([]); 
  const [timer, setTimer] = useState(60);
  const [score, setScore] = useState(0);
  
  const [isFrozen, setIsFrozen] = useState(false);
  const [isGodMode, setIsGodMode] = useState(false);
  const [godSelection, setGodSelection] = useState<number | null>(null);
  const [showTrivia, setShowTrivia] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isEQMaster, setIsEQMaster] = useState(false);
  
  const [playerName, setPlayerName] = useState('');
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    startNewGame();
    AsyncStorage.getItem(`leaderboard_${gameKey}`).then(j => j && setHighScores(JSON.parse(j)));
    const tInt = setInterval(() => { if (!isFrozen && !gameOver && timer > 0) triggerTrivia(); }, 15000);
    return () => clearInterval(tInt);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (timer > 0 && !isFrozen && !showTrivia && !gameOver) setTimer(t => t - 1);
      else if (timer <= 0 && !gameOver) handleGameOver();
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, isFrozen, showTrivia, gameOver]);

  // Auto-focus text input when modal opens
  useEffect(() => {
    if (gameOver && !showLeaderboard && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 500);
    }
  }, [gameOver, showLeaderboard]);

  const startNewGame = () => {
    let newTiles = Array.from({length: 15}, (_, i) => i + 1);
    newTiles.push(0); 
    for (let i=0; i<150; i++) {
      const e = newTiles.indexOf(0);
      const n = getNeighbors(e);
      const r = n[Math.floor(Math.random()*n.length)];
      [newTiles[e], newTiles[r]] = [newTiles[r], newTiles[e]];
    }
    setTiles(newTiles);
  };

  const getNeighbors = (i: number) => {
    const r = Math.floor(i/4), c = i%4, m=[];
    if(r>0) m.push(i-4); if(r<3) m.push(i+4); if(c>0) m.push(i-1); if(c<3) m.push(i+1);
    return m;
  };

  const handleTilePress = (i: number) => {
    if (isGodMode) {
      if(tiles[i]===0) return;
      if(godSelection===null) setGodSelection(i);
      else {
        const n=[...tiles]; [n[godSelection], n[i]]=[n[i], n[godSelection]];
        setTiles(n); setGodSelection(null); checkWin(n);
      }
      return;
    }
    const e = tiles.indexOf(0);
    if (getNeighbors(e).includes(i)) {
      const n=[...tiles]; [n[e], n[i]]=[n[i], n[e]];
      setTiles(n); checkWin(n);
    }
  };

  const checkWin = (t: number[]) => {
    if (t.slice(0,15).every((v,i)=>v===i+1)) { 
      const timeBonus = timer * 10;
      const baseScore = 1000;
      const totalScore = baseScore + timeBonus;
      setScore(totalScore);
      
      // Check if completed before timer ended (EQ Master condition)
      const completedBeforeTime = timer > 0;
      if (completedBeforeTime) {
        setIsEQMaster(true);
        setShowCompletionModal(true);
        // Add extra bonus for EQ Master
        setScore(totalScore + 500);
      } else {
        handleGameOver();
      }
    }
  };

  const triggerTrivia = () => {
    const q = TRIVIA_DATA[gameKey];
    setCurrentQuestion(q[Math.floor(Math.random()*q.length)]);
    setShowTrivia(true);
  };

  const handleTriviaAnswer = (idx: number) => {
    setShowTrivia(false);
    if (idx === currentQuestion?.correct) {
      setScore(s=>s+200); setIsFrozen(true); setIsGodMode(true);
      setTimeout(()=>{setIsFrozen(false); setIsGodMode(false); setGodSelection(null)}, 5000);
    } else { setTimer(t=>Math.max(0, t-15)); }
  };

  const handleGameOver = () => setGameOver(true);

  const handleCompletionModalClose = () => {
    setShowCompletionModal(false);
    handleGameOver();
  };

  const submitScore = async () => {
    if(!playerName.trim()) return;
    const newScores = [...highScores, {name:playerName, score, isEQMaster}].sort((a,b)=>b.score-a.score).slice(0,5);
    setHighScores(newScores); setShowLeaderboard(true);
    await AsyncStorage.setItem(`leaderboard_${gameKey}`, JSON.stringify(newScores));
  };

  const handleNameSubmit = () => {
    submitScore();
  };

  return (
    <View style={styles.gameContainer}>
      <View style={styles.bgCircle} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.glassBtn}>
          <Text style={styles.glassBtnText}>← Exit Lab</Text>
        </TouchableOpacity>
        <Text style={styles.gameTitle}>{gameKey.toUpperCase()}</Text>
      </View>

      {/* SPLIT LAYOUT */}
      <View style={styles.splitLayout}>
        {/* LEFT: GRID */}
        <View style={styles.leftPanel}>
          <View style={[styles.gridContainer, isGodMode && styles.godModeBorder]}>
            {tiles.map((num, index) => (
              <TouchableOpacity 
                key={index}
                style={[styles.tile, num===0?styles.emptyTile:styles.activeTile, godSelection===index && styles.selectedTile]}
                onPress={() => handleTilePress(index)}
                disabled={(num===0 && !isGodMode) || gameOver}
              >
                {num!==0 && <Text style={[styles.tileNumber, isGodMode && {color: THEME.accent}]}>{num}</Text>}
              </TouchableOpacity>
            ))}
          </View>
          {isGodMode && <Text style={styles.godModeText}>GOD MODE ACTIVE</Text>}
        </View>

        {/* RIGHT: DASHBOARD */}
        <View style={styles.rightPanel}>
          <View style={styles.dashboardCard}>
            <View style={styles.statRow}>
              <View><Text style={styles.statLabel}>TIME</Text><Text style={[styles.statValue, isFrozen && {color: THEME.accent}]}>{isFrozen?"STOP":timer}s</Text></View>
              <View><Text style={styles.statLabel}>SCORE</Text><Text style={styles.statValue}>{score}</Text></View>
            </View>
            {isEQMaster && (
              <View style={styles.eqMasterBadge}>
                <Text style={styles.eqMasterText}>🏆 EQ MASTER</Text>
              </View>
            )}
          </View>

          {/* Mini Music Player inside Game */}
          <MiniMusicControl />

          <View style={[styles.dashboardCard, {flex:1}]}>
            <Text style={styles.dashTitle}>Leaderboard</Text>
            {highScores.length === 0 ? (
              <Text style={{color: THEME.subText, fontStyle:'italic'}}>No scores yet</Text>
            ) : (
              highScores.map((h,i)=>(
                <View key={i} style={styles.miniScoreRow}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.miniScoreName}>#{i+1} {h.name}</Text>
                    {h.isEQMaster && <Text style={styles.badge}>🏆</Text>}
                  </View>
                  <Text style={styles.miniScoreVal}>{h.score}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      {/* Completion Modal */}
      <Modal visible={showCompletionModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalGlass, styles.completionModal]}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.completionTitle}>YOU ACTUALLY ATE THAT</Text>
            <Text style={styles.completionSubtitle}>Well done, champion! 🏆</Text>
            <Text style={styles.completionText}>
              You completed the puzzle with {timer} seconds remaining!
            </Text>
            <Text style={styles.eqMasterAward}>
              🎖️ EQ MASTER AWARD UNLOCKED 🎖️
            </Text>
            <Text style={styles.bonusText}>
              +500 Bonus Points for Speed!
            </Text>
            <TouchableOpacity 
              style={styles.celebrationBtn} 
              onPress={handleCompletionModalClose}
            >
              <Text style={styles.celebrationBtnText}>Continue to Leaderboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showTrivia} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalGlass}>
            <Text style={styles.modalTitle}>DISTRACTION!</Text>
            <Text style={styles.modalBody}>{currentQuestion?.q}</Text>
            <View style={styles.optionGrid}>
              {currentQuestion?.options.map((opt,i)=>(
                <TouchableOpacity key={i} style={styles.optionBtn} onPress={()=>handleTriviaAnswer(i)}>
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={gameOver} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.overlay}>
          <View style={styles.modalGlass}>
            {!showLeaderboard ? (
              <>
                <Text style={styles.modalTitle}>GAME OVER</Text>
                <Text style={styles.scoreBig}>{score}</Text>
                {isEQMaster && (
                  <View style={styles.eqMasterSubmission}>
                    <Text style={styles.eqMasterBadgeText}>🏆 EQ MASTER</Text>
                    <Text style={styles.eqMasterDescription}>Completed with time remaining!</Text>
                  </View>
                )}
                <TextInput 
                  ref={textInputRef}
                  style={styles.input} 
                  placeholder="Enter Your Name" 
                  placeholderTextColor={THEME.subText}
                  value={playerName} 
                  onChangeText={setPlayerName}
                  onSubmitEditing={handleNameSubmit}
                  returnKeyType="done"
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={20}
                />
                <TouchableOpacity 
                  style={[styles.primaryBtn, !playerName.trim() && styles.disabledBtn]} 
                  onPress={submitScore}
                  disabled={!playerName.trim()}
                >
                  <Text style={styles.btnText}>
                    {playerName.trim() ? 'Submit Results' : 'Enter Name First'}
                  </Text>
                </TouchableOpacity>

                {!playerName.trim() && (
                  <Text style={styles.hintText}>Please enter your name to submit</Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>LEADERBOARD</Text>
                {highScores.map((h,i)=>(
                  <View key={i} style={styles.scoreRow}>
                    <View style={styles.leaderboardName}>
                      <Text style={styles.scoreTxt}>#{i+1} {h.name}</Text>
                      {h.isEQMaster && <Text style={styles.leaderboardBadge}> 🏆</Text>}
                    </View>
                    <Text style={[styles.scoreTxt, {color: THEME.accent}]}>{h.score}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.secondaryBtn} onPress={onExit}>
                  <Text style={styles.btnTextSec}>Return to Lobby</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// --- 7. HOME SCREEN ---
const MainMenu = ({ setScreen }: { setScreen: any }) => {
  const [quote, setQuote] = useState(QUOTES[0]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const newQuote = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true })
    ]).start();
    setTimeout(() => setQuote(QUOTES[Math.floor(Math.random()*QUOTES.length)]), 200);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.menuHeader}>The Lab</Text>

      <View style={styles.desktopLayout}>
        {/* LEFT: Content */}
        <View style={styles.columnLeft}>
          
          {/* Researchers: Row */}
          <Text style={styles.sectionHeader}>Researchers</Text>
          <View style={styles.profilesRowContainer}>
            {PROFILES.map((p, i) => (
              <View key={i} style={styles.profileWrapper}>
                <View style={styles.profileCircleOutline}><Image source={{ uri: p.img }} style={styles.profileImg} /></View>
                <Text style={styles.profileName}>{p.name}</Text>
              </View>
            ))}
          </View>

          {/* Quote */}
          <View style={styles.quoteCard}>
            <Text style={styles.quoteLabel}>DAILY INSPIRATION</Text>
            <Animated.Text style={[styles.quoteText, { opacity: fadeAnim }]}>"{quote}"</Animated.Text>
            <TouchableOpacity onPress={newQuote} style={styles.quoteBtn}><Text style={styles.quoteBtnText}>New Quote</Text></TouchableOpacity>
          </View>

          {/* Experiments: 2x2 Grid */}
          <Text style={styles.sectionHeader}>Experiments</Text>
          <View style={styles.gameGrid}>
            <MenuCard title="Mwape's Melody" desc="Audio Logic" onPress={() => setScreen('mwape')} />
            <MenuCard title="Brilu's Engine" desc="Systems Eng." onPress={() => setScreen('brilu')} />
            <MenuCard title="Ngozi's Runway" desc="Visuals" onPress={() => setScreen('ngozi')} />
            <MenuCard title="Kurt's Summit" desc="Spatial Sort" onPress={() => setScreen('kurt')} />
          </View>
        </View>

        {/* RIGHT: Music Player (Desktop) or Bottom (Mobile) */}
        <View style={styles.columnRight}>
           <BigMusicPlayer />
        </View>
      </View>
    </ScrollView>
  );
};

const MenuCard = ({ title, desc, onPress }: any) => (
  <TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.9}>
    <View style={styles.menuCardInner}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>{desc}</Text>
      <View style={styles.arrowBox}><Text style={styles.arrowText}>→</Text></View>
    </View>
  </TouchableOpacity>
);

// --- 8. APP ENTRY ---
export default function App() {
  const [screen, setScreen] = useState<'splash' | 'menu' | GameKey>('splash');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' }).start();
    setTimeout(() => setScreen('menu'), 3000);
  }, []);

  if (screen === 'splash') {
    return (
      <View style={styles.splashContainer}>
         <Animated.View style={{opacity: fadeAnim, alignItems:'center'}}>
           <Text style={styles.splashTitleMain}>The EQ</Text>
           <Text style={styles.splashTitleAccent}>PANDEMIC</Text>
         </Animated.View>
      </View>
    );
  }

  return (
    <MusicProvider>
      <View style={styles.container}>
        {screen === 'menu' ? <MainMenu setScreen={setScreen} /> : <PuzzleGame gameKey={screen} onExit={() => setScreen('menu')} />}
      </View>
    </MusicProvider>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  scrollContainer: { padding: 20, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  bgCircle: { position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: 250, backgroundColor: THEME.accent, opacity: 0.15 },

  // Splash
  splashContainer: { flex: 1, backgroundColor: THEME.bg, justifyContent: 'center', alignItems: 'center' },
  splashTitleMain: { fontSize: 50, fontWeight: '300', color: THEME.text },
  splashTitleAccent: { fontSize: 60, fontWeight: '900', color: THEME.accent, letterSpacing: 2 },

  // Menu Layout
  desktopLayout: { flexDirection: IS_DESKTOP ? 'row' : 'column', gap: 40 },
  columnLeft: { flex: 2 },
  columnRight: { flex: 1, paddingTop: 20 },
  menuHeader: { fontSize: 40, fontWeight: '900', color: THEME.text, marginBottom: 20, letterSpacing: -1 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: THEME.subText, marginBottom: 15, textTransform: 'uppercase', marginTop: 20 },

  // Profiles (Row)
  profilesRowContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 },
  profileWrapper: { alignItems: 'center' },
  profileCircleOutline: { width: 70, height: 70, borderRadius: 35, overflow: 'hidden', marginBottom: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: THEME.accent },
  profileImg: { width: '100%', height: '100%' },
  profileName: { fontSize: 12, fontWeight: '700', color: THEME.text, textTransform: 'uppercase' },

  // Quote
  quoteCard: { marginTop: 20, padding: 20, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 20, borderWidth: 1, borderColor: '#fff' },
  quoteLabel: { fontSize: 10, fontWeight: '800', color: THEME.accent, marginBottom: 10 },
  quoteText: { fontSize: 16, fontStyle: 'italic', color: THEME.text, marginBottom: 15 },
  quoteBtn: { backgroundColor: THEME.accent, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, alignSelf: 'flex-start' },
  quoteBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // Game Grid (2x2)
  gameGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15 },
  menuCard: { width: '47%', backgroundColor: '#fff', borderRadius: 25, padding: 20, ...THEME.shadow, height: 150, justifyContent: 'center' },
  menuCardInner: { flex: 1, justifyContent: 'space-between' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: THEME.text },
  cardSub: { fontSize: 12, color: THEME.subText },
  arrowBox: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end' },
  arrowText: { color: '#fff', fontWeight: 'bold' },

  // BIG PLAYER (Home)
  bigPlayerCard: { backgroundColor: THEME.darkGlass, borderRadius: 30, overflow: 'hidden', padding: 25, ...THEME.shadow },
  bigAlbumArt: { width: '100%', aspectRatio: 1, borderRadius: 10, marginBottom: 20, backgroundColor: '#333' },
  trackMeta: { alignItems: 'center', marginBottom: 20 },
  trackTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  artistName: { fontSize: 14, color: '#aaa', textTransform: 'uppercase' },
  progressBarContainer: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginBottom: 20 },
  progressBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 30, marginBottom: 25 },
  playBtnLarge: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  playIconLarge: { fontSize: 28, color: '#000' },
  controlIconSecondary: { fontSize: 28, color: '#fff' },
  volumeRow: { flexDirection: 'row', alignItems: 'center', justifyContent:'center', gap: 15, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  volText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  volLabel: { color: '#ccc', fontSize: 10, fontWeight: '700' },

  // MINI PLAYER (In-Game)
  miniPlayerCard: { backgroundColor: '#1A1A1A', borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  miniLabel: { color: THEME.accent, fontSize: 8, fontWeight: '700' },
  miniTitle: { color: '#fff', fontWeight: '600' },
  miniPlayBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  miniPlayIcon: { fontSize: 12 },
  miniNextBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  miniNextIcon: { color: '#fff', fontSize: 12 },

  // GAME SCREEN
  gameContainer: { flex: 1, backgroundColor: THEME.bg, padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  gameTitle: { fontSize: 24, fontWeight: '900', color: THEME.text, letterSpacing: 2 },
  glassBtn: { padding: 10, backgroundColor: '#fff', borderRadius: 20 },
  glassBtnText: { fontWeight: '600' },
  splitLayout: { flex: 1, flexDirection: IS_DESKTOP ? 'row' : 'column', gap: 20, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  leftPanel: { flex: 2, justifyContent: 'center', alignItems: 'center' },
  gridContainer: { width: '100%', aspectRatio: 1, maxWidth: 500, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10 },
  tile: { width: '23%', height: '23%', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', ...THEME.shadow },
  activeTile: { backgroundColor: '#FDFDFD' },
  selectedTile: { backgroundColor: THEME.accent },
  emptyTile: { backgroundColor: 'transparent', elevation: 0 },
  tileNumber: { fontSize: 28, fontWeight: '300', color: THEME.text },
  godModeBorder: { borderColor: THEME.accent, borderWidth: 2, borderRadius: 10 },
  godModeText: { color: THEME.accent, fontWeight: '900', fontSize: 18, marginTop: 10 },
  
  rightPanel: { flex: 1, justifyContent: 'flex-start' },
  dashboardCard: { backgroundColor: THEME.glass, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: THEME.glassBorder, ...THEME.shadow, marginBottom: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 12, fontWeight: '700', color: THEME.subText, letterSpacing: 1 },
  statValue: { fontSize: 32, fontWeight: '300', color: THEME.text },
  dashTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: THEME.text },
  miniScoreRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  miniScoreName: { fontWeight: '600', color: THEME.text },
  miniScoreVal: { fontWeight: '300', color: THEME.text },

  // EQ Master Badge Styles
  eqMasterBadge: {
    backgroundColor: THEME.accent,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: 'center',
  },
  eqMasterText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    fontSize: 12,
    marginLeft: 5,
  },
  eqMasterSubmission: {
    backgroundColor: 'rgba(255, 140, 66, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.accent,
  },
  eqMasterBadgeText: {
    color: THEME.accent,
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 5,
  },
  eqMasterDescription: {
    color: THEME.subText,
    fontSize: 12,
    fontWeight: '600',
  },
  leaderboardName: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardBadge: {
    fontSize: 14,
  },

  // Completion Modal Styles
  completionModal: {
    alignItems: 'center',
    padding: 30,
  },
  celebrationEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.accent,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  completionSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  completionText: {
    fontSize: 16,
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  eqMasterAward: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  bonusText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.accent,
    textAlign: 'center',
    marginBottom: 25,
  },
  celebrationBtn: {
    backgroundColor: THEME.accent,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    ...THEME.shadow,
  },
  celebrationBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(247, 245, 242, 0.9)', justifyContent: 'center', alignItems: 'center' },
  modalGlass: { width: '90%', maxWidth: 400, backgroundColor: '#fff', padding: 30, borderRadius: 30, ...THEME.shadow, alignItems: 'center' },
  modalTitle: { fontSize: 14, fontWeight: '900', color: THEME.accent, letterSpacing: 2, marginBottom: 20 },
  modalBody: { fontSize: 20, textAlign: 'center', marginBottom: 30, fontWeight: '500', color: THEME.text },
  scoreBig: { fontSize: 70, fontWeight: '900', color: THEME.text, marginBottom: 20 },
  input: { width: '100%', padding: 15, backgroundColor: '#F5F5F5', borderRadius: 12, fontSize: 18, marginBottom: 20, textAlign: 'center', borderWidth: 2, borderColor: '#E5E5E5' },
  primaryBtn: { width: '100%', padding: 16, backgroundColor: '#1A1A1A', borderRadius: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  secondaryBtn: { marginTop: 15 },
  btnTextSec: { color: THEME.subText, fontWeight: '600' },
  hintText: {
    color: THEME.subText,
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  optionGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionBtn: { width: '48%', padding: 15, backgroundColor: '#F7F5F2', borderRadius: 12, alignItems: 'center' },
  optionText: { fontWeight: '600', color: THEME.text, textAlign: 'center' },
  scoreRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  scoreTxt: { fontSize: 18, fontWeight: '500' }
});