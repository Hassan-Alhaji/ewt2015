import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ewt_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile

User = get_user_model()

def create_admin():
    mobile = '0500000000'
    password = 'adminpassword'
    
    if not User.objects.filter(mobile=mobile).exists():
        user = User.objects.create_superuser(mobile=mobile, password=password)
        # Create a profile for the admin user
        UserProfile.objects.create(
            user=user,
            name="مدير المنصة",
            gender="male",
            city="الخبر",
            preferred_activity="both",
            is_disabled=False
        )
        print(f"Superuser created successfully with mobile: {mobile} and password: {password}")
    else:
        print(f"Superuser with mobile {mobile} already exists.")

if __name__ == "__main__":
    create_admin()
