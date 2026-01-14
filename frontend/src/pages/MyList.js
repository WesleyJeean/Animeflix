import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function MyList() {
  const navigate = useNavigate();
  const [myList, setMyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const profileId = localStorage.getItem('selectedProfile');
    if (!profileId) {
      navigate('/profiles');
      return;
    }
    setProfile(profileId);
    fetchMyList(profileId);
  }, [navigate]);

  const fetchMyList = async (profileId) => {
    try {
      const response = await axios.get(`${API_URL}/api/my-list/${profileId}`, { withCredentials: true });
      setMyList(response.data);
    } catch (error) {
      toast.error('Failed to load My List');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (animeId) => {
    try {
      await axios.delete(`${API_URL}/api/my-list/${profile}/${animeId}`, { withCredentials: true });
      setMyList(myList.filter(anime => anime.anime_id !== animeId));
      toast.success('Removed from My List');
    } catch (error) {
      toast.error('Failed to remove from list');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Skeleton className="w-full h-screen" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black" data-testid="my-list-page">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/80 to-transparent py-6">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            data-testid="back-to-browse-btn"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter" style={{fontFamily: 'Outfit'}}>
            My List
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-12">
        {myList.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground mb-4">Your list is empty</p>
            <Button onClick={() => navigate('/')} data-testid="browse-anime-btn">
              Browse Anime
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {myList.map((anime) => (
              <div key={anime.anime_id} className="group relative" data-testid={`my-list-item-${anime.anime_id}`}>
                <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-card cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:ring-2 hover:ring-primary/50">
                  <img
                    src={anime.poster_url}
                    alt={anime.title}
                    className="w-full h-full object-cover"
                    onClick={() => navigate(`/anime/${anime.anime_id}`)}
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <h4 className="font-bold text-sm mb-2 line-clamp-2">{anime.title}</h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => navigate(`/anime/${anime.anime_id}`)}
                      >
                        <Play className="h-4 w-4 fill-current" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(anime.anime_id)}
                        data-testid={`remove-btn-${anime.anime_id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyList;