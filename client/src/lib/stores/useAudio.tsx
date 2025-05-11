import { create } from "zustand";

// Track identifiers
export type MusicTrack = 'main' | 'alternate';

// Sound types for playSound function
export type SoundEffect = 'hit' | 'success' | 'powerUp' | 'explosion' | 'splash';

interface AudioState {
  // Audio elements
  backgroundMusic: HTMLAudioElement | null;
  alternateMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  
  // State
  isMuted: boolean;
  currentTrack: MusicTrack;
  volume: number;
  
  // Loading function
  loadSounds: () => void;
  
  // Control functions
  toggleMute: () => void;
  switchTrack: (track: MusicTrack) => void;
  setVolume: (volume: number) => void;
  playHit: () => void;
  playSuccess: () => void;
  playBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
  
  // Generic sound player
  playSound: (soundType: SoundEffect) => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  alternateMusic: null,
  hitSound: null,
  successSound: null,
  isMuted: true, // Start muted by default
  currentTrack: 'main',
  volume: 0.3,
  
  // Placeholder will be properly implemented below
  
  loadSounds: () => {
    // Create audio elements
    const background = new Audio('/sounds/background.mp3');
    background.loop = true;
    background.volume = 0.3;
    
    const alternate = new Audio('/sounds/sailing_alt.mp3');
    alternate.loop = true;
    alternate.volume = 0.3;
    
    const hit = new Audio('/sounds/hit.mp3');
    hit.volume = 0.3;
    
    const success = new Audio('/sounds/success.mp3');
    success.volume = 0.5;
    
    // Set audio elements in state
    set({ 
      backgroundMusic: background,
      alternateMusic: alternate,
      hitSound: hit,
      successSound: success
    });
    
    console.log("Game sounds loaded");
  },
  
  toggleMute: () => {
    const { isMuted, currentTrack, backgroundMusic, alternateMusic } = get();
    const newMutedState = !isMuted;
    
    set({ isMuted: newMutedState });
    
    // Get the currently active music track
    const activeMusic = currentTrack === 'main' ? backgroundMusic : alternateMusic;
    
    // Update music based on mute state
    if (activeMusic) {
      if (newMutedState) {
        activeMusic.pause();
      } else if (activeMusic.paused) {
        activeMusic.play().catch(error => {
          console.log(`Background music play prevented:`, error);
        });
      }
    }
    
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
  },
  
  switchTrack: (track: MusicTrack) => {
    const { 
      currentTrack, 
      backgroundMusic, 
      alternateMusic, 
      isMuted, 
      volume 
    } = get();
    
    // No change needed if already on this track
    if (track === currentTrack) return;
    
    // Stop current track
    const currentMusic = currentTrack === 'main' ? backgroundMusic : alternateMusic;
    if (currentMusic) {
      currentMusic.pause();
      currentMusic.currentTime = 0;
    }
    
    // Start new track if not muted
    const newMusic = track === 'main' ? backgroundMusic : alternateMusic;
    if (newMusic && !isMuted) {
      newMusic.volume = volume;
      newMusic.play().catch(error => {
        console.log(`New music track play prevented:`, error);
      });
    }
    
    // Update state
    set({ currentTrack: track });
    console.log(`Switched to ${track} music track`);
  },
  
  setVolume: (volume: number) => {
    const { backgroundMusic, alternateMusic, currentTrack } = get();
    
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    // Update volume for all audio elements
    if (backgroundMusic) backgroundMusic.volume = clampedVolume;
    if (alternateMusic) alternateMusic.volume = clampedVolume;
    
    // Update state
    set({ volume: clampedVolume });
    console.log(`Set volume to ${clampedVolume}`);
  },
  
  playHit: () => {
    const { hitSound, isMuted, volume } = get();
    if (hitSound && !isMuted) {
      // Clone the sound to allow overlapping playback
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = volume;
      soundClone.play().catch(error => {
        console.log("Hit sound play prevented:", error);
      });
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted, volume } = get();
    if (successSound && !isMuted) {
      successSound.currentTime = 0;
      successSound.volume = volume;
      successSound.play().catch(error => {
        console.log("Success sound play prevented:", error);
      });
    }
  },
  
  playBackgroundMusic: () => {
    const { 
      backgroundMusic, 
      alternateMusic, 
      isMuted, 
      currentTrack,
      volume
    } = get();
    
    // Get the current track based on the state
    const activeMusic = currentTrack === 'main' ? backgroundMusic : alternateMusic;
    
    if (activeMusic && !isMuted) {
      activeMusic.volume = volume;
      activeMusic.play().catch(error => {
        console.log("Background music play prevented:", error);
      });
    }
  },
  
  stopBackgroundMusic: () => {
    const { backgroundMusic, alternateMusic, currentTrack } = get();
    
    // Get the current track based on the state
    const activeMusic = currentTrack === 'main' ? backgroundMusic : alternateMusic;
    
    if (activeMusic) {
      activeMusic.pause();
      activeMusic.currentTime = 0;
      console.log("Background music stopped");
    }
  },
  
  // Generic sound player
  playSound: (soundType: SoundEffect) => {
    const { hitSound, successSound, isMuted, volume } = get();
    
    if (isMuted) return; // Don't play sounds when muted
    
    let sound: HTMLAudioElement | null = null;
    
    // Select the appropriate sound
    switch (soundType) {
      case 'hit':
        sound = hitSound;
        break;
      case 'success':
        sound = successSound;
        break;
      case 'powerUp':
        // Use success sound for powerUp for now
        sound = successSound;
        break;
      case 'explosion':
        // Use hit sound for explosion for now
        sound = hitSound;
        break;
      case 'splash':
        // Use hit sound for splash for now 
        sound = hitSound;
        break;
      default:
        console.warn(`Unknown sound type: ${soundType}`);
        return;
    }
    
    // Play the sound if available
    if (sound) {
      // Clone the sound to allow overlapping playback
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = volume;
      
      // Adjust volume based on sound type
      if (soundType === 'powerUp') {
        soundClone.volume = volume * 1.2; // Make power-ups slightly louder
      } else if (soundType === 'explosion') {
        soundClone.volume = volume * 1.3; // Make explosions louder
      } else if (soundType === 'splash') {
        soundClone.volume = volume * 0.7; // Make splashes quieter
      }
      
      soundClone.play().catch(error => {
        console.log(`${soundType} sound play prevented:`, error);
      });
    }
  }
}));
