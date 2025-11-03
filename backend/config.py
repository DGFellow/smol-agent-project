# backend/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Existing Server config
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 5001))
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    
    # Existing Security
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
    BCRYPT_LOG_ROUNDS = int(os.getenv("BCRYPT_LOG_ROUNDS", 12))
    
    # Enhanced JWT Configuration
    JWT_SECRET = os.getenv("JWT_SECRET", os.getenv("JWT_SECRET_KEY", "your-jwt-secret"))
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 
                                        int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600)) // 3600))
    
    # Existing Model config
    MODEL_CACHE_DIR = Path(os.getenv("MODEL_CACHE_DIR", "./model_cache"))
    MAX_TOKENS = int(os.getenv("MAX_TOKENS", 2048))
    TEMPERATURE = float(os.getenv("TEMPERATURE", 0.7))
    
    # Existing GPU config
    USE_GPU = os.getenv("USE_GPU", "true").lower() == "true"
    DEVICE = os.getenv("DEVICE", "cuda" if USE_GPU else "cpu")
    
    # Existing Database config
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///smol_agent.db")
    DATABASE_PATH = DATABASE_URL.replace("sqlite:///", "")
    
    # Vector DB (for future migration)
    VECTOR_DB_TYPE = os.getenv("VECTOR_DB_TYPE", "sqlite")
    VECTOR_DB_PATH = os.getenv("VECTOR_DB_PATH", "./vector_db")
    ENABLE_SEMANTIC_SEARCH = os.getenv("ENABLE_SEMANTIC_SEARCH", "false").lower() == "true"
    CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_storage")
    
    # Enhanced Email Configuration
    EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
    EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
    EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
    EMAIL_USERNAME = os.getenv("EMAIL_USERNAME", "")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
    EMAIL_FROM_ADDRESS = os.getenv("EMAIL_FROM_ADDRESS", "noreply@smolagent.com")
    EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Smolagent")
    
    # Frontend URL for email links
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Enhanced SMS Configuration
    SMS_ENABLED = os.getenv("SMS_ENABLED", "false").lower() == "true"
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
    
    # OAuth Configuration
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", f"{FRONTEND_URL}/auth/google/callback")
    
    GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
    GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", f"{FRONTEND_URL}/auth/github/callback")
    
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    
    # Existing Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_DIR = os.getenv("LOG_DIR", "logs")
    
    # CORS
    CORS_ORIGINS = [FRONTEND_URL]
    
    # LangChain toggle
    USE_LANGCHAIN = os.getenv("USE_LANGCHAIN", "true").lower() == "true"
    
    @classmethod
    def validate(cls):
        """Validate critical configuration"""
        if cls.DEBUG:
            return True  # Skip validation in debug mode
        
        errors = []
        
        if cls.SECRET_KEY == "your-secret-key":
            errors.append("SECRET_KEY must be changed in production")
        
        if cls.JWT_SECRET == "your-jwt-secret":
            errors.append("JWT_SECRET must be changed in production")
        
        if errors:
            print("⚠️  Configuration warnings:")
            for error in errors:
                print(f"  - {error}")
        
        return True