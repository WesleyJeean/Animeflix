import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon, X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Shounen', 'Supernatural', 'Thriller'];
const SORT_OPTIONS = [
  { value: 'title', label: 'Title' },
  { value: 'year', label: 'Year' },
  { value: 'newest', label: 'Newest First' }
];

function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (query) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [query, selectedGenre, sortBy]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length > 1) {
        fetchSuggestions();
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const fetchSuggestions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/search`, {
        params: { q: query, limit: 5 }
      });
      setSuggestions(response.data);
    } catch (error) {
      // Silent fail
    }
  };

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = { search: query, limit: 50 };
      if (selectedGenre) params.genre = selectedGenre;

      const response = await axios.get(`${API_URL}/api/anime`, { params });
      let sorted = response.data;

      // Client-side sorting
      if (sortBy === 'title') {
        sorted = sorted.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortBy === 'year') {
        sorted = sorted.sort((a, b) => b.year - a.year);
      } else if (sortBy === 'newest') {
        sorted = sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      setResults(sorted);
      setShowSuggestions(false);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    navigate(`/anime/${suggestion.anime_id}`);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setSelectedGenre('');
  };

  return (
    <div className="min-h-screen bg-black" data-testid="search-page">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/80 to-transparent py-6 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              data-testid="back-btn"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter" style={{fontFamily: 'Outfit'}}>
              Search
            </h1>
          </div>

          {/* Search Input */}
          <div className="relative max-w-2xl">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search anime titles, genres, tags..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="pl-10 pr-10 h-12 text-lg"
                data-testid="search-input"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2"
                  onClick={handleClear}
                  data-testid="clear-search-btn"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>

            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg overflow-hidden shadow-xl z-50">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.anime_id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                    data-testid={`suggestion-${suggestion.anime_id}`}
                  >
                    <img
                      src={suggestion.poster_url}
                      alt={suggestion.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                    <span className="text-left font-semibold">{suggestion.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-6">
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-[180px]" data-testid="genre-filter">
                <SelectValue placeholder="Filter by Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]" data-testid="sort-filter">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedGenre && selectedGenre !== 'all' && (
              <Badge variant="secondary" className="px-3 py-1 cursor-pointer" onClick={() => setSelectedGenre('')}>
                {selectedGenre} <X className="ml-1 h-3 w-3" />
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-md" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            <p className="text-muted-foreground mb-6" data-testid="results-count">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {results.map((anime) => (
                <div
                  key={anime.anime_id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/anime/${anime.anime_id}`)}
                  data-testid={`result-${anime.anime_id}`}
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-card transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:ring-2 hover:ring-primary/50">
                    <img
                      src={anime.poster_url}
                      alt={anime.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                      <div>
                        <h4 className="font-bold text-sm line-clamp-2 mb-1">{anime.title}</h4>
                        <div className="flex flex-wrap gap-1">
                          {anime.genres.slice(0, 2).map((genre) => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : query ? (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">No results found for "{query}"</p>
          </div>
        ) : (
          <div className="text-center py-20">
            <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">Start typing to search anime</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Search;