import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, 
  Modal, Platform, TextInput, Animated, Dimensions 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

// --- AESTHETIC CONFIGURATION ---
const COLUMNS = 4;
const SCREEN_WIDTH = Dimensions.get('window').width;
const IS_DESKTOP = SCREEN_WIDTH > 768;

const THEME = {
  bg: '#F7F5F2',
  glass: 'rgba(255, 255, 255, 0.65)',
  glassBorder: 'rgba(255, 255, 255, 0.9)',
  text: '#1A1A1A',
  subText: '#666666',
  accent: '#FF8C42',
  accentGradient: ['#FF8C42', '#FF5F2E'],
  shadow: {
    shadowColor: "#5E5045",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  }
};

// --- WORKING MUSIC PLAYLIST WITH TEST URLs ---
const PLAYLIST = [
  { 
    title: "Deep Focus", 
    uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
  },
  { 
    title: "Lounge Vibe", 
    uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" 
  },
  { 
    title: "Brain Flow",  
    uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" 
  },
  { 
    title: "Zen Garden",  
    uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" 
  },
];

// --- TYPES ---
type GameKey = 'mwape' | 'brilu' | 'ngozi' | 'kurt';

interface TriviaQuestion { q: string; options: string[]; correct: number; }
interface HighScore { name: string; score: number; }

const TRIVIA_DATA: Record<GameKey, TriviaQuestion[]> = {
  mwape: [ 
    { q: "Standard House Music BPM?", options: ["80", "124", "160", "200"], correct: 1 },
    { q: "Time signature of dance?", options: ["3/4", "4/4", "6/8", "5/4"], correct: 1 },
    { q: "Which is a drum machine?", options: ["TR-808", "Strat", "Gibson", "Violin"], correct: 0 },
  ],
  brilu: [ 
    { q: "What charges the battery?", options: ["Alternator", "Starter", "Piston", "Turbo"], correct: 0 },
    { q: "V8 means?", options: ["8 Valves", "8 Gears", "8 Cylinders", "8 Doors"], correct: 2 },
    { q: "Fix for overheating?", options: ["More Gas", "Coolant", "Oil", "Brake Fluid"], correct: 1 },
  ],
  ngozi: [ 
    { q: "Complementary to Blue?", options: ["Green", "Red", "Orange", "Purple"], correct: 2 },
    { q: "Silhouette refers to?", options: ["Color", "Shape", "Fabric", "Price"], correct: 1 },
    { q: "Primary colors?", options: ["R/G/B", "R/Y/B", "C/M/Y", "B/W/G"], correct: 1 },
  ],
  kurt: [ 
    { q: "Knot for tie-in?", options: ["Square", "Figure 8", "Slipknot", "Granny"], correct: 1 },
    { q: "Device to descend?", options: ["Ascender", "Belay", "Carabiner", "Rappel"], correct: 1 },
    { q: "Climbing communication?", options: ["On Belay?", "Hello?", "Help!", "Go?"], correct: 0 },
  ]
};

// --- FIXED MUSIC PLAYER COMPONENT ---
const MusicPlayer = () => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Request audio permissions and setup
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('Audio permissions granted');
      } catch (error) {
        console.log('Audio permissions error:', error);
      }
    };

    setupAudio();
  }, []);

  // Cleanup sound on unmount
  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading sound');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const loadAndPlay = async (index: number) => {
    try {
      setIsLoading(true);
      
      // Unload previous sound
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      console.log('Loading track:', PLAYLIST[index].uri);
      
      // Create and play new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: PLAYLIST[index].uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      setTrackIndex(index);
      setIsPlaying(true);
      
    } catch (error) {
      console.log('Error loading audio:', error);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      nextTrack();
    }
  };

  const togglePlay = async () => {
    if (!sound) {
      await loadAndPlay(trackIndex);
      return;
    }

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.log('Playback error:', error);
    }
  };

  const nextTrack = () => {
    const next = (trackIndex + 1) % PLAYLIST.length;
    loadAndPlay(next);
  };

  return (
    <View style={styles.musicCard}>
      <View style={styles.musicInfo}>
        <Text style={styles.musicLabel}>Now Playing</Text>
        <Text style={styles.musicTitle}>{PLAYLIST[trackIndex].title}</Text>
        {isLoading && <Text style={styles.loadingText}>Loading audio...</Text>}
      </View>
      <View style={styles.musicControls}>
        <TouchableOpacity 
          onPress={togglePlay} 
          style={[styles.playBtn, isLoading && styles.disabledBtn]}
          disabled={isLoading}
        >
          <Text style={styles.playIcon}>
            {isLoading ? "⏳" : isPlaying ? "⏸" : "▶"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={nextTrack} 
          style={[styles.nextBtn, isLoading && styles.disabledBtn]}
          disabled={isLoading}
        >
          <Text style={styles.nextIcon}>⏭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- PUZZLE GAME COMPONENT ---
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
  
  const [playerName, setPlayerName] = useState('');
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('last_player_name').then(name => {
      if(name) setPlayerName(name);
    });
    startNewGame();
    
    AsyncStorage.getItem(`leaderboard_${gameKey}`).then(json => {
      if(json) setHighScores(JSON.parse(json));
    });

    const triviaInterval = setInterval(() => {
      if (!isFrozen && !gameOver && timer > 0) triggerTrivia();
    }, 15000);
    return () => clearInterval(triviaInterval);
  }, []);

  useEffect(() => {
    let interval: any;
    if (timer > 0 && !isFrozen && !showTrivia && !gameOver) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer <= 0 && !gameOver) {
      handleGameOver();
    }
    return () => clearInterval(interval);
  }, [timer, isFrozen, showTrivia, gameOver]);

  const startNewGame = () => {
    let newTiles = Array.from({length: 15}, (_, i) => i + 1);
    newTiles.push(0); 
    for (let i = 0; i < 150; i++) {
      const emptyIdx = newTiles.indexOf(0);
      const neighbors = getNeighbors(emptyIdx);
      const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
      [newTiles[emptyIdx], newTiles[randomNeighbor]] = [newTiles[randomNeighbor], newTiles[emptyIdx]];
    }
    setTiles(newTiles);
  };

  const getNeighbors = (index: number) => {
    const row = Math.floor(index / COLUMNS);
    const col = index % COLUMNS;
    const moves = [];
    if (row > 0) moves.push(index - COLUMNS);
    if (row < COLUMNS - 1) moves.push(index + COLUMNS);
    if (col > 0) moves.push(index - 1);
    if (col < COLUMNS - 1) moves.push(index + 1);
    return moves;
  };

  const handleTilePress = (index: number) => {
    if (isGodMode) {
      if (tiles[index] === 0) return;
      if (godSelection === null) {
        setGodSelection(index);
      } else {
        const newTiles = [...tiles];
        [newTiles[godSelection], newTiles[index]] = [newTiles[index], newTiles[godSelection]];
        setTiles(newTiles);
        setGodSelection(null);
        checkWin(newTiles);
      }
      return;
    }

    const emptyIndex = tiles.indexOf(0);
    const neighbors = getNeighbors(emptyIndex);
    if (neighbors.includes(index)) {
      const newTiles = [...tiles];
      [newTiles[emptyIndex], newTiles[index]] = [newTiles[index], newTiles[emptyIndex]];
      setTiles(newTiles);
      checkWin(newTiles);
    }
  };

  const checkWin = (currentTiles: number[]) => {
    const isWin = currentTiles.slice(0, 15).every((val, i) => val === i + 1);
    if (isWin) {
      setScore(s => s + 1000 + (timer * 10)); 
      handleGameOver();
    }
  };

  const triggerTrivia = () => {
    const questions = TRIVIA_DATA[gameKey];
    const randomQ = questions[Math.floor(Math.random() * questions.length)];
    setCurrentQuestion(randomQ);
    setShowTrivia(true);
  };

  const handleTriviaAnswer = (index: number) => {
    const isCorrect = index === currentQuestion?.correct;
    setShowTrivia(false);
    if (isCorrect) {
      setScore(s => s + 200); 
      setIsFrozen(true);
      setIsGodMode(true);
      setTimeout(() => { 
        setIsFrozen(false); 
        setIsGodMode(false); 
        setGodSelection(null); 
      }, 5000);
    } else {
      setTimer(t => Math.max(0, t - 15));
    }
  };

  const handleGameOver = async () => {
    setGameOver(true);
  };

  const submitScore = async () => {
    if (!playerName.trim()) return;
    
    await AsyncStorage.setItem('last_player_name', playerName);

    const newEntry: HighScore = { name: playerName, score };
    const updatedScores = [...highScores, newEntry].sort((a, b) => b.score - a.score).slice(0, 5);

    setHighScores(updatedScores);
    setShowLeaderboard(true);
    await AsyncStorage.setItem(`leaderboard_${gameKey}`, JSON.stringify(updatedScores));
  };

  return (
    <View style={styles.gameContainer}>
      <View style={styles.bgCircle} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onExit} style={styles.glassBtn}>
          <Text style={styles.glassBtnText}>← Exit Lab</Text>
        </TouchableOpacity>
        <Text style={styles.gameTitle}>{gameKey.toUpperCase()} PUZZLE</Text>
      </View>

      <View style={styles.splitLayout}>
        <View style={styles.leftPanel}>
          <View style={[styles.gridContainer, isGodMode && styles.godModeBorder]}>
            {tiles.map((num, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  styles.tile,
                  num === 0 ? styles.emptyTile : styles.activeTile,
                  godSelection === index && styles.selectedTile
                ]}
                onPress={() => handleTilePress(index)}
                activeOpacity={0.9}
                disabled={(num === 0 && !isGodMode) || gameOver}
              >
                {num !== 0 && (
                  <Text style={[styles.tileNumber, isGodMode && {color: THEME.accent}]}>{num}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          {isGodMode && <Text style={styles.godModeText}>GOD MODE ACTIVE</Text>}
        </View>

        <ScrollView style={styles.rightPanel} contentContainerStyle={{gap: 20}}>
          <View style={styles.dashboardCard}>
            <View style={styles.statRow}>
              <View>
                <Text style={styles.statLabel}>TIME</Text>
                <Text style={[styles.statValue, isFrozen && {color: THEME.accent}]}>
                  {isFrozen ? "STOP" : timer}s
                </Text>
              </View>
              <View>
                <Text style={styles.statLabel}>SCORE</Text>
                <Text style={styles.statValue}>{score}</Text>
              </View>
            </View>
          </View>

          <MusicPlayer />

          <View style={styles.dashboardCard}>
            <Text style={styles.dashTitle}>Top Researchers</Text>
            {highScores.length === 0 ? (
               <Text style={{color: THEME.subText, fontStyle:'italic'}}>No data yet...</Text>
            ) : (
              highScores.slice(0, 3).map((h, i) => (
                <View key={i} style={styles.miniScoreRow}>
                  <Text style={styles.miniScoreName}>{h.name}</Text>
                  <Text style={styles.miniScoreVal}>{h.score}</Text>
                </View>
              ))
            )}
            {playerName !== '' && !gameOver && (
                <View style={{marginTop: 10, borderTopWidth: 1, borderColor: '#eee', paddingTop: 5}}>
                     <Text style={styles.statLabel}>PLAYING AS</Text>
                     <Text style={styles.miniScoreName}>{playerName}</Text>
                </View>
            )}
          </View>
        </ScrollView>
      </View>

      <Modal visible={showTrivia} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalGlass}>
            <Text style={styles.modalTitle}>DISTRACTION!</Text>
            <Text style={styles.modalBody}>{currentQuestion?.q}</Text>
            <View style={styles.optionGrid}>
              {currentQuestion?.options.map((opt, idx) => (
                <TouchableOpacity key={idx} style={styles.optionBtn} onPress={() => handleTriviaAnswer(idx)}>
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={gameOver} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalGlass}>
            {!showLeaderboard ? (
              <>
                <Text style={styles.modalTitle}>SESSION ENDED</Text>
                <Text style={styles.scoreBig}>{score}</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter Name" 
                  value={playerName} 
                  onChangeText={setPlayerName} 
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={submitScore}>
                  <Text style={styles.btnText}>Submit Results</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>LEADERBOARD</Text>
                {highScores.map((h, i) => (
                  <View key={i} style={styles.scoreRow}>
                    <Text style={styles.scoreTxt}>#{i+1} {h.name}</Text>
                    <Text style={[styles.scoreTxt, {color: THEME.accent}]}>{h.score}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.secondaryBtn} onPress={onExit}>
                  <Text style={styles.btnTextSec}>Return to Lobby</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [screen, setScreen] = useState<'splash' | 'menu' | GameKey>('splash');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.timing(fadeAnim, { 
        toValue: 0, 
        duration: 1500, 
        useNativeDriver: Platform.OS !== 'web' 
      }).start(() => setScreen('menu'));
    }, 2500);
  }, []);

  if (screen === 'splash') {
    return (
      <View style={styles.container}>
        <View style={styles.bgCircle} />
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.splashPre}>By The</Text>
          <Text style={styles.splashEQ}>EQ</Text>
          <Text style={styles.splashPost}>Pandemic</Text>
        </Animated.View>
      </View>
    );
  }

  if (screen === 'menu') {
    return (
      <View style={styles.container}>
        <View style={styles.bgCircle} />
        <ScrollView contentContainerStyle={styles.menuContent}>
          <Text style={styles.menuHeader}>Select Experiment</Text>
          <View style={styles.menuGrid}>
            <MenuCard title="Mwape's Melody" sub="Audio Processing" onPress={() => setScreen('mwape')} />
            <MenuCard title="Brilu's Engine" sub="Mechanical Logic" onPress={() => setScreen('brilu')} />
            <MenuCard title="Ngozi's Runway" sub="Visual Pattern" onPress={() => setScreen('ngozi')} />
            <MenuCard title="Kurt's Summit" sub="Vertical Sort" onPress={() => setScreen('kurt')} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return <PuzzleGame gameKey={screen} onExit={() => setScreen('menu')} />;
}

const MenuCard = ({ title, sub, onPress }: any) => (
  <TouchableOpacity style={styles.menuCard} onPress={onPress}>
    <LinearGradient 
      colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)']} 
      style={styles.menuCardGradient}
    >
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{sub}</Text>
      </View>
      <View style={styles.arrowCircle}>
        <Text style={{color:'#fff'}}>→</Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

// --- STYLES ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: THEME.bg, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  bgCircle: {
    position: 'absolute', 
    top: -100, 
    right: -100, 
    width: 500, 
    height: 500, 
    borderRadius: 250,
    backgroundColor: THEME.accent, 
    opacity: 0.15,
  },

  splashPre: { 
    fontSize: 24, 
    color: THEME.text, 
    letterSpacing: 4, 
    fontWeight: '300' 
  },
  splashEQ: { 
    fontSize: 120, 
    color: THEME.accent, 
    fontWeight: '900', 
    lineHeight: 120 
  },
  splashPost: { 
    fontSize: 40, 
    color: THEME.text, 
    fontWeight: '800' 
  },

  menuContent: { 
    padding: 40, 
    width: '100%', 
    maxWidth: 800, 
    alignSelf: 'center' 
  },
  menuHeader: { 
    fontSize: 42, 
    fontWeight: '300', 
    marginBottom: 40, 
    color: THEME.text 
  },
  menuGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 20 
  },
  menuCard: { 
    width: '48%', 
    minWidth: 280, 
    borderRadius: 20, 
    ...THEME.shadow 
  },
  menuCardGradient: { 
    padding: 30, 
    borderRadius: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#fff' 
  },
  cardTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: THEME.text 
  },
  cardSub: { 
    fontSize: 14, 
    color: THEME.subText, 
    marginTop: 5 
  },
  arrowCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#1A1A1A', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  gameContainer: { 
    flex: 1, 
    backgroundColor: THEME.bg, 
    padding: 20 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  gameTitle: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: THEME.text, 
    letterSpacing: 2 
  },
  glassBtn: { 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    backgroundColor: 'rgba(255,255,255,0.5)', 
    borderRadius: 30, 
    borderWidth: 1, 
    borderColor: '#fff' 
  },
  glassBtnText: { 
    fontWeight: '600', 
    color: THEME.text 
  },

  splitLayout: { 
    flex: 1, 
    flexDirection: IS_DESKTOP ? 'row' : 'column', 
    gap: 30, 
    maxWidth: 1200, 
    alignSelf: 'center', 
    width: '100%' 
  },
  
  leftPanel: { 
    flex: 6, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  gridContainer: { 
    width: '100%', 
    aspectRatio: 1, 
    maxWidth: 600, 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    padding: 10,
  },
  godModeBorder: { 
    borderColor: THEME.accent, 
    borderWidth: 2, 
    borderRadius: 10 
  },
  godModeText: { 
    color: THEME.accent, 
    fontWeight: '900', 
    fontSize: 18, 
    marginTop: 10 
  },
  
  tile: { 
    width: '23%', 
    height: '23%', 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#fff', 
    ...THEME.shadow 
  },
  activeTile: { 
    backgroundColor: '#FDFDFD' 
  },
  selectedTile: { 
    backgroundColor: THEME.accent 
  },
  emptyTile: { 
    backgroundColor: 'transparent', 
    shadowOpacity: 0 
  },
  tileNumber: { 
    fontSize: 32, 
    fontWeight: '300', 
    color: THEME.text 
  },

  rightPanel: { 
    flex: 4, 
    height: '100%' 
  },
  
  dashboardCard: {
    backgroundColor: THEME.glass, 
    borderRadius: 20, 
    padding: 25,
    borderWidth: 1, 
    borderColor: THEME.glassBorder, 
    ...THEME.shadow
  },
  statRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  statLabel: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: THEME.subText, 
    letterSpacing: 1 
  },
  statValue: { 
    fontSize: 36, 
    fontWeight: '300', 
    color: THEME.text 
  },

  musicCard: {
    backgroundColor: '#1A1A1A', 
    borderRadius: 20, 
    padding: 25, 
    ...THEME.shadow
  },
  musicInfo: { 
    marginBottom: 20 
  },
  musicLabel: { 
    color: THEME.accent, 
    fontSize: 10, 
    fontWeight: '700', 
    letterSpacing: 1 
  },
  musicTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: '600', 
    marginTop: 5 
  },
  loadingText: {
    color: THEME.accent,
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  musicControls: { 
    flexDirection: 'row', 
    gap: 15 
  },
  playBtn: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  disabledBtn: {
    opacity: 0.5,
  },
  playIcon: { 
    fontSize: 20 
  },
  nextBtn: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#333', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  nextIcon: { 
    fontSize: 20, 
    color: '#fff' 
  },

  dashTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 15, 
    color: THEME.text 
  },
  miniScoreRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderColor: 'rgba(0,0,0,0.05)' 
  },
  miniScoreName: { 
    fontWeight: '600', 
    color: THEME.text 
  },
  miniScoreVal: { 
    fontWeight: '300', 
    color: THEME.text 
  },

  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(230, 230, 220, 0.8)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalGlass: { 
    width: '90%', 
    maxWidth: 450, 
    backgroundColor: '#fff', 
    padding: 40, 
    borderRadius: 30, 
    ...THEME.shadow, 
    alignItems: 'center' 
  },
  modalTitle: { 
    fontSize: 14, 
    fontWeight: '900', 
    color: THEME.accent, 
    letterSpacing: 2, 
    marginBottom: 20 
  },
  modalBody: { 
    fontSize: 22, 
    textAlign: 'center', 
    marginBottom: 30, 
    fontWeight: '400', 
    color: THEME.text 
  },
  scoreBig: { 
    fontSize: 80, 
    fontWeight: '900', 
    color: THEME.text, 
    marginBottom: 20 
  },
  
  input: { 
    width: '100%', 
    padding: 15, 
    backgroundColor: '#F5F5F5', 
    borderRadius: 12, 
    fontSize: 18, 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  primaryBtn: { 
    width: '100%', 
    padding: 18, 
    backgroundColor: '#1A1A1A', 
    borderRadius: 15, 
    alignItems: 'center' 
  },
  btnText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  secondaryBtn: { 
    marginTop: 10, 
    padding: 15 
  },
  btnTextSec: { 
    color: THEME.subText, 
    fontWeight: '600' 
  },

  optionGrid: { 
    width: '100%', 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10 
  },
  optionBtn: { 
    width: '48%', 
    padding: 15, 
    backgroundColor: '#F7F5F2', 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  optionText: { 
    fontWeight: '600', 
    color: THEME.text 
  },

  scoreRow: { 
    width: '100%', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },
  scoreTxt: { 
    fontSize: 18, 
    fontWeight: '500' 
  }
});