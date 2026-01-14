from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, Header, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    password_hash: Optional[str] = None
    created_at: datetime

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_id: str
    user_id: str
    name: str
    avatar: str
    is_kid: bool = False
    created_at: datetime

class ProfileCreate(BaseModel):
    name: str
    avatar: str
    is_kid: bool = False

class Anime(BaseModel):
    model_config = ConfigDict(extra="ignore")
    anime_id: str
    title: str
    synopsis: str
    trailer_url: Optional[str] = None
    poster_url: str
    banner_url: str
    studio: str
    year: int
    age_rating: str
    genres: List[str]
    tags: List[str]
    total_episodes: int = 0
    created_at: datetime

class Episode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    episode_id: str
    anime_id: str
    season_number: int
    episode_number: int
    title: str
    thumbnail_url: str
    video_url: str
    duration_seconds: int
    skip_intro_start: Optional[int] = None
    skip_intro_end: Optional[int] = None
    skip_recap_start: Optional[int] = None
    skip_recap_end: Optional[int] = None
    created_at: datetime

class WatchHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    history_id: str
    profile_id: str
    anime_id: str
    episode_id: str
    progress_seconds: int
    last_watched_at: datetime
    completed: bool = False

class WatchHistoryUpdate(BaseModel):
    anime_id: str
    episode_id: str
    progress_seconds: int
    completed: bool = False

class MyListItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    list_id: str
    profile_id: str
    anime_id: str
    added_at: datetime

class Rating(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rating_id: str
    profile_id: str
    anime_id: str
    liked: Optional[bool] = None
    score: Optional[int] = None
    created_at: datetime

class RatingCreate(BaseModel):
    anime_id: str
    liked: Optional[bool] = None
    score: Optional[int] = Field(None, ge=1, le=10)

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str
    profile_id: str
    anime_id: str
    title: str
    content: str
    spoiler: bool = False
    rating: int = Field(ge=1, le=10)
    created_at: datetime

class ReviewCreate(BaseModel):
    anime_id: str
    title: str
    content: str
    spoiler: bool = False
    rating: int = Field(ge=1, le=10)

# ==================== AUTH HELPER ====================

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    """Get current user from session token (cookie or Authorization header)"""
    token = session_token
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_doc)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/signup")
async def signup(user_data: UserSignup, response: Response):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = pwd_context.hash(user_data.password)
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": password_hash,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user_id": user_id, "email": user_data.email, "name": user_data.name}

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not pwd_context.verify(credentials.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user_id": user_doc["user_id"], "email": user_doc["email"], "name": user_doc["name"]}

@api_router.post("/auth/session")
async def process_emergent_session(session_id: str, response: Response):
    """Process Emergent Auth session_id and create user session"""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"Failed to fetch session data: {e}")
        raise HTTPException(status_code=400, detail="Invalid session ID")
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if user_doc:
        # Update user info if changed
        await db.users.update_one(
            {"user_id": user_doc["user_id"]},
            {"$set": {"name": data["name"], "picture": data["picture"]}}
        )
        user_id = user_doc["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data["picture"],
            "password_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_doc = {
        "user_id": user_id,
        "session_token": data["session_token"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=data["session_token"],
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user_id": user_id, "email": data["email"], "name": data["name"], "picture": data["picture"]}

@api_router.get("/auth/me")
async def get_me(request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
        response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"message": "Logged out"}

# ==================== PROFILE ROUTES ====================

@api_router.get("/profiles", response_model=List[Profile])
async def get_profiles(request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    profiles = await db.profiles.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    for p in profiles:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return profiles

@api_router.post("/profiles", response_model=Profile)
async def create_profile(profile_data: ProfileCreate, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    
    # Check limit (max 5 profiles)
    count = await db.profiles.count_documents({"user_id": user.user_id})
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 profiles allowed")
    
    profile_id = f"profile_{uuid.uuid4().hex[:12]}"
    profile_doc = {
        "profile_id": profile_id,
        "user_id": user.user_id,
        "name": profile_data.name,
        "avatar": profile_data.avatar,
        "is_kid": profile_data.is_kid,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.profiles.insert_one(profile_doc)
    profile_doc['created_at'] = datetime.fromisoformat(profile_doc['created_at'])
    return Profile(**profile_doc)

@api_router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    result = await db.profiles.delete_one({"profile_id": profile_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Profile deleted"}

# ==================== ANIME ROUTES ====================

@api_router.get("/anime", response_model=List[Anime])
async def get_anime(skip: int = 0, limit: int = 20, genre: Optional[str] = None, tag: Optional[str] = None, search: Optional[str] = None):
    filter_query = {}
    if genre:
        filter_query["genres"] = genre
    if tag:
        filter_query["tags"] = tag
    if search:
        filter_query["title"] = {"$regex": search, "$options": "i"}
    
    anime_list = await db.anime.find(filter_query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    for a in anime_list:
        if isinstance(a.get('created_at'), str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
    return anime_list

@api_router.get("/anime/trending", response_model=List[Anime])
async def get_trending():
    # Mock trending: return random selection
    anime_list = await db.anime.find({}, {"_id": 0}).limit(10).to_list(10)
    for a in anime_list:
        if isinstance(a.get('created_at'), str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
    return anime_list

@api_router.get("/anime/new-releases", response_model=List[Anime])
async def get_new_releases():
    anime_list = await db.anime.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    for a in anime_list:
        if isinstance(a.get('created_at'), str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
    return anime_list

@api_router.get("/anime/{anime_id}", response_model=Anime)
async def get_anime_by_id(anime_id: str):
    anime_doc = await db.anime.find_one({"anime_id": anime_id}, {"_id": 0})
    if not anime_doc:
        raise HTTPException(status_code=404, detail="Anime not found")
    if isinstance(anime_doc.get('created_at'), str):
        anime_doc['created_at'] = datetime.fromisoformat(anime_doc['created_at'])
    return Anime(**anime_doc)

@api_router.get("/anime/{anime_id}/episodes", response_model=List[Episode])
async def get_episodes(anime_id: str):
    episodes = await db.episodes.find({"anime_id": anime_id}, {"_id": 0}).sort("episode_number", 1).to_list(1000)
    for e in episodes:
        if isinstance(e.get('created_at'), str):
            e['created_at'] = datetime.fromisoformat(e['created_at'])
    return episodes

@api_router.get("/anime/{anime_id}/recommendations", response_model=List[Anime])
async def get_recommendations(anime_id: str):
    # Get anime
    anime_doc = await db.anime.find_one({"anime_id": anime_id}, {"_id": 0})
    if not anime_doc:
        return []
    
    # Find anime with similar genres
    recommendations = await db.anime.find(
        {"anime_id": {"$ne": anime_id}, "genres": {"$in": anime_doc["genres"]}},
        {"_id": 0}
    ).limit(10).to_list(10)
    
    for a in recommendations:
        if isinstance(a.get('created_at'), str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
    return recommendations

# ==================== WATCH HISTORY ====================

@api_router.post("/watch-history")
async def update_watch_history(history_data: WatchHistoryUpdate, profile_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    
    # Verify profile belongs to user
    profile = await db.profiles.find_one({"profile_id": profile_id, "user_id": user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=403, detail="Profile not found")
    
    # Update or create watch history
    existing = await db.watch_history.find_one(
        {"profile_id": profile_id, "anime_id": history_data.anime_id},
        {"_id": 0}
    )
    
    if existing:
        await db.watch_history.update_one(
            {"profile_id": profile_id, "anime_id": history_data.anime_id},
            {"$set": {
                "episode_id": history_data.episode_id,
                "progress_seconds": history_data.progress_seconds,
                "last_watched_at": datetime.now(timezone.utc).isoformat(),
                "completed": history_data.completed
            }}
        )
    else:
        history_id = f"history_{uuid.uuid4().hex[:12]}"
        history_doc = {
            "history_id": history_id,
            "profile_id": profile_id,
            "anime_id": history_data.anime_id,
            "episode_id": history_data.episode_id,
            "progress_seconds": history_data.progress_seconds,
            "last_watched_at": datetime.now(timezone.utc).isoformat(),
            "completed": history_data.completed
        }
        await db.watch_history.insert_one(history_doc)
    
    return {"message": "Watch history updated"}

@api_router.get("/watch-history/{profile_id}/continue-watching")
async def get_continue_watching(profile_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    
    # Verify profile
    profile = await db.profiles.find_one({"profile_id": profile_id, "user_id": user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=403, detail="Profile not found")
    
    # Get watch history
    history = await db.watch_history.find(
        {"profile_id": profile_id, "completed": False},
        {"_id": 0}
    ).sort("last_watched_at", -1).limit(10).to_list(10)
    
    # Get anime details
    result = []
    for h in history:
        anime_doc = await db.anime.find_one({"anime_id": h["anime_id"]}, {"_id": 0})
        if anime_doc:
            if isinstance(anime_doc.get('created_at'), str):
                anime_doc['created_at'] = datetime.fromisoformat(anime_doc['created_at'])
            episode_doc = await db.episodes.find_one({"episode_id": h["episode_id"]}, {"_id": 0})
            result.append({
                "anime": anime_doc,
                "episode": episode_doc,
                "progress_seconds": h["progress_seconds"],
                "last_watched_at": h["last_watched_at"]
            })
    
    return result

# ==================== MY LIST ====================

@api_router.post("/my-list")
async def add_to_my_list(anime_id: str, profile_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    
    # Verify profile
    profile = await db.profiles.find_one({"profile_id": profile_id, "user_id": user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=403, detail="Profile not found")
    
    # Check if already in list
    existing = await db.my_list.find_one({"profile_id": profile_id, "anime_id": anime_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Already in list")
    
    list_id = f"list_{uuid.uuid4().hex[:12]}"
    list_doc = {
        "list_id": list_id,
        "profile_id": profile_id,
        "anime_id": anime_id,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    await db.my_list.insert_one(list_doc)
    return {"message": "Added to My List"}

@api_router.get("/my-list/{profile_id}")
async def get_my_list(profile_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    
    # Verify profile
    profile = await db.profiles.find_one({"profile_id": profile_id, "user_id": user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=403, detail="Profile not found")
    
    # Get list
    my_list = await db.my_list.find({"profile_id": profile_id}, {"_id": 0}).sort("added_at", -1).to_list(1000)
    
    # Get anime details
    result = []
    for item in my_list:
        anime_doc = await db.anime.find_one({"anime_id": item["anime_id"]}, {"_id": 0})
        if anime_doc:
            if isinstance(anime_doc.get('created_at'), str):
                anime_doc['created_at'] = datetime.fromisoformat(anime_doc['created_at'])
            result.append(anime_doc)
    
    return result

@api_router.delete("/my-list/{profile_id}/{anime_id}")
async def remove_from_my_list(profile_id: str, anime_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    
    # Verify profile
    profile = await db.profiles.find_one({"profile_id": profile_id, "user_id": user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=403, detail="Profile not found")
    
    result = await db.my_list.delete_one({"profile_id": profile_id, "anime_id": anime_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not in list")
    
    return {"message": "Removed from My List"}

# ==================== RATINGS ====================

@api_router.post("/ratings")
async def create_rating(rating_data: RatingCreate, profile_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    
    # Verify profile
    profile = await db.profiles.find_one({"profile_id": profile_id, "user_id": user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=403, detail="Profile not found")
    
    # Update or create rating
    existing = await db.ratings.find_one({"profile_id": profile_id, "anime_id": rating_data.anime_id}, {"_id": 0})
    
    if existing:
        await db.ratings.update_one(
            {"profile_id": profile_id, "anime_id": rating_data.anime_id},
            {"$set": {"liked": rating_data.liked, "score": rating_data.score}}
        )
    else:
        rating_id = f"rating_{uuid.uuid4().hex[:12]}"
        rating_doc = {
            "rating_id": rating_id,
            "profile_id": profile_id,
            "anime_id": rating_data.anime_id,
            "liked": rating_data.liked,
            "score": rating_data.score,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.ratings.insert_one(rating_doc)
    
    return {"message": "Rating saved"}

@api_router.get("/ratings/{anime_id}/{profile_id}")
async def get_rating(anime_id: str, profile_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    
    # Verify profile
    profile = await db.profiles.find_one({"profile_id": profile_id, "user_id": user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=403, detail="Profile not found")
    
    rating = await db.ratings.find_one({"profile_id": profile_id, "anime_id": anime_id}, {"_id": 0})
    if not rating:
        return {"liked": None, "score": None}
    
    return {"liked": rating.get("liked"), "score": rating.get("score")}

# ==================== REVIEWS ====================

@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, profile_id: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    
    # Verify profile
    profile = await db.profiles.find_one({"profile_id": profile_id, "user_id": user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=403, detail="Profile not found")
    
    review_id = f"review_{uuid.uuid4().hex[:12]}"
    review_doc = {
        "review_id": review_id,
        "profile_id": profile_id,
        "profile_name": profile["name"],
        "anime_id": review_data.anime_id,
        "title": review_data.title,
        "content": review_data.content,
        "spoiler": review_data.spoiler,
        "rating": review_data.rating,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    return {"message": "Review created", "review_id": review_id}

@api_router.get("/reviews/{anime_id}")
async def get_reviews(anime_id: str):
    reviews = await db.reviews.find({"anime_id": anime_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reviews

# ==================== SEARCH ====================

@api_router.get("/search")
async def search_anime(q: str, limit: int = 10):
    results = await db.anime.find(
        {"title": {"$regex": q, "$options": "i"}},
        {"_id": 0, "anime_id": 1, "title": 1, "poster_url": 1}
    ).limit(limit).to_list(limit)
    return results

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()