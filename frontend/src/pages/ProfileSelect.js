import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Switch } from '../components/ui/switch';
import { Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1697059172415-f1e08f9151bb',
  'https://images.unsplash.com/flagged/photo-1697059171452-f74cb27b03af',
  'https://images.unsplash.com/photo-1722573783570-9811ce67025e',
  'https://images.unsplash.com/photo-1674448417295-088682b6adec',
  'https://images.unsplash.com/photo-1535666669445-e8c15cd2e7d9'
];

function ProfileSelect() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newProfile, setNewProfile] = useState({ name: '', avatar: AVATAR_OPTIONS[0], is_kid: false });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/profiles`, { withCredentials: true });
      setProfiles(response.data);
    } catch (error) {
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfile.name) {
      toast.error('Please enter a name');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/profiles`, newProfile, { withCredentials: true });
      toast.success('Profile created!');
      setCreateOpen(false);
      setNewProfile({ name: '', avatar: AVATAR_OPTIONS[0], is_kid: false });
      fetchProfiles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create profile');
    }
  };

  const handleSelectProfile = (profileId) => {
    localStorage.setItem('selectedProfile', profileId);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black p-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl md:text-5xl font-black text-center mb-12" style={{fontFamily: 'Outfit'}} data-testid="profile-select-title">
          Who's Watching?
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {profiles.map((profile) => (
            <button
              key={profile.profile_id}
              onClick={() => handleSelectProfile(profile.profile_id)}
              className="group flex flex-col items-center gap-3 p-4 rounded-lg hover:bg-white/5 transition-colors"
              data-testid={`profile-card-${profile.profile_id}`}
            >
              <Avatar className="h-24 w-24 border-2 border-transparent group-hover:border-primary transition-colors">
                <AvatarImage src={profile.avatar} alt={profile.name} />
                <AvatarFallback>{profile.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-lg font-medium group-hover:text-primary transition-colors">
                {profile.name}
              </span>
              {profile.is_kid && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">Kids</span>
              )}
            </button>
          ))}

          {profiles.length < 5 && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <button
                  className="group flex flex-col items-center justify-center gap-3 p-4 rounded-lg hover:bg-white/5 transition-colors min-h-[140px]"
                  data-testid="add-profile-btn"
                >
                  <div className="h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center group-hover:border-primary transition-colors">
                    <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-lg font-medium group-hover:text-primary transition-colors">
                    Add Profile
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent data-testid="create-profile-dialog">
                <DialogHeader>
                  <DialogTitle>Create Profile</DialogTitle>
                  <DialogDescription>Add a new profile to your account.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="profile-name">Name</Label>
                    <Input
                      id="profile-name"
                      placeholder="Enter name"
                      value={newProfile.name}
                      onChange={(e) => setNewProfile({...newProfile, name: e.target.value})}
                      data-testid="profile-name-input"
                    />
                  </div>
                  <div>
                    <Label>Avatar</Label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {AVATAR_OPTIONS.map((avatar, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setNewProfile({...newProfile, avatar})}
                          className={`relative rounded-full overflow-hidden border-2 ${
                            newProfile.avatar === avatar ? 'border-primary' : 'border-transparent'
                          } hover:border-primary/50 transition-colors`}
                        >
                          <Avatar>
                            <AvatarImage src={avatar} />
                          </Avatar>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="kids-mode">Kids Mode</Label>
                    <Switch
                      id="kids-mode"
                      checked={newProfile.is_kid}
                      onCheckedChange={(checked) => setNewProfile({...newProfile, is_kid: checked})}
                      data-testid="kids-mode-switch"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateProfile} data-testid="create-profile-submit-btn">
                  Create Profile
                </Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileSelect;