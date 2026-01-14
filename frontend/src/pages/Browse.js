import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Plus, ThumbsUp, Search as SearchIcon, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../components/ui/carousel';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../components/ui/hover-card';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import axios from 'axios';
import Autoplay from 'embla-carousel-autoplay';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function Browse() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [trending, setTrending] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [allAnime, setAllAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroAnime, setHeroAnime] = useState(null);

  useEffect(() => {
    const profileId = localStorage.getItem('selectedProfile');
    if (!profileId) {
      navigate('/profiles');
      return;
    }
    setProfile(profileId);
    fetchData(profileId);
  }, [navigate]);

  const fetchData = async (profileId) => {
    try {
      const [trendingRes, newRes, allRes, continueRes] = await Promise.all([
        axios.get(`${API_URL}/api/anime/trending`),
        axios.get(`${API_URL}/api/anime/new-releases`),
        axios.get(`${API_URL}/api/anime?limit=20`),
        axios.get(`${API_URL}/api/watch-history/${profileId}/continue-watching`, { withCredentials: true })
      ]);

      setTrending(trendingRes.data);
      setNewReleases(newRes.data);
      setAllAnime(allRes.data);
      setContinueWatching(continueRes.data);
      setHeroAnime(trendingRes.data[0] || allRes.data[0]);
    } catch (error) {
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToList = async (animeId) => {
    try {
      await axios.post(
        `${API_URL}/api/my-list`,
        null,
        { params: { anime_id: animeId, profile_id: profile }, withCredentials: true }
      );
      toast.success('Added to My List');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add to list');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
      localStorage.removeItem('selectedProfile');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black"><Skeleton className="w-full h-screen" /></div>;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm transition-all duration-300" data-testid="browse-navbar">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-primary" style={{fontFamily: 'Outfit'}}>
            AnimeFlix
          </h1>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/search')}
              data-testid="search-btn"
            >
              <SearchIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/my-list')}
              data-testid="my-list-btn"
            >
              My List
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      {heroAnime && (
        <div className="relative h-[70vh] md:h-[85vh] w-full flex items-end pb-20" data-testid="hero-section">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${heroAnime.banner_url})`,
              backgroundPosition: 'center 20%'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          
          <div className="relative max-w-[1800px] mx-auto px-4 md:px-8 w-full">
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter mb-4" style={{fontFamily: 'Outfit'}}>
              {heroAnime.title}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mb-6 line-clamp-3">
              {heroAnime.synopsis}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => navigate(`/anime/${heroAnime.anime_id}`)}
                className="bg-primary hover:bg-primary/90"
                data-testid="hero-play-btn"
              >
                <Play className="mr-2 h-5 w-5 fill-current" />
                Play
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate(`/anime/${heroAnime.anime_id}`)}
                className="bg-white/20 hover:bg-white/30"
                data-testid="hero-info-btn"
              >
                <Info className="mr-2 h-5 w-5" />
                More Info
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Rows */}
      <div className="relative -mt-32 z-10 space-y-12 pb-12">
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <section className="max-w-[1800px] mx-auto px-4 md:px-8" data-testid="continue-watching-section">
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-6" style={{fontFamily: 'Outfit'}}>
              Continue Watching
            </h3>
            <Carousel className="w-full" opts={{ align: 'start', loop: false }}>
              <CarouselContent className="-ml-2 md:-ml-4">
                {continueWatching.map((item) => (
                  <CarouselItem key={item.anime.anime_id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                    <AnimeCard
                      anime={item.anime}
                      onPlay={() => navigate(`/watch/${item.episode.episode_id}`)}
                      onInfo={() => navigate(`/anime/${item.anime.anime_id}`)}
                      onAddToList={() => handleAddToList(item.anime.anime_id)}
                      progress={(item.progress_seconds / item.episode.duration_seconds) * 100}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-4" />
              <CarouselNext className="-right-4" />
            </Carousel>
          </section>
        )}

        {/* Trending */}
        <section className="max-w-[1800px] mx-auto px-4 md:px-8" data-testid="trending-section">
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-6" style={{fontFamily: 'Outfit'}}>
            Trending Now
          </h3>
          <Carousel
            className="w-full"
            opts={{ align: 'start', loop: true }}
            plugins={[Autoplay({ delay: 5000 })]}
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {trending.map((anime, index) => (
                <CarouselItem key={anime.anime_id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <AnimeCard
                    anime={anime}
                    rank={index + 1}
                    onPlay={() => navigate(`/anime/${anime.anime_id}`)}
                    onInfo={() => navigate(`/anime/${anime.anime_id}`)}
                    onAddToList={() => handleAddToList(anime.anime_id)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4" />
            <CarouselNext className="-right-4" />
          </Carousel>
        </section>

        {/* New Releases */}
        <section className="max-w-[1800px] mx-auto px-4 md:px-8" data-testid="new-releases-section">
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-6" style={{fontFamily: 'Outfit'}}>
            New Releases
          </h3>
          <Carousel className="w-full" opts={{ align: 'start', loop: false }}>
            <CarouselContent className="-ml-2 md:-ml-4">
              {newReleases.map((anime) => (
                <CarouselItem key={anime.anime_id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <AnimeCard
                    anime={anime}
                    onPlay={() => navigate(`/anime/${anime.anime_id}`)}
                    onInfo={() => navigate(`/anime/${anime.anime_id}`)}
                    onAddToList={() => handleAddToList(anime.anime_id)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4" />
            <CarouselNext className="-right-4" />
          </Carousel>
        </section>

        {/* Popular */}
        <section className="max-w-[1800px] mx-auto px-4 md:px-8" data-testid="popular-section">
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-6" style={{fontFamily: 'Outfit'}}>
            Popular on AnimeFlix
          </h3>
          <Carousel className="w-full" opts={{ align: 'start', loop: false }}>
            <CarouselContent className="-ml-2 md:-ml-4">
              {allAnime.map((anime) => (
                <CarouselItem key={anime.anime_id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <AnimeCard
                    anime={anime}
                    onPlay={() => navigate(`/anime/${anime.anime_id}`)}
                    onInfo={() => navigate(`/anime/${anime.anime_id}`)}
                    onAddToList={() => handleAddToList(anime.anime_id)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4" />
            <CarouselNext className="-right-4" />
          </Carousel>
        </section>
      </div>
    </div>
  );
}

function AnimeCard({ anime, rank, onPlay, onInfo, onAddToList, progress }) {
  return (
    <div className="group relative" data-testid={`anime-card-${anime.anime_id}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-card transition-all duration-300 group-hover:z-50 group-hover:scale-110 group-hover:shadow-2xl group-hover:ring-2 group-hover:ring-primary/50 cursor-pointer">
        {rank && (
          <div className="absolute top-0 left-0 z-10 bg-primary/90 text-white font-black text-2xl px-3 py-1 rounded-br-lg">
            {rank}
          </div>
        )}
        <img
          src={anime.poster_url}
          alt={anime.title}
          className="w-full h-full object-cover"
          onClick={onInfo}
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
          <h4 className="font-bold text-sm mb-2 line-clamp-2">{anime.title}</h4>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onPlay}>
              <Play className="h-4 w-4 fill-current" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onAddToList}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onInfo}>
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {progress !== undefined && (
        <Progress value={progress} className="h-1 mt-1" />
      )}
    </div>
  );
}

export default Browse;