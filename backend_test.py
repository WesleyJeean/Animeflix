import requests
import sys
import json
from datetime import datetime

class AnimeFlixAPITester:
    def __init__(self, base_url="https://animiflix.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.profile_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f" - {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return {}

    def test_auth_signup(self):
        """Test user signup"""
        timestamp = int(datetime.now().timestamp())
        signup_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        response = self.run_test(
            "Auth - Signup",
            "POST",
            "auth/signup",
            200,
            data=signup_data
        )
        
        if response and 'user_id' in response:
            self.user_id = response['user_id']
            return True
        return False

    def test_auth_login(self):
        """Test user login"""
        if not self.user_id:
            return False
            
        # Use the same credentials from signup
        timestamp = int(datetime.now().timestamp())
        login_data = {
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        response = self.run_test(
            "Auth - Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        return bool(response and 'user_id' in response)

    def test_auth_me(self):
        """Test get current user"""
        response = self.run_test(
            "Auth - Get Me",
            "GET",
            "auth/me", 
            200
        )
        return bool(response and 'user_id' in response)

    def test_create_profile(self):
        """Test profile creation"""
        profile_data = {
            "name": "Test Profile",
            "avatar": "https://images.unsplash.com/photo-1697059172415-f1e08f9151bb",
            "is_kid": False
        }
        
        response = self.run_test(
            "Profile - Create",
            "POST",
            "profiles",
            200,
            data=profile_data
        )
        
        if response and 'profile_id' in response:
            self.profile_id = response['profile_id']
            return True
        return False

    def test_get_profiles(self):
        """Test get profiles"""
        response = self.run_test(
            "Profile - Get All",
            "GET",
            "profiles",
            200
        )
        return bool(response and isinstance(response, list))

    def test_get_anime(self):
        """Test get anime list"""
        response = self.run_test(
            "Anime - Get List",
            "GET",
            "anime",
            200
        )
        return bool(response and isinstance(response, list))

    def test_get_trending(self):
        """Test get trending anime"""
        response = self.run_test(
            "Anime - Get Trending",
            "GET",
            "anime/trending",
            200
        )
        return bool(response and isinstance(response, list))

    def test_get_new_releases(self):
        """Test get new releases"""
        response = self.run_test(
            "Anime - Get New Releases",
            "GET",
            "anime/new-releases",
            200
        )
        return bool(response and isinstance(response, list))

    def test_anime_details(self):
        """Test get anime details"""
        # First get an anime ID
        anime_list = self.run_test(
            "Anime - Get List for Details Test",
            "GET",
            "anime?limit=1",
            200
        )
        
        if not anime_list or len(anime_list) == 0:
            self.log_test("Anime - Get Details", False, "No anime found to test")
            return False
            
        anime_id = anime_list[0]['anime_id']
        response = self.run_test(
            "Anime - Get Details",
            "GET",
            f"anime/{anime_id}",
            200
        )
        return bool(response and 'anime_id' in response)

    def test_episodes(self):
        """Test get episodes"""
        # Get an anime ID first
        anime_list = self.run_test(
            "Anime - Get List for Episodes Test",
            "GET", 
            "anime?limit=1",
            200
        )
        
        if not anime_list or len(anime_list) == 0:
            self.log_test("Anime - Get Episodes", False, "No anime found to test")
            return False
            
        anime_id = anime_list[0]['anime_id']
        response = self.run_test(
            "Anime - Get Episodes",
            "GET",
            f"anime/{anime_id}/episodes",
            200
        )
        return bool(response and isinstance(response, list))

    def test_recommendations(self):
        """Test get recommendations"""
        # Get an anime ID first
        anime_list = self.run_test(
            "Anime - Get List for Recommendations Test",
            "GET",
            "anime?limit=1", 
            200
        )
        
        if not anime_list or len(anime_list) == 0:
            self.log_test("Anime - Get Recommendations", False, "No anime found to test")
            return False
            
        anime_id = anime_list[0]['anime_id']
        response = self.run_test(
            "Anime - Get Recommendations",
            "GET",
            f"anime/{anime_id}/recommendations",
            200
        )
        return bool(response and isinstance(response, list))

    def test_my_list_operations(self):
        """Test My List add/get/remove operations"""
        if not self.profile_id:
            self.log_test("My List - Operations", False, "No profile ID available")
            return False
            
        # Get an anime ID first
        anime_list = self.run_test(
            "Anime - Get List for My List Test",
            "GET",
            "anime?limit=1",
            200
        )
        
        if not anime_list or len(anime_list) == 0:
            self.log_test("My List - Operations", False, "No anime found to test")
            return False
            
        anime_id = anime_list[0]['anime_id']
        
        # Test add to list
        add_response = self.run_test(
            "My List - Add",
            "POST",
            f"my-list?anime_id={anime_id}&profile_id={self.profile_id}",
            200
        )
        
        # Test get list
        get_response = self.run_test(
            "My List - Get",
            "GET",
            f"my-list/{self.profile_id}",
            200
        )
        
        # Test remove from list
        remove_response = self.run_test(
            "My List - Remove",
            "DELETE",
            f"my-list/{self.profile_id}/{anime_id}",
            200
        )
        
        return bool(add_response and get_response and remove_response)

    def test_ratings(self):
        """Test rating operations"""
        if not self.profile_id:
            self.log_test("Ratings - Operations", False, "No profile ID available")
            return False
            
        # Get an anime ID first
        anime_list = self.run_test(
            "Anime - Get List for Ratings Test",
            "GET",
            "anime?limit=1",
            200
        )
        
        if not anime_list or len(anime_list) == 0:
            self.log_test("Ratings - Operations", False, "No anime found to test")
            return False
            
        anime_id = anime_list[0]['anime_id']
        
        # Test create rating
        rating_data = {"anime_id": anime_id, "liked": True, "score": 8}
        create_response = self.run_test(
            "Ratings - Create",
            "POST",
            f"ratings?profile_id={self.profile_id}",
            200,
            data=rating_data
        )
        
        # Test get rating
        get_response = self.run_test(
            "Ratings - Get",
            "GET",
            f"ratings/{anime_id}/{self.profile_id}",
            200
        )
        
        return bool(create_response and get_response)

    def test_search(self):
        """Test search functionality"""
        response = self.run_test(
            "Search - Anime",
            "GET",
            "search?q=naruto&limit=5",
            200
        )
        return bool(response and isinstance(response, list))

    def test_watch_history(self):
        """Test watch history operations"""
        if not self.profile_id:
            self.log_test("Watch History - Operations", False, "No profile ID available")
            return False
            
        # Get anime and episode IDs
        anime_list = self.run_test(
            "Anime - Get List for Watch History Test",
            "GET",
            "anime?limit=1",
            200
        )
        
        if not anime_list or len(anime_list) == 0:
            self.log_test("Watch History - Operations", False, "No anime found to test")
            return False
            
        anime_id = anime_list[0]['anime_id']
        
        # Get episodes
        episodes = self.run_test(
            "Episodes - Get for Watch History Test",
            "GET",
            f"anime/{anime_id}/episodes",
            200
        )
        
        if not episodes or len(episodes) == 0:
            self.log_test("Watch History - Operations", False, "No episodes found to test")
            return False
            
        episode_id = episodes[0]['episode_id']
        
        # Test update watch history
        history_data = {
            "anime_id": anime_id,
            "episode_id": episode_id,
            "progress_seconds": 300,
            "completed": False
        }
        
        update_response = self.run_test(
            "Watch History - Update",
            "POST",
            f"watch-history?profile_id={self.profile_id}",
            200,
            data=history_data
        )
        
        # Test get continue watching
        get_response = self.run_test(
            "Watch History - Get Continue Watching",
            "GET",
            f"watch-history/{self.profile_id}/continue-watching",
            200
        )
        
        return bool(update_response and get_response)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AnimeFlix API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        # Test authentication flow
        if not self.test_auth_signup():
            print("❌ Signup failed, stopping tests")
            return False
            
        # Test basic endpoints (no auth required)
        self.test_get_anime()
        self.test_get_trending() 
        self.test_get_new_releases()
        self.test_anime_details()
        self.test_episodes()
        self.test_recommendations()
        self.test_search()
        
        # Test authenticated endpoints
        self.test_auth_me()
        
        if not self.test_create_profile():
            print("❌ Profile creation failed, skipping profile-dependent tests")
        else:
            self.test_get_profiles()
            self.test_my_list_operations()
            self.test_ratings()
            self.test_watch_history()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = AnimeFlixAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())