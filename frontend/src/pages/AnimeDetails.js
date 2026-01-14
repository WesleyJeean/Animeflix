import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Plus, ThumbsUp, ThumbsDown, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import ReactPlayer from 'react-player';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function AnimeDetails() {
  const { animeId } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [userRating, setUserRating] = useState({ liked: null, score: null });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const profileId = localStorage.getItem('selectedProfile');
    setProfile(profileId);
    fetchAnimeDetails();
  }, [animeId]);

  const fetchAnimeDetails = async () => {
    try {
      const [animeRes, episodesRes, recsRes, reviewsRes] = await Promise.all([
        axios.get(`${API_URL}/api/anime/${animeId}`),
        axios.get(`${API_URL}/api/anime/${animeId}/episodes`),
        axios.get(`${API_URL}/api/anime/${animeId}/recommendations`),
        axios.get(`${API_URL}/api/reviews/${animeId}`)
      ]);

      setAnime(animeRes.data);
      setEpisodes(episodesRes.data);
      setRecommendations(recsRes.data);
      setReviews(reviewsRes.data);

      // Get user rating if profile selected
      const profileId = localStorage.getItem('selectedProfile');
      if (profileId) {
        try {
          const ratingRes = await axios.get(`${API_URL}/api/ratings/${animeId}/${profileId}`, { withCredentials: true });
          setUserRating(ratingRes.data);
        } catch (error) {
          // No rating yet
        }
      }
    } catch (error) {
      toast.error('Failed to load anime details');
    } finally {
      setLoading(false);
    }
  };

  const handleRating = async (liked) => {
    if (!profile) return;
    try {
      await axios.post(
        `${API_URL}/api/ratings`,
        { anime_id: animeId, liked },
        { params: { profile_id: profile }, withCredentials: true }
      );
      setUserRating({ ...userRating, liked });
      toast.success(liked ? 'Liked!' : 'Disliked');
    } catch (error) {
      toast.error('Failed to rate');
    }
  };

  const handleAddToList = async () => {
    if (!profile) return;
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

  if (loading) {
    return <div className="min-h-screen bg-black"><Skeleton className="w-full h-screen" /></div>;
  }

  if (!anime) {
    return <div className="min-h-screen bg-black flex items-center justify-center">Anime not found</div>;
  }

  return (
    <div className="min-h-screen bg-black" data-testid="anime-details-page">
      {/* Hero Section */}
      <div className="relative h-[70vh] w-full flex items-end pb-20">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${anime.banner_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-10"
          onClick={() => navigate(-1)}
          data-testid="back-btn"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>

        <div className="relative max-w-[1800px] mx-auto px-4 md:px-8 w-full">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4" style={{fontFamily: 'Outfit'}} data-testid="anime-title">
            {anime.title}
          </h1>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">{anime.year}</Badge>
            <Badge variant="outline">{anime.age_rating}</Badge>
            <Badge variant="outline">{anime.total_episodes} Episodes</Badge>
            {anime.genres.map((genre) => (
              <Badge key={genre} className="bg-primary/20 text-primary border-primary/50">{genre}</Badge>
            ))}
          </div>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mb-6">
            {anime.synopsis}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={() => episodes[0] && navigate(`/watch/${episodes[0].episode_id}`)}
              className="bg-primary hover:bg-primary/90"
              disabled={episodes.length === 0}
              data-testid="play-btn"
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              Play
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={handleAddToList}
              className="bg-white/20 hover:bg-white/30"
              data-testid="add-to-list-btn"
            >
              <Plus className="mr-2 h-5 w-5" />
              My List
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className={userRating.liked === true ? 'text-primary' : ''}
              onClick={() => handleRating(true)}
              data-testid="like-btn"
            >
              <ThumbsUp className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className={userRating.liked === false ? 'text-primary' : ''}
              onClick={() => handleRating(false)}
              data-testid="dislike-btn"
            >
              <ThumbsDown className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-12">
        <Tabs defaultValue="episodes" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="episodes" data-testid="episodes-tab">Episodes</TabsTrigger>
            <TabsTrigger value="details" data-testid="details-tab">Details</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="reviews-tab">Reviews</TabsTrigger>
            <TabsTrigger value="similar" data-testid="similar-tab">More Like This</TabsTrigger>
          </TabsList>

          <TabsContent value="episodes" className="space-y-4" data-testid="episodes-content">
            <h2 className="text-2xl font-bold mb-4">Season 1</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {episodes.map((episode) => (
                <div
                  key={episode.episode_id}
                  className="group cursor-pointer bg-card rounded-lg overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => navigate(`/watch/${episode.episode_id}`)}
                  data-testid={`episode-${episode.episode_number}`}
                >
                  <div className="relative aspect-video bg-muted">
                    <img src={episode.thumbnail_url} alt={episode.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{episode.episode_number}. {episode.title}</h3>
                      <span className="text-xs text-muted-foreground">{Math.floor(episode.duration_seconds / 60)}m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" data-testid="details-content">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Information</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-muted-foreground">Studio</dt>
                    <dd className="font-semibold">{anime.studio}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Year</dt>
                    <dd className="font-semibold">{anime.year}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Age Rating</dt>
                    <dd className="font-semibold">{anime.age_rating}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Genres</dt>
                    <dd className="font-semibold">{anime.genres.join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tags</dt>
                    <dd className="font-semibold">{anime.tags.join(', ')}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4">Trailer</h3>
                {anime.trailer_url && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <ReactPlayer url={anime.trailer_url} width="100%" height="100%" controls />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews" data-testid="reviews-content">
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No reviews yet</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.review_id} className="bg-card p-6 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold">{review.title}</h4>
                        <p className="text-sm text-muted-foreground">by {review.profile_name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-primary font-bold">{review.rating}</span>
                        <span className="text-muted-foreground">/10</span>
                      </div>
                    </div>
                    {review.spoiler && (
                      <Badge variant="destructive" className="mb-2">Spoiler Warning</Badge>
                    )}
                    <p className="text-sm">{review.content}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="similar" data-testid="similar-content">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.anime_id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/anime/${rec.anime_id}`)}
                  data-testid={`recommendation-${rec.anime_id}`}
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-card group-hover:ring-2 group-hover:ring-primary/50 transition-all">
                    <img src={rec.poster_url} alt={rec.title} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-semibold text-sm mt-2 line-clamp-2">{rec.title}</h4>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AnimeDetails;