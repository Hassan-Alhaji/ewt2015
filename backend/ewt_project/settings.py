import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-ewt-walking-lifestyle-community-secret-key')

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

# In development allow everything; in production read an explicit comma-separated list.
ALLOWED_HOSTS = [
    h.strip() for h in os.environ.get(
        'ALLOWED_HOSTS', '*' if DEBUG else 'localhost,127.0.0.1'
    ).split(',') if h.strip()
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',
    
    # Local apps
    'users',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'ewt_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'ewt_project.wsgi.application'

# Database configuration.
# Priority: DATABASE_URL (Render / production) -> local PostgreSQL -> SQLite fallback.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    import dj_database_url
    DATABASES['default'] = dj_database_url.parse(
        DATABASE_URL, conn_max_age=600, ssl_require=True
    )
else:
    DB_PW_FILE = os.path.join(BASE_DIR, '.db_pw')
    db_password = 'postgres'
    if os.path.exists(DB_PW_FILE):
        with open(DB_PW_FILE, 'r') as f:
            db_password = f.read().strip()

    USE_POSTGRES = os.environ.get('USE_POSTGRES', 'True') == 'True'
    if USE_POSTGRES:
        try:
            import psycopg2
            # Verify connection can be established, otherwise we fall back to SQLite
            conn = psycopg2.connect(
                dbname=os.environ.get('DB_NAME', 'ewt_db'),
                user=os.environ.get('DB_USER', 'postgres'),
                password=os.environ.get('DB_PASSWORD', db_password),
                host=os.environ.get('DB_HOST', 'localhost'),
                port=os.environ.get('DB_PORT', '5432'),
                connect_timeout=3
            )
            conn.close()

            DATABASES['default'] = {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': os.environ.get('DB_NAME', 'ewt_db'),
                'USER': os.environ.get('DB_USER', 'postgres'),
                'PASSWORD': os.environ.get('DB_PASSWORD', db_password),
                'HOST': os.environ.get('DB_HOST', 'localhost'),
                'PORT': os.environ.get('DB_PORT', '5432'),
            }
            print("Settings configured to use PostgreSQL.")
        except Exception as e:
            print(f"PostgreSQL connection failed during settings load: {e}. Falling back to SQLite.")

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'ar-sa'
TIME_ZONE = 'Asia/Riyadh'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# WhiteNoise: serve compressed static files in production (for Django admin/DRF).
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model
AUTH_USER_MODEL = 'users.User'

# CORS Settings
# Development: allow all. Production: restrict to an explicit allowlist via env
# (CORS_ALLOWED_ORIGINS="https://app.example.com,https://www.example.com").
CORS_ALLOW_CREDENTIALS = True
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [
        o.strip() for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()
    ]

# DRF settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
}

# OTP settings
OTP_EXPIRY_MINUTES = 5
OTP_SIMULATION_MODE = True # Prints OTP in server terminal/API responses for local testing
