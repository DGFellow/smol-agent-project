# backend/app/core/config.py
"""
Enhanced configuration with Pydantic for validation
Consolidates all settings for the quest platform
"""
import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """Application settings with validation"""
    
    # ============================================
    # SERVER CONFIGURATION
    # ============================================
    PROJECT_NAME: str = "AI Quest Platform"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 5001
    DEBUG: bool = False
    
    # ============================================
    # SECURITY
    # ============================================
    SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_SECRET: str = "your-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    BCRYPT_LOG_ROUNDS: int = 12
    
    # ============================================
    # FRONTEND
    # ============================================
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # ============================================
    # DATABASE
    # ============================================
    DATABASE_URL: str = "sqlite:///./smol_agent.db"
    DATABASE_PATH: str = "./smol_agent.db"
    
    # Vector Database (ChromaDB, Pinecone, Qdrant)
    VECTOR_DB_TYPE: str = "chroma"  # "chroma", "pinecone", "qdrant"
    CHROMA_PERSIST_DIR: str = "./data/vector_store"
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    ENABLE_SEMANTIC_SEARCH: bool = True
    
    # ============================================
    # AI MODELS
    # ============================================
    # LangChain Integration
    USE_LANGCHAIN: bool = True
    USE_LANGGRAPH: bool = True  # Quest orchestration
    
    # Local LLM Configuration
    MODEL_CACHE_DIR: Path = Path("./model_cache")
    DEFAULT_MODEL: str = "Qwen/Qwen2.5-3B-Instruct"
    CODER_MODEL: str = "Qwen/Qwen2.5-Coder-3B-Instruct"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Model Parameters
    MAX_TOKENS: int = 2048
    TEMPERATURE: float = 0.7
    TOP_P: float = 0.9
    
    # GPU Configuration
    USE_GPU: bool = True
    DEVICE: str = "cuda"  # "cuda" or "cpu"
    
    # OpenAI/Anthropic (Optional Cloud Fallback)
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # ============================================
    # SANDBOX CONFIGURATION (Your Manifesto Feature)
    # ============================================
    SANDBOX_ENABLED: bool = True
    SANDBOX_MAX_MEMORY: str = "2g"
    SANDBOX_CPU_QUOTA: int = 50000
    SANDBOX_TIMEOUT: int = 300  # 5 minutes
    DOCKER_HOST: str = "unix://var/run/docker.sock"
    
    # ============================================
    # QUEST SYSTEM (Your Manifesto Feature)
    # ============================================
    ENABLE_QUESTS: bool = True
    MAX_QUEST_STEPS: int = 50
    QUEST_AUTO_SAVE: bool = True
    
    # ============================================
    # COMMUNITY/MARKETPLACE (Your Manifesto Feature)
    # ============================================
    ENABLE_COMMUNITY: bool = True
    ENABLE_PROJECT_SHARING: bool = True
    ENABLE_PROJECT_FORKING: bool = True
    
    # ============================================
    # STORAGE
    # ============================================
    STORAGE_PATH: Path = Path("./storage")
    UPLOAD_DIR: Path = Path("./data/documents")
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = ["txt", "pdf", "md", "json", "csv"]
    
    # Cloud Storage (Optional)
    USE_S3: bool = False
    S3_BUCKET: Optional[str] = None
    S3_REGION: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    
    # ============================================
    # EMAIL CONFIGURATION
    # ============================================
    EMAIL_ENABLED: bool = False
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USE_TLS: bool = True
    EMAIL_USERNAME: Optional[str] = None
    EMAIL_PASSWORD: Optional[str] = None
    EMAIL_FROM_ADDRESS: str = "noreply@questplatform.com"
    EMAIL_FROM_NAME: str = "Quest Platform"
    
    # ============================================
    # SMS CONFIGURATION
    # ============================================
    SMS_ENABLED: bool = False
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    
    # ============================================
    # OAUTH CONFIGURATION
    # ============================================
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    
    # ============================================
    # LOGGING
    # ============================================
    LOG_LEVEL: str = "INFO"
    LOG_DIR: Path = Path("./logs")
    LOG_ROTATION: str = "daily"
    LOG_RETENTION: int = 30  # days
    
    # ============================================
    # RATE LIMITING
    # ============================================
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # ============================================
    # BACKGROUND TASKS
    # ============================================
    USE_CELERY: bool = False
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # ============================================
    # MONITORING
    # ============================================
    ENABLE_METRICS: bool = True
    ENABLE_TRACING: bool = False
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create directories if they don't exist
        self.MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        self.LOG_DIR.mkdir(parents=True, exist_ok=True)
        self.STORAGE_PATH.mkdir(parents=True, exist_ok=True)
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        Path(self.CHROMA_PERSIST_DIR).mkdir(parents=True, exist_ok=True)
    
    @property
    def database_url_sync(self) -> str:
        """Synchronous database URL"""
        return self.DATABASE_URL
    
    @property
    def database_url_async(self) -> str:
        """Asynchronous database URL (for future SQLAlchemy async)"""
        return self.DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
    
    def validate_production(self) -> List[str]:
        """Validate critical settings for production"""
        errors = []
        
        if not self.DEBUG:
            if self.SECRET_KEY == "your-secret-key-change-in-production":
                errors.append("SECRET_KEY must be changed in production")
            
            if self.JWT_SECRET == "your-jwt-secret-change-in-production":
                errors.append("JWT_SECRET must be changed in production")
            
            if not self.OPENAI_API_KEY and not self.ANTHROPIC_API_KEY:
                errors.append("At least one cloud LLM API key recommended for production")
        
        return errors

# Create global settings instance
settings = Settings()

# Validate on import
if not settings.DEBUG:
    errors = settings.validate_production()
    if errors:
        print("⚠️  Production configuration warnings:")
        for error in errors:
            print(f"  - {error}")