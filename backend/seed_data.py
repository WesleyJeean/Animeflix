import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Anime seed data with user-provided images
ANIME_DATA = [
    {
        "title": "Dragon Ball Z",
        "synopsis": "Goku and his friends defend Earth against powerful villains from across the universe. Epic battles, transformations, and the legendary Super Saiyan await.",
        "trailer_url": "https://www.youtube.com/watch?v=UJOjTNDY-h8",
        "poster_url": "https://customer-assets.emergentagent.com/job_fe791525-1daf-4323-bf52-6df37239687e/artifacts/oc5ypo6v_images%20%281%29.jpg",
        "banner_url": "https://customer-assets.emergentagent.com/job_fe791525-1daf-4323-bf52-6df37239687e/artifacts/oc5ypo6v_images%20%281%29.jpg",
        "studio": "Toei Animation",
        "year": 1989,
        "age_rating": "TV-PG",
        "genres": ["Action", "Adventure", "Shounen"],
        "tags": ["Martial Arts", "Super Power", "Comedy"],
        "total_episodes": 12
    },
    {
        "title": "Naruto",
        "synopsis": "Naruto Uzumaki, a young ninja who seeks recognition from his peers and dreams of becoming the Hokage, the leader of his village.",
        "trailer_url": "https://www.youtube.com/watch?v=QczGoCmX-pI",
        "poster_url": "https://customer-assets.emergentagent.com/job_fe791525-1daf-4323-bf52-6df37239687e/artifacts/7mizyp6c_MV5BYTgyZDhmMTEtZDFhNi00MTc4LTg3NjUtYWJlNGE5Mzk2NzMxXkEyXkFqcGc%40._V1_.jpg",
        "banner_url": "https://customer-assets.emergentagent.com/job_fe791525-1daf-4323-bf52-6df37239687e/artifacts/7mizyp6c_MV5BYTgyZDhmMTEtZDFhNi00MTc4LTg3NjUtYWJlNGE5Mzk2NzMxXkEyXkFqcGc%40._V1_.jpg",
        "studio": "Studio Pierrot",
        "year": 2002,
        "age_rating": "TV-PG",
        "genres": ["Action", "Adventure", "Shounen"],
        "tags": ["Ninja", "Martial Arts", "Super Power"],
        "total_episodes": 10
    },
    {
        "title": "Death Note",
        "synopsis": "A high school student discovers a supernatural notebook that allows him to kill anyone by writing their name in it, leading to a cat-and-mouse game with a detective.",
        "trailer_url": "https://www.youtube.com/watch?v=tJZtOrm-WPk",
        "poster_url": "https://customer-assets.emergentagent.com/job_fe791525-1daf-4323-bf52-6df37239687e/artifacts/bett7axk_089875.jpg",
        "banner_url": "https://customer-assets.emergentagent.com/job_fe791525-1daf-4323-bf52-6df37239687e/artifacts/bett7axk_089875.jpg",
        "studio": "Madhouse",
        "year": 2006,
        "age_rating": "TV-14",
        "genres": ["Mystery", "Thriller", "Supernatural"],
        "tags": ["Psychological", "Detective", "Dark"],
        "total_episodes": 8
    },
    {
        "title": "Jujutsu Kaisen",
        "synopsis": "A high school student joins a secret organization of Jujutsu Sorcerers to kill a powerful Curse and save humanity from evil spirits.",
        "trailer_url": "https://www.youtube.com/watch?v=4A_X-Dvl0ws",
        "poster_url": "https://customer-assets.emergentagent.com/job_fe791525-1daf-4323-bf52-6df37239687e/artifacts/asqga2he_Jujutsu_Kaisen_Cover.png",
        "banner_url": "https://customer-assets.emergentagent.com/job_fe791525-1daf-4323-bf52-6df37239687e/artifacts/asqga2he_Jujutsu_Kaisen_Cover.png",
        "studio": "MAPPA",
        "year": 2020,
        "age_rating": "TV-MA",
        "genres": ["Action", "Supernatural", "Shounen"],
        "tags": ["Dark Fantasy", "School", "Demons"],
        "total_episodes": 10
    },
    {
        "title": "Attack on Titan",
        "synopsis": "Humanity fights for survival against giant humanoid Titans that have pushed mankind to the brink of extinction.",
        "trailer_url": "https://www.youtube.com/watch?v=LHtdKWJdif4",
        "poster_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f",
        "banner_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f",
        "studio": "Wit Studio / MAPPA",
        "year": 2013,
        "age_rating": "TV-MA",
        "genres": ["Action", "Drama", "Fantasy"],
        "tags": ["Military", "Dark", "Gore"],
        "total_episodes": 12
    },
    {
        "title": "My Hero Academia",
        "synopsis": "In a world where most humans have superpowers, a powerless boy enrolls in a prestigious hero academy to become the greatest hero.",
        "trailer_url": "https://www.youtube.com/watch?v=D5fYOnwYkj4",
        "poster_url": "https://images.unsplash.com/photo-1618336753974-aae8e04506aa",
        "banner_url": "https://images.unsplash.com/photo-1618336753974-aae8e04506aa",
        "studio": "Bones",
        "year": 2016,
        "age_rating": "TV-14",
        "genres": ["Action", "Comedy", "Shounen"],
        "tags": ["Super Power", "School", "Hero"],
        "total_episodes": 10
    },
    {
        "title": "Demon Slayer",
        "synopsis": "A family is attacked by demons, and the only survivors are a boy and his sister, who has been turned into a demon. He vows to find a cure and kill demons.",
        "trailer_url": "https://www.youtube.com/watch?v=VQGCKyvzIM4",
        "poster_url": "https://images.unsplash.com/photo-1578632767115-351597cf2477",
        "banner_url": "https://images.unsplash.com/photo-1578632767115-351597cf2477",
        "studio": "ufotable",
        "year": 2019,
        "age_rating": "TV-MA",
        "genres": ["Action", "Supernatural", "Shounen"],
        "tags": ["Demons", "Historical", "Swordplay"],
        "total_episodes": 12
    },
    {
        "title": "One Punch Man",
        "synopsis": "The story of a hero who can defeat any opponent with a single punch, seeking a challenge and meaning in his overwhelming power.",
        "trailer_url": "https://www.youtube.com/watch?v=Poo5lqoWSGw",
        "poster_url": "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe",
        "banner_url": "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe",
        "studio": "Madhouse",
        "year": 2015,
        "age_rating": "TV-14",
        "genres": ["Action", "Comedy", "Parody"],
        "tags": ["Super Power", "Hero", "Sci-Fi"],
        "total_episodes": 8
    },
    {
        "title": "Fullmetal Alchemist: Brotherhood",
        "synopsis": "Two brothers search for the Philosopher's Stone to restore their bodies after a failed alchemical experiment.",
        "trailer_url": "https://www.youtube.com/watch?v=O8mMmZ_Zaqo",
        "poster_url": "https://images.unsplash.com/photo-1578662996442-48f60103fc96",
        "banner_url": "https://images.unsplash.com/photo-1578662996442-48f60103fc96",
        "studio": "Bones",
        "year": 2009,
        "age_rating": "TV-14",
        "genres": ["Action", "Adventure", "Drama"],
        "tags": ["Military", "Magic", "Shounen"],
        "total_episodes": 10
    },
    {
        "title": "Steins;Gate",
        "synopsis": "A group of friends discover time travel through a microwave, leading to dire consequences that must be undone.",
        "trailer_url": "https://www.youtube.com/watch?v=27OZc-ku6is",
        "poster_url": "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0",
        "banner_url": "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0",
        "studio": "White Fox",
        "year": 2011,
        "age_rating": "TV-14",
        "genres": ["Sci-Fi", "Thriller", "Drama"],
        "tags": ["Time Travel", "Psychological", "Mystery"],
        "total_episodes": 8
    },
    {
        "title": "Sword Art Online",
        "synopsis": "Players are trapped in a virtual reality MMORPG and must clear all levels to escape, with death in-game meaning death in real life.",
        "trailer_url": "https://www.youtube.com/watch?v=6ohYYtxfDCg",
        "poster_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e",
        "banner_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e",
        "studio": "A-1 Pictures",
        "year": 2012,
        "age_rating": "TV-14",
        "genres": ["Action", "Adventure", "Fantasy"],
        "tags": ["Virtual Reality", "Game", "Romance"],
        "total_episodes": 10
    },
    {
        "title": "Code Geass",
        "synopsis": "An exiled prince obtains the power of Geass and leads a rebellion against the tyrannical empire that conquered his homeland.",
        "trailer_url": "https://www.youtube.com/watch?v=moDqpBN4wTc",
        "poster_url": "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3",
        "banner_url": "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3",
        "studio": "Sunrise",
        "year": 2006,
        "age_rating": "TV-14",
        "genres": ["Action", "Drama", "Mecha"],
        "tags": ["Military", "Super Power", "School"],
        "total_episodes": 12
    },
    {
        "title": "Tokyo Ghoul",
        "synopsis": "A college student becomes a half-ghoul and must navigate the dangerous world between humans and ghouls.",
        "trailer_url": "https://www.youtube.com/watch?v=vGuQeQsoRgU",
        "poster_url": "https://images.unsplash.com/photo-1613109526778-27605f1f27d2",
        "banner_url": "https://images.unsplash.com/photo-1613109526778-27605f1f27d2",
        "studio": "Studio Pierrot",
        "year": 2014,
        "age_rating": "TV-MA",
        "genres": ["Action", "Horror", "Supernatural"],
        "tags": ["Gore", "Psychological", "Dark"],
        "total_episodes": 8
    },
    {
        "title": "Hunter x Hunter",
        "synopsis": "A young boy embarks on a journey to become a Hunter and find his father, encountering friends and enemies along the way.",
        "trailer_url": "https://www.youtube.com/watch?v=d6kBeJjTGnY",
        "poster_url": "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb",
        "banner_url": "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb",
        "studio": "Madhouse",
        "year": 2011,
        "age_rating": "TV-14",
        "genres": ["Action", "Adventure", "Shounen"],
        "tags": ["Super Power", "Fantasy", "Friendship"],
        "total_episodes": 10
    },
    {
        "title": "Cowboy Bebop",
        "synopsis": "A ragtag crew of bounty hunters travels through space in 2071, dealing with their pasts and hunting criminals.",
        "trailer_url": "https://www.youtube.com/watch?v=qig4KOK2R2g",
        "poster_url": "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90",
        "banner_url": "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90",
        "studio": "Sunrise",
        "year": 1998,
        "age_rating": "TV-14",
        "genres": ["Action", "Sci-Fi", "Drama"],
        "tags": ["Space", "Bounty Hunter", "Jazz"],
        "total_episodes": 8
    },
    {
        "title": "Mob Psycho 100",
        "synopsis": "A powerful psychic tries to live a normal life while dealing with spirits and his own overwhelming emotions.",
        "trailer_url": "https://www.youtube.com/watch?v=Bw-5Lka7gPE",
        "poster_url": "https://images.unsplash.com/photo-1535666669445-e8c15cd2e7d9",
        "banner_url": "https://images.unsplash.com/photo-1535666669445-e8c15cd2e7d9",
        "studio": "Bones",
        "year": 2016,
        "age_rating": "TV-14",
        "genres": ["Action", "Comedy", "Supernatural"],
        "tags": ["Super Power", "School", "Slice of Life"],
        "total_episodes": 8
    },
    {
        "title": "One Piece",
        "synopsis": "A young pirate sets sail to find the legendary treasure One Piece and become the King of the Pirates.",
        "trailer_url": "https://www.youtube.com/watch?v=MCb13lbVGE0",
        "poster_url": "https://images.unsplash.com/photo-1620503374956-c942862f0372",
        "banner_url": "https://images.unsplash.com/photo-1620503374956-c942862f0372",
        "studio": "Toei Animation",
        "year": 1999,
        "age_rating": "TV-14",
        "genres": ["Action", "Adventure", "Comedy"],
        "tags": ["Pirates", "Shounen", "Fantasy"],
        "total_episodes": 12
    },
    {
        "title": "Vinland Saga",
        "synopsis": "A young Viking warrior seeks revenge while navigating the brutal world of medieval warfare and exploration.",
        "trailer_url": "https://www.youtube.com/watch?v=xEVcTStgA4A",
        "poster_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
        "banner_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
        "studio": "Wit Studio",
        "year": 2019,
        "age_rating": "TV-MA",
        "genres": ["Action", "Adventure", "Drama"],
        "tags": ["Historical", "Vikings", "Seinen"],
        "total_episodes": 10
    },
    {
        "title": "Spy x Family",
        "synopsis": "A spy, an assassin, and a telepath form a fake family for their respective missions, leading to comedic and heartwarming situations.",
        "trailer_url": "https://www.youtube.com/watch?v=U_rWZK_8vUk",
        "poster_url": "https://images.unsplash.com/photo-1603366445787-09714680cbf1",
        "banner_url": "https://images.unsplash.com/photo-1603366445787-09714680cbf1",
        "studio": "Wit Studio / CloverWorks",
        "year": 2022,
        "age_rating": "TV-14",
        "genres": ["Action", "Comedy", "Slice of Life"],
        "tags": ["Spy", "Family", "Wholesome"],
        "total_episodes": 8
    },
    {
        "title": "Re:Zero - Starting Life in Another World",
        "synopsis": "A young man is transported to a fantasy world and discovers he can return to a specific point in time upon death.",
        "trailer_url": "https://www.youtube.com/watch?v=ETWPtIfesyA",
        "poster_url": "https://images.unsplash.com/photo-1571847690160-bc0bde0a9b12",
        "banner_url": "https://images.unsplash.com/photo-1571847690160-bc0bde0a9b12",
        "studio": "White Fox",
        "year": 2016,
        "age_rating": "TV-MA",
        "genres": ["Drama", "Fantasy", "Thriller"],
        "tags": ["Isekai", "Time Loop", "Psychological"],
        "total_episodes": 10
    },
    {
        "title": "Bleach",
        "synopsis": "A teenager gains the powers of a Soul Reaper and must protect the living world from evil spirits and guide souls to the afterlife.",
        "trailer_url": "https://www.youtube.com/watch?v=cBbbyHiQ2os",
        "poster_url": "https://images.unsplash.com/photo-1580477667995-2b94f01c9516",
        "banner_url": "https://images.unsplash.com/photo-1580477667995-2b94f01c9516",
        "studio": "Studio Pierrot",
        "year": 2004,
        "age_rating": "TV-14",
        "genres": ["Action", "Adventure", "Supernatural"],
        "tags": ["Shounen", "Swordplay", "Spirits"],
        "total_episodes": 12
    },
    {
        "title": "Chainsaw Man",
        "synopsis": "A young man merges with a devil to become Chainsaw Man and joins a government agency hunting devils.",
        "trailer_url": "https://www.youtube.com/watch?v=v4yLeNt-kCU",
        "poster_url": "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae",
        "banner_url": "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae",
        "studio": "MAPPA",
        "year": 2022,
        "age_rating": "TV-MA",
        "genres": ["Action", "Horror", "Supernatural"],
        "tags": ["Gore", "Dark Fantasy", "Demons"],
        "total_episodes": 8
    },
    {
        "title": "Your Name",
        "synopsis": "Two strangers find themselves linked in a bizarre way and must search for each other across time and space.",
        "trailer_url": "https://www.youtube.com/watch?v=xU47nhruN-Q",
        "poster_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
        "banner_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
        "studio": "CoMix Wave Films",
        "year": 2016,
        "age_rating": "TV-PG",
        "genres": ["Romance", "Drama", "Fantasy"],
        "tags": ["Body Swap", "Supernatural", "Movie"],
        "total_episodes": 5
    }
]

async def seed_database():
    print("Starting database seeding...")
    
    # Clear existing data
    print("Clearing existing anime and episodes...")
    await db.anime.delete_many({})
    await db.episodes.delete_many({})
    
    # Seed anime
    print(f"Seeding {len(ANIME_DATA)} anime...")
    for anime_data in ANIME_DATA:
        anime_id = f"anime_{uuid.uuid4().hex[:12]}"
        
        anime_doc = {
            "anime_id": anime_id,
            "title": anime_data["title"],
            "synopsis": anime_data["synopsis"],
            "trailer_url": anime_data["trailer_url"],
            "poster_url": anime_data["poster_url"],
            "banner_url": anime_data["banner_url"],
            "studio": anime_data["studio"],
            "year": anime_data["year"],
            "age_rating": anime_data["age_rating"],
            "genres": anime_data["genres"],
            "tags": anime_data["tags"],
            "total_episodes": anime_data["total_episodes"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.anime.insert_one(anime_doc)
        
        # Create episodes for this anime
        episode_count = anime_data["total_episodes"]
        for i in range(1, episode_count + 1):
            episode_id = f"episode_{uuid.uuid4().hex[:12]}"
            episode_doc = {
                "episode_id": episode_id,
                "anime_id": anime_id,
                "season_number": 1,
                "episode_number": i,
                "title": f"Episode {i}",
                "thumbnail_url": anime_data["poster_url"],
                "video_url": f"https://example.com/video/{anime_id}/ep{i}.mp4",
                "duration_seconds": 1440,  # 24 minutes
                "skip_intro_start": 90 if i > 1 else None,
                "skip_intro_end": 180 if i > 1 else None,
                "skip_recap_start": 10 if i > 1 else None,
                "skip_recap_end": 90 if i > 1 else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.episodes.insert_one(episode_doc)
        
        print(f"✓ Seeded {anime_data['title']} with {episode_count} episodes")
    
    print(f"\n✅ Database seeding completed! Seeded {len(ANIME_DATA)} anime.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())