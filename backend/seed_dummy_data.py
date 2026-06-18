import os
import sys
import django
import random
from datetime import timedelta
from django.utils import timezone

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ewt_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile, NewsPost, Category, Event, EventAttendance

User = get_user_model()

def run_seed():
    print("Seeding realistic dummy data for testing...")

    # Categories
    cat_pro, _ = Category.objects.get_or_create(name="محترف", code="pro")
    cat_adv, _ = Category.objects.get_or_create(name="متقدم", code="advanced")
    cat_beg, _ = Category.objects.get_or_create(name="مبتدئ", code="beginner")

    categories = [cat_beg, cat_adv, cat_pro]

    # Dummy User Data
    names = [
        "سالم الدوسري", "نواف العابد", "ياسر القحطاني", "محمد النني", "عمر السومة",
        "علي البليهي", "سعد الحارثي", "فهد المولد", "سلمان الفرج", "محمد كنو",
        "هتان باهبري", "خالد الغنام", "عبدالإله العمري", "حسان تمبكتي", "عبدالله مادو"
    ]
    cities = ["الدمام", "الخبر", "الظهران", "الرياض", "جدة", "مكة", "المدينة", "تبوك"]

    print("Creating members...")
    for i in range(15):
        mobile = f"0501000{i:03d}"
        name = random.choice(names) + f" {i+1}"
        
        user, created = User.objects.get_or_create(mobile=mobile, defaults={'is_approved': True})
        
        # Determine stats
        points = random.randint(50, 1000)
        km = float(random.randint(10, 500)) + random.random()
        streak = random.randint(1, 30)
        
        # Pick category based on points roughly
        if points > 500: cat = cat_pro
        elif points > 200: cat = cat_adv
        else: cat = cat_beg

        # We will just update or create profile
        profile, p_created = UserProfile.objects.get_or_create(user=user)
        profile.name = name
        profile.gender = "male"
        profile.city = random.choice(cities)
        profile.category = cat
        profile.points = points
        profile.total_km = km
        profile.streak = streak
        profile.save()

    print("Creating realistic events...")
    # Clean previous dummy events starting with [تجريبي]
    Event.objects.filter(name_ar__startswith="[تجريبي]").delete()

    event_data = [
        {
            "name": "[تجريبي] ماراثون الشرقية السنوي",
            "desc": "أكبر ماراثون سنوي في المنطقة الشرقية، مسارات متنوعة تناسب الجميع.\n\nالتعليمات:\n- التواجد قبل انطلاق الصافرة بنصف ساعة.\n- إحضار ماء وشمسية.\n- ارتداء الزي الرياضي الخاص بالفريق.",
            "loc": "واجهة الخبر البحرية",
            "loc_url": "https://maps.google.com",
            "points": 50,
            "km": 10.0,
            "days_offset": 5, # future
            "is_active": True
        },
        {
            "name": "[تجريبي] مشي جماعي في حديقة الملك فهد",
            "desc": "مشي جماعي خفيف حول حديقة الملك فهد بالدمام لتعزيز اللياقة وتغيير الروتين.\n\nالتعليمات:\n- الحضور بالزي الرسمي للفريق (التيشيرت الأخضر).\n- الفعالية تناسب المبتدئين.",
            "loc": "حديقة الملك فهد بالدمام",
            "loc_url": "https://maps.google.com",
            "points": 20,
            "km": 5.0,
            "days_offset": 2, # future
            "is_active": True
        },
        {
            "name": "[تجريبي] فعالية اليوم الوطني",
            "desc": "مسيرة خاصة بمناسبة اليوم الوطني. نرحب بجميع الأعضاء.",
            "loc": "كورنيش الدمام",
            "loc_url": "",
            "points": 100,
            "km": 8.0,
            "days_offset": -10, # past
            "is_active": False
        }
    ]

    for ed in event_data:
        evt_date = timezone.now() + timedelta(days=ed["days_offset"])
        event = Event.objects.create(
            name_ar=ed["name"],
            name_en="Test Event",
            description_ar=ed["desc"],
            location_name=ed["loc"],
            location_url=ed["loc_url"],
            points=ed["points"],
            km=ed["km"],
            event_date=evt_date.date(),
            event_time="16:00:00",
            is_active=ed["is_active"]
        )
        pass

    print("Seeding complete! Check your UI.")

if __name__ == "__main__":
    run_seed()
