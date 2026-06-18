from django.db import migrations

def create_default_categories(apps, schema_editor):
    Category = apps.get_model('users', 'Category')
    default_categories = [
        {"name": "الشباب", "code": "youth", "description": "فئة الشباب والرجال العامة للنشاط الرياضي"},
        {"name": "السيدات", "code": "ladies", "description": "فئة السيدات المخصصة للأنشطة والترتيب الخاص بهن"},
        {"name": "كبار السن", "code": "seniors", "description": "فئة كبار السن (60 سنة فما فوق)"},
        {"name": "أصحاب الهمم", "code": "special_needs", "description": "فئة أصحاب الهمم والاحتياجات الخاصة"},
    ]
    for cat in default_categories:
        Category.objects.get_or_create(code=cat["code"], defaults=cat)

def remove_default_categories(apps, schema_editor):
    Category = apps.get_model('users', 'Category')
    Category.objects.filter(code__in=["youth", "ladies", "seniors", "special_needs"]).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_category_userprofile_is_category_manual_and_more'),
    ]

    operations = [
        migrations.RunPython(create_default_categories, reverse_code=remove_default_categories),
    ]
