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
from rest_framework.authtoken.models import Token
from users.models import UserProfile, NewsPost, Category, Event, EventAttendance

User = get_user_model()

def run_seed():
    print("=" * 60)
    print("  Seeding realistic dummy data for Live Demo...")
    print("=" * 60)

    # ═══════════════════════════════════════════════════════
    # 1. CATEGORIES
    # ═══════════════════════════════════════════════════════
    cat_pro, _ = Category.objects.get_or_create(name="محترف", code="pro")
    cat_adv, _ = Category.objects.get_or_create(name="متقدم", code="advanced")
    cat_beg, _ = Category.objects.get_or_create(name="مبتدئ", code="beginner")
    print("✅ Categories created.")

    # ═══════════════════════════════════════════════════════
    # 2. DEV LOGIN ACCOUNTS (Admin, Reviewer, Content Manager)
    # ═══════════════════════════════════════════════════════
    dev_accounts = [
        {'mobile': '0500000001', 'name': 'مدير النظام', 'role': 'admin'},
        {'mobile': '0500000002', 'name': 'مدقق الأنشطة', 'role': 'reviewer'},
        {'mobile': '0500000003', 'name': 'مدير المحتوى', 'role': 'content_manager'},
    ]
    for acc in dev_accounts:
        user, created = User.objects.get_or_create(mobile=acc['mobile'])
        user.is_approved = True
        if acc['role'] == 'admin':
            user.is_staff = True
            user.is_superuser = True
        elif acc['role'] == 'reviewer':
            user.is_reviewer = True
        elif acc['role'] == 'content_manager':
            user.is_content_manager = True
        user.set_unusable_password()
        user.save()
        Token.objects.get_or_create(user=user)
        profile, _ = UserProfile.objects.get_or_create(user=user, defaults={
            'name': acc['name'],
            'gender': 'male',
            'city': 'الدمام',
            'points': 500,
            'total_km': 120,
        })
    print("✅ Dev login accounts created (Admin, Reviewer, Content Manager).")

    # ═══════════════════════════════════════════════════════
    # 3. DUMMY MEMBERS (15 members with varied stats)
    # ═══════════════════════════════════════════════════════
    names = [
        "سالم الدوسري", "نواف العابد", "ياسر القحطاني", "محمد النني", "عمر السومة",
        "علي البليهي", "سعد الحارثي", "فهد المولد", "سلمان الفرج", "محمد كنو",
        "هتان باهبري", "خالد الغنام", "عبدالإله العمري", "حسان تمبكتي", "عبدالله مادو"
    ]
    cities = ["الدمام", "الخبر", "الظهران", "الرياض", "جدة", "مكة", "المدينة", "تبوك"]

    for i in range(15):
        mobile = f"0501000{i:03d}"
        name = names[i]
        
        user, created = User.objects.get_or_create(mobile=mobile, defaults={'is_approved': True})
        if not user.is_approved:
            user.is_approved = True
            user.save()
        
        points = random.randint(50, 1000)
        km = float(random.randint(10, 500)) + round(random.random(), 2)
        streak = random.randint(1, 30)
        
        if points > 500: cat = cat_pro
        elif points > 200: cat = cat_adv
        else: cat = cat_beg

        profile, p_created = UserProfile.objects.get_or_create(user=user)
        profile.name = name
        profile.gender = "male"
        profile.city = random.choice(cities)
        profile.category = cat
        profile.points = points
        profile.total_km = km
        profile.streak = streak
        profile.save()

    print(f"✅ 15 test members created.")

    # ═══════════════════════════════════════════════════════
    # 4. EVENTS (future + past)
    # ═══════════════════════════════════════════════════════
    Event.objects.filter(name_ar__startswith="[تجريبي]").delete()

    event_data = [
        {
            "name": "[تجريبي] ماراثون الشرقية السنوي",
            "desc": "أكبر ماراثون سنوي في المنطقة الشرقية، مسارات متنوعة تناسب الجميع.\n\nالتعليمات:\n- التواجد قبل انطلاق الصافرة بنصف ساعة.\n- إحضار ماء وشمسية.\n- ارتداء الزي الرياضي الخاص بالفريق.",
            "loc": "واجهة الخبر البحرية",
            "loc_url": "https://maps.google.com",
            "points": 50, "km": 10.0,
            "days_offset": 7, "is_active": True
        },
        {
            "name": "[تجريبي] مشي جماعي في حديقة الملك فهد",
            "desc": "مشي جماعي خفيف حول حديقة الملك فهد بالدمام لتعزيز اللياقة وتغيير الروتين.\n\nالتعليمات:\n- الحضور بالزي الرسمي للفريق (التيشيرت الأخضر).\n- الفعالية تناسب المبتدئين.",
            "loc": "حديقة الملك فهد بالدمام",
            "loc_url": "https://maps.google.com",
            "points": 20, "km": 5.0,
            "days_offset": 3, "is_active": True
        },
        {
            "name": "[تجريبي] تحدي المشي الليلي",
            "desc": "تحدي مشي ليلي ممتع تحت ضوء القمر على كورنيش الدمام.\n\nالتعليمات:\n- إحضار سترة عاكسة.\n- الالتزام بالمسار المحدد.",
            "loc": "كورنيش الدمام",
            "loc_url": "https://maps.google.com",
            "points": 30, "km": 7.0,
            "days_offset": 14, "is_active": True
        },
        {
            "name": "[تجريبي] فعالية اليوم الوطني",
            "desc": "مسيرة خاصة بمناسبة اليوم الوطني. نرحب بجميع الأعضاء.",
            "loc": "كورنيش الدمام",
            "loc_url": "",
            "points": 100, "km": 8.0,
            "days_offset": -10, "is_active": False
        }
    ]

    for ed in event_data:
        evt_date = timezone.now() + timedelta(days=ed["days_offset"])
        Event.objects.create(
            name_ar=ed["name"], name_en="Test Event",
            description_ar=ed["desc"],
            location_name=ed["loc"], location_url=ed["loc_url"],
            points=ed["points"], km=ed["km"],
            event_date=evt_date.date(), event_time="16:00:00",
            is_active=ed["is_active"]
        )
    print(f"✅ {len(event_data)} events created.")

    # ═══════════════════════════════════════════════════════
    # 5. NEWS POSTS (achievements & announcements)
    # ═══════════════════════════════════════════════════════
    admin_user = User.objects.filter(is_staff=True).first()
    member_users = User.objects.filter(mobile__startswith='0501000')

    if not NewsPost.objects.filter(title__startswith="[تجريبي]").exists():
        news_data = [
            {
                "title": "[تجريبي] العضو سالم الدوسري يحقق 500 كم!",
                "content": "نبارك للعضو المتميز سالم الدوسري تحقيقه لإنجاز 500 كيلومتر مشي منذ انضمامه للفريق. إنجاز يستحق التقدير والاحتفاء! استمر يا بطل 💪🏃",
                "news_type": "achievement",
                "is_approved": True,
            },
            {
                "title": "[تجريبي] إعلان: افتتاح التسجيل في ماراثون الشرقية",
                "content": "يسعدنا الإعلان عن افتتاح باب التسجيل في ماراثون الشرقية السنوي 🏅\n\nالفعالية ستقام على واجهة الخبر البحرية وستشمل مسارات متنوعة تناسب جميع المستويات.\n\nسارعوا بالتسجيل!",
                "news_type": "news",
                "is_approved": True,
            },
            {
                "title": "[تجريبي] نواف العابد يكمل أول 100 كم",
                "content": "ألف مبروك للعضو نواف العابد على إكماله أول 100 كيلومتر! بداية قوية وعزيمة لا تُقهر. نتمنى لك المزيد من الإنجازات 🌟",
                "news_type": "achievement",
                "is_approved": True,
            },
            {
                "title": "[تجريبي] نصائح للمشي في فصل الصيف",
                "content": "مع ارتفاع درجات الحرارة، إليكم أهم النصائح:\n\n1. اختاروا الأوقات المبكرة أو المتأخرة للمشي\n2. اشربوا كميات كافية من الماء\n3. ارتدوا ملابس خفيفة وفاتحة اللون\n4. استخدموا واقي الشمس\n5. لا تنسوا القبعة والنظارات الشمسية",
                "news_type": "news",
                "is_approved": True,
            },
        ]

        for nd in news_data:
            author = random.choice(list(member_users)) if nd["news_type"] == "achievement" else admin_user
            if author:
                NewsPost.objects.create(
                    author=author,
                    title=nd["title"],
                    content=nd["content"],
                    news_type=nd.get("news_type", "news"),
                    is_approved=nd["is_approved"],
                )
        print(f"✅ {len(news_data)} news posts created.")
    else:
        print("⏭️  News posts already exist, skipping.")

    # ═══════════════════════════════════════════════════════
    # 6. REGISTER SOME MEMBERS TO EVENTS
    # ═══════════════════════════════════════════════════════
    active_events = Event.objects.filter(is_active=True)
    for event in active_events:
        members_to_register = list(member_users)[:random.randint(3, 8)]
        for member in members_to_register:
            EventAttendance.objects.get_or_create(
                user=member, event=event,
                defaults={"status": "approved"}
            )
    print("✅ Random event registrations created.")

    print("=" * 60)
    print("  ✅ Seeding complete! All data ready for Live Demo.")
    print("=" * 60)

if __name__ == "__main__":
    run_seed()
