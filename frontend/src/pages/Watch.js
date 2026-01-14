import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, SkipForward, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { toast } from 'sonner';
import axios from 'axios';
import React from 'react';
import ReactPlayer from 'react-player';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function Watch() {
  const { episodeId } = useParams();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState(null);
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipRecap, setShowSkipRecap] = useState(false);
  const playerRef = React.useRef(null);
  const controlsTimeout = React.useRef(null);

  useEffect(() => {
    fetchEpisodeData();
  }, [episodeId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playing && episode && progress > 0) {
        saveProgress(progress);
      }
    }, 10000); // Save every 10 seconds

    return () => clearInterval(interval);
  }, [playing, progress, episode]);

  const fetchEpisodeData = async () => {
    try {
      // Get all episodes to find current episode and anime
      const episodesRes = await axios.get(`${API_URL}/api/anime`);
      let foundEpisode = null;
      let foundAnime = null;
      
      for (const anime of episodesRes.data) {
        const eps = await axios.get(`${API_URL}/api/anime/${anime.anime_id}/episodes`);
        const ep = eps.data.find(e => e.episode_id === episodeId);
        if (ep) {
          foundEpisode = ep;
          foundAnime = anime;
          setEpisodes(eps.data);
          break;
        }
      }

      if (!foundEpisode || !foundAnime) {
        toast.error('Episode not found');
        navigate('/');
        return;
      }

      setEpisode(foundEpisode);
      setAnime(foundAnime);
      setDuration(foundEpisode.duration_seconds);

      // Load saved progress
      const profileId = localStorage.getItem('selectedProfile');
      if (profileId) {
        try {
          const historyRes = await axios.get(
            `${API_URL}/api/watch-history/${profileId}/continue-watching`,
            { withCredentials: true }
          );
          const savedProgress = historyRes.data.find(
            h => h.episode.episode_id === episodeId
          );
          if (savedProgress && savedProgress.progress_seconds > 10) {
            setProgress(savedProgress.progress_seconds);
            playerRef.current?.seekTo(savedProgress.progress_seconds, 'seconds');
          }
        } catch (error) {
          // No saved progress
        }
      }
    } catch (error) {
      toast.error('Failed to load episode');
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (seconds) => {
    const profileId = localStorage.getItem('selectedProfile');
    if (!profileId || !episode || !anime) return;

    try {
      await axios.post(
        `${API_URL}/api/watch-history`,
        {
          anime_id: anime.anime_id,
          episode_id: episode.episode_id,
          progress_seconds: Math.floor(seconds),
          completed: seconds >= duration * 0.9
        },
        { params: { profile_id: profileId }, withCredentials: true }
      );
    } catch (error) {
      // Silent fail
    }
  };

  const handleProgress = (state) => {
    setProgress(state.playedSeconds);

    // Show skip intro button
    if (episode?.skip_intro_start && episode?.skip_intro_end) {
      if (state.playedSeconds >= episode.skip_intro_start && state.playedSeconds <= episode.skip_intro_end) {
        setShowSkipIntro(true);
      } else {
        setShowSkipIntro(false);
      }
    }

    // Show skip recap button
    if (episode?.skip_recap_start && episode?.skip_recap_end) {
      if (state.playedSeconds >= episode.skip_recap_start && state.playedSeconds <= episode.skip_recap_end) {
        setShowSkipRecap(true);
      } else {
        setShowSkipRecap(false);
      }
    }
  };

  const handleSkipIntro = () => {
    if (episode?.skip_intro_end) {
      playerRef.current?.seekTo(episode.skip_intro_end, 'seconds');
      setShowSkipIntro(false);
    }
  };

  const handleSkipRecap = () => {
    if (episode?.skip_recap_end) {
      playerRef.current?.seekTo(episode.skip_recap_end, 'seconds');
      setShowSkipRecap(false);
    }
  };

  const handleNextEpisode = () => {
    const currentIndex = episodes.findIndex(ep => ep.episode_id === episodeId);
    if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
      navigate(`/watch/${episodes[currentIndex + 1].episode_id}`);
    }
  };

  const handleEnded = () => {
    saveProgress(duration);
    // Auto play next episode
    const currentIndex = episodes.findIndex(ep => ep.episode_id === episodeId);
    if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
      setTimeout(() => handleNextEpisode(), 3000);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!episode || !anime) {
    return <div className="min-h-screen bg-black flex items-center justify-center">Episode not found</div>;
  }

  const currentIndex = episodes.findIndex(ep => ep.episode_id === episodeId);
  const hasNextEpisode = currentIndex >= 0 && currentIndex < episodes.length - 1;

  return (
    <div
      className="relative w-full h-screen bg-black overflow-hidden"
      onMouseMove={handleMouseMove}
      data-testid="watch-page"
    >
      {/* Video Player */}
      <div className="absolute inset-0">
        <ReactPlayer
          ref={playerRef}
          url={episode.video_url}
          width="100%"
          height="100%"
          playing={playing}
          volume={volume}
          muted={muted}
          onProgress={handleProgress}
          onDuration={setDuration}
          onEnded={handleEnded}
          progressInterval={1000}
          config={{
            file: {
              attributes: {
                crossOrigin: 'anonymous'
              }
            }
          }}
        />
      </div>

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/anime/${anime.anime_id}`)}
            data-testid="back-to-anime-btn"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1 ml-4">
            <h2 className="text-xl font-bold" style={{fontFamily: 'Outfit'}}>
              {anime.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              S{episode.season_number} E{episode.episode_number} - {episode.title}
            </p>
          </div>
        </div>

        {/* Skip Buttons */}
        {showSkipIntro && (
          <Button
            className="absolute top-1/2 right-8 transform -translate-y-1/2"
            onClick={handleSkipIntro}
            data-testid="skip-intro-btn"
          >
            Skip Intro <SkipForward className="ml-2 h-4 w-4" />
          </Button>
        )}
        {showSkipRecap && (
          <Button
            className="absolute top-1/2 right-8 transform -translate-y-1/2"
            onClick={handleSkipRecap}
            data-testid="skip-recap-btn"
          >
            Skip Recap <SkipForward className="ml-2 h-4 w-4" />
          </Button>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {/* Progress Bar */}
          <Slider
            value={[progress]}
            max={duration}
            step={1}
            onValueChange={(value) => {
              setProgress(value[0]);
              playerRef.current?.seekTo(value[0], 'seconds');
            }}
            className="mb-4"
          />

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPlaying(!playing)}
                data-testid="play-pause-btn"
              >
                {playing ? (
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMuted(!muted)}
                  data-testid="mute-btn"
                >
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                <Slider
                  value={[muted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={(value) => {
                    setVolume(value[0]);
                    setMuted(value[0] === 0);
                  }}
                  className="w-24"
                />
              </div>

              <span className="text-sm">
                {formatTime(progress)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasNextEpisode && (
                <Button
                  variant="secondary"
                  onClick={handleNextEpisode}
                  data-testid="next-episode-btn"
                >
                  Next Episode <SkipForward className="ml-2 h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    document.documentElement.requestFullscreen();
                  }
                }}
                data-testid="fullscreen-btn"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default Watch;