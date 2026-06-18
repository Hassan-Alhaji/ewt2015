from django.db import migrations

def create_default_events(apps, schema_editor):
    Event = apps.get_model('users', 'Event')
    default_events = [
        {
            "name_ar": "فعالية مشي نهاية الأسبوع بالخبر",
            "name_en": "Khobar Weekend Walk Event",
            "description_ar": "فعالية مشي جماعية على كورنيش الخبر بمناسبة نهاية الأسبوع.",
            "description_en": "Group walking event on Khobar Corniche for the weekend.",
            "points": 50,
            "km": 5.00,
            "is_active": True
        },
        {
            "name_ar": "تحدي المشي والصحة العالمي",
            "name_en": "Global Walk & Health Challenge",
            "description_ar": "فعالية عالمية لتشجيع الصحة والمشي لمسافات طويلة.",
            "description_en": "A global event to promote health and long-distance walking.",
            "points": 100,
            "km": 10.00,
            "is_active": True
        },
        {
            "name_ar": "فعالية المشي لكبار السن وأصحاب الهمم",
            "name_en": "Seniors & Special Needs Walking Event",
            "description_ar": "فعالية مشي هادئة ومخصصة لدعم ودمج كبار السن وأصحاب الهمم.",
            "description_en": "A calm walk event dedicated to supporting and integrating seniors and special needs members.",
            "points": 40,
            "km": 3.00,
            "is_active": True
        }
    ]
    for ev in default_events:
        Event.objects.get_or_create(name_ar=ev["name_ar"], defaults=ev)

def remove_default_events(apps, schema_editor):
    Event = apps.get_model('users', 'Event')
    Event.objects.all().delete()

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_event_eventattendance'),
    ]

    operations = [
        migrations.RunPython(create_default_events, reverse_code=remove_default_events),
    ]
